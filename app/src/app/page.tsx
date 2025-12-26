'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Database, Zap, Code2, Sparkles, ArrowRight, Github, Terminal } from 'lucide-react';

export default function Home() {
	return (
		<div className="relative min-h-screen overflow-hidden">
			{/* Animated Background Grid */}
			<div className="pointer-events-none fixed inset-0 z-0">
				<div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-size-[24px_24px] mask-[radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_110%)]" />
			</div>

			{/* Gradient Orbs */}
			<div className="pointer-events-none fixed inset-0 z-0">
				<div className="absolute left-1/4 top-0 h-[500px] w-[500px] animate-pulse rounded-full bg-foreground/5 blur-[120px]" />
				<div className="absolute bottom-0 right-1/4 h-[500px] w-[500px] animate-pulse rounded-full bg-foreground/5 blur-[120px] [animation-delay:2s]" />
			</div>

			<div className="relative z-10">
				{/* Hero Section */}
				<section className="px-6 py-24 sm:py-40 lg:px-8">
					<div className="mx-auto max-w-4xl">
						<div className="mb-8 flex justify-center">
							<div className="group relative inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/50 px-4 py-1.5 text-xs font-medium text-muted-foreground backdrop-blur-sm transition-all hover:border-foreground/20 hover:bg-background/80">
								<Sparkles className="h-3.5 w-3.5 transition-transform group-hover:rotate-12" />
								<span className="bg-linear-to-r from-foreground to-foreground/60 bg-clip-text text-transparent">
									Lightweight • Reactive • TypeScript-First
								</span>
							</div>
						</div>

						<h1 className="mb-8 text-center text-6xl font-bold tracking-tighter sm:text-7xl lg:text-8xl">
							<span className="inline-block bg-linear-to-b from-foreground to-foreground/40 bg-clip-text text-transparent">
								Ramify DB
							</span>
						</h1>

						<p className="mb-6 text-center text-xl font-medium text-foreground/90 sm:text-2xl lg:text-3xl">
							Lightweight in-memory database with{' '}
							<span className="relative inline-block">
								<span className="relative z-10 bg-linear-to-r from-foreground to-foreground/60 bg-clip-text text-transparent">
									live query observation
								</span>
								<span className="absolute -bottom-1 left-0 h-[2px] w-full bg-linear-to-r from-foreground/40 to-transparent" />
							</span>
						</p>

						<p className="mx-auto mb-12 max-w-2xl text-center text-base leading-relaxed text-muted-foreground sm:text-lg">
							Build reactive applications with a powerful, type-safe database that runs entirely in
							memory. Perfect for client-side data management, real-time data, and observable
							queries.
						</p>

						<div className="flex flex-wrap items-center justify-center gap-4">
							<Link href="/docs">
								<Button
									size="lg"
									className="group cursor-pointer gap-2 bg-foreground px-8 py-6 text-base font-medium text-background transition-all hover:scale-105 hover:shadow-[0_0_40px_rgba(0,0,0,0.1)] dark:hover:shadow-[0_0_40px_rgba(255,255,255,0.1)]"
								>
									Get Started
									<ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
								</Button>
							</Link>
							<Link href="https://github.com/haroonwaves/ramify-db" target="_blank">
								<Button
									size="lg"
									variant="outline"
									className="group cursor-pointer gap-2 border border-gray-300 bg-background/50 px-8 py-6 text-base font-medium backdrop-blur-sm transition-all hover:scale-105 hover:border-foreground/40 hover:bg-background/80"
								>
									<Github className="h-4 w-4 transition-transform group-hover:rotate-12" />
									GitHub
								</Button>
							</Link>
						</div>

						{/* Stats */}
						<div className="mt-20 grid grid-cols-3 gap-8 border-y border-border/40 py-8">
							<div className="text-center">
								<div className="mb-1 text-3xl font-bold tracking-tight">0</div>
								<div className="text-sm text-muted-foreground">Dependencies</div>
							</div>
							<div className="text-center">
								<div className="mb-1 text-3xl font-bold tracking-tight">&lt;5KB</div>
								<div className="text-sm text-muted-foreground">Minified</div>
							</div>
							<div className="text-center">
								<div className="mb-1 text-3xl font-bold tracking-tight">100%</div>
								<div className="text-sm text-muted-foreground">TypeScript</div>
							</div>
						</div>
					</div>
				</section>

				{/* Features Grid */}
				<section className="px-6 py-24 lg:px-8">
					<div className="mx-auto max-w-7xl">
						<div className="mb-20 text-center">
							<h2 className="mb-4 text-4xl font-bold tracking-tight sm:text-5xl">Why Ramify DB?</h2>
							<p className="mx-auto max-w-2xl text-lg text-muted-foreground">
								Everything you need for reactive, client-side data management
							</p>
						</div>

						<div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
							{[
								{
									icon: Database,
									title: 'In-Memory Performance',
									description:
										'Lightning-fast queries with data stored entirely in memory. No network latency, no disk I/O.',
								},
								{
									icon: Zap,
									title: 'Live Query Observation',
									description:
										'React hooks that automatically re-render when your data changes. Build reactive UIs effortlessly.',
								},
								{
									icon: Code2,
									title: 'TypeScript-First',
									description:
										'Full type safety with intelligent autocomplete. Catch errors at compile time, not runtime.',
								},
								{
									icon: Sparkles,
									title: 'Powerful Queries',
									description:
										'Fluent API with filtering, sorting, pagination, and range operators. Query like a pro.',
								},
								{
									icon: Database,
									title: 'Indexed Collections',
									description:
										'Create indexes for lightning-fast lookups. Support for multi-entry indexes on array fields.',
								},
								{
									icon: Terminal,
									title: 'Zero Dependencies',
									description:
										'Minimal footprint with no external dependencies. Just pure, efficient JavaScript.',
								},
							].map((feature, index) => (
								<div
									key={index}
									className="group relative overflow-hidden rounded-2xl border border-border/60 bg-background/50 p-8 backdrop-blur-sm transition-all hover:border-foreground/20 hover:bg-background/80 hover:shadow-[0_8px_30px_rgba(0,0,0,0.06)] dark:hover:shadow-[0_8px_30px_rgba(255,255,255,0.06)]"
								>
									<div className="absolute right-0 top-0 h-32 w-32 translate-x-8 -translate-y-8 rounded-full bg-foreground/5 blur-2xl transition-all group-hover:bg-foreground/10" />
									<div className="relative">
										<div className="mb-5 flex h-14 w-14 items-center justify-center rounded-xl border border-border/60 bg-background shadow-sm transition-all group-hover:scale-110 group-hover:border-foreground/30 group-hover:shadow-md">
											<feature.icon className="h-6 w-6 transition-transform group-hover:rotate-6" />
										</div>
										<h3 className="mb-3 text-xl font-semibold">{feature.title}</h3>
										<p className="leading-relaxed text-muted-foreground">{feature.description}</p>
									</div>
								</div>
							))}
						</div>
					</div>
				</section>

				{/* Code Example Section */}
				<section className="px-6 py-24 lg:px-8">
					<div className="mx-auto max-w-5xl">
						<div className="mb-12 text-center">
							<h2 className="mb-4 text-4xl font-bold tracking-tight sm:text-5xl">Quick Example</h2>
							<p className="text-lg text-muted-foreground">
								Get started in seconds with our intuitive API
							</p>
						</div>

						<div className="group relative overflow-hidden rounded-2xl border border-border/60 bg-background/50 shadow-2xl backdrop-blur-sm transition-all hover:border-foreground/20 hover:shadow-[0_20px_70px_rgba(0,0,0,0.1)] dark:hover:shadow-[0_20px_70px_rgba(255,255,255,0.1)]">
							<div className="absolute right-0 top-0 h-64 w-64 translate-x-20 -translate-y-20 rounded-full bg-foreground/5 blur-3xl transition-all group-hover:bg-foreground/10" />
							<div className="relative border-b border-border/40 bg-muted/30 px-6 py-4">
								<div className="flex items-center gap-2">
									<div className="h-3 w-3 rounded-full bg-foreground/20" />
									<div className="h-3 w-3 rounded-full bg-foreground/20" />
									<div className="h-3 w-3 rounded-full bg-foreground/20" />
									<span className="ml-4 text-xs font-medium text-muted-foreground">
										example.tsx
									</span>
								</div>
							</div>
							<pre className="relative overflow-x-auto bg-muted/30 p-8 text-sm leading-7">
								<code className="text-foreground">{`
import { Ramify, type Schema } from '@ramify-db/core';
import { useLiveQuery } from '@ramify-db/react';

// Define your schema
type User = {
  id: string;
  name: string;
  email: string;
  age: number;
};

// Create a store
const db = new Ramify().createStore<{
	users: Schema<User, 'id'>;
}>({
	users: {
		primaryKey: 'id',
		indexes: ['email', 'age'],
		multiEntry: ['tags'],
	},
});

// Add data
db.users.add({
  id: '1',
  name: 'Alice',
  email: 'alice@example.com',
  age: 28
});

// Query with live updates
function UserList() {
  const users = useLiveQuery(
    () => db.users
    	.orderBy('name')
    	.reverse()
    	.limit(10)
    	.toArray(),
    { collections: [db.users], others: [] }
  );
  
  return <div>{users?.map(u => u.name)}</div>;
}`}</code>
							</pre>
						</div>
					</div>
				</section>

				{/* CTA Section */}
				<section className="px-6 py-24 lg:px-8">
					<div className="mx-auto max-w-4xl">
						<div className="relative overflow-hidden rounded-3xl border border-border/60 bg-linear-to-br from-background/80 to-background/40 p-12 text-center backdrop-blur-sm sm:p-16">
							<div className="absolute left-1/2 top-1/2 h-[300px] w-[300px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-foreground/5 blur-3xl" />
							<div className="relative">
								<h2 className="mb-4 text-4xl font-bold tracking-tight sm:text-5xl">
									Ready to get started?
								</h2>
								<p className="mb-10 text-lg text-muted-foreground">
									Explore the documentation and start building reactive applications today.
								</p>
								<Link href="/docs">
									<Button
										size="lg"
										className="group gap-2 bg-foreground px-10 py-7 text-lg font-medium text-background transition-all hover:scale-105 hover:shadow-[0_0_50px_rgba(0,0,0,0.15)] dark:hover:shadow-[0_0_50px_rgba(255,255,255,0.15)]"
									>
										Read the Documentation
										<ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
									</Button>
								</Link>
							</div>
						</div>
					</div>
				</section>
			</div>
		</div>
	);
}
