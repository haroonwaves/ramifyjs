---
title: Getting Started
description:
  Learn how to get started with Ramify DB - a lightweight in-memory database with querying and live
  query observation
date: 2024-12-10
category: Tutorial
---

## Getting Started with Ramify DB

Welcome to Ramify DB! This guide will help you get up and running with this powerful, lightweight
in-memory database designed for reactive applications.

### What is Ramify DB?

Ramify DB is a **reactive, in-memory database for in-process JavaScript applications**. It is
environment-agnostic, making it ideal for client-side applications, edge runtimes, and in-process
Node.js services.

Key features include:

- **Environment-agnostic** - Runs in the browser, Node.js, Bun, Deno, and Edge.
- **Lightning-fast queries** - All data stored in memory for instant access.
- **Live query observation** - React hooks that automatically update when data changes.
- **Type-safe API** - Full TypeScript support with intelligent autocomplete.
- **Indexed collections** - Fast lookups with primary keys and secondary indexes.
- **Zero dependencies** - Light footprint for any environment.

### Installation

Install Ramify DB using your preferred package manager:

```bash
npm install @ramify-db/core
# or
pnpm add @ramify-db/core
# or
yarn add @ramify-db/core
```

**For React Applications (Optional):**

If you're using React and want to use live queries with the `useLiveQuery` hook, install the React
hooks package:

```bash
npm install @ramify-db/react-hooks
# or
pnpm add @ramify-db/react-hooks
# or
yarn add @ramify-db/react-hooks
```

> **Note:** The `@ramify-db/react-hooks` package is optional and only required if you're building a
> React application. The core package works independently in any JavaScript/TypeScript environment.

### Basic Usage

#### 1. Define Your Schema

First, define the types for your data:

```typescript
type User = {
	id: number;
	email: string;
	name: string;
	age: number;
	roles: string[];
	status: 'active' | 'inactive' | 'banned';
	stats: { score: number; level: number };
};

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
```

#### 2. Create a Store

Create a Ramify instance and define your collections with schemas:

```typescript
import { Ramify, type Schema } from '@ramify-db/core';

const db = new Ramify().createStore<{
	users: Schema<User, 'id'>;
	messages: Schema<Message, 'id'>;
}>({
	users: {
		primaryKey: 'id',
		indexes: ['email', 'status', 'stats.level'],
		multiEntry: ['roles'],
	},
	messages: {
		primaryKey: 'id',
		indexes: ['senderId', 'channelId', 'metadata.priority'],
		multiEntry: ['mentions', 'tags', 'metadata.readBy'],
	},
});
```

**Schema Options:**

- `primaryKey`: The field to use as the primary key (required)
- `indexes`: Array of fields to index for fast lookups (optional)
- `multiEntry`: Array fields that should be indexed individually (optional)

#### 3. Add Data

Add documents to your collections:

```typescript
// Add a single user
db.users.add({
	id: '1',
	name: 'Alice Johnson',
	email: 'alice@example.com',
	age: 28,
	roles: ['admin'],
	status: 'active',
	stats: { score: 100, level: 1 },
});

// Add multiple users at once
db.users.bulkAdd([
	{
		id: '2',
		name: 'Bob Smith',
		email: 'bob@example.com',
		age: 35,
		roles: ['manager', 'creator'],
		status: 'active',
		stats: { score: 200, level: 2 },
	},
	{
		id: '3',
		name: 'Charlie Brown',
		email: 'charlie@example.com',
		age: 22,
		roles: ['user', 'reader'],
		status: 'active',
		stats: { score: 300, level: 3 },
	},
]);
```

#### 4. Query Data

Query your data using the fluent API:

```typescript
// Get a user by ID
const user = db.users.get('1');

// Get all users
const allUsers = db.users.toArray();

// Collection filter (use with caution for large datasets)
const adults = db.users.filter((user) => user.age >= 18).toArray();

// Query with multi-entry index
const developers = db.users.where('roles').equals(['admin']).toArray();

// Complex queries with sorting and pagination
const topUsers = db.users
	.where('roles')
	.anyOf(['admin', 'manager'])
	.orderBy('name')
	.limit(10)
	.toArray();
```

#### 5. Update Data

Update existing documents:

```typescript
// Update a single user
db.users.update('1', { age: 29 });

// Update multiple users
db.users.bulkUpdate([
	{ key: '1', changes: { age: 29 } },
	{ key: '2', changes: { age: 36 } },
]);

// Update via query
db.users.where({ email: 'alice@example.com' }).modify({ roles: ['admin', 'manager'] });
```

#### 6. Delete Data

Remove documents from collections:

```typescript
// Delete a single user
db.users.delete('1');

// Delete multiple users
db.users.bulkDelete(['1', '2', '3']);

// Delete via query
db.users.where('roles').equals(['manager', 'creator']).delete();

// Clear entire collection
db.users.clear();
```

### Using with React

Ramify DB provides a React hook for live queries that automatically re-render when data changes:

```typescript
import { useLiveQuery } from '@ramify-db/react-hooks';

function UserList() {
  const users = useLiveQuery(
    () => db.users
		.where({ status: 'active' })
		.orderBy('name')
		.reverse()
		.limit(10)
		.toArray(),
    {
      collections: [db.users],
      others: []
    }
  );

  return (
    <ul>
      {users?.map(user => (
        <li key={user.id}>{user.name} - {user.age}</li>
      ))}
    </ul>
  );
}
```

The component will automatically re-render whenever:

- Users are added, updated, or deleted
- The query results change

### Next Steps

Now that you've learned the basics, explore more advanced features:

- [API Reference](/docs/api/store) - Complete API documentation
- [Advanced Queries](/docs/guides/crud) - Complex filtering and query patterns
- [Live Queries](/docs/core/live-queries) - Deep dive into reactive queries with React

### Need Help?

If you run into any issues:

- Check the [API Reference](/docs/api/store) for detailed documentation
- Open an issue on [GitHub](https://github.com/haroonwaves/ramify-db)
- Review the examples in the documentation
