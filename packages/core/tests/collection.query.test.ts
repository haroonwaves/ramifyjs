import { createUserStore, seedUsers, type User } from './helpers';
import { Ramify, type ExecutableStage, type Schema } from '../dist/index.js';

describe('Collection – Query pipeline', () => {
	let db: ReturnType<typeof createUserStore>;

	beforeEach(() => {
		db = createUserStore();
		seedUsers(db);
	});

	/* ================================================================== */
	/*  where(criteria)  –  object form                                   */
	/* ================================================================== */

	describe('where(criteriaObject)', () => {
		test('matches a single indexed field exactly', () => {
			const result = db.users.where({ name: 'Alice' }).toArray();
			expect(result).toHaveLength(1);
			expect(result[0].id).toBe(1);
		});

		test('matches a boolean index', () => {
			const active = db.users.where({ active: true }).toArray();
			expect(active).toHaveLength(3); // Alice, Cara, Daniel
		});

		test('matches a numeric index', () => {
			const age25 = db.users.where({ age: 25 }).toArray();
			expect(age25).toHaveLength(1);
			expect(age25[0].name).toBe('Alice');
		});

		test('matches exact array values on a multiEntry field', () => {
			// Exact match: roles must be exactly ['admin']
			const adminOnly = db.users.where({ roles: ['admin'] }).toArray();
			expect(adminOnly).toHaveLength(1);
			expect(adminOnly[0].id).toBe(1); // Alice has ['admin'], Daniel has ['admin', 'ops']
		});

		test('multi-criteria narrows the result set', () => {
			const result = db.users.where({ name: 'Alice', active: true }).toArray();
			expect(result).toHaveLength(1);
			expect(result[0].id).toBe(1);
		});

		test('multi-criteria that matches nobody returns empty', () => {
			const result = db.users.where({ name: 'Alice', active: false }).toArray();
			expect(result).toHaveLength(0);
		});

		test('throws when all criteria fields are non-indexed', () => {
			expect(() =>
				(
					db.users.where({
						stats: { score: 10, level: 1 },
					} as any) as unknown as ExecutableStage<User>
				).toArray()
			).toThrow();
		});

		test('matches falsy boolean (active: false)', () => {
			const activeFalse = db.users.where({ active: false }).toArray();
			expect(activeFalse).toHaveLength(1);
			expect(activeFalse[0]?.name).toBe('Bob');
		});

		test('matches falsy numeric 0 and empty string', () => {
			const store = new Ramify().createStore<{
				items: Schema<{ id: number; count: number; tag: string }, 'id'>;
			}>({
				items: { primaryKey: 'id', indexes: ['count', 'tag'] },
			});

			store.items.add({ id: 1, count: 0, tag: '' });
			store.items.add({ id: 2, count: 5, tag: 'hello' });

			expect(store.items.where({ count: 0 }).count()).toBe(1);
			expect(store.items.where({ tag: '' }).count()).toBe(1);
			expect(store.items.where({ count: 0, tag: '' }).count()).toBe(1);
		});
	});

	/* ================================================================== */
	/*  where(field)  –  string form                                      */
	/* ================================================================== */

	describe('where(field).equals()', () => {
		test('finds documents by index value', () => {
			const result = db.users.where('name').equals('Bob').toArray();
			expect(result).toHaveLength(1);
			expect(result[0].age).toBe(30);
		});

		test('returns empty array when no match', () => {
			expect(db.users.where('name').equals('Nobody').toArray()).toHaveLength(0);
		});

		test('equals matches falsy values (false, 0, "")', () => {
			const store = new Ramify().createStore<{
				items: Schema<{ id: number; active: boolean; count: number; tag: string }, 'id'>;
			}>({
				items: { primaryKey: 'id', indexes: ['active', 'count', 'tag'] },
			});

			store.items.add({ id: 1, active: false, count: 0, tag: '' });

			expect(store.items.where('active').equals(false).count()).toBe(1);
			expect(store.items.where('count').equals(0).count()).toBe(1);
			expect(store.items.where('tag').equals('').count()).toBe(1);
		});

		test('equals matches Date instances by timestamp equality', () => {
			const store = new Ramify().createStore<{
				events: Schema<{ id: number; createdAt: Date }, 'id'>;
			}>({
				events: { primaryKey: 'id', indexes: ['createdAt'] },
			});

			store.events.add({ id: 1, createdAt: new Date('2026-06-15T12:00:00Z') });

			expect(store.events.where('createdAt').equals(new Date('2026-06-15T12:00:00Z')).count()).toBe(
				1
			);
			expect(store.events.where({ createdAt: new Date('2026-06-15T12:00:00Z') }).count()).toBe(1);
		});

		test('throws for a non-indexed field', () => {
			expect(() => db.users.where('stats' as any).equals('x')).toThrow(
				/not a primary key or an index/i
			);
		});
	});

	describe('where(field).anyOf()', () => {
		test('matches any of the given values (regular index)', () => {
			const result = db.users.where('age').anyOf([25, 40]).toArray();
			expect(result).toHaveLength(2);
			expect(result.map((u) => u.name).sort()).toEqual(['Alice', 'Daniel']);
		});

		test('matches any of the given values (multiEntry index)', () => {
			const result = db.users.where('roles').anyOf(['admin', 'editor']).toArray();
			// Alice (admin), Bob (editor), Daniel (admin, ops) = 3 unique docs
			expect(result).toHaveLength(3);
		});

		test('returns empty when no values match', () => {
			expect(db.users.where('name').anyOf(['Nobody', 'Ghost']).toArray()).toHaveLength(0);
		});
	});

	describe('where(field).allOf()', () => {
		test('matches documents that contain all specified values in a multiEntry field', () => {
			// Daniel has roles: ['admin', 'ops']
			const result = db.users.where('roles').allOf(['admin', 'ops']).toArray();
			expect(result).toHaveLength(1);
			expect(result[0].name).toBe('Daniel');
		});

		test('does not match when only some values are present', () => {
			// Nobody has both 'admin' and 'editor'
			const result = db.users.where('roles').allOf(['admin', 'editor']).toArray();
			expect(result).toHaveLength(0);
		});
	});

	/* ================================================================== */
	/*  where(primaryKey)                                                 */
	/* ================================================================== */

	describe('where(primaryKey)', () => {
		test('equals finds by primary key', () => {
			const result = db.users.where('id').equals(3).toArray();
			expect(result).toHaveLength(1);
			expect(result[0].name).toBe('Cara');
		});

		test('anyOf finds multiple documents by primary key', () => {
			const result = db.users.where('id').anyOf([1, 4]).toArray();
			expect(result).toHaveLength(2);
		});
	});

	/* ================================================================== */
	/*  sortBy / reverse                                                  */
	/* ================================================================== */

	describe('sortBy() / reverse()', () => {
		test('sorts documents ascending by default', () => {
			const sorted = db.users.sortBy('age').toArray();
			const ages = sorted.map((u) => u.age);
			expect(ages).toEqual([22, 25, 30, 40]);
		});

		test('sorts descending with reverse()', () => {
			const sorted = db.users.sortBy('age').reverse().toArray();
			const ages = sorted.map((u) => u.age);
			expect(ages).toEqual([40, 30, 25, 22]);
		});

		test('sorts string fields lexicographically', () => {
			const sorted = db.users.sortBy('name').toArray();
			const names = sorted.map((u) => u.name);
			expect(names).toEqual(['Alice', 'Bob', 'Cara', 'Daniel']);
		});
	});

	/* ================================================================== */
	/*  limit / offset                                                    */
	/* ================================================================== */

	describe('limit() / offset()', () => {
		test('limit caps the number of returned documents', () => {
			const result = db.users.sortBy('age').limit(2).toArray();
			expect(result).toHaveLength(2);
			expect(result[0].age).toBe(22);
			expect(result[1].age).toBe(25);
		});

		test('offset skips the first N documents', () => {
			const result = db.users.sortBy('age').limit(2).offset(1).toArray();
			expect(result).toHaveLength(2);
			expect(result[0].age).toBe(25);
		});

		test('offset larger than result set returns empty', () => {
			const result = db.users.sortBy('age').limit(10).offset(100).toArray();
			expect(result).toHaveLength(0);
		});

		test('collection-level limit and offset work', () => {
			const limited = db.users.limit(2).toArray();
			expect(limited).toHaveLength(2);

			const offset = db.users.offset(3).toArray();
			expect(offset).toHaveLength(1);
		});
	});

	/* ================================================================== */
	/*  filter                                                            */
	/* ================================================================== */

	describe('filter()', () => {
		test('filters within a where result', () => {
			const result = db.users
				.where({ active: true })
				.filter((u) => u.age > 24)
				.toArray();
			// Active users: Alice(25), Cara(22), Daniel(40) → age > 24: Alice, Daniel
			expect(result).toHaveLength(2);
		});

		test('chains with sortBy + limit', () => {
			const result = db.users.filter((u) => u.active).toArray();
			expect(result).toHaveLength(3);
		});
	});

	/* ================================================================== */
	/*  first / last / count                                              */
	/* ================================================================== */

	describe('first() / last() / count()', () => {
		test('first returns the first matching document', () => {
			const first = db.users.sortBy('age').first();
			expect(first).toBeDefined();
			expect(first!.age).toBe(22);
		});

		test('last returns the last matching document', () => {
			const last = db.users.sortBy('age').last();
			expect(last).toBeDefined();
			expect(last!.age).toBe(40);
		});

		test('first returns undefined on empty result', () => {
			expect(db.users.where('name').equals('Nobody').first()).toBeUndefined();
		});

		test('last returns undefined on empty result', () => {
			expect(db.users.where('name').equals('Nobody').last()).toBeUndefined();
		});

		test('count reflects the number of matched documents', () => {
			expect(db.users.where({ active: true }).count()).toBe(3);
			expect(db.users.where('active').equals(false).count()).toBe(1);
		});
	});

	/* ================================================================== */
	/*  modify / delete via query                                         */
	/* ================================================================== */

	describe('query .modify() / .delete()', () => {
		test('modify updates all matched documents', () => {
			db.users.where('active').equals(true).modify({ age: 99 });
			// Alice, Cara, Daniel were active
			expect(db.users.get(1)!.age).toBe(99);
			expect(db.users.get(3)!.age).toBe(99);
			expect(db.users.get(4)!.age).toBe(99);
			// Bob untouched
			expect(db.users.get(2)!.age).toBe(30);
		});

		test('modify with limit only modifies the limited set', () => {
			db.users.where('active').equals(true).limit(1).modify({ age: 77 });
			const updated = db.users.toArray().filter((u) => u.age === 77);
			expect(updated).toHaveLength(1);
		});

		test('delete removes all matched documents', () => {
			db.users.where('active').equals(false).delete();
			// Bob was inactive
			expect(db.users.get(2)).toBeUndefined();
			expect(db.users.count()).toBe(3);
		});
	});
});
