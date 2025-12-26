import { Ramify, type Schema } from './packages/core/dist/index.js';

type User = {
	id: string;
	name: string;
	email: string;
	age: number;
	tags: string[];
};

type Post = {
	id: string;
	userId: string;
	title: string;
	content: string;
	createdAt: number;
};

const db = new Ramify().createStore<{
	users: Schema<User, 'id'>;
	posts: Schema<Post, 'id'>;
}>({
	users: {
		primaryKey: 'id',
		indexes: ['email', 'age'],
		multiEntry: ['tags'],
	},
	posts: {
		primaryKey: 'id',
		indexes: ['userId', 'createdAt'],
	},
});

// Add a single user
db.users.add({
	id: '1',
	name: 'Alice Johnson',
	email: 'alice@example.com',
	age: 28,
	tags: ['designer'],
});

// Add multiple users at once
db.users.bulkAdd([
	{
		id: '2',
		name: 'Bob Smith',
		email: 'bob@example.com',
		age: 35,
		tags: ['manager', 'developer'],
	},
	{
		id: '3',
		name: 'Charlie Brown',
		email: 'charlie@example.com',
		age: 22,
		tags: ['intern', 'developer'],
	},
]);

// Get a user by ID
const user = db.users.get('1');
console.log('Get a user by ID:', user);

// Get all users
const allUsers = db.users.toArray();
console.log('Get all users:', allUsers);

// Query with filters
const developers = db.users.where('tags').equals('developer').toArray();
console.log('Get developers:', developers);

// Query with indexed field
const adults = db.users.filter((user) => user.age >= 18).toArray();
console.log('Get adults:', adults);

// Complex queries with sorting and pagination
const topUsers = db.users
	.filter((user) => user.age >= 18)
	.orderBy('name')
	.reverse()
	.limit(10)
	.toArray();
console.log('Get top users:', topUsers);

// Update a single user
db.users.update('1', { age: 29 });

// Update multiple users
db.users.bulkUpdate([
	{ key: '1', changes: { age: 29 } },
	{ key: '2', changes: { age: 36 } },
]);

// Update via query
db.users.where({ email: 'alice@example.com' }).modify({ tags: ['team lead'] });

// Delete a single user
db.users.delete('1');

// Delete multiple users
db.users.bulkDelete(['1', '2', '3']);

// Delete via query
db.users.where('tags').equals('intern').delete();

// Clear entire collection
db.users.clear();
