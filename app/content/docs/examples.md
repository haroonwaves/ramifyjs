---
title: Examples
description: Real-world examples and use cases for Ramify DB
date: 2024-12-10
category: Guide
---

## Examples

Practical examples showing how to use Ramify DB in real-world applications.

### Todo List Application

A complete todo list with filtering and persistence.

```typescript
import { Ramify } from '@ramify-db/core';
import { useLiveQuery } from '@ramify-db/react-hooks';
import { useState } from 'react';

// Define types
type Todo = {
  id: string;
  title: string;
  completed: boolean;
  createdAt: number;
  priority: 'low' | 'medium' | 'high';
  tags: string[];
};

// Create database
const ramify = new Ramify();
const db = ramify.createStore({
  todos: {
    primaryKey: 'id',
    indexes: ['completed', 'priority', 'createdAt'],
    multiEntry: ['tags']
  }
});

// Todo List Component
function TodoList() {
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const todos = useLiveQuery(
    () => {
      let query = db.todos.toArray();

      // Filter by status
      if (filter === 'active') {
        query = query.filter(t => !t.completed);
      } else if (filter === 'completed') {
        query = query.filter(t => t.completed);
      }

      // Search
      if (searchQuery) {
        const lower = searchQuery.toLowerCase();
        query = query.filter(t => t.title.toLowerCase().includes(lower));
      }

      // Sort by priority and date
      return query.sort((a, b) => {
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
          return priorityOrder[a.priority] - priorityOrder[b.priority];
        }
        return b.createdAt - a.createdAt;
      });
    },
    { collections: [db.todos], others: [filter, searchQuery] }
  );

  const addTodo = (title: string, priority: Todo['priority']) => {
    db.todos.add({
      id: crypto.randomUUID(),
      title,
      completed: false,
      createdAt: Date.now(),
      priority,
      tags: []
    });
  };

  const toggleTodo = (id: string) => {
    const todo = db.todos.get(id);
    if (todo) {
      db.todos.update(id, { completed: !todo.completed });
    }
  };

  const deleteTodo = (id: string) => {
    db.todos.delete(id);
  };

  const clearCompleted = () => {
    db.todos.where({ completed: true }).delete();
  };

  return (
    <div>
      <h1>Todo List</h1>

      <input
        type="text"
        placeholder="Search todos..."
        value={searchQuery}
        onChange={e => setSearchQuery(e.target.value)}
      />

      <div>
        <button onClick={() => setFilter('all')}>All</button>
        <button onClick={() => setFilter('active')}>Active</button>
        <button onClick={() => setFilter('completed')}>Completed</button>
      </div>

      <TodoForm onAdd={addTodo} />

      <ul>
        {todos?.map(todo => (
          <li key={todo.id}>
            <input
              type="checkbox"
              checked={todo.completed}
              onChange={() => toggleTodo(todo.id)}
            />
            <span style={{ textDecoration: todo.completed ? 'line-through' : 'none' }}>
              {todo.title} ({todo.priority})
            </span>
            <button onClick={() => deleteTodo(todo.id)}>Delete</button>
          </li>
        ))}
      </ul>

      <button onClick={clearCompleted}>Clear Completed</button>

      <p>
        {todos?.filter(t => !t.completed).length} items left
      </p>
    </div>
  );
}

function TodoForm({ onAdd }: { onAdd: (title: string, priority: Todo['priority']) => void }) {
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState<Todo['priority']>('medium');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (title.trim()) {
      onAdd(title.trim(), priority);
      setTitle('');
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="text"
        value={title}
        onChange={e => setTitle(e.target.value)}
        placeholder="What needs to be done?"
      />
      <select value={priority} onChange={e => setPriority(e.target.value as Todo['priority'])}>
        <option value="low">Low</option>
        <option value="medium">Medium</option>
        <option value="high">High</option>
      </select>
      <button type="submit">Add</button>
    </form>
  );
}
```

### Blog with Comments

A blog system with posts and nested comments.

```typescript
type Post = {
  id: string;
  title: string;
  content: string;
  authorId: string;
  createdAt: number;
  tags: string[];
};

type Comment = {
  id: string;
  postId: string;
  authorId: string;
  content: string;
  createdAt: number;
};

type User = {
  id: string;
  name: string;
  email: string;
  avatar: string;
};

const db = ramify.createStore({
  users: {
    primaryKey: 'id',
    indexes: ['email']
  },
  posts: {
    primaryKey: 'id',
    indexes: ['authorId', 'createdAt'],
    multiEntry: ['tags']
  },
  comments: {
    primaryKey: 'id',
    indexes: ['postId', 'authorId', 'createdAt']
  }
});

function BlogPost({ postId }: { postId: string }) {
  const data = useLiveQuery(
    () => {
      const post = db.posts.get(postId);
      if (!post) return null;

      const author = db.users.get(post.authorId);
      const comments = db.comments
        .where({ postId })
        .orderBy('createdAt')
        .toArray();

      const commentAuthors = new Map(
        comments
          .map(c => db.users.get(c.authorId))
          .filter(Boolean)
          .map(u => [u!.id, u!])
      );

      return { post, author, comments, commentAuthors };
    },
    { collections: [db.posts, db.users, db.comments], others: [postId] }
  );

  if (!data?.post) return <div>Post not found</div>;

  const addComment = (content: string, authorId: string) => {
    db.comments.add({
      id: crypto.randomUUID(),
      postId,
      authorId,
      content,
      createdAt: Date.now()
    });
  };

  return (
    <article>
      <h1>{data.post.title}</h1>
      <p>By {data.author?.name} on {new Date(data.post.createdAt).toLocaleDateString()}</p>
      <div>{data.post.content}</div>
      <div>
        Tags: {data.post.tags.map(tag => <span key={tag}>#{tag} </span>)}
      </div>

      <h2>Comments ({data.comments.length})</h2>
      <ul>
        {data.comments.map(comment => {
          const author = data.commentAuthors.get(comment.authorId);
          return (
            <li key={comment.id}>
              <strong>{author?.name}</strong>: {comment.content}
              <br />
              <small>{new Date(comment.createdAt).toLocaleString()}</small>
            </li>
          );
        })}
      </ul>

      <CommentForm onSubmit={(content) => addComment(content, 'current-user-id')} />
    </article>
  );
}

function PostList() {
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  const posts = useLiveQuery(
    () => {
      if (selectedTag) {
        return db.posts
          .where({ tags: selectedTag })
          .orderBy('createdAt')
          .reverse()
          .toArray();
      }
      return db.posts
        .orderBy('createdAt')
        .reverse()
        .toArray();
    },
    { collections: [db.posts], others: [selectedTag] }
  );

  const allTags = useLiveQuery(
    () => {
      const posts = db.posts.toArray();
      const tagSet = new Set<string>();
      posts.forEach(post => post.tags.forEach(tag => tagSet.add(tag)));
      return Array.from(tagSet).sort();
    },
    { collections: [db.posts], others: [] }
  );

  return (
    <div>
      <h1>Blog Posts</h1>

      <div>
        <button onClick={() => setSelectedTag(null)}>All</button>
        {allTags?.map(tag => (
          <button key={tag} onClick={() => setSelectedTag(tag)}>
            #{tag}
          </button>
        ))}
      </div>

      <ul>
        {posts?.map(post => (
          <li key={post.id}>
            <h2>{post.title}</h2>
            <p>{post.content.substring(0, 200)}...</p>
            <Link href={`/posts/${post.id}`}>Read more</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

### E-commerce Cart

Shopping cart with products and inventory management.

```typescript
type Product = {
  id: string;
  name: string;
  price: number;
  category: string;
  inStock: number;
  imageUrl: string;
};

type CartItem = {
  id: string;
  productId: string;
  quantity: number;
  addedAt: number;
};

const db = ramify.createStore({
  products: {
    primaryKey: 'id',
    indexes: ['category', 'price']
  },
  cart: {
    primaryKey: 'id',
    indexes: ['productId']
  }
});

function ShoppingCart() {
  const cartData = useLiveQuery(
    () => {
      const items = db.cart.toArray();
      const itemsWithProducts = items.map(item => {
        const product = db.products.get(item.productId);
        return { item, product };
      }).filter(({ product }) => product !== undefined);

      const total = itemsWithProducts.reduce(
        (sum, { item, product }) => sum + (product!.price * item.quantity),
        0
      );

      return { items: itemsWithProducts, total };
    },
    { collections: [db.cart, db.products], others: [] }
  );

  const addToCart = (productId: string) => {
    const existing = db.cart.where({ productId }).first();

    if (existing) {
      db.cart.update(existing.id, { quantity: existing.quantity + 1 });
    } else {
      db.cart.add({
        id: crypto.randomUUID(),
        productId,
        quantity: 1,
        addedAt: Date.now()
      });
    }
  };

  const updateQuantity = (itemId: string, quantity: number) => {
    if (quantity <= 0) {
      db.cart.delete(itemId);
    } else {
      db.cart.update(itemId, { quantity });
    }
  };

  const clearCart = () => {
    db.cart.clear();
  };

  return (
    <div>
      <h2>Shopping Cart</h2>

      {cartData?.items.length === 0 ? (
        <p>Your cart is empty</p>
      ) : (
        <>
          <ul>
            {cartData?.items.map(({ item, product }) => (
              <li key={item.id}>
                <img src={product!.imageUrl} alt={product!.name} width={50} />
                <span>{product!.name}</span>
                <span>${product!.price}</span>
                <input
                  type="number"
                  value={item.quantity}
                  onChange={e => updateQuantity(item.id, parseInt(e.target.value))}
                  min={0}
                />
                <span>${(product!.price * item.quantity).toFixed(2)}</span>
                <button onClick={() => updateQuantity(item.id, 0)}>Remove</button>
              </li>
            ))}
          </ul>

          <div>
            <strong>Total: ${cartData?.total.toFixed(2)}</strong>
          </div>

          <button onClick={clearCart}>Clear Cart</button>
          <button>Checkout</button>
        </>
      )}
    </div>
  );
}

function ProductList() {
  const [category, setCategory] = useState<string | null>(null);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 1000]);

  const products = useLiveQuery(
    () => {
      let query = db.products.toArray();

      if (category) {
        query = query.filter(p => p.category === category);
      }

      query = query.filter(p => p.price >= priceRange[0] && p.price <= priceRange[1]);

      return query.filter(p => p.inStock > 0);
    },
    { collections: [db.products], others: [category, priceRange] }
  );

  const categories = useLiveQuery(
    () => {
      const products = db.products.toArray();
      return Array.from(new Set(products.map(p => p.category))).sort();
    },
    { collections: [db.products], others: [] }
  );

  return (
    <div>
      <h2>Products</h2>

      <div>
        <button onClick={() => setCategory(null)}>All</button>
        {categories?.map(cat => (
          <button key={cat} onClick={() => setCategory(cat)}>
            {cat}
          </button>
        ))}
      </div>

      <div>
        <label>
          Price Range: ${priceRange[0]} - ${priceRange[1]}
        </label>
        <input
          type="range"
          min={0}
          max={1000}
          value={priceRange[1]}
          onChange={e => setPriceRange([priceRange[0], parseInt(e.target.value)])}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
        {products?.map(product => (
          <div key={product.id} style={{ border: '1px solid #ccc', padding: '1rem' }}>
            <img src={product.imageUrl} alt={product.name} width="100%" />
            <h3>{product.name}</h3>
            <p>${product.price}</p>
            <p>{product.inStock} in stock</p>
            <button onClick={() => addToCart(product.id)}>Add to Cart</button>
          </div>
        ))}
      </div>
    </div>
  );
}
```

### Real-Time Chat

A simple chat application with messages and users.

```typescript
type Message = {
  id: string;
  userId: string;
  content: string;
  timestamp: number;
  roomId: string;
};

type ChatUser = {
  id: string;
  name: string;
  avatar: string;
  status: 'online' | 'offline';
};

const db = ramify.createStore({
  messages: {
    primaryKey: 'id',
    indexes: ['roomId', 'userId', 'timestamp']
  },
  users: {
    primaryKey: 'id',
    indexes: ['status']
  }
});

function ChatRoom({ roomId, currentUserId }: { roomId: string; currentUserId: string }) {
  const [newMessage, setNewMessage] = useState('');

  const messages = useLiveQuery(
    () => db.messages
      .where({ roomId })
      .orderBy('timestamp')
      .toArray(),
    { collections: [db.messages], others: [roomId] }
  );

  const users = useLiveQuery(
    () => {
      const messageUserIds = new Set(messages?.map(m => m.userId) || []);
      return Array.from(messageUserIds)
        .map(id => db.users.get(id))
        .filter(Boolean) as ChatUser[];
    },
    { collections: [db.users], others: [messages] }
  );

  const sendMessage = () => {
    if (!newMessage.trim()) return;

    db.messages.add({
      id: crypto.randomUUID(),
      userId: currentUserId,
      content: newMessage.trim(),
      timestamp: Date.now(),
      roomId
    });

    setNewMessage('');
  };

  return (
    <div style={{ display: 'flex', height: '100vh' }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={{ flex: 1, overflowY: 'auto', padding: '1rem' }}>
          {messages?.map(message => {
            const user = users?.find(u => u.id === message.userId);
            const isOwn = message.userId === currentUserId;

            return (
              <div
                key={message.id}
                style={{
                  display: 'flex',
                  justifyContent: isOwn ? 'flex-end' : 'flex-start',
                  marginBottom: '0.5rem'
                }}
              >
                <div
                  style={{
                    maxWidth: '70%',
                    padding: '0.5rem 1rem',
                    borderRadius: '1rem',
                    backgroundColor: isOwn ? '#007bff' : '#e9ecef',
                    color: isOwn ? 'white' : 'black'
                  }}
                >
                  {!isOwn && <strong>{user?.name}: </strong>}
                  {message.content}
                  <div style={{ fontSize: '0.75rem', opacity: 0.7 }}>
                    {new Date(message.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ padding: '1rem', borderTop: '1px solid #ccc' }}>
          <input
            type="text"
            value={newMessage}
            onChange={e => setNewMessage(e.target.value)}
            onKeyPress={e => e.key === 'Enter' && sendMessage()}
            placeholder="Type a message..."
            style={{ width: '100%', padding: '0.5rem' }}
          />
          <button onClick={sendMessage}>Send</button>
        </div>
      </div>

      <div style={{ width: '200px', borderLeft: '1px solid #ccc', padding: '1rem' }}>
        <h3>Users</h3>
        <ul>
          {users?.map(user => (
            <li key={user.id}>
              <img src={user.avatar} alt={user.name} width={30} />
              {user.name}
              <span style={{ color: user.status === 'online' ? 'green' : 'gray' }}>
                ●
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
```

### Analytics Dashboard

Track and visualize user events.

```typescript
type Event = {
  id: string;
  type: 'pageview' | 'click' | 'purchase' | 'signup';
  userId: string;
  timestamp: number;
  metadata: Record<string, any>;
};

const db = ramify.createStore({
  events: {
    primaryKey: 'id',
    indexes: ['type', 'userId', 'timestamp']
  }
});

function AnalyticsDashboard() {
  const stats = useLiveQuery(
    () => {
      const now = Date.now();
      const dayAgo = now - 24 * 60 * 60 * 1000;
      const weekAgo = now - 7 * 24 * 60 * 60 * 1000;

      const allEvents = db.events.toArray();
      const last24h = allEvents.filter(e => e.timestamp > dayAgo);
      const last7d = allEvents.filter(e => e.timestamp > weekAgo);

      const eventsByType = allEvents.reduce((acc, e) => {
        acc[e.type] = (acc[e.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const uniqueUsers = new Set(allEvents.map(e => e.userId)).size;

      return {
        total: allEvents.length,
        last24h: last24h.length,
        last7d: last7d.length,
        eventsByType,
        uniqueUsers
      };
    },
    { collections: [db.events], others: [] }
  );

  return (
    <div>
      <h1>Analytics Dashboard</h1>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
        <div style={{ padding: '1rem', border: '1px solid #ccc' }}>
          <h3>Total Events</h3>
          <p style={{ fontSize: '2rem' }}>{stats?.total}</p>
        </div>

        <div style={{ padding: '1rem', border: '1px solid #ccc' }}>
          <h3>Last 24 Hours</h3>
          <p style={{ fontSize: '2rem' }}>{stats?.last24h}</p>
        </div>

        <div style={{ padding: '1rem', border: '1px solid #ccc' }}>
          <h3>Last 7 Days</h3>
          <p style={{ fontSize: '2rem' }}>{stats?.last7d}</p>
        </div>

        <div style={{ padding: '1rem', border: '1px solid #ccc' }}>
          <h3>Unique Users</h3>
          <p style={{ fontSize: '2rem' }}>{stats?.uniqueUsers}</p>
        </div>
      </div>

      <div style={{ marginTop: '2rem' }}>
        <h2>Events by Type</h2>
        <ul>
          {Object.entries(stats?.eventsByType || {}).map(([type, count]) => (
            <li key={type}>
              {type}: {count}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

// Track events
function trackEvent(type: Event['type'], userId: string, metadata: Record<string, any> = {}) {
  db.events.add({
    id: crypto.randomUUID(),
    type,
    userId,
    timestamp: Date.now(),
    metadata
  });
}

// Usage
trackEvent('pageview', 'user-123', { page: '/home' });
trackEvent('click', 'user-123', { button: 'signup' });
trackEvent('purchase', 'user-456', { amount: 99.99, product: 'premium' });
```

These examples demonstrate common patterns and real-world use cases for Ramify DB. You can adapt
them to your specific needs!
