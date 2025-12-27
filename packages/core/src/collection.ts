import { NotificationManager, type Observer } from '@/observer.js';
import { Query } from '@/query.js';
import type {
	Criteria,
	ExecutableStage,
	LimitedStage,
	NestedKeyOf,
	OrderableStage,
	Schema,
	WhereStage,
	WhereStageNested,
} from '@/types';
import { getNestedValue } from '@/utils/getNestedValue';
import { createLazyCloneProxy } from '@/utils/lazyCloneProxy.js';
import assert from 'assert';

/*
	primaryMap => Map<primaryKey, document>
	indexMaps => {[index]: Map<value, Map<primaryKey, document>>}
*/

export type CollectionOperation = 'create' | 'update' | 'delete' | 'clear';

function isPrimitive(value: unknown): boolean {
	if (value === null || value === undefined) return true;
	const type = typeof value;
	return type === 'string' || type === 'number' || type === 'boolean' || value instanceof Date;
}

export class Collection<T = any, Pk extends keyof T = keyof T> {
	readonly collectionName: string;
	readonly primaryKey: Pk;
	readonly indexes: string[];
	readonly multiEntryIndexes: string[];

	protected data: Map<any, T>;
	protected indexMaps: { [key: string]: Map<unknown, Map<unknown, T>> };

	protected observer: NotificationManager<T[Pk] | undefined>;
	batchOperationInProgress: boolean;

	constructor(collectionName: string, schema: Schema<T, Pk>) {
		this.collectionName = collectionName;
		this.primaryKey = schema.primaryKey;
		this.indexes = schema.indexes || [];
		this.multiEntryIndexes = schema.multiEntry || [];

		this.data = new Map();
		this.indexMaps = {};
		for (const index of [...this.indexes, ...this.multiEntryIndexes]) {
			this.indexMaps[index] = new Map();
		}

		this.observer = new NotificationManager<T[Pk] | undefined>(collectionName);
		this.batchOperationInProgress = false;
	}

	where<K extends keyof T>(field: K): WhereStage<T, K>;
	where<K extends NestedKeyOf<T>>(field: K): WhereStageNested<T, K>;
	where(criteria: Criteria<T>): ExecutableStage<T>;
	where(
		criteriaOrField: Criteria<T> | keyof T | NestedKeyOf<T>
	): WhereStage<T> | WhereStageNested<T, any> | ExecutableStage<T> {
		return new Query<T, Pk>(this, criteriaOrField);
	}

	put(document: T): T[Pk] {
		const primaryVal = document[this.primaryKey];

		assert(
			isPrimitive(primaryVal),
			`Ramify: Primary key "${String(this.primaryKey)}" must be a primitive value (string, number, boolean, Date). Got ${typeof primaryVal}.`
		);

		this.delete(document[this.primaryKey]); // Delete existing document
		this.data.set(document[this.primaryKey], document); // Add to primary Map
		for (const index of [...this.indexes, ...this.multiEntryIndexes]) {
			this.addToIndex(index, document); // Add to index Map
		}

		if (!this.batchOperationInProgress) this.observer.notify('create', [primaryVal]);
		return primaryVal;
	}

	bulkPut(documents: T[]) {
		this.batchOperationInProgress = true;
		const results = documents.map((document) => this.put(document));
		this.batchOperationInProgress = false;

		this.observer.notify('create', results);
		return results;
	}

	add(document: T) {
		const primaryVal = document[this.primaryKey];
		const existingDocument = this.data.get(primaryVal);
		if (existingDocument)
			throw new Error(
				`Ramify: Document with primary key ${primaryVal as string} already exists in the collection`
			);

		return this.put(document);
	}

	bulkAdd(documents: T[]) {
		this.batchOperationInProgress = true;
		const results = documents.map((document) => this.add(document));
		this.batchOperationInProgress = false;

		this.observer.notify('create', results);
		return results;
	}

	get(primaryVal: T[Pk]): T | undefined {
		const value = this.data.get(primaryVal);
		return value ? createLazyCloneProxy<T>(value) : undefined;
	}

	bulkGet(primaryVals: Array<T[Pk]>): Array<T | undefined> {
		return primaryVals.map((value) => this.get(value));
	}

	toArray(): T[] {
		return [...this.data.values()].map((item) => createLazyCloneProxy<T>(item));
	}

	update(primaryVal: T[Pk], changes: Partial<T>): T[Pk] | undefined {
		const oldData = this.data.get(primaryVal);
		if (!oldData) return;

		const newData = Object.assign(oldData, changes); // Update the data through reference.

		const isPrimaryKeyUpdate = changes[this.primaryKey] !== undefined;
		const isIndexUpdate = Object.keys(changes).some(
			(key) => this.indexes.includes(key) || this.multiEntryIndexes.includes(key)
		);

		// If the primary key or index is updated, delete the old document and add the new one.
		if (isPrimaryKeyUpdate || isIndexUpdate) {
			this.delete(primaryVal);
			this.put(newData);
		}

		if (!this.batchOperationInProgress) this.observer.notify('update', [primaryVal]);
		return primaryVal;
	}

	bulkUpdate(keys: Array<T[Pk]>, changes: Partial<T>): Array<T[Pk] | undefined> {
		this.batchOperationInProgress = true;
		const results = keys.map((key) => this.update(key, changes));
		this.batchOperationInProgress = false;

		this.observer.notify('update', results);
		return results;
	}

	delete(primaryVal: T[Pk]): T[Pk] | undefined {
		const document = this.data.get(primaryVal);
		if (!document) return;

		this.data.delete(primaryVal); // Delete from primary Map
		for (const index of [...this.indexes, ...this.multiEntryIndexes]) {
			this.removeFromIndex(index, document); // Delete from index Map
		}

		if (!this.batchOperationInProgress) this.observer.notify('delete', [primaryVal]);
		return primaryVal;
	}

	bulkDelete(primaryVals: Array<T[Pk]>): Array<T[Pk] | undefined> {
		this.batchOperationInProgress = true;
		const results = primaryVals.map((value) => this.delete(value));
		this.batchOperationInProgress = false;

		this.observer.notify('delete', results);
		return results;
	}

	clear(): void {
		this.data.clear(); // Clear the primary Map
		for (const index of [...this.indexes, ...this.multiEntryIndexes])
			this.indexMaps[index]?.clear(); // Clear the index Map
		this.observer.notify('clear', []);
	}

	count(): number {
		return this.data.size;
	}

	keys(): Array<T[Pk]> {
		return [...this.data.keys()];
	}

	has(primaryVal: T[Pk]): boolean {
		return this.data.has(primaryVal);
	}

	filter(callback: (document: T) => boolean): ExecutableStage<T> {
		return new Query<T, Pk>(this, {}).filter((element: T) => callback(element));
	}

	each(callback: (document: T) => void): void {
		this.toArray().forEach((element) => callback(element));
	}

	orderBy(field: keyof T): OrderableStage<T> {
		return new Query<T, Pk>(this, {}).orderBy(field);
	}

	limit(count: number): LimitedStage<T> {
		return new Query<T, Pk>(this, {}).limit(count);
	}

	offset(count: number): LimitedStage<T> {
		return new Query<T, Pk>(this, {}).offset(count);
	}

	subscribe(cb: Observer<T[Pk] | undefined>) {
		return this.observer.subscribe(cb);
	}

	unsubscribe(cb: Observer<T[Pk] | undefined>) {
		return this.observer.unsubscribe(cb);
	}

	private addToIndex(index: string, document: T): void {
		const value = getNestedValue(document as unknown as Record<string, unknown>, index);
		const indexMap = this.indexMaps[index];
		if (!indexMap) return;

		// Validate index values
		if (this.multiEntryIndexes.includes(index) && Array.isArray(value)) {
			// Validate each array element is primitive
			for (const entry of value) {
				assert(
					isPrimitive(entry),
					`Ramify: multiEntry index "${index}" array elements must be primitive values (string, number, boolean, Date). Got ${typeof entry}.`
				);
				this.addToMap(indexMap, entry, document);
			}
		} else {
			// Regular indexes must have primitive values
			assert(
				isPrimitive(value),
				`Ramify: Index "${index}" must be a primitive value (string, number, boolean, Date). Got ${typeof value}.`
			);
			this.addToMap(indexMap, value, document);
		}
	}

	private removeFromIndex(index: string, document: T): void {
		const value = getNestedValue(document as unknown as Record<string, unknown>, index);
		const indexMap = this.indexMaps[index];
		if (!indexMap) return;

		if (this.multiEntryIndexes.includes(index) && Array.isArray(value)) {
			for (const entry of value) this.removeFromMap(indexMap, entry, document);
		} else {
			this.removeFromMap(indexMap, value, document);
		}
	}

	private addToMap<V extends { [K in keyof T]: T[K] }>(
		indexMap: Map<unknown, Map<unknown, V>>,
		field: unknown,
		document: V
	): void {
		const documentsMap = indexMap.get(field) || new Map<unknown, V>();
		documentsMap.set(document[this.primaryKey], document);
		indexMap.set(field, documentsMap);
	}

	private removeFromMap<V extends { [K in keyof T]: T[K] }>(
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
