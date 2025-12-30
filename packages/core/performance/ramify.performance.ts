import fs from 'fs';
import path from 'path';
import { performance } from 'perf_hooks';
import { Ramify, type Schema } from '../dist/index.js';

/* --------------------------------- */
/*             User Type             */
/* --------------------------------- */

type User = {
	id: number;
	name: string;
	age: number;
	roles: string[];
	active: boolean;
	stats: { score: number; level: number };
};

/* --------------------------------- */
/*           Config + CLI            */
/* --------------------------------- */

const SIZE = Number(process.argv[2]) || 10_000;
const OUT_DIR = path.resolve(process.cwd(), 'performance');
const OUT_FILE = path.join(OUT_DIR, 'performance-results.md');

const OPS = {
	GET_EXISTING: 1000,
	GET_MISSING: 1000,
	BULK_GET: 50,
	WHERE_EQUALS: 100,
	FILTER: 100,
	SORTBY_LIMIT: 1000,
	PUT: 50,
	UPDATE: 100,
	BULK_ADD: 100,
	DELETE: 50,
	BULK_DELETE: 100,
	MODIFY: 100,
	QUERY_DELETE: 100,
};

/* --------------------------------- */
/*         Store + Data Setup        */
/* --------------------------------- */

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

function genUser(id: number): User {
	return {
		id,
		name: `User${id}`,
		age: 20 + (id % 30),
		roles: id % 3 === 0 ? ['admin'] : ['viewer'],
		active: id % 2 === 0,
		stats: { score: id * 2, level: id % 10 },
	};
}

function seed(db: ReturnType<typeof createStore>) {
	const batch: User[] = [];
	const chunk = 500;

	for (let i = 1; i <= SIZE; i++) {
		batch.push(genUser(i));
		if (batch.length >= chunk) {
			db.users.bulkAdd(batch.splice(0));
		}
	}
	if (batch.length) db.users.bulkAdd(batch);

	return { records: SIZE, chunk };
}

/* --------------------------------- */
/*            Timing Helper          */
/* --------------------------------- */

function runTimed(label: string, ops: number, fn: () => void) {
	const t0 = performance.now();
	fn();
	const ms = performance.now() - t0;
	return {
		label,
		ops,
		ms,
		msPerOp: ms / ops,
		opsPerSec: ops / (ms / 1000),
	};
}

/* --------------------------------- */
/*            Benchmarks             */
/* --------------------------------- */

function runBenchmarks(db: ReturnType<typeof createStore>) {
	const r: any[] = [];

	const users = db.users;

	r.push(
		runTimed('get existing', OPS.GET_EXISTING, () => {
			for (let i = 0; i < OPS.GET_EXISTING; i++) users.get(1);
		})
	);

	r.push(
		runTimed('get missing', OPS.GET_MISSING, () => {
			for (let i = 0; i < OPS.GET_MISSING; i++) users.get(9999999);
		})
	);

	r.push(
		runTimed('bulkGet small', OPS.BULK_GET, () => {
			users.bulkGet(Array.from({ length: OPS.BULK_GET }, (_, i) => i + 1));
		})
	);

	r.push(
		runTimed('where().equals()', OPS.WHERE_EQUALS, () => {
			users.where('age').equals(25).limit(OPS.WHERE_EQUALS).toArray();
		})
	);

	r.push(
		runTimed('filter(active)', SIZE, () => {
			users
				.filter((u) => u.active)
				.limit(OPS.FILTER)
				.toArray();
		})
	);

	r.push(
		runTimed('sortBy(age).limit()', OPS.SORTBY_LIMIT, () => {
			users.sortBy('age').limit(OPS.SORTBY_LIMIT).toArray();
		})
	);

	r.push(
		runTimed('put()', OPS.PUT, () => {
			for (let i = 0; i < OPS.PUT; i++) users.put(genUser(1));
		})
	);

	r.push(
		runTimed('update()', OPS.UPDATE, () => {
			for (let i = 0; i < OPS.UPDATE; i++) users.update(1, { active: i % 2 === 0 });
		})
	);

	r.push(
		runTimed('bulkAdd (100)', OPS.BULK_ADD, () => {
			users.bulkAdd(Array.from({ length: OPS.BULK_ADD }, (_, i) => genUser(SIZE + i + 1)));
		})
	);

	r.push(
		runTimed('delete()', OPS.DELETE, () => {
			for (let i = 0; i < OPS.DELETE; i++) users.delete(SIZE + 1);
		})
	);

	r.push(
		runTimed('bulkDelete (100)', OPS.BULK_DELETE, () => {
			const ids = Array.from({ length: OPS.BULK_DELETE }, (_, i) => SIZE + 200 + i);
			users.bulkDelete(ids);
		})
	);

	r.push(
		runTimed('modify() 100 docs', OPS.MODIFY, () => {
			users.where('active').equals(true).limit(OPS.MODIFY).modify({ active: false });
		})
	);

	r.push(
		runTimed('query.delete() 100 docs', OPS.QUERY_DELETE, () => {
			users.where('age').equals(25).limit(OPS.QUERY_DELETE).delete();
		})
	);

	r.push(
		runTimed('clear()', SIZE, () => {
			users.clear();
		})
	);

	return r;
}

/* --------------------------------- */
/*           Markdown Writer         */
/* --------------------------------- */

function writeMarkdown(seedInfo: any, results: any[]) {
	if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

	let md = `# Ramify Benchmark\n\n`;
	md += `Generated: ${new Date().toISOString()}\n\n`;
	md += `Dataset size: **${SIZE} users**\n\n`;

	md += `## Initial Insert\n`;
	md += `- Records: ${seedInfo.records}\n`;
	md += `- Chunk size: ${seedInfo.chunk}\n\n`;

	md += `## Operations\n`;
	md += `| Operation | Ops | Total ms | ms/op | ops/sec |\n`;
	md += `|-----------|-----|----------:|--------:|-----------:|\n`;

	for (const r of results) {
		md += `| ${r.label} | ${r.ops} | ${r.ms.toFixed(2)} | ${r.msPerOp.toFixed(6)} | ${Math.round(
			r.opsPerSec as number
		).toLocaleString()} |\n`;
	}

	fs.writeFileSync(OUT_FILE, md, 'utf8');
	console.log(`\nBenchmark written to ${OUT_FILE}\n`);
}

/* --------------------------------- */
/*               Run                 */
/* --------------------------------- */

function run() {
	console.log(`Benchmarking with ${SIZE} users...\n`);

	const db = createStore();

	const seedInfo = seed(db);

	const results = runBenchmarks(db);

	writeMarkdown(seedInfo, results);
}

run();
