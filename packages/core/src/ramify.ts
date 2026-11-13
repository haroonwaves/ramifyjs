import { Collection } from '@/collection.js';
import type { Schema } from '@/types';

type ExtractDoc<T> = T extends Schema<infer U, any> ? U : never;
type ExtractPK<T> = T extends Schema<any, infer PK> ? PK : never;

export type Store<S extends { [K in keyof S]: Schema<any, any> }> = {
	[K in keyof S]: Collection<ExtractDoc<S[K]>, ExtractPK<S[K]>>;
} & {
	delete(): void;
};

class RamifyStore<S extends { [K in keyof S]: Schema<any, any> }> {
	#collections: { [K in keyof S]?: Collection<any, any> } = {};

	constructor(storeDefinition: S) {
		const entries = Object.entries(storeDefinition) as Array<[keyof S, Schema<any, any>]>;

		for (const [collectionName, schema] of entries) {
			const collection = new Collection(collectionName as string, schema);
			this.#collections[collectionName] = collection;

			Object.defineProperty(this, collectionName, {
				value: collection,
				enumerable: true,
			});
		}
	}

	delete() {
		for (const collection of Object.values(this.#collections)) {
			if (collection) {
				(collection as any).clearObservers?.();
				(collection as any).clear?.();
			}
		}
		this.#collections = {};
	}
}

export class Ramify<T = any> {
	#collections: { [K in keyof T]?: Collection<T[K], any> } = {};

	constructor() {
		this.#collections = {};
	}

	static createStore<S extends { [K in keyof S]: Schema<any, any> }>(storeDefinition: S): Store<S> {
		return new RamifyStore(storeDefinition) as unknown as Store<S>;
	}

	// Infer document type U and primary key PK from each CollectionSchema in S
	createStore<S extends { [K in keyof S]: Schema<any, any> }>(storeDefinition: S): Store<S> {
		return new RamifyStore(storeDefinition) as unknown as Store<S>;
	}

	delete() {
		for (const collection of Object.values(this.#collections)) {
			if (collection) {
				(collection as any).clearObservers?.();
				(collection as any).clear?.();
			}
		}
		this.#collections = {};
	}
}
