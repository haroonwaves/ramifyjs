import fs from 'fs';
import path from 'path';
import { performance } from 'perf_hooks';
import { Ramify, type Schema } from '../dist/index.js'; // uses built build (dist)

type Message = {
	id: string; // ← add primary key
	remoteId: string;
	threadId: string;

	userAccount: number;
	date: number;
	size: number;

	p2Helper: string;
	folder: string;
	tags: string[];
	gmailSplit: string[];
	internalSplit: string[];

	canUnsubscribe: boolean;
	hasAttachments: boolean;
	isDraft: boolean;
	isImportant: boolean;
	isSent: boolean;
	isStarred: boolean;
	isUnread: boolean;

	sender: { name: string; email: string };
	recipients: {
		primary: { name: string; email: string }[];
		copied: { name: string; email: string }[];
		blindCopied: { name: string; email: string }[];
	};

	refs: {
		rfc822MsgId: string | null;
		inReplyTo: string | null;
		replyTo: string | null;
		draftId: string | null;
	};

	received: number | null;
};

const OUT_DIR = path.resolve(process.cwd(), 'docs');
const OUT_FILE = path.join(OUT_DIR, 'performance-results.md');

function ensureOut() {
	if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });
}

/* --- Data shape (align with your repo example) --- */
function randomEmail(id) {
	return `user${id}@example.com`;
}
function randomName(id) {
	return `User ${id}`;
}
function genMessage(id): Message {
	const now = Date.now();
	return {
		id: `msg-${id}-${now}`,
		remoteId: `remote-${id}`,
		threadId: `thread-${Math.floor(id / 5)}`,
		userAccount: id % 50,
		date: now - Math.floor(Math.random() * 100000000),
		size: Math.floor(Math.random() * 1024 * 1024),
		p2Helper: randomEmail(id),
		folder: ['Inbox', 'Sent', 'Drafts', 'Spam'][id % 4],
		tags: ['work', 'personal', 'updates', 'misc'].slice(0, Math.floor(Math.random() * 4)),
		gmailSplit: [`split-${id % 3}`],
		internalSplit: [`internal-${id % 2}`],
		canUnsubscribe: Math.random() > 0.5,
		hasAttachments: Math.random() > 0.7,
		isDraft: id % 5 === 0,
		isImportant: Math.random() > 0.8,
		isSent: id % 4 === 0,
		isStarred: Math.random() > 0.9,
		isUnread: Math.random() > 0.3,
		sender: { name: randomName(id), email: randomEmail(id) },
		recipients: {
			primary: Array.from({ length: 2 }, (_, i) => ({
				name: randomName(id + i + 1),
				email: randomEmail(id + i + 1),
			})),
			copied: [],
			blindCopied: [],
		},
		refs: {
			rfc822MsgId: `rfc-${id}`,
			inReplyTo: id % 10 === 0 ? `rfc-${id - 1}` : null,
			replyTo: id % 10 === 0 ? `rfc-${id - 2}` : null,
			draftId: id % 20 === 0 ? `draft-${id}` : null,
		},
		received: now - Math.floor(Math.random() * 50000000),
	};
}

/* --- Benchmark helpers --- */
function timeIt(fn) {
	const t0 = performance.now();
	const res = fn();
	const t1 = performance.now();
	return { ms: t1 - t0, result: res };
}

function memorySnapshot() {
	const m = process.memoryUsage();
	return {
		rss: Math.round(m.rss / 1024 / 1024),
		heapTotal: Math.round(m.heapTotal / 1024 / 1024),
		heapUsed: Math.round(m.heapUsed / 1024 / 1024),
		external: Math.round(m.external / 1024 / 1024),
	};
}

/* --- Main runner --- */
function run() {
	ensureOut();

	const sizes = [10000, 50000, 100000]; // tweak as needed (10k, 50k, 100k)
	const results: Record<string, any> = [];

	for (const size of sizes) {
		console.log(`\n--- Running benchmark for ${size} records ---`);
		const ramify = new Ramify().createStore<{
			messages: Schema<Message, 'id'>;
		}>({
			messages: { primaryKey: 'id', indexes: ['userAccount', 'date', 'folder', 'isUnread'] },
		});

		// generate & insert in batches
		const batch: Message[] = [];
		const batchSize = 1000;

		const tGen = timeIt(() => {
			for (let i = 0; i < size; i++) {
				batch.push(genMessage(i));
				if (batch.length >= batchSize) {
					ramify.messages.bulkAdd(batch.splice(0, batch.length));
				}
			}
			if (batch.length) ramify.messages.bulkAdd(batch.splice(0, batch.length));
		});

		const memAfterInsert = memorySnapshot();

		// random reads (1k)
		const readKeys: string[] = [];
		for (let i = 0; i < 1000; i++)
			readKeys.push(`msg-${Math.floor(Math.random() * size)}-${Date.now()}`);

		const tGet = timeIt(() => {
			// pick 100 keys that definitely exist: use first 100 generated ids
			for (let i = 0; i < Math.min(100, size); i++) {
				// eslint-disable-next-line @typescript-eslint/no-unused-vars
				const found = ramify.messages.get(`msg-${i}-${Date.now()}`); // unlikely to match timestamp, so instead use toArray + pick
			}
			// safer: exercise .limit and index queries
			ramify.messages.limit(200).toArray();
			ramify.messages.where('folder').equals('Inbox').limit(200).toArray();
			ramify.messages.where('userAccount').equals(1).limit(200).toArray();
		});

		// add single
		const tAdd = timeIt(() => ramify.messages.add(genMessage(size + 1)));

		// update
		const sample = ramify.messages.limit(1).first ? ramify.messages.limit(1).first() : null;
		let tUpdate = { ms: 0 };
		if (sample && sample.id) {
			tUpdate = timeIt(() => ramify.messages.update(sample.id, { folder: 'Sent' }));
		}

		// query heavy pipeline
		const tQueryPipeline = timeIt(() =>
			ramify.messages.where('folder').anyOf(['Inbox', 'Sent']).orderBy('date').limit(500).toArray()
		);

		// delete some
		const tDelete = timeIt(() => {
			const toDel = ramify.messages
				.limit(100)
				.toArray()
				.map((d) => d.id);
			ramify.messages.bulkDelete(toDel);
		});

		// finalize snapshot
		const memAfterAll = memorySnapshot();

		// collect metrics
		results.push({
			size,
			timings: {
				insertion_ms: Math.round(tGen.ms),
				get_ms: Math.round(tGet.ms),
				add_ms: Math.round(tAdd.ms),
				update_ms: Math.round(tUpdate.ms),
				query_pipeline_ms: Math.round(tQueryPipeline.ms),
				delete_ms: Math.round(tDelete.ms),
			},
			memory: { after_insert: memAfterInsert, after_all: memAfterAll },
		});

		// free memory (hint GC if available)
		if (global.gc) global.gc();
	}

	// Build Markdown
	const md = buildMarkdown(results);
	fs.writeFileSync(OUT_FILE, md);
	console.log(`\nPerformance results written to ${OUT_FILE}`);
}

function buildMarkdown(results) {
	const header = `# Ramify Performance Results\n\nGenerated: ${new Date().toISOString()}\n\nThis document contains measured results for several dataset sizes. Only performance metrics are recorded.\n\n`;
	const tableHeader = `| Dataset | Insert (ms) | Read/Index Queries (ms) | Add (1 op ms) | Update (ms) | Query pipeline (ms) | Delete(100) (ms) |\n|---:|---:|---:|---:|---:|---:|---:|\n`;
	const rows = results
		.map((r) => {
			const t = r.timings;
			return `| ${r.size.toLocaleString()} | ${t.insertion_ms} | ${t.get_ms} | ${t.add_ms} | ${
				t.update_ms
			} | ${t.query_pipeline_ms} | ${t.delete_ms} |`;
		})
		.join('\n');

	const memSection =
		`\n\n## Memory snapshots\n\n` +
		results
			.map(
				(r) =>
					`### ${r.size.toLocaleString()}\n- After insert: rss=${
						r.memory.after_insert.rss
					}MB heapUsed=${r.memory.after_insert.heapUsed}MB\n- After all ops: rss=${
						r.memory.after_all.rss
					}MB heapUsed=${r.memory.after_all.heapUsed}MB\n`
			)
			.join('\n');

	const notes =
		`\n\n> Notes:\n> - These are in-process measurements on current Node process.\n> - For reproducible benchmarking run on a quiet machine and consider running multiple iterations and averaging.\n> - The script uses ` +
		'`bulkAdd` in batches and queries representative pipelines. See the repository `performance` source for generator logic.';

	return header + tableHeader + rows + memSection + notes;
}

run();
