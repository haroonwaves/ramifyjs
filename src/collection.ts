import { NotificationManager, type Observer } from '@/observer.js';
import { Query, type Criteria } from '@/query.js';
import BTree from 'sorted-btree';

export type CollectionSchema<T, PK extends keyof T = keyof T> = {
	primaryKey: PK;
	indexes?: Array<keyof T & string>;
	multiEntry?: Array<keyof T & string>;
	bTree?: (a: T, b: T) => number;
};

export type CollectionOperation = 'create' | 'update' | 'delete' | 'clear';

type BTreeKey<T> = {
	[K in keyof T]: T[K];
};

function createBTreeKey<T>(document: T): BTreeKey<T> {
	return { ...document };
}

function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
	return path
		.split('.')
		.reduce<unknown>((acc, part) => (acc as Record<string, unknown>)?.[part], obj);
}

export class Collection<T = any, Pk extends keyof T = keyof T> {
	readonly collectionName: string;
	readonly primaryKey: Pk;
	readonly indexes: string[];
	readonly multiEntryIndexes: string[];

	protected data: Map<any, T>;
	protected indexMaps: { [key: string]: Map<unknown, Map<unknown, T>> };
	protected sortedBTree: BTree<T> | null;

	protected observer: NotificationManager;
	batchOperationInProgress: boolean;

	constructor(collectionName: string, schema: CollectionSchema<T, Pk>) {
		this.collectionName = collectionName;
		this.primaryKey = schema.primaryKey;
		this.indexes = schema.indexes || [];
		this.multiEntryIndexes = schema.multiEntry || [];

		this.data = new Map();
		this.indexMaps = {};
		this.sortedBTree = schema.bTree ? new BTree(undefined, schema.bTree) : null;
		for (const index of [...this.indexes, ...this.multiEntryIndexes]) {
			this.indexMaps[index] = new Map();
		}

		this.observer = new NotificationManager(collectionName);
		this.batchOperationInProgress = false;
	}

	where(criteria: Criteria<T> | keyof T): Query<T, Pk> {
		return new Query<T, Pk>(this, criteria);
	}

	put(document: T): T[Pk] {
		this.delete(document[this.primaryKey]); // Delete existing document

		this.data.set(document[this.primaryKey], document); // Add to primary Map

		for (const index of [...this.indexes, ...this.multiEntryIndexes])
			this.addToIndex(index, document); // Add to index Set
		if (this.sortedBTree) this.sortedBTree.set(createBTreeKey(document), document); // Add to BTree

		if (!this.batchOperationInProgress) this.observer?.notify('create');
		return document[this.primaryKey];
	}

	bulkPut(documents: T[]) {
		this.batchOperationInProgress = true;
		const results = documents.map((document) => this.put(document));
		this.batchOperationInProgress = false;

		this.observer?.notify('create');
		return results;
	}

	add(document: T) {
		const primaryVal = document[this.primaryKey];
		const existingDocument = this.data.get(primaryVal);
		if (existingDocument)
			throw new Error(
				`Ramify: Document with primary key ${primaryVal} already exists in the collection`
			);

		return this.put(document);
	}

	bulkAdd(documents: T[]) {
		this.batchOperationInProgress = true;
		const results = documents.map((document) => this.add(document));
		this.batchOperationInProgress = false;

		this.observer?.notify('create');
		return results;
	}

	get(primaryVal: T[Pk]): T | undefined {
		return this.data.get(primaryVal);
	}

	bulkGet(primaryVals: Array<T[Pk]>): Array<T | undefined> {
		return primaryVals.map((value) => this.get(value));
	}

	toArray(): T[] {
		return [...(this.sortedBTree?.values() || this.data.values())];
	}

	update(primaryVal: T[Pk], changes: Partial<T>): T {
		const oldData = this.get(primaryVal);
		if (!oldData) throw new Error(`Ramify: Document not found in the collection`);

		const oldKey = createBTreeKey(oldData);
		const newData = Object.assign(oldData, changes); // Update the data
		const newKey = createBTreeKey(newData);

		const isPrimaryKeyUpdate = changes[this.primaryKey] !== undefined;
		const isIndexUpdate = Object.keys(changes).some(
			(key) => this.indexes.includes(key) || this.multiEntryIndexes.includes(key)
		);

		if (isPrimaryKeyUpdate || isIndexUpdate) {
			this.delete(primaryVal);
			this.put(newData);
		}

		if (this.sortedBTree) {
			this.sortedBTree.delete(oldKey);
			this.sortedBTree.set(newKey, newData);
		}

		if (!this.batchOperationInProgress) this.observer?.notify('update');
		return newData;
	}

	bulkUpdate(documents: Array<{ key: T[Pk]; changes: Partial<T> }>): T[] {
		this.batchOperationInProgress = true;
		const results = documents.map(({ key, changes }) => this.update(key, changes));
		this.batchOperationInProgress = false;

		this.observer?.notify('update');
		return results;
	}

	delete(primaryVal: T[Pk]): T[Pk] | undefined {
		const document = this.get(primaryVal);
		if (!document) return;

		this.data.delete(primaryVal); // Delete from primary Map
		for (const index of [...this.indexes, ...this.multiEntryIndexes]) {
			this.removeFromIndex(index, document); // Delete from index Set
		}
		if (this.sortedBTree) this.sortedBTree.delete(createBTreeKey(document)); // Delete from sorted BTree

		if (!this.batchOperationInProgress) this.observer?.notify('delete');
		return document[this.primaryKey];
	}

	bulkDelete(primaryVals: Array<T[Pk]>): Array<T[Pk] | undefined> {
		this.batchOperationInProgress = true;
		const results = primaryVals.map((value) => this.delete(value));
		this.batchOperationInProgress = false;

		this.observer?.notify('delete');
		return results;
	}

	clear(): void {
		this.data.clear();
		for (const index of this.indexes) this.indexMaps[index]?.clear();
		if (this.sortedBTree) this.sortedBTree.clear();
		this.observer?.notify('clear');
	}

	count(): number {
		return this.toArray().length;
	}

	filter(callback: (document: T) => boolean): Query<T, Pk> {
		return new Query<T, Pk>(this, {}).filter((element) => callback(element));
	}

	each(callback: (document: T) => void): void {
		this.toArray().forEach((element) => callback(element));
	}

	orderBy(field: keyof T): Query<T, Pk> {
		return new Query<T, Pk>(this, {}).orderBy(field);
	}

	limit(count: number): Query<T, Pk> {
		return new Query<T, Pk>(this, {}).limit(count);
	}

	offset(count: number): Query<T, Pk> {
		return new Query<T, Pk>(this, {}).offset(count);
	}

	subscribe(cb: Observer) {
		return this.observer.subscribe(cb);
	}

	unsubscribe(cb: Observer) {
		return this.observer.unsubscribe(cb);
	}

	private addToIndex(index: string, document: T): void {
		const value = getNestedValue(document as unknown as Record<string, unknown>, index);
		const indexMap = this.indexMaps[index];
		if (!indexMap) return;

		if (this.multiEntryIndexes.includes(index) && Array.isArray(value)) {
			for (const entry of value) this.addToSet(indexMap, entry, document);
		} else {
			this.addToSet(indexMap, value, document);
		}
	}

	private removeFromIndex(index: string, document: T): void {
		const value = getNestedValue(document as unknown as Record<string, unknown>, index);
		const indexMap = this.indexMaps[index];
		if (!indexMap) return;

		if (this.multiEntryIndexes.includes(index) && Array.isArray(value)) {
			for (const entry of value) this.removeFromSet(indexMap, entry, document);
		} else {
			this.removeFromSet(indexMap, value, document);
		}
	}

	private addToSet<V extends { [K in keyof T]: T[K] }>(
		indexMap: Map<unknown, Map<unknown, V>>,
		field: unknown,
		document: V
	): void {
		const documentsMap = indexMap.get(field) || new Map<unknown, V>();
		documentsMap.set(document[this.primaryKey], document);
		indexMap.set(field, documentsMap);
	}

	private removeFromSet<V extends { [K in keyof T]: T[K] }>(
		indexMap: Map<unknown, Map<unknown, V>>,
		field: unknown,
		document: V
	): void {
		const documentsMap = indexMap.get(field);
		if (documentsMap) {
			documentsMap.delete(document[this.primaryKey]);
			if (documentsMap.size === 0) indexMap.delete(field);
		}
	}

	get _indexes() {
		return {
			primary: this.primaryKey,
			indexes: this.indexes,
			multiEntryIndexes: this.multiEntryIndexes,
		};
	}
}
