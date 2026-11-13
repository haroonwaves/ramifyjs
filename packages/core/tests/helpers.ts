import { Ramify } from '../dist/index.js';
import type { Schema } from '../dist/index.js';

/* ------------------------------------------------------------------ */
/*  Shared types used across all test files                           */
/* ------------------------------------------------------------------ */

export type User = {
	id: number;
	name: string;
	age: number;
	roles: string[];
	active: boolean;
	stats: { score: number; level: number };
};

export type Post = {
	id: string;
	userId: string;
	title: string;
	content: string;
	tags: string[];
	createdAt: number;
};

export type Message = {
	id: string;
	channelId: string;
	senderId: string;
	body: string;
	priority: number;
	read: boolean;
	metadata: {
		importance: string;
		readBy: string[];
	};
};

/* ------------------------------------------------------------------ */
/*  Store factory helpers                                             */
/* ------------------------------------------------------------------ */

export function createUserStore() {
	return new Ramify().createStore<{
		users: Schema<User, 'id'>;
	}>({
		users: {
			primaryKey: 'id',
			indexes: ['name', 'age', 'active'],
			multiEntry: ['roles'],
		},
	});
}

export function createPostStore() {
	return new Ramify().createStore<{
		posts: Schema<Post, 'id'>;
	}>({
		posts: {
			primaryKey: 'id',
			indexes: ['userId', 'createdAt'],
			multiEntry: ['tags'],
		},
	});
}

export function createMultiStore() {
	return new Ramify().createStore<{
		users: Schema<User, 'id'>;
		posts: Schema<Post, 'id'>;
	}>({
		users: {
			primaryKey: 'id',
			indexes: ['name', 'age', 'active'],
			multiEntry: ['roles'],
		},
		posts: {
			primaryKey: 'id',
			indexes: ['userId', 'createdAt'],
			multiEntry: ['tags'],
		},
	});
}

/* ------------------------------------------------------------------ */
/*  Seed data                                                        */
/* ------------------------------------------------------------------ */

export const USERS: User[] = [
	{ id: 1, name: 'Alice', age: 25, roles: ['admin'], active: true, stats: { score: 10, level: 1 } },
	{ id: 2, name: 'Bob', age: 30, roles: ['editor'], active: false, stats: { score: 20, level: 2 } },
	{ id: 3, name: 'Cara', age: 22, roles: ['viewer'], active: true, stats: { score: 30, level: 3 } },
	{
		id: 4,
		name: 'Daniel',
		age: 40,
		roles: ['admin', 'ops'],
		active: true,
		stats: { score: 40, level: 4 },
	},
];

export function seedUsers(db: ReturnType<typeof createUserStore>) {
	db.users.bulkAdd(
		USERS.map((u) => ({
			...u,
			roles: [...u.roles],
			stats: { ...u.stats },
		}))
	);
}
