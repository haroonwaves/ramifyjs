import { useState, useEffect } from 'react';

export type Subscribable = {
	subscribe: (cb: () => void | Promise<void>) => () => void;
};

export function useLiveQuery<T>(
	callback: () => T,
	dependencies: { collections: readonly Subscribable[]; others: readonly unknown[] }
) {
	const [result, setResult] = useState<T | null>(null);

	useEffect(() => {
		setResult(callback());

		const unsubscribes = dependencies.collections.map((collection) =>
			collection.subscribe(() => setResult(callback()))
		);

		return () => {
			for (const unsubscribe of unsubscribes) unsubscribe();
		};
		// dependencies.collections, dependencies.others, and callback are intentionally excluded to prevent unnecessary re-renders
		// when the array reference changes but content remains the same
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [...dependencies.collections, ...dependencies.others]);

	return result ?? callback();
}
