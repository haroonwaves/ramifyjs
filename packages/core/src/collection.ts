import { NotificationManager, type Observer } from '@/observer.js';
import {
	Query,
	type Criteria,
	type ExecutableStage,
	type LimitedStage,
	type OrderableStage,
	type WhereStage,
} from '@/query.js';
import type { Schema } from '@/types';
import { createLazyCloneProxy } from '@/utils/lazyCloneProxy.js';

export type CollectionOperation = 'create' | 'update' | 'delete' | 'clear';

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

	protected observer: NotificationManager;
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

		this.observer = new NotificationManager(collectionName);
		this.batchOperationInProgress = false;
	}

	where<K extends keyof T>(field: K): WhereStage<T>;
	where(criteria: Criteria<T>): ExecutableStage<T>;
	where(criteriaOrField: Criteria<T> | keyof T): WhereStage<T> | ExecutableStage<T> {
		return new Query<T, Pk>(this, criteriaOrField);
	}

	put(document: T): T[Pk] {
		this.delete(document[this.primaryKey]); // Delete existing document

		this.data.set(document[this.primaryKey], document); // Add to primary Map

		for (const index of [...this.indexes, ...this.multiEntryIndexes])
			this.addToIndex(index, document); // Add to index Map

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
				`Ramify: Document with primary key ${primaryVal as string} already exists in the collection`
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
		const value = this.data.get(primaryVal);
		return value ? createLazyCloneProxy<T>(value) : undefined;
	}

	bulkGet(primaryVals: Array<T[Pk]>): Array<T | undefined> {
		return primaryVals.map((value) => this.get(value));
	}

	toArray(): T[] {
		return [...this.data.values()].map((item) => createLazyCloneProxy<T>(item));
	}

	update(primaryVal: T[Pk], changes: Partial<T>): number {
		const oldData = this.data.get(primaryVal);
		if (!oldData) return 0;

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

		if (!this.batchOperationInProgress) this.observer?.notify('update');
		return 1;
	}

	bulkUpdate(documents: Array<{ key: T[Pk]; changes: Partial<T> }>): number {
		this.batchOperationInProgress = true;
		const results = documents.map(({ key, changes }) => this.update(key, changes));
		this.batchOperationInProgress = false;

		this.observer?.notify('update');
		return results.filter((result) => result === 1).length;
	}

	delete(primaryVal: T[Pk]): T[Pk] | undefined {
		const document = this.data.get(primaryVal);
		if (!document) return;

		this.data.delete(primaryVal); // Delete from primary Map
		for (const index of [...this.indexes, ...this.multiEntryIndexes]) {
			this.removeFromIndex(index, document); // Delete from index Map
		}

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
		this.data.clear(); // Clear the primary Map
		for (const index of [...this.indexes, ...this.multiEntryIndexes])
			this.indexMaps[index]?.clear(); // Clear the index Map
		this.observer?.notify('clear');
	}

	count(): number {
		return this.toArray().length;
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
			for (const entry of value) this.addToMap(indexMap, entry, document);
		} else {
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
