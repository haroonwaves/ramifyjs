import { Ramify } from '../dist/index.js';
import type { Schema } from '../dist/index.js';

type User = { id: number; name: string; tags?: string[]; age: number };
type Nested = { id: string; meta: { score: number; flags: string[] } };

describe('Ramify - functional test suite', () => {
	let db: ReturnType<typeof createStore>;
	function createStore() {
		return new Ramify().createStore<{
			users: Schema<User, 'id'>;
			nested: Schema<Nested, 'id'>;
		}>({
			users: { primaryKey: 'id', indexes: ['name', 'age'], multiEntry: ['tags'] },
			nested: { primaryKey: 'id', indexes: ['meta'], multiEntry: ['meta'] },
		});
	}

	beforeEach(() => {
		db = createStore();
	});

	test('put/add/get/bulkGet/bulkPut & index population', () => {
		// add single
		const pk1 = db.users.add({ id: 1, name: 'Alice', tags: ['a', 'b'], age: 30 });
		expect(pk1).toBe(1);

		// adding same PK should throw
		expect(() => db.users.add({ id: 1, name: 'Alice', age: 30 })).toThrow();

		// put replaces
		const pk1put = db.users.put({ id: 1, name: 'Alice (v2)', tags: ['b'], age: 31 });
		expect(pk1put).toBe(1);
		const got = db.users.get(1)!;
		expect(got.name).toBe('Alice (v2)');

		// bulkAdd & bulkGet
		const pks = db.users.bulkAdd([
			{ id: 2, name: 'Bob', tags: ['b'], age: 21 },
			{ id: 3, name: 'Cara', tags: ['c'], age: 22 },
		]);
		expect(pks).toEqual([2, 3]);
		const many = db.users.bulkGet([1, 2, 3]);
		expect(many.filter((x) => !!x).length).toBe(3);

		// indexes: query by name (index)
		const q = db.users.where('name').anyOf(['Alice (v2)']).toArray();
		expect(q.length).toBe(1);

		// multiEntry index match
		const tagMatch = db.users.where('tags').anyOf(['b']).count();
		expect(tagMatch).toBeGreaterThanOrEqual(2);
	});

	test('update / bulkUpdate / reindex when indexed fields change', () => {
		db.users.bulkPut([
			{ id: 10, name: 'X', tags: ['x'], age: 40 },
			{ id: 11, name: 'Y', tags: ['y'], age: 41 },
		]);

		// update a non-index field
		expect(db.users.update(10, { age: 41 })).toBe(1);
		// update an indexed field (name) -> should reindex
		expect(db.users.update(11, { name: 'Y2' })).toBe(1);
		expect(db.users.where('name').equals('Y2').count()).toBe(1);

		// update primary key (simulate) -> should remove old and add new
		db.users.put({ id: 100, name: 'PKTest', tags: ['p'], age: 50 });
		// update changing primaryKey by calling update with change to primary key (library will delete + put)
		expect(db.users.update(100, { id: 101, name: 'PKTest2' })).toBe(1);
		expect(db.users.get(100)).toBeUndefined();
		expect(db.users.get(101)).toBeDefined();
		expect(db.users.update(9999, { name: 'Nope' })).toBe(0);
	});

	test('delete / bulkDelete / clear', () => {
		db.users.bulkPut([
			{ id: 21, name: 'D', tags: ['t'], age: 20 },
			{ id: 22, name: 'E', tags: ['t'], age: 25 },
		]);

		expect(db.users.delete(21)).toBe(21);
		expect(db.users.get(21)).toBeUndefined();

		const deleted = db.users.bulkDelete([22, 999]);
		expect(deleted[0]).toBe(22);
		expect(deleted[1]).toBeUndefined();

		db.users.clear();
		expect(db.users.count()).toBe(0);
	});

	test('query pipeline: orderBy / limit / offset / filter / first / last / toArray', () => {
		db.users.bulkPut([
			{ id: 31, name: 'A', tags: ['a'], age: 10 },
			{ id: 32, name: 'B', tags: ['b'], age: 20 },
			{ id: 33, name: 'C', tags: ['c'], age: 30 },
			{ id: 34, name: 'D', tags: ['d'], age: 40 },
		]);

		const arr = db.users.where({}).orderBy('age').limit(2).toArray();
		expect(arr.length).toBe(2);
		expect(arr[0].age).toBe(10);

		const second = db.users.orderBy('age').limit(1).offset(1).first();
		expect(second?.age).toBe(20);

		const last = db.users.orderBy('age').reverse().first();
		expect(last?.age).toBe(40);
	});

	test('lazy clone proxy prevents direct mutation', () => {
		db.users.add({ id: 41, name: 'Immutable', tags: [], age: 99 });
		const item = db.users.get(41)!;
		// direct mutation to returned object should not change stored value
		item.name = 'mutated';
		const again = db.users.get(41)!;
		expect(again.name).toBe('Immutable');
	});

	test('subscribe / unsubscribe behavior (observer debounced)', (done) => {
		// small test for subscribe
		const received: string[] = [];
		const unsubscribe = db.users.subscribe((op: string) => {
			received.push(op);
		});

		db.users.add({ id: 51, name: 'S1', tags: [], age: 1 });
		db.users.add({ id: 52, name: 'S2', tags: [], age: 2 });

		// debounce delay in implementation is 70ms; wait slightly longer
		setTimeout(() => {
			expect(received.includes('create')).toBeTruthy();
			unsubscribe();
			done();
		}, 120);
	}, 1000);

	test('range operators: between / above / below / aboveOrEqual / belowOrEqual', () => {
		db.users.bulkPut([
			{ id: 61, name: 'User1', tags: [], age: 10 },
			{ id: 62, name: 'User2', tags: [], age: 20 },
			{ id: 63, name: 'User3', tags: [], age: 30 },
			{ id: 64, name: 'User4', tags: [], age: 40 },
			{ id: 65, name: 'User5', tags: [], age: 50 },
		]);

		// between
		const between = db.users.where('age').between(20, 40).toArray();
		expect(between.length).toBe(3);
		expect(between.map((u) => u.age).sort()).toEqual([20, 30, 40]);

		// above
		const above = db.users.where('age').above(30).toArray();
		expect(above.length).toBe(2);
		expect(above.every((u) => u.age > 30)).toBe(true);

		// below
		const below = db.users.where('age').below(30).toArray();
		expect(below.length).toBe(2);
		expect(below.every((u) => u.age < 30)).toBe(true);

		// aboveOrEqual
		const aboveOrEqual = db.users.where('age').aboveOrEqual(30).toArray();
		expect(aboveOrEqual.length).toBe(3);
		expect(aboveOrEqual.every((u) => u.age >= 30)).toBe(true);

		// belowOrEqual
		const belowOrEqual = db.users.where('age').belowOrEqual(30).toArray();
		expect(belowOrEqual.length).toBe(3);
		expect(belowOrEqual.every((u) => u.age <= 30)).toBe(true);
	});

	test('notEquals operator', () => {
		db.users.bulkPut([
			{ id: 71, name: 'Active', tags: [], age: 25 },
			{ id: 72, name: 'Inactive', tags: [], age: 26 },
			{ id: 73, name: 'Active', tags: [], age: 27 },
		]);

		const notActive = db.users.where('name').notEquals('Active').toArray();
		expect(notActive.length).toBe(1);
		expect(notActive[0].name).toBe('Inactive');

		// notEquals with age
		const notAge25 = db.users.where('age').notEquals(25).toArray();
		expect(notAge25.length).toBe(2);
		expect(notAge25.every((u) => u.age !== 25)).toBe(true);
	});

	test('keys() and has() methods', () => {
		db.users.bulkPut([
			{ id: 81, name: 'K1', tags: [], age: 1 },
			{ id: 82, name: 'K2', tags: [], age: 2 },
			{ id: 83, name: 'K3', tags: [], age: 3 },
		]);

		// keys() should return all primary keys
		const keys = db.users.keys();
		expect(keys.length).toBe(3);
		expect(keys).toContain(81);
		expect(keys).toContain(82);
		expect(keys).toContain(83);

		// has() should check existence
		expect(db.users.has(81)).toBe(true);
		expect(db.users.has(82)).toBe(true);
		expect(db.users.has(999)).toBe(false);

		// delete and check again
		db.users.delete(81);
		expect(db.users.has(81)).toBe(false);
		expect(db.users.keys().length).toBe(2);
	});

	test('range operators with orderBy and limit', () => {
		db.users.bulkPut([
			{ id: 91, name: 'U1', tags: [], age: 15 },
			{ id: 92, name: 'U2', tags: [], age: 25 },
			{ id: 93, name: 'U3', tags: [], age: 35 },
			{ id: 94, name: 'U4', tags: [], age: 45 },
		]);

		const result = db.users.where('age').between(20, 50).orderBy('age').limit(2).toArray();
		expect(result.length).toBe(2);
		expect(result[0].age).toBe(25);
		expect(result[1].age).toBe(35);
	});

	test('returned docs are fully detached (no shared references)', () => {
		const id = db.nested.add({
			id: 'player1',
			meta: { score: 92, flags: ['top'] },
		});

		// 1) read document
		const doc1 = db.nested.get(id);

		// mutate field
		doc1!.id = 'player2';
		doc1!.meta.score = 60;
		doc1!.meta.flags = ['middle', 'final'];

		const doc2 = db.nested.get(id);

		// original must not change
		expect(doc2!.id).toBe('player1');
		expect(doc2!.meta.score).toBe(92);
		expect(doc2!.meta.flags).toEqual(['top']);
	});
});
