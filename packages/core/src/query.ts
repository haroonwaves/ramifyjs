import { Collection } from '@/collection.js';
import type {
	Criteria,
	ExecutableStage,
	LimitedStage,
	NestedKeyOf,
	OrderableStage,
	WhereStage,
	WhereStageNested,
} from '@/types';
import { getNestedValue } from '@/utils/getNestedValue';
import { createLazyCloneProxy } from '@/utils/lazyCloneProxy.js';

/**
 * whereCriteria (Object): always perform exact query
 * whereStage (String)
  - $equals (Any): perform exact query
  - $anyOf (Array): perform inexact query
  - $allOf (Array): perform inexact query
 **/

type WhereStageOperator = {
	$anyOf?: any[];
	$equals?: any;
	$allOf?: any[];
};

export class Query<T = any, PK extends keyof T = keyof T>
	implements ExecutableStage<T>, WhereStage<T>, WhereStageNested<T, any>
{
	private results: T[] | null = null;
	private orderField: keyof T | null = null;
	private orderDirection: 'asc' | 'desc' = 'asc';
	private limitCount: number | null = null;
	private offsetCount: number = 0;
	private whereStage: [Extract<keyof T, string>, WhereStageOperator] | null = null;
	private isExact: boolean = true;

	readonly collection: Collection<T, PK>;
	readonly criteria: Criteria<T>;

	constructor(collection: Collection<T, PK>, criteria: Criteria<T> | keyof T | NestedKeyOf<T>) {
		this.collection = collection;
		this.criteria = typeof criteria === 'object' ? criteria : ({} as Criteria<T>);
		this.orderField = null;
		this.orderDirection = 'asc';
		this.limitCount = null;
		this.offsetCount = 0;

		if (typeof criteria === 'string') {
			const criteriaStr = criteria;
			if (
				criteriaStr !== String(this.collection.primaryKey) &&
				!this.collection.indexes.includes(criteriaStr) &&
				!this.collection.multiEntryIndexes.includes(criteriaStr)
			) {
				throw new Error('Ramify: The field is not a primary key or an index');
			}
			this.whereStage = [criteriaStr as Extract<keyof T, string>, {}];
			this.criteria = {} as Criteria<T>;
		}
	}

	anyOf(values: any[]): ExecutableStage<T> {
		if (this.whereStage) {
			const [, operator] = this.whereStage;
			operator.$anyOf = values;
		}
		return this as ExecutableStage<T>;
	}

	allOf(values: any[]): ExecutableStage<T> {
		if (this.whereStage) {
			const [, operator] = this.whereStage;
			operator.$allOf = values;
		}
		return this as ExecutableStage<T>;
	}

	equals(value: any): ExecutableStage<T> {
		if (this.whereStage) {
			const [, operator] = this.whereStage;
			operator.$equals = value;
		}
		return this as ExecutableStage<T>;
	}

	first(): T | undefined {
		if (!this.results) this.execute();
		return this.results?.length ? createLazyCloneProxy<T>(this.results[0]) : undefined;
	}

	last(): T | undefined {
		if (!this.results) this.execute();
		return this.results?.length ? createLazyCloneProxy<T>(this.results.at(-1) as T) : undefined;
	}

	toArray(): T[] {
		if (!this.results) this.execute();
		return this.results?.map((document) => createLazyCloneProxy<T>(document)) || [];
	}

	modify(changes: Partial<T>): (T[PK] | undefined)[] {
		if (!this.results) this.execute();

		this.collection.batchOperationInProgress = true;
		const keys: T[PK][] = [];
		const results = (this.results || []).map((document) => {
			const key = document[this.collection.primaryKey];
			keys.push(key as T[PK]);
			return this.collection.update(key, changes);
		});
		this.collection.batchOperationInProgress = false;

		(this.collection as any).observer.notify('update', keys);
		return results;
	}

	delete(): Array<T[PK] | undefined> {
		if (!this.results) this.execute();

		this.collection.batchOperationInProgress = true;
		const keys: T[PK][] = [];
		const results = (this.results || []).map((document) => {
			const key = document[this.collection.primaryKey];
			keys.push(key as T[PK]);
			return this.collection.delete(key);
		});
		this.collection.batchOperationInProgress = false;

		(this.collection as any).observer.notify('delete', keys);
		return results;
	}

	sortBy(field: keyof T): OrderableStage<T> {
		this.orderField = field;
		return this;
	}

	reverse(): OrderableStage<T> {
		this.orderDirection = 'desc';
		return this;
	}

	limit(count: number): LimitedStage<T> {
		this.limitCount = count;
		return this;
	}

	offset(count: number): LimitedStage<T> {
		this.offsetCount = count;
		return this;
	}

	filter(callback: (document: T) => boolean): ExecutableStage<T> {
		if (!this.results) this.execute();
		this.results = (this.results || []).filter((element) => callback(element));
		return this;
	}

	each(callback: (document: T) => void): void {
		if (!this.results) this.execute();
		(this.results || []).forEach((element) => callback(element));
	}

	count(): number {
		if (!this.results) this.execute();
		return this.results?.length || 0;
	}

	private execute(): void {
		const {
			criteria,
			collection,
			orderField,
			orderDirection,
			offsetCount,
			limitCount,
			whereStage,
		} = this;

		let documents: T[] = [];

		const hasWhereStage = whereStage !== null;
		const fields = hasWhereStage ? [whereStage[0]] : Object.keys(criteria as object);

		const primaryKey = fields.find((field) => field === String(collection.primaryKey));
		const indexes = fields.filter(
			(field) => collection.indexes.includes(field) || collection.multiEntryIndexes.includes(field)
		);

		this.isExact = !hasWhereStage || whereStage?.[1].$equals;

		if (primaryKey) {
			documents = this.getDocumentsByPrimaryKey(primaryKey); // Query by primary key
		} else if (indexes.length > 0) {
			documents = this.getDocumentsByIndexes(indexes); // Query by indexes
		} else if (Object.keys(criteria as object).length === 0) {
			documents = [...(collection as any).data.values()]; // Query all docs (for collection.filter(callback))
		} else {
			throw new Error('Ramify: No primary key or index fields found for the query');
		}

		if (hasWhereStage) {
			documents = documents.filter((document) => this.matchesWhereStage(document));
		} else if (primaryKey || indexes.length > 0) {
			documents = documents.filter((document) => this.matchesCriteria(document));
		}

		if (orderField) {
			documents.sort((a, b) => {
				const aValue = a[orderField];
				const bValue = b[orderField];
				if (aValue < bValue) return orderDirection === 'asc' ? -1 : 1;
				if (aValue > bValue) return orderDirection === 'asc' ? 1 : -1;
				return 0;
			});
		}

		if (offsetCount) documents = documents.slice(offsetCount);
		if (limitCount !== null) documents = documents.slice(0, limitCount);

		this.results = documents;
	}

	private getDocumentsByPrimaryKey(primaryKey: string): T[] {
		const documents: T[] = [];
		const key = this.getFieldValue(primaryKey);
		const data = (this.collection as any).data;

		if (Array.isArray(key)) {
			for (const value of key as T[PK][]) {
				const document = data.get(value) as T;
				if (document) documents.push(document);
			}
		} else if (key !== undefined) {
			const document = data.get(key as T[PK]) as T;
			if (document) documents.push(document);
		}

		return documents;
	}

	private getDocumentsByIndexes(indexes: string[]): T[] {
		const smallestMap = this.findSmallestMatchingMap(indexes);
		if (!smallestMap) return [];
		return [...smallestMap.values()];
	}

	private findSmallestMatchingMap(indexes: string[]): Map<any, T> | null {
		let smallestMap: Map<any, T> | null = null;

		for (const index of indexes) {
			const indexValue = this.getFieldValue(index);
			if (indexValue === undefined) continue;

			const currentMap = this.getMatchingMapForField(index, indexValue);
			if (!currentMap) continue;
			if (!smallestMap || currentMap.size < smallestMap.size) smallestMap = currentMap;
		}

		return smallestMap;
	}

	private getMatchingMapForField(index: string, indexValue: any): Map<any, T> {
		const indexMaps = (this.collection as any).indexMaps;

		if (Array.isArray(indexValue)) {
			const combinedMap = new Map<any, T>();
			for (const value of indexValue) {
				const matches = indexMaps[index]?.get(value) || new Map();
				for (const [idx, document] of matches) combinedMap.set(idx, document as T);
			}
			return combinedMap;
		}

		return indexMaps[index]?.get(indexValue) || new Map();
	}

	private getFieldValue(field: string): T[keyof T] {
		return this.criteria[field as keyof T] || Object.values(this.whereStage?.[1] || {})[0];
	}

	private matchesCriteria(document: T): boolean {
		return Object.entries(this.criteria as object).every(([field, value]) => {
			const nestedValue = getNestedValue(document as Record<string, unknown>, field);
			return this.compareValues(nestedValue, value, true);
		});
	}

	private compareValues(document: any, criteriaValue: any, isEvery: boolean = false): boolean {
		if (Array.isArray(criteriaValue)) {
			if (Array.isArray(document)) {
				if (isEvery) {
					return (
						(this.isExact ? criteriaValue.length === document.length : true) &&
						criteriaValue.every((v) => document.includes(v))
					);
				}
				return criteriaValue.some((v) => document.includes(v));
			}

			return isEvery ? false : criteriaValue.includes(document);
		}

		if (Array.isArray(document)) return document.includes(criteriaValue);
		return document === criteriaValue;
	}

	private matchesWhereStage(document: T): boolean {
		if (!this.whereStage) return true;
		const [field, operators] = this.whereStage;
		const nestedValue = getNestedValue(document as Record<string, unknown>, field);

		if (operators.$equals && !this.compareValues(nestedValue, operators.$equals, true))
			return false;
		if (operators.$anyOf && !this.compareValues(nestedValue, operators.$anyOf)) return false;
		if (operators.$allOf && !this.compareValues(nestedValue, operators.$allOf, true)) return false;

		return true;
	}
}
