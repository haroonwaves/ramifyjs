import { Collection } from '@/collection.js';
import { createLazyCloneProxy } from '@/utils/lazyCloneProxy.js';

export type Criteria<T> = {
	[K in keyof T]?: T[K] | T[K][];
};

export type RangeOperator = {
	$between?: [number, number];
	$above?: number;
	$below?: number;
	$aboveOrEqual?: number;
	$belowOrEqual?: number;
	$notEquals?: any;
};

export type WhereStage<T> = {
	anyOf(values: T[keyof T][]): ExecutableStage<T>;
	equals(value: T[keyof T]): ExecutableStage<T>;
	notEquals(value: T[keyof T]): ExecutableStage<T>;
	between(lower: number, upper: number): ExecutableStage<T>;
	above(value: number): ExecutableStage<T>;
	below(value: number): ExecutableStage<T>;
	aboveOrEqual(value: number): ExecutableStage<T>;
	belowOrEqual(value: number): ExecutableStage<T>;
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
	private whereField: Extract<keyof T, string> | null = null;
	private orderField: keyof T | null = null;
	private orderDirection: 'asc' | 'desc' = 'asc';
	private limitCount: number | null = null;
	private offsetCount: number = 0;
	private rangeOperators: Map<string, RangeOperator> = new Map();

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
			this.whereField = criteriaStr as Extract<keyof T, string>;
			this.criteria = {} as Criteria<T>;
		}
	}

	anyOf(values: T[keyof T][]): ExecutableStage<T> {
		if (this.whereField)
			this.criteria[this.whereField] = values as Criteria<T>[typeof this.whereField];
		return this as ExecutableStage<T>;
	}

	equals(value: T[keyof T]): ExecutableStage<T> {
		if (this.whereField)
			this.criteria[this.whereField] = value as Criteria<T>[typeof this.whereField];
		return this as ExecutableStage<T>;
	}

	notEquals(value: T[keyof T]): ExecutableStage<T> {
		if (this.whereField) {
			const operator = this.rangeOperators.get(this.whereField) || {};
			operator.$notEquals = value;
			this.rangeOperators.set(this.whereField, operator);
		}
		return this as ExecutableStage<T>;
	}

	between(lower: number, upper: number): ExecutableStage<T> {
		if (this.whereField) {
			const operator = this.rangeOperators.get(this.whereField) || {};
			operator.$between = [lower, upper];
			this.rangeOperators.set(this.whereField, operator);
		}
		return this as ExecutableStage<T>;
	}

	above(value: number): ExecutableStage<T> {
		if (this.whereField) {
			const operator = this.rangeOperators.get(this.whereField) || {};
			operator.$above = value;
			this.rangeOperators.set(this.whereField, operator);
		}
		return this as ExecutableStage<T>;
	}

	below(value: number): ExecutableStage<T> {
		if (this.whereField) {
			const operator = this.rangeOperators.get(this.whereField) || {};
			operator.$below = value;
			this.rangeOperators.set(this.whereField, operator);
		}
		return this as ExecutableStage<T>;
	}

	aboveOrEqual(value: number): ExecutableStage<T> {
		if (this.whereField) {
			const operator = this.rangeOperators.get(this.whereField) || {};
			operator.$aboveOrEqual = value;
			this.rangeOperators.set(this.whereField, operator);
		}
		return this as ExecutableStage<T>;
	}

	belowOrEqual(value: number): ExecutableStage<T> {
		if (this.whereField) {
			const operator = this.rangeOperators.get(this.whereField) || {};
			operator.$belowOrEqual = value;
			this.rangeOperators.set(this.whereField, operator);
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

		const hasRangeOperators = this.rangeOperators.size > 0;

		if (primaryField) {
			records = this.getRecordsByPrimaryField(primaryField); // Query by primary key
		} else if (indexFields.length > 0) {
			records = this.getRecordsByIndexFields(indexFields); // Query by index fields
		} else if (Object.keys(criteria).length === 0) {
			records = [...(collection as any).data.values()]; // Query all records (for collection.filter(callback))
		} else {
			throw new Error('Ramify: No primary key or index fields found for the query');
		}

		if (hasRangeOperators) records = records.filter((record) => this.matchesRangeOperators(record));

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
				if (record && this.matchesCriteria(record)) records.push(record);
			}
		} else if (primaryValue !== undefined) {
			const record = data.get(primaryValue as T[P]) as T;
			if (record && this.matchesCriteria(record)) records.push(record);
		}

		return records;
	}

	private getRecordsByIndexFields(indexFields: string[]): T[] {
		const smallestMap = this.findSmallestMatchingMap(indexFields);
		if (!smallestMap) return [];
		return [...smallestMap.values()].filter((record) => this.matchesCriteria(record));
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
		if (Object.keys(this.criteria).length <= 1) return true;

		return Object.entries(this.criteria).every(([field, value]) => {
			const recordValue = getNestedValue(record as Record<string, unknown>, field);
			const isMultiEntry = this.collection.multiEntryIndexes.includes(field);
			return this.compareValues(recordValue, value, isMultiEntry);
		});
	}

	private compareValues(recordValue: any, criteriaValue: any, isMultiEntry: boolean): boolean {
		if (Array.isArray(criteriaValue)) {
			if (isMultiEntry && Array.isArray(recordValue)) {
				return criteriaValue.some((v) => recordValue.includes(v));
			}
			return criteriaValue.includes(recordValue);
		}

		if (isMultiEntry && Array.isArray(recordValue)) {
			return recordValue.includes(criteriaValue);
		}

		return recordValue === criteriaValue;
	}

	private matchesRangeOperators(record: T): boolean {
		for (const [field, operators] of this.rangeOperators.entries()) {
			const recordValue = getNestedValue(record as Record<string, unknown>, field);

			// Handle notEquals
			if (operators.$notEquals !== undefined) {
				if (recordValue === operators.$notEquals) return false;
			}

			// Range operators require numeric values
			if (typeof recordValue !== 'number') {
				// If any numeric range operator is defined, but the value is not a number, fail
				if (
					operators.$between !== undefined ||
					operators.$above !== undefined ||
					operators.$below !== undefined ||
					operators.$aboveOrEqual !== undefined ||
					operators.$belowOrEqual !== undefined
				) {
					return false;
				}
				continue;
			}

			// Handle between
			if (operators.$between !== undefined) {
				const [lower, upper] = operators.$between;
				if (recordValue < lower || recordValue > upper) return false;
			}

			// Handle above
			if (operators.$above !== undefined) {
				if (recordValue <= operators.$above) return false;
			}

			// Handle below
			if (operators.$below !== undefined) {
				if (recordValue >= operators.$below) return false;
			}

			// Handle aboveOrEqual
			if (operators.$aboveOrEqual !== undefined) {
				if (recordValue < operators.$aboveOrEqual) return false;
			}

			// Handle belowOrEqual
			if (operators.$belowOrEqual !== undefined) {
				if (recordValue > operators.$belowOrEqual) return false;
			}
		}

		return true;
	}
}
