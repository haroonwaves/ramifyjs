import type { CollectionOperation } from '@/collection';

export type Observer<Pk = any> = (type: CollectionOperation, keys: Pk[]) => void | Promise<void>;

type ObserverMap<Pk> = {
	[collectionName: string]: Set<Observer<Pk>>;
};

export class NotificationManager<Pk = any> {
	private observers: ObserverMap<Pk> = {};
	private collectionName: string;

	constructor(collectionName: string) {
		this.collectionName = collectionName;
		this.observers[this.collectionName] = new Set();
	}

	subscribe(obs: Observer<Pk>) {
		this.observers[this.collectionName].add(obs);
		return () => this.unsubscribe(obs);
	}

	unsubscribe(obs: Observer<Pk>) {
		this.observers[this.collectionName].delete(obs);
	}

	notify(type: CollectionOperation, keys: Pk[]) {
		const observers = this.observers[this.collectionName];
		if (!observers) return;

		for (const obs of observers) void obs(type, keys);
	}
}
