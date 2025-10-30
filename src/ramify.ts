import { Collection, type CollectionSchema } from '@/collection.js';

type StoreSchema<T> = {
	[K in keyof T]: CollectionSchema<T[K]>;
};

export class Ramify<T> {
	#collections: { [K in keyof T]?: Collection<T[K]> } = {};

	constructor() {
		this.#collections = {};
	}

	createStore<S>(storeDefinition: StoreSchema<S>) {
		const ramify = new Ramify<S>();
		const entries = Object.entries(storeDefinition) as Array<
			[keyof S, CollectionSchema<S[keyof S]>]
		>;

		for (const [collectionName, schema] of entries) {
			const collection = new Collection(collectionName as string, schema);
			ramify.#collections[collectionName] = collection;

			Object.defineProperty(ramify, collectionName, {
				value: collection,
				enumerable: true,
			});
		}

		return ramify as Ramify<S> & { [K in keyof S]: Collection<S[K]> };
	}

	delete() {
		for (const collection of Object.values(this.#collections) as Collection<any>[]) {
			collection.clear();
		}
	}
}
