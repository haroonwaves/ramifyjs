/**
 * Normalizes a key or index value for Map storage and lookup.
 * Specifically converts Date instances to their millisecond timestamps
 * so that distinct Date instances with the same value compare equally under SameValueZero.
 */
export function normalizeKey<T = unknown>(val: T): T | number {
	if (val instanceof Date) {
		return val.getTime();
	}
	return val;
}
