import { createUserStore } from './helpers';
import { Ramify, type Schema } from '../dist/index.js';

describe('Immutability – Lazy Clone Proxy', () => {
	let db: ReturnType<typeof createUserStore>;

	beforeEach(() => {
		db = createUserStore();
		db.users.add({
			id: 1,
			name: 'Alice',
			age: 25,
			roles: ['admin', 'editor'],
			active: true,
			stats: { score: 100, level: 5 },
		});
	});

	/* ================================================================== */
	/*  Top-level mutation protection                                     */
	/* ================================================================== */

	describe('top-level fields', () => {
		test('mutating a top-level field on get() does not affect the store', () => {
			const doc = db.users.get(1)!;
			doc.name = 'Mutated';

			const fresh = db.users.get(1)!;
			expect(fresh.name).toBe('Alice');
		});

		test('the local proxy reflects the top-level mutation', () => {
			const doc = db.users.get(1)!;
			doc.name = 'Mutated';

			// After the first write, the proxy creates a clone and writes succeed
			expect(doc.name).toBe('Mutated');
		});
	});

	/* ================================================================== */
	/*  Nested object mutation protection                                 */
	/* ================================================================== */

	describe('nested objects', () => {
		test('mutating a nested object does not affect the store', () => {
			const doc = db.users.get(1)!;
			doc.stats.score = 999;

			const fresh = db.users.get(1)!;
			expect(fresh.stats.score).toBe(100);
		});

		test('nested mutation persists on the returned proxy own view', () => {
			const doc = db.users.get(1)!;
			doc.stats.score = 999;

			expect(doc.stats.score).toBe(999);
		});

		test('deeply nested mutations (3+ levels) persist on the returned proxy', () => {
			type DeepDoc = { id: number; a: { b: { c: { d: number } } } };
			const deepDb = new Ramify().createStore<{ items: Schema<DeepDoc, 'id'> }>({
				items: { primaryKey: 'id' },
			});

			deepDb.items.add({ id: 1, a: { b: { c: { d: 42 } } } });

			const doc = deepDb.items.get(1)!;
			doc.a.b.c.d = 100;
			expect(doc.a.b.c.d).toBe(100);

			// Store is still immutable
			expect(deepDb.items.get(1)!.a.b.c.d).toBe(42);
		});

		test('mutating a pre-extracted nested object reference persists across root and nested', () => {
			const doc = db.users.get(1)!;
			const stats = doc.stats; // extracted before any writes
			doc.name = 'Bob'; // writes root first
			stats.score = 777; // writes to pre-extracted nested ref

			expect(stats.score).toBe(777);
			expect(doc.stats.score).toBe(777);
			expect(doc.name).toBe('Bob');

			// Store is unaffected
			expect(db.users.get(1)!.stats.score).toBe(100);
			expect(db.users.get(1)!.name).toBe('Alice');
		});
	});

	/* ================================================================== */
	/*  Array mutation protection                                         */
	/* ================================================================== */

	describe('arrays', () => {
		test('push on a returned array does not affect the store', () => {
			const doc = db.users.get(1)!;
			doc.roles.push('viewer');

			const fresh = db.users.get(1)!;
			expect(fresh.roles).toEqual(['admin', 'editor']);
		});

		test('array push persists on the returned proxy own view', () => {
			const doc = db.users.get(1)!;
			doc.roles.push('viewer');

			expect(doc.roles).toEqual(['admin', 'editor', 'viewer']);
		});

		test('splice on a returned array does not affect the store', () => {
			const doc = db.users.get(1)!;
			doc.roles.splice(0, 1); // Remove 'admin'

			const fresh = db.users.get(1)!;
			expect(fresh.roles).toEqual(['admin', 'editor']);
		});

		test('multiple mutating array operations (push, pop, shift, unshift, sort) persist on proxy', () => {
			const doc = db.users.get(1)!;
			doc.roles.push('new1');
			doc.roles.push('new2');
			expect(doc.roles).toEqual(['admin', 'editor', 'new1', 'new2']);

			doc.roles.pop();
			expect(doc.roles).toEqual(['admin', 'editor', 'new1']);

			doc.roles.shift();
			expect(doc.roles).toEqual(['editor', 'new1']);

			doc.roles.unshift('first');
			expect(doc.roles).toEqual(['first', 'editor', 'new1']);

			doc.roles.sort();
			expect(doc.roles).toEqual(['editor', 'first', 'new1']);

			// Store is still immutable
			expect(db.users.get(1)!.roles).toEqual(['admin', 'editor']);
		});
	});

	/* ================================================================== */
	/*  Independence between multiple get() calls                         */
	/* ================================================================== */

	describe('independence between returned copies', () => {
		test('two get() calls return independent objects', () => {
			const doc1 = db.users.get(1)!;
			const doc2 = db.users.get(1)!;

			doc1.name = 'Mutation1';

			// doc2 is unaffected
			expect(doc2.name).toBe('Alice');
		});
	});

	/* ================================================================== */
	/*  toArray / query results                                           */
	/* ================================================================== */

	describe('query results are also proxied', () => {
		test('toArray results are protected from mutation', () => {
			const arr = db.users.toArray();
			arr[0].name = 'Hacked';

			expect(db.users.get(1)!.name).toBe('Alice');
		});

		test('where().first() returns a protected proxy', () => {
			const doc = db.users.where('name').equals('Alice').first()!;
			doc.name = 'Hacked';

			expect(db.users.get(1)!.name).toBe('Alice');
		});

		test('where().last() returns a protected proxy', () => {
			const doc = db.users.where('name').equals('Alice').last()!;
			doc.age = 999;

			expect(db.users.get(1)!.age).toBe(25);
		});
	});

	/* ================================================================== */
	/*  Proxy traps: has / ownKeys / getOwnPropertyDescriptor             */
	/* ================================================================== */

	describe('proxy traps', () => {
		test('`in` operator works through the proxy', () => {
			const doc = db.users.get(1)!;
			expect('name' in doc).toBe(true);
			expect('nonexistent' in doc).toBe(false);
		});

		test('Object.keys works through the proxy', () => {
			const doc = db.users.get(1)!;
			const keys = Object.keys(doc);
			expect(keys).toContain('name');
			expect(keys).toContain('id');
		});

		test('delete operator triggers clone', () => {
			const doc = db.users.get(1)! as any;
			delete doc.name;
			expect(doc.name).toBeUndefined();

			// Store is unaffected
			expect(db.users.get(1)!.name).toBe('Alice');
		});
	});
});
