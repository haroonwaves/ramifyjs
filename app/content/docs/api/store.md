`--- title: 'Store API' description: 'Complete API reference for the Store class'

---

## Store API

The **Store API** is initialized via the `Ramify` class. It serves as the central database instance,
managing collections, definitions, and schemas.

### Core Methods

#### `new Ramify()`

Creates a new Ramify instance.

```typescript
import { Ramify } from 'ramify-db';

const ramify = new Ramify();
```

#### `createStore(schema)`

Defines the database schema and creates collections.

```typescript
const db = ramify.createStore({
	users: {
		primaryKey: 'id',
		indexes: ['email', 'role'],
		multiEntry: ['tags'],
	},
	posts: {
		primaryKey: 'id',
		indexes: ['userId'],
	},
});
```

**Parameters:**

- `schema`: An object mapping collection names to their schema definition.
  - `primaryKey`: The field used as the unique identifier.
  - `indexes`: Array of fields to be indexed for fast lookups.
  - `multiEntry`: Array of array-fields where each element should be indexed individually.

**Returns:** An object containing the typed collections.

#### `delete()`

Clears all data from all collections in the store.

```typescript
ramify.delete();
```

**Returns:** `void`.

### Schema Definition

Where `Schema` is defined as:

```typescript
type Schema<T, Pk extends keyof T> = {
	primaryKey: Pk;
	indexes?: string[];
	multiEntry?: string[];
};
```

### Common Pitfalls

- **Defining indexes later** – Indexes must be defined at store creation time in the schema. You
  cannot add them dynamically later.
- **Missing Primary Key** – Every collection requires a valid `primaryKey`.

{{ ... }}

### Mental Model

- **Ramify Instance** → Database Server
- **Store Definition** → Schema / Migration
- **Collection** → Table

```

```
