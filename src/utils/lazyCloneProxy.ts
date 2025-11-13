/**
 * Creates a Proxy that lazily clones the object only when it's modified.
 * This ensures mutations don't affect the stored data while only cloning when needed.
 */
export function createLazyCloneProxy<T>(original: T): T {
	let cloned: T | null = null;
	const isCloned = () => cloned !== null;

	const ensureCloned = () => {
		if (cloned === null) cloned = structuredClone(original);
	};

	const getTarget = () => (isCloned() ? cloned : original) as object;

	return new Proxy(original as object, {
		get(_, prop, receiver) {
			const target = getTarget();
			const value = Reflect.get(target, prop, receiver);
			// If the value is an object/array, wrap it in a proxy too to prevent nested mutations
			// But only if we haven't cloned yet (to avoid double-wrapping)
			if (
				!isCloned() &&
				value !== null &&
				typeof value === 'object' &&
				!(value instanceof Date) &&
				!(value instanceof RegExp)
			) {
				return createLazyCloneProxy(value);
			}
			return value;
		},
		set(_, prop, value, receiver) {
			ensureCloned(); // Clone on first write
			const result = Reflect.set(cloned as object, prop, value, receiver);
			// Return true to indicate the property was set successfully
			return result;
		},
		has(_, prop) {
			const target = getTarget();
			return Reflect.has(target, prop);
		},
		ownKeys() {
			const target = getTarget();
			return Reflect.ownKeys(target);
		},
		getOwnPropertyDescriptor(_, prop) {
			const target = getTarget();
			return Reflect.getOwnPropertyDescriptor(target, prop);
		},
		defineProperty(_, prop, descriptor) {
			ensureCloned(); // Clone on first write
			return Reflect.defineProperty(cloned as object, prop, descriptor);
		},
		deleteProperty(_, prop) {
			ensureCloned(); // Clone on first write
			return Reflect.deleteProperty(cloned as object, prop);
		},
	}) as T;
}
