import { Ramify } from '../dist/index.js';
import type { Schema, CollectionOperation } from '../dist/index.js';

describe('Ramify – Store lifecycle', () => {
	/* ================================================================== */
	/*  createStore                                                       */
	/* ================================================================== */

	describe('createStore()', () => {
		test('creates a store with multiple collections', () => {
			type User = { id: number; name: string };
			type Post = { id: string; title: string };

			const db = new Ramify().createStore<{
				users: Schema<User, 'id'>;
				posts: Schema<Post, 'id'>;
			}>({
				users: { primaryKey: 'id' },
				posts: { primaryKey: 'id' },
			});

			expect(db.users).toBeDefined();
			expect(db.posts).toBeDefined();
		});

		test('collections are enumerable on the store', () => {
			type Item = { id: number };
			const db = new Ramify().createStore<{
				items: Schema<Item, 'id'>;
			}>({
				items: { primaryKey: 'id' },
			});

			const keys = Object.keys(db);
			expect(keys).toContain('items');
		});

		test('store only exposes collections and delete method, not createStore', () => {
			type Item = { id: number };
			const db = new Ramify().createStore<{
				items: Schema<Item, 'id'>;
			}>({
				items: { primaryKey: 'id' },
			});

			expect(db.items).toBeDefined();
			expect(typeof db.delete).toBe('function');
			expect((db as any).createStore).toBeUndefined();
		});

		test('collections are independent of each other', () => {
			type A = { id: number; val: string };
			type B = { id: number; val: string };

			const db = new Ramify().createStore<{
				collA: Schema<A, 'id'>;
				collB: Schema<B, 'id'>;
			}>({
				collA: { primaryKey: 'id' },
				collB: { primaryKey: 'id' },
			});

			db.collA.add({ id: 1, val: 'a' });
			db.collB.add({ id: 1, val: 'b' });

			expect(db.collA.count()).toBe(1);
			expect(db.collB.count()).toBe(1);
			expect(db.collA.get(1)!.val).toBe('a');
			expect(db.collB.get(1)!.val).toBe('b');

			db.collA.clear();
			expect(db.collA.count()).toBe(0);
			expect(db.collB.count()).toBe(1); // Unaffected
		});
	});

	/* ================================================================== */
	/*  delete                                                            */
	/* ================================================================== */

	describe('delete()', () => {
		test('delete() clears collection data across multiple collections', () => {
			type Item = { id: number; name: string };
			type Log = { id: number; msg: string };
			const db = new Ramify().createStore<{
				items: Schema<Item, 'id'>;
				logs: Schema<Log, 'id'>;
			}>({
				items: { primaryKey: 'id' },
				logs: { primaryKey: 'id' },
			});

			db.items.add({ id: 1, name: 'test' });
			db.logs.add({ id: 1, msg: 'hello' });
			expect(db.items.count()).toBe(1);
			expect(db.logs.count()).toBe(1);

			db.delete();

			expect(db.items.count()).toBe(0);
			expect(db.logs.count()).toBe(0);
		});

		test('delete() detaches observers so subsequent operations do not notify', () => {
			type Item = { id: number; name: string };
			const db = new Ramify().createStore<{
				items: Schema<Item, 'id'>;
			}>({
				items: { primaryKey: 'id' },
			});

			const events: CollectionOperation[] = [];
			db.items.subscribe((type: CollectionOperation) => {
				events.push(type);
			});

			db.delete();

			// Writing after delete should not notify detached observer
			db.items.add({ id: 1, name: 'post-delete' });
			expect(events).toHaveLength(0);
		});

		test('calling delete() multiple times is safe and idempotent', () => {
			type Item = { id: number };
			const db = new Ramify().createStore<{
				items: Schema<Item, 'id'>;
			}>({
				items: { primaryKey: 'id' },
			});

			db.items.add({ id: 1 });
			db.delete();
			expect(() => db.delete()).not.toThrow();
			expect(db.items.count()).toBe(0);
		});
	});

	/* ================================================================== */
	/*  Multiple independent stores                                       */
	/* ================================================================== */

	describe('independent stores', () => {
		test('two stores created from separate Ramify instances are fully isolated', () => {
			type Item = { id: number; value: string };

			const db1 = new Ramify().createStore<{ items: Schema<Item, 'id'> }>({
				items: { primaryKey: 'id' },
			});
			const db2 = new Ramify().createStore<{ items: Schema<Item, 'id'> }>({
				items: { primaryKey: 'id' },
			});

			db1.items.add({ id: 1, value: 'store1' });
			db2.items.add({ id: 1, value: 'store2' });

			expect(db1.items.get(1)!.value).toBe('store1');
			expect(db2.items.get(1)!.value).toBe('store2');
		});
	});
});
