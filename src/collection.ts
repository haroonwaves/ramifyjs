import { NotificationManager, type Observer } from '@/observer.js';
import { Query, type Criteria } from '@/query.js';
import BTree from 'sorted-btree';

export type CollectionSchema<T = any> = {
	primaryKey: keyof T;
	indexes?: Array<string>;
	multiEntry?: Array<string>;
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
    return path.split('.').reduce<unknown>((acc, part) => (acc as Record<string, unknown>)?.[part], obj);
}

export class Collection<T = any> {
	readonly collectionName: string;
	readonly primaryKey: keyof T;
	readonly indexes: Array<string>;
	readonly multiEntryIndexes: string[];

	protected data: Map<any, T>;
    protected indexMaps: { [key: string]: Map<unknown, Map<unknown, T>> };
	protected sortedBTree: BTree<T> | null;

	protected observer: NotificationManager;
	batchOperationInProgress: boolean;

	constructor(collectionName: string, schema: CollectionSchema<T>) {
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

	where(criteria: Criteria<T> | keyof T): Query<T> {
		return new Query<T>(this, criteria);
	}

	put(document: T): T {
		this.delete(document[this.primaryKey]); // Delete existing document

		this.data.set(document[this.primaryKey], document); // Add to primary Map

		for (const index of [...this.indexes, ...this.multiEntryIndexes])
			this.addToIndex(index, document); // Add to index Set
		if (this.sortedBTree) this.sortedBTree.set(createBTreeKey(document), document); // Add to BTree

		if (!this.batchOperationInProgress) this.observer?.notify('create');
		return document;
	}

	bulkPut(documents: T[]): T[] {
		this.batchOperationInProgress = true;
		const results = documents.map((document) => this.put(document));
		this.batchOperationInProgress = false;

		this.observer?.notify('create');
		return results;
	}

	add(document: T): T {
		const existingDocument = this.data.get(document[this.primaryKey]);
		if (existingDocument) throw new Error(`Ramify: Document already exists in the collection`);

		return this.put(document);
	}

	bulkAdd(documents: T[]): T[] {
		this.batchOperationInProgress = true;
		const results = documents.map((document) => this.add(document));
		this.batchOperationInProgress = false;

		this.observer?.notify('create');
		return results;
	}

	get(primaryValue: T[keyof T]): T | undefined {
		return this.data.get(primaryValue);
	}

	bulkGet(primaryValues: Array<T[keyof T]>): Array<T | undefined> {
		return primaryValues.map((value) => this.get(value));
	}

	toArray(): T[] {
		return [...(this.sortedBTree?.values() || this.data.values())];
	}

	update(primaryValue: T[keyof T], changes: Partial<T>): T {
		const oldData = this.get(primaryValue);
		if (!oldData) throw new Error(`Ramify: Document not found in the collection`);

		const oldKey = createBTreeKey(oldData);
		const newData = Object.assign(oldData, changes); // Update the data
		const newKey = createBTreeKey(newData);

		const isPrimaryKeyUpdate = changes[this.primaryKey] !== undefined;
		const isIndexUpdate = Object.keys(changes).some(
			(key) => this.indexes.includes(key) || this.multiEntryIndexes.includes(key)
		);

		if (isPrimaryKeyUpdate || isIndexUpdate) {
			this.delete(primaryValue);
			this.put(newData);
		}

		if (this.sortedBTree) {
			this.sortedBTree.delete(oldKey);
			this.sortedBTree.set(newKey, newData);
		}

		if (!this.batchOperationInProgress) this.observer?.notify('update');
		return newData;
	}

	bulkUpdate(documents: Array<{ key: T[keyof T]; changes: Partial<T> }>): T[] {
		this.batchOperationInProgress = true;
		const results = documents.map(({ key, changes }) => this.update(key, changes));
		this.batchOperationInProgress = false;

		this.observer?.notify('update');
		return results;
	}

	delete(primaryValue: T[keyof T]): T[keyof T] | undefined {
		const oldData = this.get(primaryValue);
		if (!oldData) return;

		this.data.delete(primaryValue); // Delete from primary Map
		for (const index of [...this.indexes, ...this.multiEntryIndexes]) {
			this.removeFromIndex(index, oldData); // Delete from index Set
		}
		if (this.sortedBTree) this.sortedBTree.delete(createBTreeKey(oldData)); // Delete from sorted BTree

		if (!this.batchOperationInProgress) this.observer?.notify('delete');
		return oldData[this.primaryKey];
	}

	bulkDelete(primaryValues: Array<T[keyof T]>): Array<T[keyof T] | undefined> {
		this.batchOperationInProgress = true;
		const results = primaryValues.map((value) => this.delete(value));
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

	filter(callback: (document: T) => boolean): Query<T> {
		return new Query<T>(this, {}).filter((element) => callback(element));
	}

	each(callback: (document: T) => void): void {
		this.toArray().forEach((element) => callback(element));
	}

	orderBy(field: keyof T): Query<T> {
		return new Query<T>(this, {}).orderBy(field);
	}

	limit(count: number): Query<T> {
		return new Query<T>(this, {}).limit(count);
	}

	offset(count: number): Query<T> {
		return new Query<T>(this, {}).offset(count);
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
