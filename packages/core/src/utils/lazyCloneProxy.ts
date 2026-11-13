/**
 * Creates a Proxy that lazily clones the object only when it's modified.
 * This ensures mutations don't affect the stored data while only cloning when needed.
 */

interface LazyProxyState<T> {
	original: T;
	cloned: T | null;
	ensureCloned: () => T;
	proxyCache: Map<string, object>;
}

const MUTATING_ARRAY_METHODS = new Set([
	'push',
	'pop',
	'shift',
	'unshift',
	'splice',
	'sort',
	'reverse',
	'fill',
	'copyWithin',
]);

function getTargetAtPath(state: LazyProxyState<unknown>, path: PropertyKey[]): object {
	let curr: unknown = state.cloned !== null ? state.cloned : state.original;
	for (const seg of path) {
		if (curr == null) return {};
		curr = (curr as Record<PropertyKey, unknown>)[seg];
	}
	return (curr ?? {}) as object;
}

function createProxyAtPath<T extends object>(
	state: LazyProxyState<unknown>,
	path: PropertyKey[]
): T {
	const cacheKey = path.map(String).join('\0');
	const existing = state.proxyCache.get(cacheKey);
	if (existing) return existing as T;

	const initialTarget = getTargetAtPath(state, path);

	const proxy = new Proxy(initialTarget, {
		get(_, prop) {
			const target = getTargetAtPath(state, path);

			if (Array.isArray(target) && MUTATING_ARRAY_METHODS.has(prop as string)) {
				return (...args: unknown[]) => {
					state.ensureCloned();
					const arr = getTargetAtPath(state, path);
					return (Array.prototype as unknown as Record<string, (...a: unknown[]) => unknown>)[
						prop as string
					].apply(arr, args);
				};
			}

			const value = Reflect.get(target, prop);

			if (
				state.cloned === null &&
				value !== null &&
				typeof value === 'object' &&
				!(value instanceof Date) &&
				!(value instanceof RegExp)
			) {
				return createProxyAtPath(state, [...path, prop]);
			}

			return value;
		},

		set(_, prop, value) {
			state.ensureCloned();
			const target = getTargetAtPath(state, path);
			return Reflect.set(target, prop, value);
		},

		has(_, prop) {
			const target = getTargetAtPath(state, path);
			return Reflect.has(target, prop);
		},

		ownKeys() {
			const target = getTargetAtPath(state, path);
			return Reflect.ownKeys(target);
		},

		getOwnPropertyDescriptor(_, prop) {
			const target = getTargetAtPath(state, path);
			return Reflect.getOwnPropertyDescriptor(target, prop);
		},

		defineProperty(_, prop, descriptor) {
			state.ensureCloned();
			const target = getTargetAtPath(state, path);
			return Reflect.defineProperty(target, prop, descriptor);
		},

		deleteProperty(_, prop) {
			state.ensureCloned();
			const target = getTargetAtPath(state, path);
			return Reflect.deleteProperty(target, prop);
		},
	}) as T;

	state.proxyCache.set(cacheKey, proxy);
	return proxy;
}

export function createLazyCloneProxy<T>(original: T): T {
	if (
		original === null ||
		typeof original !== 'object' ||
		original instanceof Date ||
		original instanceof RegExp
	) {
		return original;
	}

	const state: LazyProxyState<T> = {
		original,
		cloned: null,
		ensureCloned() {
			if (this.cloned === null) {
				this.cloned = structuredClone(this.original);
			}
			return this.cloned;
		},
		proxyCache: new Map(),
	};

	return createProxyAtPath<T & object>(state as LazyProxyState<unknown>, []);
}
