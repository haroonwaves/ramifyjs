import { Collection, type CollectionSchema } from '@/collection.js';

type StoreDefinition<T extends Record<string, any>> = {
	[K in keyof T]: CollectionSchema<T[K], keyof T[K]>;
};

export class Ramify<T> {
	#collections: { [K in keyof T]?: Collection<T[K], any> } = {};

	constructor() {
		this.#collections = {};
	}

	createStore<T extends Record<string, any>>(storeDefinition: StoreDefinition<T>) {
		const ramify = new Ramify<T>();
		const entries = Object.entries(storeDefinition) as Array<
			[keyof T, CollectionSchema<T[keyof T], any>]
		>;

		for (const [collectionName, schema] of entries) {
			const collection = new Collection(collectionName as string, schema);
			ramify.#collections[collectionName] = collection as any;

			Object.defineProperty(ramify, collectionName, {
				value: collection,
				enumerable: true,
			});
		}

		return ramify as Ramify<T> & {
			[K in keyof T]: Collection<T[K], T[K]['primaryKey']>;
		};
	}

	delete() {
		for (const collection of Object.values(this.#collections) as Collection<any>[]) {
			collection.clear();
		}
	}
}
