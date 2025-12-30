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

// Query-related types
// Support both direct keys and nested paths in criteria
export type Criteria<T> = {
	[K in keyof T]?: T[K];
} & {
	[K in NestedKeyOf<T>]?: K extends keyof T ? T[K] : GetNestedType<T, K>;
};

export type WhereStage<T, K extends keyof T = keyof T> = {
	anyOf(values: T[K] extends (infer E)[] ? E[] : T[K][]): ExecutableStage<T>;
	equals(value: T[K]): ExecutableStage<T>;
	allOf(values: T[K] extends (infer E)[] ? E[] : T[K][]): ExecutableStage<T>;
};

// Overload for nested paths using string
export type WhereStageNested<T, Path extends string> = {
	anyOf(
		values: GetNestedType<T, Path> extends (infer E)[] ? E[] : GetNestedType<T, Path>[]
	): ExecutableStage<T>;
	equals(value: GetNestedType<T, Path>): ExecutableStage<T>;
	allOf(
		values: GetNestedType<T, Path> extends (infer E)[] ? E[] : GetNestedType<T, Path>[]
	): ExecutableStage<T>;
};

export type OrderableStage<T> = Omit<ExecutableStage<T>, 'sortBy'> & {
	reverse(): OrderableStage<T>;
};

export type LimitedStage<T> = Omit<ExecutableStage<T>, 'limit' | 'sortBy'>;

export type ExecutableStage<T> = {
	sortBy(field: keyof T): OrderableStage<T>;
	limit(count: number): LimitedStage<T>;
	offset(count: number): LimitedStage<T>;
	filter(callback: (document: T) => boolean): ExecutableStage<T>;
	toArray(): T[];
	first(): T | undefined;
	last(): T | undefined;
	modify(changes: Partial<T>): (T[keyof T] | undefined)[];
	delete(): Array<T[keyof T] | undefined>;
	count(): number;
};
