export function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
	return path
		.split('.')
		.reduce<unknown>((acc, part) => (acc as Record<string, unknown>)?.[part], obj);
}
