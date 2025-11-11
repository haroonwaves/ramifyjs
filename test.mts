/* eslint-disable @typescript-eslint/no-unused-vars */
import { Ramify } from './dist/index.js';

type User = { id: number; name: string; tags?: string[]; age: number };
type Message = { id: number; content: string; userId: number };

/*INITIALIZE DATABASE*/
const ramify = new Ramify().createStore<{ users: User; messages: Message }>({
	users: { primaryKey: 'id', indexes: ['name', 'age'], multiEntry: ['tags'] },
	messages: { primaryKey: 'id', indexes: ['userId'] },
});

/*COLLECTION OPERATIONS*/
const add = ramify.users.add({ id: 1, name: 'John', tags: ['a', 'b'], age: 20 }); // PK
const bulkAdd = ramify.users.bulkAdd([
	{ id: 2, name: 'Jane', tags: ['b'], age: 21 },
	{ id: 3, name: 'Jim', tags: ['c'], age: 22 },
]); // [PK]
const put = ramify.users.put({ id: 4, name: 'Jill', tags: ['d'], age: 23 }); // PK
const bulkPut = ramify.users.bulkPut([
	{ id: 5, name: 'Jack', tags: ['e'], age: 24 },
	{ id: 6, name: 'Jill', tags: ['f'], age: 25 },
]); // [PK]

const get = ramify.users.get(1); // User | undefined
const bulkGet = ramify.users.bulkGet([1, 2, 3]); // [User | undefined]

const updated = ramify.users.update(1, { name: 'John Doe' }); // User
const bulkUpdated = ramify.users.bulkUpdate([
	{ key: 2, changes: { name: 'Jane Doe' } },
	{ key: 3, changes: { name: 'Jim Doe' } },
]); // [User]

const deleted = ramify.users.delete(1); // PK | undefined
const bulkDeleted = ramify.users.bulkDelete([2, 3]); // [PK | undefined]

const each = ramify.users.each((user) => {}); // void
const filter = ramify.users.filter((user) => user.name === 'John'); // Query instance
const limit = ramify.users.limit(1); // Query instance
const offset = ramify.users.offset(1); // Query instance
const orderBy = ramify.users.orderBy('name'); // Query instance
const where = ramify.users.where('name'); // Query instance

const count = ramify.users.count(); // number
// const cleared = ramify.users.clear(); // void

/*QUERY OPERATIONS*/
const queriedUsers = ramify.users.where('name').anyOf(['John', 'Jane']).orderBy('age').toArray(); // [User]
const queryCount = ramify.users.count(); // number
console.log(queriedUsers);
console.log(queryCount);
