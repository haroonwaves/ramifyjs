import Benchmark from 'benchmark';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { Ramify, type Schema } from '../dist/index.js';

/* --------------------------------- */
/*           Message Type            */
/* --------------------------------- */

type Message = {
	id: string;
	content: string;
	senderId: string;
	channelId: string;
	createdAt: Date;
	isDeleted: boolean;

	metadata: {
		priority: 'low' | 'normal' | 'high';
		readBy: string[];
	};

	mentions: string[]; // User IDs mentioned
	tags: string[]; // Message tags
};

/* --------------------------------- */
/*           Config + CLI            */
/* --------------------------------- */

const SIZE = Number(process.argv[2]) || 100_000;
const OUT_DIR = path.resolve(process.cwd(), 'benchmark');
const OUT_FILE = path.join(OUT_DIR, 'benchmark.md');

/* --------------------------------- */
/*      Environment Detection        */
/* --------------------------------- */

function getEnvironmentInfo() {
	const cpus = os.cpus();
	const cpuModel = cpus[0]?.model || 'Unknown';
	const cpuCount = cpus.length;

	const totalMemGB = (os.totalmem() / 1024 / 1024 / 1024).toFixed(2);
	const platform = os.platform();
	const arch = os.arch();

	// Detect runtime
	let runtime = 'Node.js';
	// @ts-ignore - Bun and Deno are runtime-specific globals
	if (typeof globalThis.Bun !== 'undefined') {
		runtime = 'Bun';
		// @ts-ignore
	} else if (typeof globalThis.Deno !== 'undefined') {
		runtime = 'Deno';
	}

	const version = process.version;

	return {
		cpu: `${cpuModel} (${cpuCount} cores)`,
		ram: `${totalMemGB} GB`,
		os: `${platform} ${arch}`,
		runtime: `${runtime} ${version}`,
	};
}

function getMemoryUsage() {
	const used = process.memoryUsage();
	return {
		heapUsed: (used.heapUsed / 1024 / 1024).toFixed(2),
	};
}

/* --------------------------------- */
/*         Store + Data Setup        */
/* --------------------------------- */

function createStore() {
	return new Ramify().createStore<{
		messages: Schema<Message, 'id'>;
	}>({
		messages: {
			primaryKey: 'id',
			indexes: ['senderId', 'channelId', 'metadata.priority'],
			multiEntry: ['mentions', 'tags', 'metadata.readBy'],
		},
	});
}

function genMessage(id: number): Message {
	const priorities: Array<'low' | 'normal' | 'high'> = ['low', 'normal', 'high'];
	const channelIds = ['general', 'random', 'tech', 'announcements'];
	const tags = ['urgent', 'question', 'announcement', 'discussion', 'help'];

	return {
		id: `msg-${id}`,
		content: `This is message number ${id} with some content`,
		senderId: `user-${(id % 100) + 1}`,
		channelId: channelIds[id % channelIds.length],
		createdAt: new Date(Date.now() - id * 1000),
		isDeleted: id % 50 === 0,
		metadata: {
			priority: priorities[id % 3],
			readBy: id % 5 === 0 ? [`user-${id % 10}`, `user-${(id % 10) + 1}`] : [],
		},
		mentions: id % 3 === 0 ? [`user-${id % 20}`, `user-${(id % 20) + 1}`] : [],
		tags:
			id % 2 === 0
				? [tags[id % tags.length]]
				: [tags[id % tags.length], tags[(id + 1) % tags.length]],
	};
}

function seed(db: ReturnType<typeof createStore>) {
	const batch: Message[] = [];
	const chunk = 500;

	for (let i = 1; i <= SIZE; i++) {
		batch.push(genMessage(i));
		if (batch.length >= chunk) {
			db.messages.bulkAdd(batch.splice(0));
		}
	}
	if (batch.length) db.messages.bulkAdd(batch);

	return { records: SIZE, chunk };
}

/* --------------------------------- */
/*        Benchmark Results          */
/* --------------------------------- */

interface BenchmarkResult {
	name: string;
	opsPerSec: number;
	rme: number;
	samples: number;
}

/* --------------------------------- */
/*           Markdown Writer         */
/* --------------------------------- */

function writeMarkdown(seedInfo: any, results: BenchmarkResult[], env: any, memoryStats: any) {
	if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

	let md = `# Ramify Performance Benchmark\n\n`;
	md += `> Benchmarked using [Benchmark.js](https://benchmarkjs.com/) for statistically significant results.\n\n`;

	md += `## Environment\n\n`;
	md += `- **CPU:** ${env.cpu}\n`;
	md += `- **RAM:** ${env.ram}\n`;
	md += `- **OS:** ${env.os}\n`;
	md += `- **Runtime:** ${env.runtime}\n`;
	md += `- **Flags:** None\n\n`;

	md += `## Memory Usage\n\n`;
	md += `| Scenario | Heap Used (MB) |\n`;
	md += `|----------|----------------|\n`;
	md += `| Empty DB | ${memoryStats.empty} |\n`;
	md += `| After Load (${SIZE.toLocaleString()} records) | ${memoryStats.afterLoad} |\n`;
	md += `| With Indexes | ${memoryStats.withIndexes} |\n\n`;

	md += `---\n\n`;

	md += `## Results\n\n`;
	md += `**Dataset:** ${SIZE.toLocaleString()} messages\n\n`;
	md += `| Operation | ms/op | Ops/sec | ±% | Samples |\n`;
	md += `|-----------|------:|--------:|---:|--------:|\n`;

	for (const r of results) {
		const opsPerSec = r.opsPerSec.toLocaleString('en-US', { maximumFractionDigits: 0 });
		const msPerOp = r.opsPerSec > 0 ? (1000 / r.opsPerSec).toFixed(6) : '0';
		const rme = r.rme.toFixed(2);
		md += `| ${r.name} | ${msPerOp} | ${opsPerSec} | ${rme} | ${r.samples} |\n`;
	}

	md += `\n---\n\n`;
	md += `*All benchmarks run until achieving statistical significance.*\n`;

	fs.writeFileSync(OUT_FILE, md, 'utf8');
	console.log(`\n✓ Results written to ${OUT_FILE}\n`);
}

/* --------------------------------- */
/*               Run                 */
/* --------------------------------- */

function run() {
	console.log(`\n🚀 Ramify Benchmark (${SIZE.toLocaleString()} messages)\n`);

	const env = getEnvironmentInfo();

	// Measure truly empty state
	const emptyMem = getMemoryUsage();

	const db = createStore();
	const seedInfo = seed(db);

	const afterLoadMem = getMemoryUsage();
	const memoryStats = {
		empty: emptyMem.heapUsed,
		afterLoad: afterLoadMem.heapUsed,
		withIndexes: afterLoadMem.heapUsed,
	};

	console.log(`✓ Seeded ${seedInfo.records.toLocaleString()} records\n`);
	console.log(`Running benchmarks...\n`);

	const suite = new Benchmark.Suite();
	const results: BenchmarkResult[] = [];

	// Separate counters to avoid ID collisions
	let addCounter = SIZE + 10000;
	let putCounter = SIZE + 20000;
	let bulkAddCounter = SIZE + 30000;

	// Pre-populate records for delete benchmarks
	const deletePoolSize = 1000;
	const deleteIds: string[] = [];
	const bulkDeletePoolSize = 100;
	const bulkDeleteBatches: string[][] = [];

	console.log('Pre-populating records for delete benchmarks...');

	// Create pool for single deletes
	for (let i = 0; i < deletePoolSize; i++) {
		const id = `msg-delete-${i}`;
		db.messages.put({ ...genMessage(i), id });
		deleteIds.push(id);
	}

	// Create pool for bulk deletes (batches of 100)
	for (let i = 0; i < bulkDeletePoolSize; i++) {
		const batch: string[] = [];
		for (let j = 0; j < 100; j++) {
			const id = `msg-bulkdelete-${i}-${j}`;
			db.messages.put({ ...genMessage(i * 100 + j), id });
			batch.push(id);
		}
		bulkDeleteBatches.push(batch);
	}

	console.log('✓ Pre-populated delete test records\n');

	let deleteCounter = 0;
	let bulkDeleteCounter = 0;

	suite
		// Primary key operations
		.add('get(id)', () => {
			db.messages.get('msg-1');
		})
		.add('bulkGet(50 ids)', () => {
			db.messages.bulkGet(Array.from({ length: 50 }, (_, i) => `msg-${i + 1}`));
		})
		.add('has(id)', () => {
			db.messages.has('msg-1');
		})
		.add('count()', () => {
			db.messages.count();
		})

		// Index queries
		.add('where(criteriaObject)', () => {
			db.messages.where({ channelId: 'general' }).toArray();
		})
		.add('where(index).equals()', () => {
			db.messages.where('channelId').equals('general').toArray();
		})
		.add('where(index).anyOf()', () => {
			db.messages.where('tags').anyOf(['urgent', 'question']).toArray();
		})
		.add('where(multiEntry).allOf()', () => {
			db.messages.where('tags').allOf(['urgent', 'question']).toArray();
		})

		// Write operations
		.add('add(doc)', () => {
			db.messages.add(genMessage(addCounter++));
		})
		.add('put(doc)', () => {
			db.messages.put(genMessage(putCounter++));
		})
		.add('update(id, changes)', () => {
			db.messages.update('msg-1', { isDeleted: false });
		})
		.add('bulkPut(100 docs)', () => {
			const start = bulkAddCounter;
			bulkAddCounter += 100;
			db.messages.bulkPut(Array.from({ length: 100 }, (_, i) => genMessage(start + i)));
		})
		.add('bulkUpdate(50 ids)', () => {
			const ids = Array.from({ length: 50 }, (_, i) => `msg-${i + 1}`);
			db.messages.bulkUpdate(ids, { isDeleted: false });
		})
		.add('where(index).modify()', () => {
			db.messages.where('channelId').equals('general').limit(10).modify({ isDeleted: false });
		})

		// Delete operations - cycle through pre-populated pools
		.add('delete(id)', () => {
			const id = deleteIds[deleteCounter++ % deletePoolSize];
			db.messages.delete(id);
		})
		.add('bulkDelete(100 ids)', () => {
			const batch = bulkDeleteBatches[bulkDeleteCounter++ % bulkDeletePoolSize];
			db.messages.bulkDelete(batch);
		})

		.on('cycle', (event: Benchmark.Event) => {
			const bench = event.target;
			console.log(`  ${String(bench)}`);

			results.push({
				name: bench.name || 'unknown',
				opsPerSec: bench.hz || 0,
				rme: bench.stats?.rme || 0,
				samples: bench.stats?.sample?.length || 0,
			});
		})
		.on('complete', () => {
			console.log(`\n✓ Benchmarks completed!\n`);
			writeMarkdown(seedInfo, results, env, memoryStats);
		})
		.run({ async: false });
}

run();
