export type Schema<T, PK extends keyof T = keyof T> = {
	primaryKey: PK;
	indexes?: Array<keyof T & string>;
	multiEntry?: Array<keyof T & string>;
};
