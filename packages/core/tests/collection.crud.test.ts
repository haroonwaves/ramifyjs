import { Ramify, type Schema } from '../dist/index.js';
import { createUserStore, seedUsers, type User } from './helpers';

describe('Collection – CRUD operations', () => {
	let db: ReturnType<typeof createUserStore>;

	beforeEach(() => {
		db = createUserStore();
	});

	/* ================================================================== */
	/*  put                                                               */
	/* ================================================================== */

	describe('put()', () => {
		test('inserts a new document and returns its primary key', () => {
			const pk = db.users.put({
				id: 1,
				name: 'Alice',
				age: 25,
				roles: ['admin'],
				active: true,
				stats: { score: 1, level: 1 },
			});
			expect(pk).toBe(1);
			expect(db.users.count()).toBe(1);
		});

		test('replaces an existing document with the same primary key', () => {
			db.users.put({
				id: 1,
				name: 'Alice',
				age: 25,
				roles: [],
				active: true,
				stats: { score: 1, level: 1 },
			});
			db.users.put({
				id: 1,
				name: 'Alice-v2',
				age: 26,
				roles: [],
				active: false,
				stats: { score: 2, level: 2 },
			});

			expect(db.users.count()).toBe(1);
			expect(db.users.get(1)!.name).toBe('Alice-v2');
			expect(db.users.get(1)!.age).toBe(26);
		});

		test('rejects non-primitive primary keys', () => {
			const store = createUserStore();
			expect(() =>
				(store.users as any).put({
					id: { nested: true },
					name: 'Bad',
					age: 0,
					roles: [],
					active: true,
					stats: { score: 0, level: 0 },
				})
			).toThrow(/primitive/i);
		});
	});

	/* ================================================================== */
	/*  add                                                               */
	/* ================================================================== */

	describe('add()', () => {
		test('inserts a new document', () => {
			const pk = db.users.add({
				id: 1,
				name: 'Alice',
				age: 25,
				roles: [],
				active: true,
				stats: { score: 0, level: 0 },
			});
			expect(pk).toBe(1);
		});

		test('throws when the primary key already exists', () => {
			db.users.add({
				id: 1,
				name: 'Alice',
				age: 25,
				roles: [],
				active: true,
				stats: { score: 0, level: 0 },
			});
			expect(() =>
				db.users.add({
					id: 1,
					name: 'Duplicate',
					age: 30,
					roles: [],
					active: true,
					stats: { score: 0, level: 0 },
				})
			).toThrow(/already exists/i);
		});
	});

	/* ================================================================== */
	/*  get / bulkGet                                                     */
	/* ================================================================== */

	describe('get() / bulkGet()', () => {
		test('returns the document for an existing key', () => {
			seedUsers(db);
			const user = db.users.get(1);
			expect(user).toBeDefined();
			expect(user!.name).toBe('Alice');
		});

		test('returns undefined for a missing key', () => {
			seedUsers(db);
			expect(db.users.get(9999)).toBeUndefined();
		});

		test('bulkGet returns an array aligned with the requested keys', () => {
			seedUsers(db);
			const result = db.users.bulkGet([1, 9999, 3]);
			expect(result).toHaveLength(3);
			expect(result[0]!.name).toBe('Alice');
			expect(result[1]).toBeUndefined();
			expect(result[2]!.name).toBe('Cara');
		});
	});

	/* ================================================================== */
	/*  bulkPut / bulkAdd                                                 */
	/* ================================================================== */

	describe('bulkPut() / bulkAdd()', () => {
		test('bulkAdd inserts multiple documents and returns their keys', () => {
			const keys = db.users.bulkAdd([
				{ id: 10, name: 'X', age: 20, roles: [], active: true, stats: { score: 0, level: 0 } },
				{ id: 11, name: 'Y', age: 21, roles: [], active: true, stats: { score: 0, level: 0 } },
			]);
			expect(keys).toEqual([10, 11]);
			expect(db.users.count()).toBe(2);
		});

		test('bulkAdd throws on duplicate keys within the batch', () => {
			db.users.add({
				id: 1,
				name: 'Existing',
				age: 30,
				roles: [],
				active: true,
				stats: { score: 0, level: 0 },
			});
			expect(() =>
				db.users.bulkAdd([
					{ id: 2, name: 'OK', age: 20, roles: [], active: true, stats: { score: 0, level: 0 } },
					{ id: 1, name: 'Dup', age: 20, roles: [], active: true, stats: { score: 0, level: 0 } },
				])
			).toThrow();
		});

		test('bulkPut upserts multiple documents', () => {
			db.users.add({
				id: 1,
				name: 'Old',
				age: 20,
				roles: [],
				active: true,
				stats: { score: 0, level: 0 },
			});
			db.users.bulkPut([
				{ id: 1, name: 'Updated', age: 21, roles: [], active: true, stats: { score: 0, level: 0 } },
				{ id: 2, name: 'New', age: 22, roles: [], active: true, stats: { score: 0, level: 0 } },
			]);

			expect(db.users.count()).toBe(2);
			expect(db.users.get(1)!.name).toBe('Updated');
			expect(db.users.get(2)!.name).toBe('New');
		});
	});

	/* ================================================================== */
	/*  update / bulkUpdate                                               */
	/* ================================================================== */

	describe('update() / bulkUpdate()', () => {
		test('updates a non-indexed field', () => {
			seedUsers(db);
			expect(db.users.update(1, { age: 99 })).toBe(1);
			expect(db.users.get(1)!.age).toBe(99);
		});

		test('updates an indexed field and re-indexes correctly', () => {
			seedUsers(db);
			db.users.update(2, { name: 'Bob-v2' });

			expect(db.users.where('name').equals('Bob-v2').count()).toBe(1);
		});

		test('updates the primary key (re-keys the document)', () => {
			db.users.add({
				id: 10,
				name: 'Temp',
				age: 50,
				roles: [],
				active: true,
				stats: { score: 0, level: 0 },
			});
			db.users.update(10, { id: 11 });

			expect(db.users.get(10)).toBeUndefined();
			expect(db.users.get(11)).toBeDefined();
			expect(db.users.get(11)!.name).toBe('Temp');
		});

		test('returns undefined when updating a non-existent key', () => {
			seedUsers(db);
			expect(db.users.update(9999, { name: 'Ghost' })).toBeUndefined();
		});

		test('bulkUpdate applies changes to all given keys', () => {
			seedUsers(db);
			const results = db.users.bulkUpdate([1, 2], { active: true });
			expect(results).toEqual([1, 2]);
			expect(db.users.get(2)!.active).toBe(true);
		});

		test('bulkUpdate returns undefined for non-existent keys', () => {
			seedUsers(db);
			const results = db.users.bulkUpdate([1, 9999], { age: 50 });
			expect(results[0]).toBe(1);
			expect(results[1]).toBeUndefined();
		});
	});

	/* ================================================================== */
	/*  delete / bulkDelete / clear                                       */
	/* ================================================================== */

	describe('delete() / bulkDelete() / clear()', () => {
		test('delete removes a document and returns its key', () => {
			seedUsers(db);
			expect(db.users.delete(1)).toBe(1);
			expect(db.users.get(1)).toBeUndefined();
			expect(db.users.count()).toBe(3);
		});

		test('delete returns undefined for a non-existent key', () => {
			seedUsers(db);
			expect(db.users.delete(9999)).toBeUndefined();
		});

		test('bulkDelete removes multiple documents', () => {
			seedUsers(db);
			const results = db.users.bulkDelete([1, 2, 9999]);
			expect(results[0]).toBe(1);
			expect(results[1]).toBe(2);
			expect(results[2]).toBeUndefined();
			expect(db.users.count()).toBe(2);
		});

		test('clear empties the entire collection', () => {
			seedUsers(db);
			db.users.clear();
			expect(db.users.count()).toBe(0);
			expect(db.users.toArray()).toEqual([]);
		});
	});

	/* ================================================================== */
	/*  toArray / keys / has / count / each / filter                      */
	/* ================================================================== */

	describe('utility methods', () => {
		test('toArray returns all documents', () => {
			seedUsers(db);
			const all = db.users.toArray();
			expect(all).toHaveLength(4);
		});

		test('keys returns all primary keys', () => {
			seedUsers(db);
			expect(db.users.keys().sort()).toEqual([1, 2, 3, 4]);
		});

		test('has returns true for existing keys and false otherwise', () => {
			seedUsers(db);
			expect(db.users.has(1)).toBe(true);
			expect(db.users.has(999)).toBe(false);
		});

		test('count reflects the number of documents', () => {
			expect(db.users.count()).toBe(0);
			seedUsers(db);
			expect(db.users.count()).toBe(4);
			db.users.delete(1);
			expect(db.users.count()).toBe(3);
		});

		test('each iterates over all documents', () => {
			seedUsers(db);
			const names: string[] = [];
			db.users.each((doc: User) => names.push(doc.name));
			expect(names.sort()).toEqual(['Alice', 'Bob', 'Cara', 'Daniel']);
		});

		test('collection-level filter returns matching documents', () => {
			seedUsers(db);
			const result = db.users.filter((u) => u.age > 25).toArray();
			expect(result).toHaveLength(2);
			expect(result.map((u) => u.name).sort()).toEqual(['Bob', 'Daniel']);
		});
	});

	/* ================================================================== */
	/*  Date primary keys                                                 */
	/* ================================================================== */

	describe('Date primary keys', () => {
		test('get() with a new Date instance of equal timestamp returns the document', () => {
			const store = new Ramify().createStore<{
				logs: Schema<{ timestamp: Date; msg: string }, 'timestamp'>;
			}>({
				logs: { primaryKey: 'timestamp' },
			});

			const d = new Date('2026-01-01T00:00:00Z');
			store.logs.add({ timestamp: d, msg: 'hello' });

			expect(store.logs.has(new Date('2026-01-01T00:00:00Z'))).toBe(true);
			const doc = store.logs.get(new Date('2026-01-01T00:00:00Z'));
			expect(doc).toBeDefined();
			expect(doc!.msg).toBe('hello');
			expect(store.logs.keys()).toHaveLength(1);
			expect(store.logs.keys()[0]).toBeInstanceOf(Date);
		});

		test('delete() and put() with Date primary keys', () => {
			const store = new Ramify().createStore<{
				logs: Schema<{ timestamp: Date; msg: string }, 'timestamp'>;
			}>({
				logs: { primaryKey: 'timestamp' },
			});

			const d = new Date('2026-01-01T00:00:00Z');
			store.logs.put({ timestamp: d, msg: 'v1' });
			store.logs.put({ timestamp: new Date('2026-01-01T00:00:00Z'), msg: 'v2' });

			expect(store.logs.count()).toBe(1);
			expect(store.logs.get(d)!.msg).toBe('v2');

			store.logs.delete(new Date('2026-01-01T00:00:00Z'));
			expect(store.logs.count()).toBe(0);
		});
	});
});
