import { Collection, type Schema } from '@/collection.js';

export class Ramify<T> {
	#collections: { [K in keyof T]?: Collection<T[K], any> } = {};

	constructor() {
		this.#collections = {};
	}

	// New createStore: infer document type U and primary key PK from each CollectionSchema in S
	createStore<S extends { [K in keyof S]: Schema<any, any> }>(storeDefinition: S) {
		type ExtractDoc<T> = T extends Schema<infer U, any> ? U : never;
		type ExtractPK<T> = T extends Schema<any, infer PK> ? PK : never;

		const ramify = new Ramify<{ [K in keyof S]: ExtractDoc<S[K]> }>();

		const entries = Object.entries(storeDefinition) as Array<[keyof S, Schema<any, any>]>;

		for (const [collectionName, schema] of entries) {
			const collection = new Collection(collectionName as string, schema);
			(ramify as any).#collections[collectionName] = collection;

			Object.defineProperty(ramify, collectionName, {
				value: collection,
				enumerable: true,
			});
		}

		return ramify as Ramify<{ [K in keyof S]: ExtractDoc<S[K]> }> & {
			[K in keyof S]: Collection<ExtractDoc<S[K]>, ExtractPK<S[K]>>;
		};
	}

	delete() {
		for (const collection of Object.values(this.#collections) as Collection<any>[]) {
			collection.clear();
		}
	}
}
