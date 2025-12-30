# @ramifyjs/core

Reactive, in-memory database for JavaScript applications.

Ramify JS is environment-agnostic—built for the browser, Node.js, and Edge runtimes. It provides a
lightweight, type-safe data store with live query observation for building reactive applications.

[Main Documentation →](https://ramifyjs.pages.dev)

[React Hooks →](https://www.npmjs.com/package/@ramifyjs/react-hooks)

## Install

```bash
npm install @ramifyjs/core
# or
pnpm add @ramifyjs/core
# or
yarn add @ramifyjs/core
```

## Usage

```ts
import { Ramify, type Schema } from '@ramifyjs/core';

// 1. Define your schema
const schema = {
	users: {
		primaryKey: 'id',
		indexes: ['email'],
	},
};

// 2. Create the store
const db = new Ramify().createStore<{ users: Schema<User, 'id'> }>(schema);

// 3. Simple operations
db.users.put({ id: 1, name: 'John Doe', email: 'john@example.com' });

const user = db.users.where({ email: 'john@example.com' }).first();
console.log(user); // { id: 1, name: 'John Doe', email: 'john@example.com' }
```

## Features

- **Type-safe**: Full TypeScript support with schema-based type inference.
- **Reactive**: Observe changes with live queries.
- **Fast**: In-memory operations for high-performance data access.
- **Environment Agnostic**: Works in Browser, Node.js, and Edge.

## License

[LICENSE](/LICENSE)
