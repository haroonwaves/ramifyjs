import { Ramify } from './dist/index.js';

export type Message = {
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

const ramify = new Ramify().createStore<{ messages: Message }>({
	messages: { primaryKey: 'id', indexes: ['userAccount', 'date', 'folder', 'isUnread'] },
});

function randomEmail(id: number) {
	return `user${id}@example.com`;
}

function randomName(id: number) {
	return `User ${id}`;
}

function generateRandomMessage(id: number): Message {
	const now = Date.now();

	return {
		id: `msg-${id}-${now}`,
		remoteId: `remote-${id}`,
		threadId: `thread-${Math.floor(id / 5)}`,
		userAccount: id % 50, // 50 fake user accounts
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

export function generateMessages(count = 100_000) {
	console.time('generateMessages');
	const batch: Message[] = [];

	for (let i = 0; i < count; i++) {
		batch.push(generateRandomMessage(i));

		// insert in chunks to reduce overhead
		if (batch.length === 1000) {
			ramify.messages.bulkAdd(batch);
			batch.length = 0;
		}
	}

	if (batch.length) ramify.messages.bulkAdd(batch);

	console.timeEnd('generateMessages');
}

generateMessages(500_000);

const t1 = performance.now();
const messages = ramify.messages.limit(200).toArray();
const t2 = performance.now();

console.log('Fetched:', messages.length, ', Time (ms):', (t2 - t1).toFixed(2));

const t3 = performance.now();
const added = ramify.messages.add(generateRandomMessage(500_001));
const t4 = performance.now();

console.log('Added:', added, ', Time (ms):', (t4 - t3).toFixed(2));

const t5 = performance.now();
const get = ramify.messages.get(added);
const t6 = performance.now();

console.log('Get:', get, ', Time (ms):', (t6 - t5).toFixed(2));

if (get) get.p2Helper = 'haroon@example.com';

const t7 = performance.now();
const newGet = ramify.messages.get(added);
const t8 = performance.now();

console.log('New Get:', newGet, ', Time (ms):', (t8 - t7).toFixed(2));
