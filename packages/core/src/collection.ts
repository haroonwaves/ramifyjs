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
import { normalizeKey } from '@/utils/normalizeKey.js';
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
		const rawKey = document[this.primaryKey];

		assert(
			isPrimitive(rawKey),
			`Ramify: Primary key "${String(this.primaryKey)}" must be a primitive value (string, number, boolean, Date). Got ${typeof rawKey}.`
		);

		const key = normalizeKey(rawKey);
		const exists = this.data.has(key);

		if (exists) {
			const oldDoc = this.data.get(key)!;
			for (const index of [...this.indexes, ...this.multiEntryIndexes]) {
				this.removeFromIndex(index, oldDoc);
			}
		}

		this.data.set(key, document); // Add to primary Map
		for (const index of [...this.indexes, ...this.multiEntryIndexes]) {
			this.addToIndex(index, document); // Add to index Map
		}

		if (!this.batchOperationInProgress) {
			this.observer.notify(exists ? 'update' : 'create', [rawKey]);
		}
		return rawKey;
	}

	bulkPut(documents: T[]) {
		this.batchOperationInProgress = true;
		const createdKeys: T[Pk][] = [];
		const updatedKeys: T[Pk][] = [];
		const results: T[Pk][] = [];

		for (const document of documents) {
			const rawKey = document[this.primaryKey];
			const exists = this.has(rawKey);
			this.put(document);
			results.push(rawKey);
			if (exists) {
				updatedKeys.push(rawKey);
			} else {
				createdKeys.push(rawKey);
			}
		}
		this.batchOperationInProgress = false;

		if (createdKeys.length > 0) this.observer.notify('create', createdKeys);
		if (updatedKeys.length > 0) this.observer.notify('update', updatedKeys);
		return results;
	}

	add(document: T) {
		const key = document[this.primaryKey];
		const exists = this.has(key);
		if (exists)
			throw new Error(
				`Ramify: Document with primary key ${key as string} already exists in the collection`
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

	get(key: T[Pk]): T | undefined {
		const value = this.data.get(normalizeKey(key));
		return value ? createLazyCloneProxy<T>(value) : undefined;
	}

	bulkGet(keys: Array<T[Pk]>): Array<T | undefined> {
		return keys.map((key) => this.get(key));
	}

	toArray(): T[] {
		return [...this.data.values()].map((item) => createLazyCloneProxy<T>(item));
	}

	update(key: T[Pk], changes: Partial<T>): T[Pk] | undefined {
		const normKey = normalizeKey(key);
		const oldData = this.data.get(normKey);
		if (!oldData) return;

		const isPrimaryKeyUpdate =
			changes[this.primaryKey] !== undefined && normalizeKey(changes[this.primaryKey]) !== normKey;

		const allIndexes = [...this.indexes, ...this.multiEntryIndexes];

		const affectedIndexes = isPrimaryKeyUpdate
			? allIndexes
			: allIndexes.filter((idx) => {
					const rootField = idx.split('.')[0];
					return rootField in changes;
				});

		for (const idx of affectedIndexes) {
			this.removeFromIndex(idx, oldData);
		}

		if (isPrimaryKeyUpdate) {
			this.data.delete(normKey);
		}

		Object.assign(oldData, changes);

		const returnKey = isPrimaryKeyUpdate ? (changes[this.primaryKey] as T[Pk]) : key;
		if (isPrimaryKeyUpdate) {
			this.data.set(normalizeKey(returnKey), oldData);
		}

		for (const idx of affectedIndexes) {
			this.addToIndex(idx, oldData);
		}

		if (!this.batchOperationInProgress) this.observer.notify('update', [returnKey]);
		return returnKey;
	}

	bulkUpdate(keys: Array<T[Pk]>, changes: Partial<T>): Array<T[Pk] | undefined> {
		this.batchOperationInProgress = true;
		const results = keys.map((key) => this.update(key, changes));
		this.batchOperationInProgress = false;

		const updatedKeys = results.filter((k): k is T[Pk] => k !== undefined);
		if (updatedKeys.length > 0) {
			this.observer.notify('update', updatedKeys);
		}
		return results;
	}

	delete(key: T[Pk]): T[Pk] | undefined {
		const normKey = normalizeKey(key);
		const document = this.data.get(normKey);
		if (!document) return;

		this.data.delete(normKey); // Delete from primary Map
		for (const index of [...this.indexes, ...this.multiEntryIndexes]) {
			this.removeFromIndex(index, document); // Delete from index Map
		}

		if (!this.batchOperationInProgress) this.observer.notify('delete', [key]);
		return key;
	}

	bulkDelete(keys: Array<T[Pk]>): Array<T[Pk] | undefined> {
		this.batchOperationInProgress = true;
		const results = keys.map((key) => this.delete(key));
		this.batchOperationInProgress = false;

		const deletedKeys = results.filter((k): k is T[Pk] => k !== undefined);
		if (deletedKeys.length > 0) {
			this.observer.notify('delete', deletedKeys);
		}
		return results;
	}

	clear(): void {
		this.data.clear(); // Clear the primary Map
		for (const index of [...this.indexes, ...this.multiEntryIndexes])
			this.indexMaps[index]?.clear(); // Clear the index Map
		this.observer.notify('clear', []);
	}

	clearObservers(): void {
		this.observer.clear();
	}

	count(): number {
		return this.data.size;
	}

	keys(): Array<T[Pk]> {
		return [...this.data.values()].map((doc) => doc[this.primaryKey]);
	}

	has(key: T[Pk]): boolean {
		return this.data.has(normalizeKey(key));
	}

	filter(callback: (document: T) => boolean): ExecutableStage<T> {
		return new Query<T, Pk>(this, {}).filter((element: T) => callback(element));
	}

	each(callback: (document: T) => void): void {
		this.toArray().forEach((element) => callback(element));
	}

	sortBy(field: keyof T): OrderableStage<T> {
		return new Query<T, Pk>(this, {}).sortBy(field);
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
		const normField = normalizeKey(field);
		const normPk = normalizeKey(document[this.primaryKey]);
		const documentsMap = indexMap.get(normField) || new Map<unknown, V>();
		documentsMap.set(normPk, document);
		indexMap.set(normField, documentsMap);
	}

	private removeFromMap<V extends { [K in keyof T]: T[K] }>(
		indexMap: Map<unknown, Map<unknown, V>>,
		field: unknown,
		document: V
	): void {
		const normField = normalizeKey(field);
		const normPk = normalizeKey(document[this.primaryKey]);
		const documentsMap = indexMap.get(normField);
		if (documentsMap) {
			documentsMap.delete(normPk);
			if (documentsMap.size === 0) indexMap.delete(normField);
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
