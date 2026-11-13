import { createUserStore, seedUsers } from './helpers';
import type { CollectionOperation } from '../dist/index.js';

describe('Collection – Observer / Subscriptions', () => {
	let db: ReturnType<typeof createUserStore>;

	beforeEach(() => {
		db = createUserStore();
	});

	/* ================================================================== */
	/*  Basic subscribe / unsubscribe                                     */
	/* ================================================================== */

	describe('subscribe / unsubscribe', () => {
		test('subscribe returns an unsubscribe function', () => {
			const unsubscribe = db.users.subscribe(() => {});
			expect(typeof unsubscribe).toBe('function');
		});

		test('observer receives create events on add', () => {
			const events: Array<{ type: CollectionOperation; keys: any[] }> = [];
			db.users.subscribe((type, keys) => {
				events.push({ type, keys });
			});

			db.users.add({
				id: 1,
				name: 'Alice',
				age: 25,
				roles: [],
				active: true,
				stats: { score: 0, level: 0 },
			});

			expect(events).toHaveLength(1);
			expect(events[0].type).toBe('create');
			expect(events[0].keys).toEqual([1]);
		});

		test('observer receives update events on update', () => {
			seedUsers(db);
			const events: Array<{ type: CollectionOperation; keys: any[] }> = [];
			db.users.subscribe((type, keys) => {
				events.push({ type, keys });
			});

			db.users.update(1, { age: 99 });

			expect(events).toEqual([{ type: 'update', keys: [1] }]);
		});

		test('updating an indexed field emits a single update event (not delete + create + update)', () => {
			seedUsers(db);
			const events: Array<{ type: CollectionOperation; keys: any[] }> = [];
			db.users.subscribe((type: CollectionOperation, keys: any[]) => {
				events.push({ type, keys });
			});

			db.users.update(1, { name: 'Bob-New' });

			expect(events).toEqual([{ type: 'update', keys: [1] }]);
		});

		test('put() replacing an existing document emits a single update event', () => {
			seedUsers(db);
			const events: Array<{ type: CollectionOperation; keys: any[] }> = [];
			db.users.subscribe((type: CollectionOperation, keys: any[]) => {
				events.push({ type, keys });
			});

			db.users.put({
				id: 1,
				name: 'Alice-Updated',
				age: 26,
				roles: ['admin'],
				active: true,
				stats: { score: 10, level: 2 },
			});

			expect(events).toEqual([{ type: 'update', keys: [1] }]);
		});

		test('observer receives delete events on delete', () => {
			seedUsers(db);
			const events: Array<{ type: CollectionOperation; keys: any[] }> = [];
			db.users.subscribe((type, keys) => {
				events.push({ type, keys });
			});

			db.users.delete(1);

			expect(events).toHaveLength(1);
			expect(events[0].type).toBe('delete');
			expect(events[0].keys).toEqual([1]);
		});

		test('observer receives clear events', () => {
			seedUsers(db);
			const events: Array<{ type: CollectionOperation; keys: any[] }> = [];
			db.users.subscribe((type, keys) => {
				events.push({ type, keys });
			});

			db.users.clear();

			expect(events).toHaveLength(1);
			expect(events[0].type).toBe('clear');
			expect(events[0].keys).toEqual([]);
		});

		test('unsubscribed observer no longer receives events', () => {
			const events: CollectionOperation[] = [];
			const unsubscribe = db.users.subscribe((type: CollectionOperation) => {
				events.push(type);
			});

			db.users.add({
				id: 1,
				name: 'A',
				age: 20,
				roles: [],
				active: true,
				stats: { score: 0, level: 0 },
			});
			expect(events).toHaveLength(1);

			unsubscribe();

			db.users.add({
				id: 2,
				name: 'B',
				age: 20,
				roles: [],
				active: true,
				stats: { score: 0, level: 0 },
			});
			expect(events).toHaveLength(1); // No new event
		});

		test('collection.unsubscribe(observer) also removes it', () => {
			const events: CollectionOperation[] = [];
			const observer = (type: CollectionOperation) => {
				events.push(type);
			};

			db.users.subscribe(observer);
			db.users.add({
				id: 1,
				name: 'A',
				age: 20,
				roles: [],
				active: true,
				stats: { score: 0, level: 0 },
			});
			expect(events).toHaveLength(1);

			db.users.unsubscribe(observer);
			db.users.add({
				id: 2,
				name: 'B',
				age: 20,
				roles: [],
				active: true,
				stats: { score: 0, level: 0 },
			});
			expect(events).toHaveLength(1);
		});
	});

	/* ================================================================== */
	/*  Batch operation notifications                                     */
	/* ================================================================== */

	describe('batch operations emit a single notification', () => {
		test('bulkAdd emits one create event with all keys', () => {
			const events: Array<{ type: CollectionOperation; keys: any[] }> = [];
			db.users.subscribe((type, keys) => {
				events.push({ type, keys });
			});

			db.users.bulkAdd([
				{ id: 10, name: 'X', age: 20, roles: [], active: true, stats: { score: 0, level: 0 } },
				{ id: 11, name: 'Y', age: 21, roles: [], active: true, stats: { score: 0, level: 0 } },
			]);

			expect(events).toHaveLength(1);
			expect(events[0].type).toBe('create');
			expect(events[0].keys).toEqual([10, 11]);
		});

		test('bulkDelete emits one delete event', () => {
			seedUsers(db);
			const events: Array<{ type: CollectionOperation; keys: any[] }> = [];
			db.users.subscribe((type, keys) => {
				events.push({ type, keys });
			});

			db.users.bulkDelete([1, 2]);

			expect(events).toHaveLength(1);
			expect(events[0].type).toBe('delete');
			expect(events[0].keys).toEqual([1, 2]);
		});

		test('bulkDelete filters out non-existent keys and never emits undefined', () => {
			seedUsers(db);
			const events: Array<{ type: CollectionOperation; keys: any[] }> = [];
			db.users.subscribe((type: CollectionOperation, keys: any[]) => {
				events.push({ type, keys });
			});

			db.users.bulkDelete([1, 9999]);

			expect(events).toHaveLength(1);
			expect(events[0].keys).toEqual([1]);
		});

		test('bulkDelete with only non-existent keys emits no events', () => {
			seedUsers(db);
			const events: Array<{ type: CollectionOperation; keys: any[] }> = [];
			db.users.subscribe((type: CollectionOperation, keys: any[]) => {
				events.push({ type, keys });
			});

			db.users.bulkDelete([8888, 9999]);
			expect(events).toHaveLength(0);
		});

		test('bulkPut updating existing documents emits update, not create', () => {
			seedUsers(db);
			const events: Array<{ type: CollectionOperation; keys: any[] }> = [];
			db.users.subscribe((type: CollectionOperation, keys: any[]) => {
				events.push({ type, keys });
			});

			db.users.bulkPut([
				{
					id: 1,
					name: 'Alice-v2',
					age: 26,
					roles: [],
					active: true,
					stats: { score: 0, level: 0 },
				},
			]);

			expect(events).toEqual([{ type: 'update', keys: [1] }]);
		});

		test('bulkPut with mixed new and existing documents emits both create and update events', () => {
			seedUsers(db);
			const events: Array<{ type: CollectionOperation; keys: any[] }> = [];
			db.users.subscribe((type: CollectionOperation, keys: any[]) => {
				events.push({ type, keys });
			});

			db.users.bulkPut([
				{
					id: 1,
					name: 'Alice-v2',
					age: 26,
					roles: [],
					active: true,
					stats: { score: 0, level: 0 },
				}, // existing
				{
					id: 99,
					name: 'NewUser',
					age: 20,
					roles: [],
					active: true,
					stats: { score: 0, level: 0 },
				}, // new
			]);

			expect(events).toEqual([
				{ type: 'create', keys: [99] },
				{ type: 'update', keys: [1] },
			]);
		});

		test('bulkUpdate emits one update event', () => {
			seedUsers(db);
			const events: Array<{ type: CollectionOperation; keys: any[] }> = [];
			db.users.subscribe((type, keys) => {
				events.push({ type, keys });
			});

			db.users.bulkUpdate([1, 2], { age: 50 });

			expect(events).toHaveLength(1);
			expect(events[0].type).toBe('update');
		});
	});

	/* ================================================================== */
	/*  Multiple subscribers                                              */
	/* ================================================================== */

	describe('multiple subscribers', () => {
		test('all subscribers receive the same events', () => {
			const log1: CollectionOperation[] = [];
			const log2: CollectionOperation[] = [];

			db.users.subscribe((type: CollectionOperation) => {
				log1.push(type);
			});
			db.users.subscribe((type: CollectionOperation) => {
				log2.push(type);
			});

			db.users.add({
				id: 1,
				name: 'A',
				age: 20,
				roles: [],
				active: true,
				stats: { score: 0, level: 0 },
			});

			expect(log1).toEqual(['create']);
			expect(log2).toEqual(['create']);
		});

		test('unsubscribing one does not affect the other', () => {
			const log1: CollectionOperation[] = [];
			const log2: CollectionOperation[] = [];

			const unsub1 = db.users.subscribe((type: CollectionOperation) => {
				log1.push(type);
			});
			db.users.subscribe((type: CollectionOperation) => {
				log2.push(type);
			});

			unsub1();

			db.users.add({
				id: 1,
				name: 'A',
				age: 20,
				roles: [],
				active: true,
				stats: { score: 0, level: 0 },
			});

			expect(log1).toEqual([]);
			expect(log2).toEqual(['create']);
		});
	});

	/* ================================================================== */
	/*  query .modify() / .delete() notification                          */
	/* ================================================================== */

	describe('query-level modify/delete notifications', () => {
		test('where().modify() emits an update event', () => {
			seedUsers(db);
			const events: Array<{ type: CollectionOperation; keys: any[] }> = [];
			db.users.subscribe((type, keys) => {
				events.push({ type, keys });
			});

			db.users.where('active').equals(true).modify({ age: 99 });

			const updateEvents = events.filter((e) => e.type === 'update');
			expect(updateEvents.length).toBeGreaterThanOrEqual(1);
		});

		test('where().delete() emits a delete event', () => {
			seedUsers(db);
			const events: Array<{ type: CollectionOperation; keys: any[] }> = [];
			db.users.subscribe((type, keys) => {
				events.push({ type, keys });
			});

			db.users.where('active').equals(false).delete();

			const deleteEvents = events.filter((e) => e.type === 'delete');
			expect(deleteEvents.length).toBeGreaterThanOrEqual(1);
		});
	});
});
