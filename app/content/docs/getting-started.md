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

Ramify DB is a TypeScript-first, in-memory database that provides:

- **Lightning-fast queries** - All data stored in memory for instant access
- **Live query observation** - React hooks that automatically update when data changes
- **Type-safe API** - Full TypeScript support with intelligent autocomplete
- **Indexed collections** - Fast lookups with primary keys and secondary indexes
- **Fluent query API** - Chainable methods for powerful data queries

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
```

#### 2. Create a Store

Create a Ramify instance and define your collections with schemas:

```typescript
import { Ramify, type Schema } from '@ramify-db/core';

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
	tags: ['developer', 'designer'],
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
const developers = db.users.where('tags').equals('developer').toArray();

// Complex queries with sorting and pagination
const topUsers = db.users
	.where('tags')
	.anyOf(['developer', 'manager'])
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
db.users.where({ email: 'alice@example.com' }).modify({ tags: ['team lead'] });
```

#### 6. Delete Data

Remove documents from collections:

```typescript
// Delete a single user
db.users.delete('1');

// Delete multiple users
db.users.bulkDelete(['1', '2', '3']);

// Delete via query
db.users.where('tags').equals('intern').delete();

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

- [API Reference](/docs/api-reference) - Complete API documentation
- [Advanced Queries](/docs/advanced-queries) - Complex filtering and query patterns
- [Live Queries](/docs/live-queries) - Deep dive into reactive queries with React
- [Best Practices](/docs/best-practices) - Tips for optimal performance

### Need Help?

If you run into any issues:

- Check the [API Reference](/docs/api-reference) for detailed documentation
- Open an issue on [GitHub](https://github.com/haroonwaves/ramify-db)
- Review the examples in the documentation
