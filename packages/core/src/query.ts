import { Collection } from '@/collection.js';
import { createLazyCloneProxy } from '@/utils/lazyCloneProxy.js';

export type Criteria<T> = {
	[K in keyof T]?: T[K] | T[K][];
};

export type WhereStageOperator = {
	$anyOf?: any[];
	$equals?: any;
	$allOf?: any[];
};

export type WhereStage<T, K extends keyof T = keyof T> = {
	anyOf(values: T[K] extends (infer E)[] ? E[] : T[K][]): ExecutableStage<T>;
	equals(value: T[K] extends (infer E)[] ? E : T[K]): ExecutableStage<T>;
	allOf(values: T[K] extends (infer E)[] ? E[] : T[K][]): ExecutableStage<T>;
};

export type OrderableStage<T> = Omit<ExecutableStage<T>, 'orderBy'> & {
	reverse(): OrderableStage<T>;
};

export type LimitedStage<T> = Omit<ExecutableStage<T>, 'limit' | 'orderBy'>;

export type ExecutableStage<T> = {
	orderBy(field: keyof T): OrderableStage<T>;
	limit(count: number): LimitedStage<T>;
	offset(count: number): LimitedStage<T>;
	filter(callback: (document: T) => boolean): ExecutableStage<T>;
	toArray(): T[];
	first(): T | undefined;
	last(): T | undefined;
	modify(changes: Partial<T>): number;
	delete(): Array<T[keyof T] | undefined>;
	count(): number;
};

function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
	return path
		.split('.')
		.reduce((acc: unknown, part) => (acc as Record<string, unknown>)?.[part], obj);
}

export class Query<T = any, P extends keyof T = keyof T>
	implements ExecutableStage<T>, WhereStage<T>
{
	private results: T[] | null = null;
	private orderField: keyof T | null = null;
	private orderDirection: 'asc' | 'desc' = 'asc';
	private limitCount: number | null = null;
	private offsetCount: number = 0;
	private whereStage: [Extract<keyof T, string>, WhereStageOperator] | null = null;

	readonly collection: Collection<T, P>;
	readonly criteria: Criteria<T>;

	constructor(collection: Collection<T, P>, criteria: Criteria<T> | keyof T) {
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
			const [field, operator] = this.whereStage;
			operator.$anyOf = values;
			this.criteria[field] = values; // For primary/index query matching
		}
		return this as ExecutableStage<T>;
	}

	allOf(values: any[]): ExecutableStage<T> {
		if (this.whereStage) {
			const [field, operator] = this.whereStage;
			operator.$allOf = values;
			this.criteria[field] = values; // For primary/index query matching
		}
		return this as ExecutableStage<T>;
	}

	equals(value: any): ExecutableStage<T> {
		if (this.whereStage) {
			const [field, operator] = this.whereStage;
			operator.$equals = value;
			this.criteria[field] = value; // For primary/index query matching
		}
		return this as ExecutableStage<T>;
	}

	first(): T | undefined {
		if (!this.results) this.execute();
		return this.results?.length ? this.results[0] : undefined;
	}

	last(): T | undefined {
		if (!this.results) this.execute();
		return this.results?.length ? this.results.at(-1) : undefined;
	}

	toArray(): T[] {
		if (!this.results) this.execute();
		return this.results || [];
	}

	modify(changes: Partial<T>): number {
		if (!this.results) this.execute();

		this.collection.batchOperationInProgress = true;
		const results = (this.results || []).map((record) =>
			this.collection.update(record[this.collection.primaryKey], changes)
		);
		this.collection.batchOperationInProgress = false;

		(this.collection as any).observer.notify('update');
		return results.filter((result) => result === 1).length;
	}

	delete(): Array<T[P] | undefined> {
		if (!this.results) this.execute();

		this.collection.batchOperationInProgress = true;
		const results = (this.results || []).map((record) =>
			this.collection.delete(record[this.collection.primaryKey])
		);
		this.collection.batchOperationInProgress = false;

		(this.collection as any).observer.notify('delete');
		return results;
	}

	orderBy(field: keyof T): OrderableStage<T> {
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
		const { criteria, collection, orderField, orderDirection, offsetCount, limitCount } = this;

		let records: T[] = [];

		const primaryField = Object.keys(criteria).find(
			(field) => field === String(collection.primaryKey)
		);
		const indexFields = Object.keys(criteria).filter(
			(field) => collection.indexes.includes(field) || collection.multiEntryIndexes.includes(field)
		);

		const hasWhereStage = this.whereStage !== null;

		if (primaryField) {
			records = this.getRecordsByPrimaryField(primaryField); // Query by primary key
		} else if (indexFields.length > 0) {
			records = this.getRecordsByIndexFields(indexFields); // Query by index fields
		} else if (Object.keys(criteria).length === 0) {
			records = [...(collection as any).data.values()]; // Query all records (for collection.filter(callback))
		} else {
			throw new Error('Ramify: No primary key or index fields found for the query');
		}

		if (hasWhereStage) {
			records = records.filter((record) => this.matchesWhereStage(record));
		} else if ((primaryField || indexFields.length > 0) && Object.keys(criteria).length > 1) {
			records = records.filter((record) => this.matchesCriteria(record));
		}

		if (orderField) {
			records.sort((a, b) => {
				const aValue = a[orderField];
				const bValue = b[orderField];
				if (aValue < bValue) return orderDirection === 'asc' ? -1 : 1;
				if (aValue > bValue) return orderDirection === 'asc' ? 1 : -1;
				return 0;
			});
		}

		if (offsetCount) records = records.slice(offsetCount);
		if (limitCount !== null) records = records.slice(0, limitCount);

		// Wrap results in lazy clone proxies to prevent mutations from affecting stored data
		this.results = records.map((record) => createLazyCloneProxy<T>(record));
	}

	private getRecordsByPrimaryField(primaryField: string): T[] {
		const records: T[] = [];
		const primaryValue = this.criteria[primaryField as keyof T];
		const data = (this.collection as any).data;

		if (Array.isArray(primaryValue)) {
			for (const value of primaryValue as T[P][]) {
				const record = data.get(value) as T;
				if (record) records.push(record);
			}
		} else if (primaryValue !== undefined) {
			const record = data.get(primaryValue as T[P]) as T;
			if (record) records.push(record);
		}

		return records;
	}

	private getRecordsByIndexFields(indexFields: string[]): T[] {
		const smallestMap = this.findSmallestMatchingMap(indexFields);
		if (!smallestMap) return [];
		return [...smallestMap.values()];
	}

	private findSmallestMatchingMap(indexFields: string[]): Map<any, T> | null {
		let smallestMap: Map<any, T> | null = null;

		for (const field of indexFields) {
			const indexValue = this.criteria[field as keyof T];
			if (indexValue === undefined) continue;

			const currentMap = this.getMatchingMapForField(field, indexValue);
			if (!currentMap) continue;
			if (!smallestMap || currentMap.size < smallestMap.size) smallestMap = currentMap;
		}

		return smallestMap;
	}

	private getMatchingMapForField(field: string, indexValue: any): Map<any, T> {
		const indexMaps = (this.collection as any).indexMaps;

		if (Array.isArray(indexValue)) {
			const combinedMap = new Map<any, T>();
			for (const value of indexValue) {
				const matches = indexMaps[field]?.get(value) || new Map();
				for (const [key, record] of matches) combinedMap.set(key, record as T);
			}
			return combinedMap;
		}

		return indexMaps[field]?.get(indexValue) || new Map();
	}

	private matchesCriteria(record: T): boolean {
		return Object.entries(this.criteria).every(([field, value]) => {
			const recordValue = getNestedValue(record as Record<string, unknown>, field);
			return this.compareValues(recordValue, value);
		});
	}

	private compareValues(recordValue: any, criteriaValue: any, isEvery: boolean = false): boolean {
		if (Array.isArray(criteriaValue)) {
			if (Array.isArray(recordValue)) {
				if (isEvery) return criteriaValue.every((v) => recordValue.includes(v));
				return criteriaValue.some((v) => recordValue.includes(v));
			}
			return criteriaValue.includes(recordValue);
		}

		if (Array.isArray(recordValue)) return recordValue.includes(criteriaValue);
		return recordValue === criteriaValue;
	}

	private matchesWhereStage(record: T): boolean {
		if (!this.whereStage) return true;
		const [field, operators] = this.whereStage;
		const recordValue = getNestedValue(record as Record<string, unknown>, field);

		if (operators.$equals && !this.compareValues(recordValue, operators.$equals)) return false;
		if (operators.$anyOf && !this.compareValues(recordValue, operators.$anyOf)) return false;
		if (operators.$allOf && !this.compareValues(recordValue, operators.$allOf, true)) return false;

		return true;
	}
}
