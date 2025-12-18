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

<hr />

### What is Ramify DB?

Ramify DB is a TypeScript-first, in-memory database that provides:

- **Lightning-fast queries** - All data stored in memory for instant access
- **Live query observation** - React hooks that automatically update when data changes
- **Type-safe API** - Full TypeScript support with intelligent autocomplete
- **Indexed collections** - Fast lookups with primary keys and secondary indexes
- **Fluent query API** - Chainable methods for powerful data queries

### Mental Model: Data vs UI State

Ramify DB is a **reactive in-memory database**, designed to work _alongside_ your existing state
management tools, not necessarily to replace them entirely.

#### The Hybrid Approach

Most applications benefit from separating "Data" from "UI State":

- **Ramify DB** → **Application Data**
  - Collections of entities (Users, Posts, Products)
  - Shared state accessed by many components
  - Data that requires filtering, sorting, or searching

- **State Manager (Zustand / Context / Signals)** → **UI Control State**
  - Ephemeral UI state (isModalOpen, currentTab)
  - Form input values
  - Theme settings (dark/light mode)

#### When is Ramify DB the right choice?

Ramify DB is the ideal solution when your state is:

- **Collection-based**: You are managing lists of records rather than simple values.
- **Query-heavy**: You need to filter, sort, or paginate data on the client.
- **Derived often**: You need to calculate stats or subsets efficiently in real-time.
- **Reactive**: You need components to auto re-render only when specific data queries change.

<hr />

### Installation

Install Ramify DB using your preferred package manager:

```bash
npm install @ramify-db/core
# or
pnpm add @ramify-db/core
# or
yarn add @ramify-db/core
```

<hr />

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

// Query with filter
const adults = db.users
	.where('age')
	.filter((age) => age >= 18)
	.toArray();

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
db.users.where({ tags: 'intern' }).modify({ tags: ['developer'] });
```

#### 6. Delete Data

Remove documents from collections:

```typescript
// Delete a single user
db.users.delete('1');

// Delete multiple users
db.users.bulkDelete(['1', '2', '3']);

// Delete via query
db.users.where('age').below(18).delete();

// Clear entire collection
db.users.clear();
```

<hr />

### Using with React

Ramify DB provides a React hook for live queries that automatically re-render when data changes:

```typescript
import { useLiveQuery } from 'ramify-db/react';

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

<hr />

### Next Steps

Now that you've learned the basics, explore more advanced features:

- [API Reference](/docs/api-reference) - Complete API documentation
- [Advanced Queries](/docs/advanced-queries) - Complex filtering and query patterns
- [Live Queries](/docs/live-queries) - Deep dive into reactive queries with React
- [Best Practices](/docs/best-practices) - Tips for optimal performance

<hr />

### Need Help?

If you run into any issues:

- Check the [API Reference](/docs/api-reference) for detailed documentation
- Open an issue on [GitHub](https://github.com/haroonwaves/ramify-db)
- Review the examples in the documentation
