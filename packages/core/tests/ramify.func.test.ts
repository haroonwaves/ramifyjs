import { Ramify } from '../dist/index.js';
import type { Schema } from '../dist/index.js';

type User = {
	id: number;
	name: string;
	age: number;
	roles: string[];
	active: boolean;
	stats: { score: number; level: number };
};

describe('Ramify – functional test suite (refactored dataset)', () => {
	let db: ReturnType<typeof createStore>;

	function createStore() {
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

	// Compact predictable seed
	function seedUsers() {
		db.users.bulkAdd([
			{
				id: 1,
				name: 'Alice',
				age: 25,
				roles: ['admin'],
				active: true,
				stats: { score: 10, level: 1 },
			},
			{
				id: 2,
				name: 'Bob',
				age: 30,
				roles: ['editor'],
				active: false,
				stats: { score: 20, level: 2 },
			},
			{
				id: 3,
				name: 'Cara',
				age: 22,
				roles: ['viewer'],
				active: true,
				stats: { score: 30, level: 3 },
			},
			{
				id: 4,
				name: 'Daniel',
				age: 40,
				roles: ['admin', 'ops'],
				active: true,
				stats: { score: 40, level: 4 },
			},
		]);
	}

	beforeEach(() => {
		db = createStore();
	});

	/* -------------------------------------------------------------------------- */
	/*                               CRUD + Indexing                              */
	/* -------------------------------------------------------------------------- */

	test('put/add/get/bulkGet/bulkPut & index population', () => {
		// single add
		const pk1 = db.users.add({
			id: 1,
			name: 'Alice',
			age: 25,
			roles: ['admin'],
			active: true,
			stats: { score: 1, level: 1 },
		});
		expect(pk1).toBe(1);

		// duplicate PK throws
		expect(() =>
			db.users.add({
				id: 1,
				name: 'Alice',
				age: 25,
				roles: ['admin'],
				active: true,
				stats: { score: 1, level: 1 },
			})
		).toThrow();

		// put replaces
		const pkPut = db.users.put({
			id: 1,
			name: 'Alice2',
			age: 26,
			roles: ['admin'],
			active: false,
			stats: { score: 2, level: 2 },
		});
		expect(pkPut).toBe(1);
		expect(db.users.get(1)!.name).toBe('Alice2');

		// bulkAdd + bulkGet
		const pks = db.users.bulkAdd([
			{
				id: 2,
				name: 'Bob',
				age: 30,
				roles: ['editor'],
				active: false,
				stats: { score: 20, level: 2 },
			},
			{
				id: 3,
				name: 'Cara',
				age: 22,
				roles: ['viewer'],
				active: true,
				stats: { score: 30, level: 3 },
			},
		]);

		expect(pks).toEqual([2, 3]);

		const many = db.users.bulkGet([1, 2, 3]);
		expect(many.filter(Boolean).length).toBe(3);

		// index test: name
		const byName = db.users.where('name').anyOf(['Alice2']).toArray();
		expect(byName.length).toBe(1);

		// multiEntry index: roles
		const byRole = db.users.where('roles').anyOf(['editor']).count();
		expect(byRole).toBe(1);
	});

	/* -------------------------------------------------------------------------- */
	/*                                Update Tests                                */
	/* -------------------------------------------------------------------------- */

	test('update / bulkUpdate / re-indexing', () => {
		seedUsers();

		// update non-index
		expect(db.users.update(1, { age: 26 })).toBe(1);

		// update indexed (name)
		expect(db.users.update(2, { name: 'Bob2' })).toBe(2);
		expect(db.users.where('name').equals('Bob2').count()).toBe(1);

		// update PK (simulate)
		db.users.put({
			id: 10,
			name: 'PKTest',
			age: 50,
			roles: [],
			active: true,
			stats: { score: 99, level: 9 },
		});
		expect(db.users.update(10, { id: 11 })).toBe(10);
		expect(db.users.get(10)).toBeUndefined();
		expect(db.users.get(11)).toBeDefined();

		// update missing
		expect(db.users.update(9999, { name: 'Nope' })).toBeUndefined();
	});

	/* -------------------------------------------------------------------------- */
	/*                              Delete / Clear                                */
	/* -------------------------------------------------------------------------- */

	test('delete / bulkDelete / clear', () => {
		seedUsers();

		expect(db.users.delete(1)).toBe(1);
		expect(db.users.get(1)).toBeUndefined();

		const deleted = db.users.bulkDelete([2, 999]);
		expect(deleted[0]).toBe(2);
		expect(deleted[1]).toBeUndefined();

		db.users.clear();
		expect(db.users.count()).toBe(0);
	});

	/* -------------------------------------------------------------------------- */
	/*                             Query Pipelines                                */
	/* -------------------------------------------------------------------------- */

	test('orderBy / limit / offset / filter / first / last', () => {
		seedUsers();

		const arr = db.users.orderBy('age').limit(2).toArray();
		expect(arr.length).toBe(2);
		expect(arr[0].age).toBe(22);

		const second = db.users.orderBy('age').limit(1).offset(1).first();
		expect(second?.age).toBe(25);

		const last = db.users.orderBy('age').reverse().first();
		expect(last?.age).toBe(40);
	});

	/* -------------------------------------------------------------------------- */
	/*                               Immutability                                 */
	/* -------------------------------------------------------------------------- */

	test('lazy clone proxy prevents direct mutation', () => {
		db.users.add({
			id: 1,
			name: 'Test',
			age: 20,
			roles: [],
			active: true,
			stats: { score: 1, level: 1 },
		});

		const item = db.users.get(1)!;
		item.name = 'mutated';
		item.stats.score = 999;

		const again = db.users.get(1)!;
		expect(again.name).toBe('Test');
		expect(again.stats.score).toBe(1);
	});

	/* -------------------------------------------------------------------------- */
	/*                                Observers                                   */
	/* -------------------------------------------------------------------------- */

	test('subscribe / unsubscribe behavior (debounced)', (done) => {
		const received: string[] = [];

		const unsubscribe = db.users.subscribe((type) => {
			received.push(type);
		});

		db.users.add({
			id: 1,
			name: 'Alice',
			age: 20,
			roles: [],
			active: true,
			stats: { score: 1, level: 1 },
		});
		db.users.add({
			id: 2,
			name: 'Bob',
			age: 20,
			roles: [],
			active: true,
			stats: { score: 1, level: 1 },
		});

		setTimeout(() => {
			expect(received.includes('create')).toBeTruthy();
			unsubscribe();
			done();
		}, 120);
	}, 1000);

	/* -------------------------------------------------------------------------- */
	/*                               keys() / has()                                */
	/* -------------------------------------------------------------------------- */

	test('keys() and has()', () => {
		seedUsers();

		const keys = db.users.keys();
		expect(keys.length).toBe(4);
		expect(keys.sort()).toEqual([1, 2, 3, 4]);

		expect(db.users.has(1)).toBe(true);
		expect(db.users.has(999)).toBe(false);

		db.users.delete(1);
		expect(db.users.has(1)).toBe(false);
		expect(db.users.keys().length).toBe(3);
	});

	/* -------------------------------------------------------------------------- */
	/*                         returned docs are detached                         */
	/* -------------------------------------------------------------------------- */

	test('returned docs are detached (no shared refs)', () => {
		db.users.add({
			id: 1,
			name: 'X',
			age: 25,
			roles: ['a'],
			active: true,
			stats: { score: 100, level: 5 },
		});

		const doc1 = db.users.get(1)!;
		doc1.name = 'change';
		doc1.stats.score = 0;

		const doc2 = db.users.get(1)!;
		expect(doc2.name).toBe('X');
		expect(doc2.stats.score).toBe(100);
	});

	/* -------------------------------------------------------------------------- */
	/*                    where() exact equality matching only                    */
	/* -------------------------------------------------------------------------- */

	test('where() performs exact equality matching, not IN queries', () => {
		seedUsers();

		// Exact match on single value
		const alice = db.users.where({ name: 'Alice' }).toArray();
		expect(alice.length).toBe(1);
		expect(alice[0].name).toBe('Alice');

		// Exact match on boolean
		const activeUsers = db.users.where({ active: true }).toArray();
		expect(activeUsers.length).toBe(3);

		// Exact match on number
		const age25 = db.users.where({ age: 25 }).toArray();
		expect(age25.length).toBe(1);

		// Exact match on array field - should match the exact array
		const adminOnly = db.users.where({ roles: ['admin'] }).toArray();
		expect(adminOnly.length).toBe(1);
		expect(adminOnly[0].id).toBe(1);

		// Different array should not match
		const editorOnly = db.users.where({ roles: ['editor'] }).toArray();
		expect(editorOnly.length).toBe(1);
		expect(editorOnly[0].id).toBe(2);

		// For IN queries, must use anyOf()
		const adminsAndEditors = db.users.where('roles').anyOf(['admin', 'editor']).toArray();
		expect(adminsAndEditors.length).toBe(3); // Alice (admin), Bob (editor), Daniel (admin, ops)

		// Multiple criteria - all must match exactly
		const activeAlice = db.users.where({ name: 'Alice', active: true }).toArray();
		expect(activeAlice.length).toBe(1);
		expect(activeAlice[0].id).toBe(1);
	});
});
