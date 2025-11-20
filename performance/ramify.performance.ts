import fs from 'fs';
import path from 'path';
import { performance } from 'perf_hooks';
import { Ramify, type Collection, type ExecutableStage, type Schema } from '../dist/index.js';

type Message = {
	id: string;
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

type MemorySnapshot = {
	rss: number;
	heapTotal: number;
	heapUsed: number;
	external: number;
};

type ScenarioTuning = {
	seedBatchSize: number;
	getExistingIterations: number;
	missingIterations: number;
	bulkReadSize: number;
	limitSampleSize: number;
	offsetSampleSize: number;
	mutationChunk: number;
	bulkMutationChunk: number;
	bulkAddChunk: number;
	queryLimit: number;
	deleteChunk: number;
	subscriptionIterations: number;
};

type SampleSets = {
	allIds: string[];
	getExistingKeys: string[];
	missingKeys: string[];
	bulkReadKeys: string[];
	mutationIds: string[];
	bulkMutationIds: string[];
	deletionIds: string[];
	folderKey: string;
	folderAnyOfKeys: string[];
	folderBucketSize: number;
	folderLimit: number;
	folderUnreadKey: string;
	folderUnreadLimit: number;
	userAccount: number;
	userLimit: number;
	tagKey: string;
	tagAnyOfKeys: string[];
	tagLimit: number;
	unreadIds: string[];
	limitCount: number;
	offsetCount: number;
};

type SampleTracker = {
	allIds: string[];
	byFolder: Map<string, string[]>;
	byFolderUnread: Map<string, string[]>;
	byUser: Map<number, string[]>;
	byTag: Map<string, string[]>;
	unreadIds: string[];
};

type OperationRunSummary = {
	ms: number;
	operations?: number;
};

type OperationDefinition = {
	id: string;
	label: string;
	category: string;
	detail: string;
	run: (ctx: ScenarioContext) => OperationRunSummary;
};

type OperationResult = {
	id: string;
	label: string;
	category: string;
	detail: string;
	ms: number;
	operations?: number;
	msPerOp?: number;
	opsPerSec?: number;
};

type ScenarioReport = {
	size: number;
	timing: {
		createStore_ms: number;
		seed_ms: number;
		seedBatchSize: number;
	};
	memory: {
		afterSeed: MemorySnapshot;
		afterBenchmarks: MemorySnapshot;
		afterTeardown: MemorySnapshot;
	};
	operations: OperationResult[];
	tuning: ScenarioTuning;
};

type MessageStore = Ramify<{ messages: Message }> & {
	messages: Collection<Message, 'id'>;
};

type ScenarioContext = {
	size: number;
	ramify: MessageStore;
	messages: Collection<Message, 'id'>;
	tuning: ScenarioTuning;
	samples: SampleSets;
	runtime: {
		subscriptions: Array<() => void>;
	};
};

const OUT_DIR = path.resolve(process.cwd(), 'performance');
const OUT_FILE = path.join(OUT_DIR, 'performance-results.md');

const DATASET_SIZES = [10_000, 50_000, 100_000] as const;
const FOLDERS = ['Inbox', 'Sent', 'Drafts', 'Archive', 'Spam'];
const TAG_POOL = ['work', 'personal', 'updates', 'misc', 'alerts', 'finance', 'ops', 'vip'];

let globalMessageSeq = 0;
let missingKeySeq = 0;

type StageWithEach<T> = ExecutableStage<T> & {
	each(callback: (document: T) => void): void;
};

function ensureOut() {
	if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });
}

/* ---------- Data generation helpers ---------- */
function randomEmail(id: number) {
	return `user${id}@example.com`;
}

function randomName(id: number) {
	return `User ${id}`;
}

function buildTags(seed: number) {
	const count = (seed % 3) + 1;
	return Array.from({ length: count }, (_, idx) => TAG_POOL[(seed + idx) % TAG_POOL.length]);
}

function buildRecipients(seed: number) {
	return Array.from({ length: 2 }, (_, idx) => ({
		name: randomName(seed + idx + 1),
		email: randomEmail(seed + idx + 1),
	}));
}

function genMessage(overrides: Partial<Message> = {}): Message {
	const seq = globalMessageSeq++;
	const timestamp = Date.now() - seq * 1000;
	const folder = FOLDERS[seq % FOLDERS.length];
	const tags = buildTags(seq);
	return {
		id: `msg-${seq}`,
		remoteId: `remote-${seq}`,
		threadId: `thread-${Math.floor(seq / 5)}`,
		userAccount: seq % 50,
		date: timestamp - Math.floor(Math.random() * 1_000_000),
		size: 32_768 + (seq % 1024) * 128,
		p2Helper: randomEmail(seq),
		folder,
		tags,
		gmailSplit: [`split-${seq % 4}`],
		internalSplit: [`internal-${seq % 3}`],
		canUnsubscribe: seq % 2 === 0,
		hasAttachments: seq % 5 === 0,
		isDraft: seq % 7 === 0,
		isImportant: seq % 11 === 0,
		isSent: seq % 4 === 0,
		isStarred: seq % 13 === 0,
		isUnread: seq % 3 !== 0,
		sender: { name: randomName(seq), email: randomEmail(seq) },
		recipients: {
			primary: buildRecipients(seq),
			copied: [],
			blindCopied: [],
		},
		refs: {
			rfc822MsgId: `rfc-${seq}`,
			inReplyTo: seq % 8 === 0 ? `rfc-${seq - 1}` : null,
			replyTo: seq % 9 === 0 ? `rfc-${seq - 2}` : null,
			draftId: seq % 10 === 0 ? `draft-${seq}` : null,
		},
		received: timestamp - Math.floor(Math.random() * 5_000_000),
		...overrides,
	};
}

function createSampleTracker(): SampleTracker {
	return {
		allIds: [],
		byFolder: new Map(),
		byFolderUnread: new Map(),
		byUser: new Map(),
		byTag: new Map(),
		unreadIds: [],
	};
}

function pushToMap<T>(map: Map<T, string[]>, key: T, value: string) {
	const arr = map.get(key) || [];
	arr.push(value);
	map.set(key, arr);
}

function trackSample(tracker: SampleTracker, message: Message) {
	tracker.allIds.push(message.id);
	pushToMap(tracker.byFolder, message.folder, message.id);
	if (message.isUnread) {
		pushToMap(tracker.byFolderUnread, message.folder, message.id);
		tracker.unreadIds.push(message.id);
	}
	pushToMap(tracker.byUser, message.userAccount, message.id);
	for (const tag of message.tags) pushToMap(tracker.byTag, tag, message.id);
}

function clamp(value: number, min: number, max: number) {
	return Math.max(min, Math.min(max, value));
}

function deriveTuning(size: number): ScenarioTuning {
	return {
		seedBatchSize: 1_000,
		getExistingIterations: clamp(size, 2_000, 20_000),
		missingIterations: clamp(Math.floor(size / 2), 1_000, 15_000),
		bulkReadSize: clamp(Math.floor(size / 5), 500, 5_000),
		limitSampleSize: clamp(Math.floor(size / 20), 200, 2_000),
		offsetSampleSize: clamp(Math.floor(size / 15), 200, 2_000),
		mutationChunk: clamp(Math.floor(size / 50), 200, 2_000),
		bulkMutationChunk: clamp(Math.floor(size / 25), 500, 4_000),
		bulkAddChunk: 1_000,
		queryLimit: clamp(Math.floor(size / 40), 200, 1_000),
		deleteChunk: clamp(Math.floor(size / 40), 200, 1_500),
		subscriptionIterations: clamp(Math.floor(size / 50), 500, 3_000),
	};
}

function cycle<T>(items: T[], count: number) {
	if (!items.length) return [];
	const result: T[] = [];
	for (let i = 0; i < count; i++) result.push(items[i % items.length]);
	return result;
}

function takeFirst<T>(items: T[], count: number) {
	return items.slice(0, Math.min(count, items.length));
}

function takeLast<T>(items: T[], count: number) {
	if (items.length <= count) return [...items];
	return items.slice(items.length - count);
}

function pickLargestBucket<K>(
	map: Map<K, string[]>,
	fallbackIds: string[],
	fallbackKey: K
): {
	key: K;
	ids: string[];
} {
	if (!map.size) return { key: fallbackKey, ids: fallbackIds };
	const sorted = [...map.entries()].sort((a, b) => b[1].length - a[1].length);
	return { key: sorted[0][0], ids: sorted[0][1] };
}

function ensureKeys(keys: string[], desired: number, fallback: string) {
	const filled = [...keys];
	while (filled.length < desired) filled.push(fallback);
	return filled.slice(0, desired);
}

function generateMissingKeys(count: number) {
	return Array.from({ length: count }, () => `missing-${missingKeySeq++}`);
}

function finalizeSamples(tracker: SampleTracker, tuning: ScenarioTuning): SampleSets {
	const ids = tracker.allIds;
	const limitCount = Math.min(tuning.limitSampleSize, ids.length);
	const offsetCount = Math.min(tuning.offsetSampleSize, Math.max(1, ids.length - limitCount));
	const folderLargest = pickLargestBucket(tracker.byFolder, ids, 'Inbox');
	const folderUnreadLargest = pickLargestBucket(
		tracker.byFolderUnread,
		folderLargest.ids,
		folderLargest.key
	);
	const folderAnyOf = ensureKeys([...tracker.byFolder.keys()], 2, folderLargest.key);
	const userLargest = pickLargestBucket(tracker.byUser, ids, 0);
	const tagLargest = pickLargestBucket(tracker.byTag, ids, TAG_POOL[0]);
	const tagAnyOf = ensureKeys([...tracker.byTag.keys()], 3, tagLargest.key);

	const unreadPool = tracker.unreadIds.length ? tracker.unreadIds : ids;

	return {
		allIds: ids,
		getExistingKeys: cycle(ids, tuning.getExistingIterations),
		missingKeys: generateMissingKeys(tuning.missingIterations),
		bulkReadKeys: cycle(ids, tuning.bulkReadSize),
		mutationIds: takeFirst(ids, tuning.mutationChunk),
		bulkMutationIds: takeFirst(ids, tuning.bulkMutationChunk),
		deletionIds: takeLast(ids, tuning.deleteChunk),
		folderKey: folderLargest.key,
		folderAnyOfKeys: folderAnyOf,
		folderBucketSize: folderLargest.ids.length,
		folderLimit: Math.max(1, Math.min(tuning.queryLimit, folderLargest.ids.length)),
		folderUnreadKey: folderUnreadLargest.key,
		folderUnreadLimit: Math.max(1, Math.min(tuning.queryLimit, folderUnreadLargest.ids.length)),
		userAccount: Number(userLargest.key),
		userLimit: Math.max(1, Math.min(tuning.queryLimit, userLargest.ids.length)),
		tagKey: tagLargest.key,
		tagAnyOfKeys: ensureKeys(tagAnyOf, 2, tagLargest.key),
		tagLimit: Math.max(1, Math.min(tuning.queryLimit, tagLargest.ids.length)),
		unreadIds: cycle(unreadPool, tuning.queryLimit),
		limitCount: Math.max(1, limitCount),
		offsetCount: Math.max(1, offsetCount),
	};
}

/* ---------- Benchmark helpers ---------- */
function timeIt<T>(fn: () => T) {
	const t0 = performance.now();
	const result = fn();
	const t1 = performance.now();
	return { ms: t1 - t0, result };
}

function memorySnapshot(): MemorySnapshot {
	const m = process.memoryUsage();
	return {
		rss: Math.round(m.rss / 1024 / 1024),
		heapTotal: Math.round(m.heapTotal / 1024 / 1024),
		heapUsed: Math.round(m.heapUsed / 1024 / 1024),
		external: Math.round(m.external / 1024 / 1024),
	};
}

function runOperations(defs: OperationDefinition[], ctx: ScenarioContext) {
	const results: OperationResult[] = [];
	for (const def of defs) {
		const summary = def.run(ctx);
		const ops = summary.operations;
		const msPerOp = ops && ops > 0 ? summary.ms / ops : undefined;
		const safeMs = summary.ms === 0 ? 0.001 : summary.ms;
		const opsPerSec = ops && safeMs > 0 ? ops / (safeMs / 1000) : undefined;
		console.log(
			`   • ${def.label.padEnd(32)} ${summary.ms.toFixed(2)} ms${ops ? ` (${ops} ops)` : ''}`
		);
		results.push({
			id: def.id,
			label: def.label,
			category: def.category,
			detail: def.detail,
			ms: summary.ms,
			operations: ops,
			msPerOp,
			opsPerSec,
		});
	}
	return results;
}

/* ---------- Scenario creation ---------- */
function createScenario(size: number) {
	console.log(`\n=== Scenario: ${size.toLocaleString()} documents ===`);
	const tuning = deriveTuning(size);
	const createTimer = timeIt(() =>
		new Ramify().createStore<{
			messages: Schema<Message, 'id'>;
		}>({
			messages: {
				primaryKey: 'id',
				indexes: ['userAccount', 'date', 'folder', 'isUnread'],
				multiEntry: ['tags'],
			},
		})
	);
	const ramify = createTimer.result as MessageStore;
	const tracker = createSampleTracker();
	const seedTimer = timeIt(() => {
		const batch: Message[] = [];
		for (let i = 0; i < size; i++) {
			const msg = genMessage();
			batch.push(msg);
			trackSample(tracker, msg);
			if (batch.length >= tuning.seedBatchSize) {
				ramify.messages.bulkAdd(batch.splice(0, batch.length));
			}
		}
		if (batch.length) ramify.messages.bulkAdd(batch.splice(0, batch.length));
	});

	const samples = finalizeSamples(tracker, tuning);

	const ctx: ScenarioContext = {
		size,
		ramify,
		messages: ramify.messages,
		tuning,
		samples,
		runtime: { subscriptions: [] },
	};

	return {
		ctx,
		timing: {
			createStore_ms: Math.round(createTimer.ms),
			seed_ms: Math.round(seedTimer.ms),
			seedBatchSize: tuning.seedBatchSize,
		},
		memoryAfterSeed: memorySnapshot(),
	};
}

/* ---------- Operation builders ---------- */
function buildBenchmarkOperations(ctx: ScenarioContext): OperationDefinition[] {
	const { samples, tuning } = ctx;
	return [
		{
			id: 'collection.get_existing',
			label: 'Collection#get',
			category: 'reads',
			detail: `${samples.getExistingKeys.length} primary-key hits`,
			run: () => {
				const keys = samples.getExistingKeys;
				const timer = timeIt(() => {
					for (const key of keys) ctx.messages.get(key);
				});
				return { ms: timer.ms, operations: keys.length };
			},
		},
		{
			id: 'collection.get_missing',
			label: 'Collection#get (miss)',
			category: 'reads',
			detail: `${samples.missingKeys.length} missing keys`,
			run: () => {
				const keys = samples.missingKeys;
				const timer = timeIt(() => {
					for (const key of keys) ctx.messages.get(key);
				});
				return { ms: timer.ms, operations: keys.length };
			},
		},
		{
			id: 'collection.bulk_get',
			label: 'Collection#bulkGet',
			category: 'reads',
			detail: `${samples.bulkReadKeys.length} keys (50% miss mix)`,
			run: () => {
				const half = Math.floor(samples.bulkReadKeys.length / 2);
				const keys = [
					...samples.bulkReadKeys.slice(0, half),
					...samples.missingKeys.slice(0, samples.bulkReadKeys.length - half),
				];
				const timer = timeIt(() => ctx.messages.bulkGet(keys));
				return { ms: timer.ms, operations: keys.length };
			},
		},
		{
			id: 'collection.limit',
			label: 'Collection#limit',
			category: 'reads',
			detail: `${samples.limitCount} records via .limit().toArray()`,
			run: () => {
				const timer = timeIt(() => ctx.messages.limit(samples.limitCount).toArray());
				return { ms: timer.ms, operations: samples.limitCount };
			},
		},
		{
			id: 'collection.to_array',
			label: 'Collection#toArray',
			category: 'reads',
			detail: `Clone entire dataset (${ctx.size.toLocaleString()} docs)`,
			run: () => {
				const timer = timeIt(() => ctx.messages.toArray());
				return { ms: timer.ms, operations: ctx.size };
			},
		},
		{
			id: 'collection.count',
			label: 'Collection#count',
			category: 'reads',
			detail: 'Count requires cloning (toArray under the hood)',
			run: () => {
				const timer = timeIt(() => ctx.messages.count());
				return { ms: timer.ms, operations: 1 };
			},
		},
		{
			id: 'query.where_pk_field',
			label: 'Query.where("id").equals',
			category: 'queries',
			detail: 'Single primary-key equality via stage API',
			run: () => {
				const key = samples.getExistingKeys[0];
				const timer = timeIt(() => ctx.messages.where('id').equals(key).first());
				return { ms: timer.ms, operations: 1 };
			},
		},
		{
			id: 'query.where_pk_object',
			label: 'Query.where(criteria)',
			category: 'queries',
			detail: 'Object criteria on primary key + count()',
			run: () => {
				const key = samples.getExistingKeys[1] || samples.getExistingKeys[0];
				const timer = timeIt(() => ctx.messages.where({ id: key }).count());
				return { ms: timer.ms, operations: 1 };
			},
		},
		{
			id: 'query.where_index_folder',
			label: 'Query.where(folder).equals',
			category: 'queries',
			detail: `${samples.folderLimit} docs from folder "${samples.folderKey}"`,
			run: () => {
				const timer = timeIt(() =>
					ctx.messages
						.where('folder')
						.equals(samples.folderKey)
						.limit(samples.folderLimit)
						.toArray()
				);
				return { ms: timer.ms, operations: samples.folderLimit };
			},
		},
		{
			id: 'query.where_index_anyOf',
			label: 'Query.where(folder).anyOf',
			category: 'queries',
			detail: `Union of ${samples.folderAnyOfKeys.join(', ')}`,
			run: () => {
				const timer = timeIt(() =>
					ctx.messages
						.where('folder')
						.anyOf(samples.folderAnyOfKeys)
						.limit(samples.folderLimit)
						.toArray()
				);
				return { ms: timer.ms, operations: samples.folderLimit };
			},
		},
		{
			id: 'query.where_user_index',
			label: 'Query.where(userAccount).equals',
			category: 'queries',
			detail: `User ${samples.userAccount} (${samples.userLimit} docs)`,
			run: () => {
				const timer = timeIt(() =>
					ctx.messages
						.where('userAccount')
						.equals(samples.userAccount)
						.limit(samples.userLimit)
						.toArray()
				);
				return { ms: timer.ms, operations: samples.userLimit };
			},
		},
		{
			id: 'query.where_tags_anyOf',
			label: 'Query.where(tags).anyOf',
			category: 'queries',
			detail: `Multi-entry tags ${samples.tagAnyOfKeys.join(', ')}`,
			run: () => {
				const timer = timeIt(() =>
					ctx.messages.where('tags').anyOf(samples.tagAnyOfKeys).limit(samples.tagLimit).toArray()
				);
				return { ms: timer.ms, operations: samples.tagLimit };
			},
		},
		{
			id: 'query.where_multi_criteria',
			label: 'Query.where(criteria).limit',
			category: 'queries',
			detail: `Folder "${samples.folderUnreadKey}" + isUnread=true`,
			run: () => {
				const timer = timeIt(() =>
					ctx.messages
						.where({ folder: samples.folderUnreadKey, isUnread: true })
						.limit(samples.folderUnreadLimit)
						.toArray()
				);
				return { ms: timer.ms, operations: samples.folderUnreadLimit };
			},
		},
		{
			id: 'query.orderBy_date',
			label: 'Query.orderBy(date)',
			category: 'queries',
			detail: `Ascending order + limit ${samples.limitCount}`,
			run: () => {
				const timer = timeIt(() =>
					ctx.messages.orderBy('date').limit(samples.limitCount).toArray()
				);
				return { ms: timer.ms, operations: samples.limitCount };
			},
		},
		{
			id: 'query.orderBy_desc_limit',
			label: 'Query.orderBy(date).reverse',
			category: 'queries',
			detail: `Descending order + limit ${samples.limitCount}`,
			run: () => {
				const timer = timeIt(() =>
					ctx.messages.orderBy('date').reverse().limit(samples.limitCount).toArray()
				);
				return { ms: timer.ms, operations: samples.limitCount };
			},
		},
		{
			id: 'query.offset_limit',
			label: 'Query.offset + limit',
			category: 'queries',
			detail: `Offset ${samples.offsetCount}, limit ${samples.limitCount}`,
			run: () => {
				const combinedLimit = Math.min(ctx.size, samples.offsetCount + samples.limitCount);
				const effectiveLimit = Math.max(0, combinedLimit - samples.offsetCount);
				const timer = timeIt(() =>
					ctx.messages.orderBy('date').limit(combinedLimit).offset(samples.offsetCount).toArray()
				);
				return { ms: timer.ms, operations: effectiveLimit };
			},
		},
		{
			id: 'query.count',
			label: 'Query.count()',
			category: 'queries',
			detail: `Count docs in folder "${samples.folderKey}"`,
			run: () => {
				const timer = timeIt(() => ctx.messages.where('folder').equals(samples.folderKey).count());
				return { ms: timer.ms, operations: 1 };
			},
		},
		{
			id: 'query.each',
			label: 'Query.each()',
			category: 'queries',
			detail: `Iterate ${samples.folderLimit} docs via filter().each()`,
			run: () => {
				let seen = 0;
				const stage = ctx.messages
					.where('folder')
					.equals(samples.folderKey)
					.filter(() => seen++ < samples.folderLimit) as StageWithEach<Message>;
				const timer = timeIt(() => stage.each(() => {}));
				return { ms: timer.ms, operations: samples.folderLimit };
			},
		},
		{
			id: 'collection.filter',
			label: 'Collection#filter',
			category: 'queries',
			detail: 'filter() + count() on size threshold',
			run: () => {
				const timer = timeIt(() => ctx.messages.filter((doc) => doc.size > 128 * 1024).count());
				return { ms: timer.ms, operations: ctx.size };
			},
		},
		{
			id: 'collection.each',
			label: 'Collection#each',
			category: 'reads',
			detail: `Iterate entire dataset (${ctx.size.toLocaleString()} docs)`,
			run: () => {
				let checksum = 0;
				const timer = timeIt(() =>
					ctx.messages.each((doc) => {
						checksum += doc.size;
					})
				);
				void checksum;
				return { ms: timer.ms, operations: ctx.size };
			},
		},
		{
			id: 'query.first_last',
			label: 'Query.first()/last()',
			category: 'queries',
			detail: 'first + last on ordered query',
			run: () => {
				const timer = timeIt(() => {
					ctx.messages.orderBy('date').first();
					ctx.messages.orderBy('date').reverse().first();
				});
				return { ms: timer.ms, operations: 2 };
			},
		},
		{
			id: 'collection.put',
			label: 'Collection#put',
			category: 'mutations',
			detail: 'Overwrite existing doc (re-index)',
			run: () => {
				const targetId = samples.mutationIds[0];
				const original = ctx.messages.get(targetId);
				if (!original) return { ms: 0, operations: 0 };
				const updated = { ...original, folder: 'Sent', size: original.size + 10 };
				const timer = timeIt(() => ctx.messages.put(updated));
				return { ms: timer.ms, operations: 1 };
			},
		},
		{
			id: 'collection.bulk_put',
			label: 'Collection#bulkPut',
			category: 'mutations',
			detail: `${samples.bulkMutationIds.length} records refreshed`,
			run: () => {
				const docs = ctx.messages.bulkGet(samples.bulkMutationIds).filter(Boolean) as Message[];
				const updated = docs.map((doc, idx) => ({
					...doc,
					isImportant: idx % 2 === 0,
					tags: buildTags(idx + 100),
				}));
				const timer = timeIt(() => ctx.messages.bulkPut(updated));
				return { ms: timer.ms, operations: updated.length };
			},
		},
		{
			id: 'collection.add',
			label: 'Collection#add',
			category: 'mutations',
			detail: 'Insert single new doc',
			run: () => {
				const doc = genMessage({ folder: 'Archive' });
				const timer = timeIt(() => ctx.messages.add(doc));
				ctx.messages.delete(doc.id);
				return { ms: timer.ms, operations: 1 };
			},
		},
		{
			id: 'collection.bulk_add',
			label: 'Collection#bulkAdd',
			category: 'mutations',
			detail: `${tuning.bulkAddChunk} new docs`,
			run: () => {
				const docs = Array.from({ length: tuning.bulkAddChunk }, () =>
					genMessage({ folder: 'Inbox' })
				);
				const timer = timeIt(() => ctx.messages.bulkAdd(docs));
				ctx.messages.bulkDelete(docs.map((d) => d.id));
				return { ms: timer.ms, operations: docs.length };
			},
		},
		{
			id: 'collection.update',
			label: 'Collection#update',
			category: 'mutations',
			detail: 'Single update touching indexed fields',
			run: () => {
				const targetId = samples.mutationIds[1] || samples.mutationIds[0];
				const timer = timeIt(() =>
					ctx.messages.update(targetId, { folder: 'Inbox', isUnread: false })
				);
				return { ms: timer.ms, operations: 1 };
			},
		},
		{
			id: 'collection.bulk_update',
			label: 'Collection#bulkUpdate',
			category: 'mutations',
			detail: `${samples.mutationIds.length} updates with index churn`,
			run: () => {
				const docs = samples.mutationIds.map((id, idx) => ({
					key: id,
					changes: {
						folder: FOLDERS[(idx + 1) % FOLDERS.length],
						isImportant: idx % 3 === 0,
					},
				}));
				const timer = timeIt(() => ctx.messages.bulkUpdate(docs));
				return { ms: timer.ms, operations: docs.length };
			},
		},
		{
			id: 'query.modify',
			label: 'Query.modify()',
			category: 'mutations',
			detail: `Modify ${samples.folderLimit} docs in folder "${samples.folderKey}"`,
			run: () => {
				const timer = timeIt(() =>
					ctx.messages
						.where('folder')
						.equals(samples.folderKey)
						.limit(samples.folderLimit)
						.modify({ isStarred: true })
				);
				return { ms: timer.ms, operations: samples.folderLimit };
			},
		},
		{
			id: 'collection.delete',
			label: 'Collection#delete',
			category: 'mutations',
			detail: 'Single delete + reinsertion',
			run: () => {
				const targetId = samples.mutationIds[2] || samples.mutationIds[0];
				const backup = ctx.messages.get(targetId);
				if (!backup) return { ms: 0, operations: 0 };
				const timer = timeIt(() => ctx.messages.delete(targetId));
				ctx.messages.add(backup);
				return { ms: timer.ms, operations: 1 };
			},
		},
		{
			id: 'collection.bulk_delete',
			label: 'Collection#bulkDelete',
			category: 'mutations',
			detail: `${samples.deletionIds.length} deletes with restore`,
			run: () => {
				const backups = ctx.messages.bulkGet(samples.deletionIds).filter(Boolean) as Message[];
				const timer = timeIt(() => ctx.messages.bulkDelete(samples.deletionIds));
				if (backups.length) ctx.messages.bulkAdd(backups);
				return { ms: timer.ms, operations: samples.deletionIds.length };
			},
		},
		{
			id: 'query.delete',
			label: 'Query.delete()',
			category: 'mutations',
			detail: `Delete ${samples.folderLimit} docs via where().limit().delete()`,
			run: () => {
				const backups = ctx.messages
					.where('folder')
					.equals(samples.folderKey)
					.limit(samples.folderLimit)
					.toArray();
				const timer = timeIt(() =>
					ctx.messages.where('folder').equals(samples.folderKey).limit(samples.folderLimit).delete()
				);
				if (backups.length) ctx.messages.bulkAdd(backups);
				return { ms: timer.ms, operations: samples.folderLimit };
			},
		},
		{
			id: 'collection.subscribe',
			label: 'Collection#subscribe',
			category: 'observers',
			detail: `${tuning.subscriptionIterations} observer registrations`,
			run: () => {
				const unsubscribes: Array<() => void> = [];
				const timer = timeIt(() => {
					for (let i = 0; i < tuning.subscriptionIterations; i++) {
						unsubscribes.push(ctx.messages.subscribe(() => {}));
					}
				});
				ctx.runtime.subscriptions.push(...unsubscribes);
				return { ms: timer.ms, operations: unsubscribes.length };
			},
		},
		{
			id: 'collection.unsubscribe',
			label: 'Collection#unsubscribe',
			category: 'observers',
			detail: `Unsubscribe ${tuning.subscriptionIterations} observers`,
			run: () => {
				const subs = ctx.runtime.subscriptions.splice(0);
				const timer = timeIt(() => subs.forEach((unsub) => unsub()));
				return { ms: timer.ms, operations: subs.length };
			},
		},
	];
}

function buildTeardownOperations(): OperationDefinition[] {
	return [
		{
			id: 'collection.clear',
			label: 'Collection#clear',
			category: 'teardown',
			detail: 'Clear collection data and indexes',
			run: (ctx) => {
				const timer = timeIt(() => ctx.messages.clear());
				return { ms: timer.ms, operations: ctx.size };
			},
		},
		{
			id: 'ramify.delete',
			label: 'Ramify#delete',
			category: 'teardown',
			detail: 'Delete entire store (all collections)',
			run: (ctx) => {
				const timer = timeIt(() => ctx.ramify.delete());
				return { ms: timer.ms, operations: 1 };
			},
		},
	];
}

/* ---------- Markdown builder ---------- */
function formatMs(value: number) {
	return `${value.toFixed(1)}`;
}

function formatOps(value?: number) {
	return value === undefined ? '—' : value.toLocaleString();
}

function formatMsPerOp(value?: number) {
	if (value === undefined) return '—';
	return value < 1 ? value.toFixed(4) : value.toFixed(2);
}

function formatOpsPerSec(value?: number) {
	if (value === undefined) return '—';
	return Math.round(value).toLocaleString();
}

function buildScenarioSection(report: ScenarioReport) {
	const profile = `**Dataset preparation**\n- createStore: ${report.timing.createStore_ms} ms\n- seed (batch ${report.timing.seedBatchSize}): ${report.timing.seed_ms} ms`;
	const tuning = report.tuning;
	const executionProfile = `**Execution profile**\n- get iterations: ${tuning.getExistingIterations.toLocaleString()}\n- query limit: ${
		tuning.queryLimit
	}\n- bulk chunk: ${tuning.bulkAddChunk}\n- mutation chunk: ${
		tuning.mutationChunk
	}\n- subscription burst: ${tuning.subscriptionIterations}`;
	const memory = `**Memory snapshots (MB)**\n- After seed: rss=${report.memory.afterSeed.rss} heapUsed=${report.memory.afterSeed.heapUsed}\n- After benchmarks: rss=${report.memory.afterBenchmarks.rss} heapUsed=${report.memory.afterBenchmarks.heapUsed}\n- After teardown: rss=${report.memory.afterTeardown.rss} heapUsed=${report.memory.afterTeardown.heapUsed}`;
	const tableHeader =
		'| Category | Operation | Detail | Total ms | Ops | ms/op | ops/sec |\n|---|---|---|---:|---:|---:|---:|\n';
	const rows = report.operations
		.map(
			(op) =>
				`| ${op.category} | ${op.label} | ${op.detail} | ${formatMs(op.ms)} | ${formatOps(
					op.operations
				)} | ${formatMsPerOp(op.msPerOp)} | ${formatOpsPerSec(op.opsPerSec)} |`
		)
		.join('\n');
	return `### ${report.size.toLocaleString()} documents\n\n${profile}\n\n${executionProfile}\n\n${memory}\n\n${tableHeader}${rows}\n`;
}

function buildMarkdown(results: ScenarioReport[]) {
	const header = `# Ramify Performance Matrix\n\nGenerated: ${new Date().toISOString()}\n\nThis report captures end-to-end timings for every Ramify collection method across multiple dataset sizes. All measurements were taken in-process using Node.js perf_hooks on the current workstation.\n\n`;
	const body = results.map((r) => buildScenarioSection(r)).join('\n');
	const notes = `## Notes\n- Each scenario reuses the same synthetic workload (rich message documents with indexes on primary, secondary, and multi-entry fields).\n- Bulk operations use deterministic chunk sizes so ms/op and ops/sec can be compared between dataset sizes.\n- Query pipelines include order/limit/offset, multi-field criteria, and mutation helpers (modify/delete).\n- Observer costs measure subscription churn only; notification delivery depends on workload-specific callbacks.\n- Numbers are single-run measurements; rerun on an isolated machine and average across runs for publishable benchmarks.`;
	return header + body + '\n' + notes + '\n';
}

/* ---------- Main runner ---------- */
function run() {
	ensureOut();
	const reports: ScenarioReport[] = [];
	for (const size of DATASET_SIZES) {
		const { ctx, timing, memoryAfterSeed } = createScenario(size);
		const benchmarkResults = runOperations(buildBenchmarkOperations(ctx), ctx);
		const memoryAfterBenchmarks = memorySnapshot();
		const teardownResults = runOperations(buildTeardownOperations(), ctx);
		const memoryAfterTeardown = memorySnapshot();
		reports.push({
			size,
			timing,
			memory: {
				afterSeed: memoryAfterSeed,
				afterBenchmarks: memoryAfterBenchmarks,
				afterTeardown: memoryAfterTeardown,
			},
			operations: [...benchmarkResults, ...teardownResults],
			tuning: ctx.tuning,
		});
		if (global.gc) global.gc();
	}
	const md = buildMarkdown(reports);
	fs.writeFileSync(OUT_FILE, md);
	console.log(`\nPerformance matrix written to ${OUT_FILE}`);
}

run();
