## Store API

The **Store API** is initialized via the `Ramify` class. It serves as the central database instance,
managing collections, definitions, and schemas.

---

### Core Methods

#### `new Ramify<T>()`

Creates a new Ramify instance.

**Example:**

```typescript
import { Ramify, type Schema } from '@ramify-db/core';

const ramify = new Ramify();
```

**Parameters:** None

**Returns:** A new `Ramify<T>` instance

---

#### `createStore<S>(storeDefinition)`

Defines the database schema and creates collections. This method infers document types and primary
keys from the schema definition.

**Example:**

```typescript
const db = ramify.createStore<{
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

// db.users is now typed as Collection<User, 'id'>
// db.messages is now typed as Collection<Message, 'id'>
```

**Parameters:**

- **`storeDefinition`**: `S` - An object mapping collection names to their schema definition
  - **`primaryKey`**: `Pk extends keyof T` - The field used as the unique identifier (required)
  - **`indexes`**: `Array<NestedKeyOf<T>>` - Array of fields to be indexed for fast lookups
    (optional)
  - **`multiEntry`**: `Array<NestedKeyOf<T>>` - Array of array-fields where each element should be
    indexed individually (optional)

**Returns:** A typed store object where:

- The store extends `Ramify` with inferred document types
- Each collection is accessible as a property with type `Collection<T, Pk>`

---

#### `delete()`

Clears all data from all collections in the store.

**Example:**

```typescript
ramify.delete();
```

**Parameters:** None

**Returns:** `void`

---

### Schema Definition

The `Schema` type is defined as:

```typescript
type Schema<T, PK extends keyof T = keyof T> = {
	primaryKey: PK;
	indexes?: Array<NestedKeyOf<T>>;
	multiEntry?: Array<NestedKeyOf<T>>;
};
```

**Type Parameters:**

- **`T`**: The document type for the collection
- **`Pk`**: The primary key field name, must be a key of `T`

---

### Common Pitfalls

- **Defining indexes later** – Indexes must be defined at store creation time in the schema. You
  cannot add them dynamically later.
- **Missing Primary Key** – Every collection requires a valid `primaryKey`.
- **Type mismatches** – Ensure the `primaryKey` specified in the schema matches a field in your
  document type.

---

### Mental Model

- **Ramify Instance** → Database Server
- **Store Definition** → Schema / Migration
- **Collection** → Table
