import { Ramify } from '../dist/index.js';
import type { Schema, ExecutableStage } from '../dist/index.js';
import { createUserStore, seedUsers } from './helpers';

describe('Collection – Indexes', () => {
	/* ================================================================== */
	/*  Regular indexes                                                   */
	/* ================================================================== */

	describe('regular indexes', () => {
		let db: ReturnType<typeof createUserStore>;

		beforeEach(() => {
			db = createUserStore();
			seedUsers(db);
		});

		test('_indexes exposes schema info', () => {
			const info = db.users._indexes;
			expect(info.primary).toBe('id');
			expect(info.indexes).toEqual(['name', 'age', 'active']);
			expect(info.multiEntryIndexes).toEqual(['roles']);
		});

		test('querying by an index returns the correct documents', () => {
			expect(db.users.where('name').equals('Alice').count()).toBe(1);
			expect(db.users.where('age').equals(30).first()!.name).toBe('Bob');
		});

		test('indexes are updated after put (replace)', () => {
			db.users.put({
				id: 1,
				name: 'Alice-v2',
				age: 99,
				roles: [],
				active: false,
				stats: { score: 0, level: 0 },
			});
			expect(db.users.where('name').equals('Alice-v2').count()).toBe(1);
			expect(db.users.where('name').equals('Alice').count()).toBe(0);
		});

		test('indexes are cleaned up after delete', () => {
			db.users.delete(1);
			expect(db.users.where('name').equals('Alice').count()).toBe(0);
		});

		test('indexes survive clear and re-population', () => {
			db.users.clear();
			expect(db.users.where('name').equals('Alice').count()).toBe(0);

			seedUsers(db);
			expect(db.users.where('name').equals('Alice').count()).toBe(1);
		});
	});

	/* ================================================================== */
	/*  Multi-entry indexes                                               */
	/* ================================================================== */

	describe('multi-entry indexes', () => {
		let db: ReturnType<typeof createUserStore>;

		beforeEach(() => {
			db = createUserStore();
			seedUsers(db);
		});

		test('each array element is individually indexed', () => {
			// Daniel has roles: ['admin', 'ops']
			expect(db.users.where('roles').anyOf(['ops']).count()).toBe(1);
			expect(db.users.where('roles').anyOf(['admin']).count()).toBe(2); // Alice + Daniel
		});

		test('allOf requires all values to be present', () => {
			expect(db.users.where('roles').allOf(['admin', 'ops']).count()).toBe(1); // Daniel only
			expect(db.users.where('roles').allOf(['admin', 'editor']).count()).toBe(0);
		});

		test('multi-entry index is cleaned up on delete', () => {
			db.users.delete(4); // Daniel (admin, ops)
			expect(db.users.where('roles').anyOf(['ops']).count()).toBe(0);
			expect(db.users.where('roles').anyOf(['admin']).count()).toBe(1); // Only Alice left
		});

		test('rejects non-primitive values in multiEntry arrays', () => {
			expect(() =>
				db.users.put({
					id: 99,
					name: 'Bad',
					age: 0,
					roles: [{ nested: true }] as any,
					active: true,
					stats: { score: 0, level: 0 },
				})
			).toThrow(/primitive/i);
		});
	});

	/* ================================================================== */
	/*  Nested field indexes                                              */
	/* ================================================================== */

	describe('nested field indexes', () => {
		type WithNested = {
			id: number;
			profile: { city: string; score: number };
		};

		function createNestedStore() {
			return new Ramify().createStore<{
				items: Schema<WithNested, 'id'>;
			}>({
				items: {
					primaryKey: 'id',
					indexes: ['profile.city', 'profile.score'],
				},
			});
		}

		test('can query by nested indexed fields', () => {
			const db = createNestedStore();
			db.items.add({ id: 1, profile: { city: 'NYC', score: 90 } });
			db.items.add({ id: 2, profile: { city: 'LA', score: 80 } });
			db.items.add({ id: 3, profile: { city: 'NYC', score: 70 } });

			const nyc = (
				db.items.where({ 'profile.city': 'NYC' } as any) as unknown as ExecutableStage<WithNested>
			).toArray();
			expect(nyc).toHaveLength(2);
		});

		test('nested index is cleaned up after delete', () => {
			const db = createNestedStore();
			db.items.add({ id: 1, profile: { city: 'NYC', score: 90 } });
			db.items.delete(1);

			expect(
				(
					db.items.where({ 'profile.city': 'NYC' } as any) as unknown as ExecutableStage<WithNested>
				).count()
			).toBe(0);
		});
	});

	/* ================================================================== */
	/*  Index maintenance on update / delete                              */
	/* ================================================================== */

	describe('index maintenance on update and delete', () => {
		test('updating an indexed field removes the old value from the index map', () => {
			const db = new Ramify().createStore<{
				users: Schema<{ id: number; name: string }, 'id'>;
			}>({
				users: { primaryKey: 'id', indexes: ['name'] },
			});

			db.users.add({ id: 1, name: 'Alice' });
			db.users.update(1, { name: 'Bob' });

			const indexMaps = (db.users as any).indexMaps;
			const nameIndex: Map<unknown, Map<unknown, any>> = indexMaps['name'];

			expect(nameIndex.has('Alice')).toBe(false);
			expect(nameIndex.has('Bob')).toBe(true);
			expect(db.users.where('name').equals('Bob').count()).toBe(1);
			expect(db.users.where('name').equals('Alice').count()).toBe(0);
		});

		test('deleting a document must not leave old pre-update index entries orphaned', () => {
			const db = new Ramify().createStore<{
				users: Schema<{ id: number; name: string }, 'id'>;
			}>({
				users: { primaryKey: 'id', indexes: ['name'] },
			});

			db.users.add({ id: 1, name: 'Alice' });
			db.users.update(1, { name: 'Bob' });
			db.users.delete(1);

			const indexMaps = (db.users as any).indexMaps;
			const nameIndex: Map<unknown, Map<unknown, any>> = indexMaps['name'];

			expect(nameIndex.has('Alice')).toBe(false);
			expect(nameIndex.has('Bob')).toBe(false);
			expect(db.users.count()).toBe(0);
		});

		test('updating a nested indexed field cleans up old nested index values', () => {
			type Item = { id: number; meta: { tag: string } };
			const db = new Ramify().createStore<{ items: Schema<Item, 'id'> }>({
				items: { primaryKey: 'id', indexes: ['meta.tag'] },
			});

			db.items.add({ id: 1, meta: { tag: 'old' } });
			db.items.update(1, { meta: { tag: 'new' } });

			expect(db.items.where('meta.tag').equals('old').count()).toBe(0);
			expect(db.items.where('meta.tag').equals('new').count()).toBe(1);
		});

		test('updating primary key correctly migrates all index entries to new key', () => {
			const db = new Ramify().createStore<{
				users: Schema<{ id: number; name: string }, 'id'>;
			}>({
				users: { primaryKey: 'id', indexes: ['name'] },
			});

			db.users.add({ id: 1, name: 'Alice' });
			db.users.update(1, { id: 2, name: 'Alice' });

			expect(db.users.get(1)).toBeUndefined();
			expect(db.users.get(2)).toBeDefined();

			const results = db.users.where('name').equals('Alice').toArray();
			expect(results).toHaveLength(1);
			expect(results[0].id).toBe(2);
		});
	});

	/* ================================================================== */
	/*  Date indexing                                                      */
	/* ================================================================== */

	describe('Date indexing', () => {
		test('indexed Date query with a new Date instance matches the document', () => {
			const db = new Ramify().createStore<{
				events: Schema<{ id: number; createdAt: Date }, 'id'>;
			}>({
				events: { primaryKey: 'id', indexes: ['createdAt'] },
			});

			const d = new Date('2026-06-15T12:00:00Z');
			db.events.add({ id: 1, createdAt: d });

			expect(db.events.where({ createdAt: new Date('2026-06-15T12:00:00Z') }).count()).toBe(1);
			expect(db.events.where('createdAt').equals(new Date('2026-06-15T12:00:00Z')).count()).toBe(1);
		});

		test('updating an indexed Date removes old timestamp from index and adds new', () => {
			const db = new Ramify().createStore<{
				events: Schema<{ id: number; createdAt: Date }, 'id'>;
			}>({
				events: { primaryKey: 'id', indexes: ['createdAt'] },
			});

			const d1 = new Date('2026-01-01T00:00:00Z');
			const d2 = new Date('2026-02-01T00:00:00Z');
			db.events.add({ id: 1, createdAt: d1 });
			db.events.update(1, { createdAt: d2 });

			expect(db.events.where('createdAt').equals(new Date('2026-01-01T00:00:00Z')).count()).toBe(0);
			expect(db.events.where('createdAt').equals(new Date('2026-02-01T00:00:00Z')).count()).toBe(1);
		});
	});

	/* ================================================================== */
	/*  No-index collections                                              */
	/* ================================================================== */

	describe('collections with no indexes', () => {
		test('can still use put/get/delete without indexes', () => {
			const db = new Ramify().createStore<{
				simple: Schema<{ id: number; value: string }, 'id'>;
			}>({
				simple: { primaryKey: 'id' },
			});

			db.simple.put({ id: 1, value: 'hello' });
			expect(db.simple.get(1)!.value).toBe('hello');
			db.simple.delete(1);
			expect(db.simple.count()).toBe(0);
		});
	});
});
