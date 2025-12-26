// Helper type to generate all possible nested paths from a type
// e.g., for { child: { name: string } }, generates "child" | "child.name"
export type NestedKeyOf<T> = {
	[K in keyof T & string]: T[K] extends Array<any>
		? K // Don't traverse into arrays
		: T[K] extends object
			? T[K] extends Date
				? K // Don't traverse into Date objects
				: K | `${K}.${NestedKeyOf<T[K]>}`
			: K;
}[keyof T & string];

// Helper type to extract the type from a nested path
// e.g., GetNestedType<User, 'child.age'> returns number
export type GetNestedType<T, Path extends string> = Path extends keyof T
	? T[Path]
	: Path extends `${infer K}.${infer Rest}`
		? K extends keyof T
			? GetNestedType<T[K], Rest>
			: never
		: never;

export type Schema<T, PK extends keyof T = keyof T> = {
	primaryKey: PK;
	indexes?: Array<NestedKeyOf<T>>;
	multiEntry?: Array<NestedKeyOf<T>>;
};
