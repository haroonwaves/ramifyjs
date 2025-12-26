---
title: 'Store & Collections'
description: 'Understanding the core building blocks of Ramify-DB'
---

## Store & Collections

The **Store** and **Collections** are the fundamental building blocks of Ramify DB.

The **Store** acts as your central database instance. It is a singleton that holds the
configuration, schema definitions, and acts as a factory for your collections.

**Collections** are typed containers for your records, similar to tables in a SQL database. They
provide methods to add, update, delete, and query data, while maintaining type safety and handling
indexing behind the scenes.

### Core Concepts

#### The Store

The Store manages the lifecycle of your data layer. When initialized, it creates the necessary
in-memory structures to hold your data.

- **Single Source of Truth**: A single store instance helps maintain consistency across your
  application.
- **Schema Definition**: You define strict schemas for your collections, ensuring that all data
  interacting with the database is predictable and typed.

#### Collections

Each collection is dedicated to a specific entity type (e.g., `User`, `Post`).

- **Reactive Updates**: Collections emit events when data changes, which powers Ramify's Live Query
  system.
- **Indexing**: Collections manage their own indexes to optimize lookups.

### Examples

```typescript
import { Ramify, type Schema } from 'ramify-db';

// Initialize Ramify
const ramify = new Ramify();

// Define your data type
interface User {
	id: string;
	name: string;
	email: string;
	age: number;
}

// Create a store with collections and schema
const db = ramify.createStore<{
	users: Schema<User, 'id'>;
}>({
	users: {
		primaryKey: 'id',
		indexes: ['email', 'age'],
		multiEntry: ['tags'],
	},
});

// db.users is now your typed collection
```

### Common pitfalls

- **Forgetting to define indexes**: Without indexes, queries can be slow
- **Creating multiple stores**: Usually you only need one store per app
- **Not typing your collections**: TypeScript types give you safety and autocomplete
