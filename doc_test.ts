import { Ramify, type Schema } from './packages/core/dist/index.js';

type User = {
	id: string;
	name: string;
	email: string;
	age: number;
	child: {
		name: string;
		age: number;
	};
	tags: string[];
	status?: string;
	roles?: string[];
};

type Post = {
	id: string;
	userId: string;
	title: string;
	content: string;
	createdAt: number;
};

const ramify = new Ramify();

const db = ramify.createStore<{
	users: Schema<User, 'id'>;
	posts: Schema<Post, 'id'>;
}>({
	users: {
		primaryKey: 'id',
		indexes: ['email', 'age', 'child.age', 'status', 'roles'],
		multiEntry: ['tags', 'roles'],
	},
	posts: {
		primaryKey: 'id',
		indexes: ['userId', 'createdAt'],
	},
});

db.users.subscribe((type, keys) => {
	console.log('__________EVENT________:', { type, keys });
});

// Add a single user
db.users.put({
	id: '1',
	name: 'Alice Johnson',
	email: 'alice@example.com',
	age: 28,
	child: {
		name: 'Bob Johnson',
		age: 35,
	},
	tags: ['designer'],
});

// Add multiple users at once
db.users.bulkAdd([
	{
		id: '2',
		name: 'Bob Smith',
		email: 'bob@example.com',
		age: 35,
		child: {
			name: 'Bob Smith',
			age: 35,
		},
		tags: ['manager', 'developer'],
	},
	{
		id: '3',
		name: 'Charlie Brown',
		email: 'charlie@example.com',
		age: 22,
		child: {
			name: 'Charlie Brown',
			age: 22,
		},
		tags: ['intern', 'developer'],
	},
]);

db.users.put({
	id: '1',
	name: 'Alice',
	email: 'alice@example.com',
	age: 28,
	child: { name: 'Bob', age: 35 },
	tags: ['designer'],
});
db.users.get('1');
db.users.toArray();
db.users.update('1', { age: 31 });
db.users.delete('1');
db.users.clear();
db.users.bulkAdd([
	{
		id: '1',
		name: 'Alice',
		email: 'alice@example.com',
		age: 28,
		child: { name: 'Bob', age: 35 },
		tags: ['designer'],
	},
	{
		id: '2',
		name: 'Bob',
		email: 'bob@example.com',
		age: 35,
		child: { name: 'Bob', age: 35 },
		tags: ['manager'],
	},
]);
db.users.bulkPut([
	{
		id: '1',
		name: 'Alice Updated',
		email: 'alice@example.com',
		age: 28,
		child: { name: 'Bob', age: 35 },
		tags: ['designer'],
	},
	{
		id: '2',
		name: 'Bob Updated',
		email: 'bob@example.com',
		age: 35,
		child: { name: 'Bob', age: 35 },
		tags: ['manager'],
	},
]);
db.users.bulkGet(['1', '2', '3']);
db.users.bulkUpdate(['1', '2', '3'], { age: 31 });
db.users.bulkDelete(['1', '2', '3']);
db.users.count();
db.users.keys();
db.users.has('1');
db.users.each((user) => {
	console.log(user.name);
});
db.users.where('age');
db.users.where({ age: 18 });
db.users.sortBy('name');
db.users.limit(10);
db.users.limit(10).offset(5);

const unsubscribe = db.users.subscribe((operation, keys) => {
	console.log(operation, keys);
});

db.users.unsubscribe(unsubscribe);

db.users.where('email').equals('alice@example.com');
db.users.where({ status: 'active', roles: ['admin'] });

db.users.where('status').equals('active').sortBy('name');
db.users.where('status').equals('active').limit(10);
db.users.where('status').equals('active').limit(10).offset(10);
db.users.where('status').anyOf(['active', 'pending']).first();
db.users.where('status').equals('pending').modify({ status: 'active' });
db.users.where('status').anyOf(['inactive', 'banned']).delete();
