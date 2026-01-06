---
title: 'Ramify JS Search Strategies'
description:
  'Implement efficient search in Ramify JS with filtering, multi-entry indexing, and tokenization
  strategies for finding data quickly.'
---

## Search Strategies

Ramify JS is primarily an in-memory document store with exact-match indexing. It does **not** have a
built-in full-text search engine (like ElasticSearch or multiple-token indexing). However, because
it runs in-memory, you can implement efficient search strategies using standard JavaScript or
lightweight helper libraries.

### Strategy 1: Simple Filter (Small Datasets)

For collections with fewer than ~10,000 records, Javascript's native string methods are often fast
enough.

```typescript
const searchQuery = 'john';

const results = db.users
	.filter((user) => user.name.toLowerCase().includes(searchQuery.toLowerCase()));
	.toArray()
```

### Strategy 2: Multi-Entry Indexing (Tagging)

If you want to search by strict keywords or roles, use Ramify's `multiEntry` index.

**Schema:**

```typescript
// Find all users with role only 'manager'
const managers = db.users.where('roles').equals(['manager']).toArray();

// Find all users with role 'admin'
const admins = db.users.where('roles').anyOf(['admin']).toArray();

// Find all users with role 'user' plus 'reader'
const usersWithReadAccess = db.users.where('roles').allOf(['user', 'reader']).toArray();
```

### Strategy 3: Tokenization (Manual Search Index)

For more advanced "search-like" behavior, you can tokenize your text fields into an array of
keywords and store them in a `multiEntry` field.

**Model:**

```typescript
interface Product {
	id: string;
	name: string;
	// Computed field for search
	_searchTerms: string[];
}
```

**Schema:**

```typescript
const db = ramify.createStore<{ products: Schema<Product, 'id'> }>({
	products: {
		primaryKey: 'id',
		multiEntry: ['_searchTerms'],
	},
});
```

**Writing Data:**

```typescript
function saveProduct(product) {
	// Simple tokenizer: split by space, lowercase
	const terms = product.name.toLowerCase().split(/\s+/);

	db.products.put({
		...product,
		_searchTerms: terms,
	});
}
```

**Searching:**

```typescript
// Find products has the word only "phone" (exact token match)
const phones = db.products.where('_searchTerms').equals(['phone']).toArray();

// Find products containing the word "phone" or "tablet" (any token match)
const phonesOrTablets = db.products.where('_searchTerms').anyOf(['phone', 'tablet']).toArray();

// Find products containing the word "phone" and "smart" (all token match)
const smartPhones = db.products.where('_searchTerms').allOf(['phone', 'smart']).toArray();
```

### Summary

- **Exact Match**: Use Ramify `indexes`.
- **Keyword Match**: Use `multiEntry` indexes.
- **Substring Match**: Use `.filter()` (fast enough for small/medium data).
