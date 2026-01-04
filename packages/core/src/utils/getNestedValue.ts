export function getNestedValue(obj: Record<string, unknown>, field: string): unknown {
	if (!field) return obj;
	return field
		.split('.')
		.reduce<unknown>((acc, part) => (acc as Record<string, unknown>)?.[part], obj);
}
