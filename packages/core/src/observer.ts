import { debounce } from './utils/debounce.js';
import type { CollectionOperation } from '@/collection';

export type Observer = (operation: CollectionOperation) => void;

type ObserverMap = {
	[collectionName: string]: Set<Observer>;
};

type CollectionNotifier = {
	[collectionName: string]: ReturnType<typeof debounce>;
};

export class NotificationManager {
	private observers: ObserverMap = {};
	private notifiers: CollectionNotifier = {};
	private collectionName: string;

	constructor(collectionName: string) {
		this.collectionName = collectionName;
		this.observers[this.collectionName] = new Set();
		this.notifiers[this.collectionName] = debounce((operation: unknown) => {
			const observers = this.observers[this.collectionName];
			if (!observers) return;

			for (const obs of observers) obs(operation as CollectionOperation);
		}, 70);
	}

	subscribe(obs: Observer) {
		this.observers[this.collectionName].add(obs);
		return () => this.unsubscribe(obs);
	}

	unsubscribe(obs: Observer) {
		this.observers[this.collectionName].delete(obs);
	}

	notify(operation: CollectionOperation) {
		const notifier = this.notifiers[this.collectionName];
		notifier(operation);
	}
}
