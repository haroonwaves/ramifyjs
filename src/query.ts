import { Collection } from '@/collection.js';

export type Criteria<T> = {
	[K in keyof T]?: T[K] | T[K][];
};

type OrderDirection = 'asc' | 'desc';

function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
	return path
		.split('.')
		.reduce((acc: unknown, part) => (acc as Record<string, unknown>)?.[part], obj);
}

export class Query<T = any, P extends keyof T = keyof T> {
	private results: T[] | null = null;
	private whereField: Extract<keyof T, string> | null = null;
	private orderField: keyof T | null = null;
	private orderDirection: OrderDirection = 'asc';
	private limitCount: number | null = null;
	private offsetCount: number = 0;

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

	anyOf(values: T[keyof T][]): this {
		if (this.whereField)
			this.criteria[this.whereField] = values as Criteria<T>[typeof this.whereField];
		return this;
	}

	equals(value: T[keyof T]): this {
		if (this.whereField)
			this.criteria[this.whereField] = value as Criteria<T>[typeof this.whereField];
		return this;
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

	modify(changes: Partial<T>): T[] {
		if (!this.results) this.execute();

		this.collection.batchOperationInProgress = true;
		const results = (this.results || []).map((record) =>
			this.collection.update(record[this.collection.primaryKey], changes)
		);
		this.collection.batchOperationInProgress = false;

		(this.collection as any).observer.notify('update');
		return results;
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

	orderBy(field: keyof T): this {
		this.orderField = field;
		return this;
	}

	reverse(): this {
		this.orderDirection = 'desc';
		return this;
	}

	limit(count: number): this {
		this.limitCount = count;
		return this;
	}

	offset(count: number): this {
		this.offsetCount = count;
		return this;
	}

	filter(callback: (document: T) => boolean): this {
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

		if (primaryField) {
			records = this.getRecordsByPrimaryField(primaryField); // Query by primary key
		} else if (indexFields.length > 0) {
			records = this.getRecordsByIndexFields(indexFields); // Query by index fields
		} else if (Object.keys(criteria).length === 0) {
			records = collection.toArray(); // Query all records (for collection.filter(callback))
		} else {
			throw new Error('Ramify: No primary key or index fields found for the query');
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

		this.results = records;
	}

	private getRecordsByPrimaryField(primaryField: string): T[] {
		const records: T[] = [];
		const primaryValue = this.criteria[primaryField as keyof T];

		if (Array.isArray(primaryValue)) {
			for (const value of primaryValue as T[P][]) {
				const record = this.collection.get(value);
				if (record && this.matchesCriteria(record)) records.push(record);
			}
		} else if (primaryValue !== undefined) {
			const record = this.collection.get(primaryValue as T[P]);
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
}
