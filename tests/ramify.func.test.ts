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
});
