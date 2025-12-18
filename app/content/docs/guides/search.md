---
title: 'Search'
description: 'Full-text search and filtering strategies in Ramify-DB'
---

## Search Strategies

### Overview

Ramify DB is primarily an in-memory document store with exact-match and range-based indexing. It
does **not** have a built-in full-text search engine (like ElasticSearch or multiple-token
indexing). However, because it runs in-memory, you can implement efficient search strategies using
standard JavaScript or lightweight helper libraries.

### Strategy 1: Simple Filter (Small Datasets)

For collections with fewer than ~10,000 records, Javascript's native string methods are often fast
enough.

```typescript
const searchQuery = 'john';

// Use .toArray() to get all records, then filter in memory
const results = db.users
	.toArray()
	.filter((user) => user.name.toLowerCase().includes(searchQuery.toLowerCase()));
```

### Strategy 2: Multi-Entry Indexing (Tagging)

If you want to search by strict keywords or tags, use Ramify's `multiEntry` index.

**Schema:**

```typescript
const db = ramify.createStore({
	posts: {
		primaryKey: 'id',
		multiEntry: ['tags'],
	},
});
```

**Usage:**

```typescript
// Find all posts tagged with 'javascript'
const posts = db.posts.where('tags').equals('javascript').toArray();
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
const db = ramify.createStore({
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
// Find products containing the word "phone" (exact token match)
const phones = db.products.where('_searchTerms').equals('phone').toArray();
```

### Strategy 4: External Search Libraries

For fuzzy search (handling typos) or complex relevance scoring, combine Ramify with a dedicated
library like **Fuse.js** or **MiniSearch**.

**Example with Fuse.js:**

```typescript
import Fuse from 'fuse.js';

// 1. Get data from Ramify
const allProducts = db.products.toArray();

// 2. Initialize Fuse
const fuse = new Fuse(allProducts, {
	keys: ['name', 'description'],
	threshold: 0.3,
});

// 3. Search
const results = fuse.search('iphoen'); // Handles typo 'iphoen' -> 'iphone'
```

### Summary

- **Exact Match / Range**: Use Ramify `indexes`.
- **Keyword Match**: Use `multiEntry` indexes.
- **Substring Match**: Use `.filter()` (fast enough for small/medium data).
- **Fuzzy / Relevance**: Use an external library like Fuse.js on top of Ramify data.
