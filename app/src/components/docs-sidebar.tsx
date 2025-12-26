'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Book, Lightbulb, Rocket, Package } from 'lucide-react';

interface DocSection {
	title: string;
	icon: React.ComponentType<{ className?: string }>;
	items: {
		title: string;
		href: string;
	}[];
}

const docSections: DocSection[] = [
	{
		title: 'Introduction',
		icon: Rocket,
		items: [{ title: 'Getting Started', href: '/docs/getting-started' }],
	},
	{
		title: 'Core Concepts',
		icon: Book,
		items: [
			{ title: 'Store & Collections', href: '/docs/core/store-and-collections' },
			{ title: 'Indexes', href: '/docs/core/indexes' },
			{ title: 'Queries', href: '/docs/core/queries' },
			{ title: 'Live Queries (React)', href: '/docs/core/live-queries' },
		],
	},
	{
		title: 'API Reference',
		icon: Package,
		items: [
			{ title: 'Store API', href: '/docs/api/store' },
			{ title: 'Collection API', href: '/docs/api/collection' },
			{ title: 'Query API', href: '/docs/api/query' },
			{ title: 'React Hooks', href: '/docs/api/react-hooks' },
		],
	},
	{
		title: 'Guides',
		icon: Lightbulb,
		items: [
			{ title: 'CRUD Patterns', href: '/docs/guides/crud' },
			{ title: 'Pagination & Sorting', href: '/docs/guides/pagination-sorting' },
			{ title: 'Search', href: '/docs/guides/search' },
			{ title: 'Performance', href: '/docs/guides/performance' },
			{ title: 'Persistence', href: '/docs/guides/persistence' },
		],
	},
	{
		title: 'Resources',
		icon: Book,
		items: [
			{ title: 'Examples', href: '/docs/examples' },
			{ title: 'FAQ', href: '/docs/faq' },
		],
	},
];

export function DocsSidebar() {
	const pathname = usePathname();

	return (
		<aside className="sticky top-16 overflow-y-auto h-[calc(100vh-4rem)] w-64 shrink-0 border-r border-border/40 bg-background lg:block">
			<div className="flex h-full flex-col gap-8 p-6">
				{/* Navigation */}
				<nav className="flex-1 space-y-8 ">
					{docSections.map((section) => {
						if (section.items.length === 0) return null;
						const Icon = section.icon;

						return (
							<div key={section.title} className="space-y-3">
								<div className="flex items-center gap-2 px-2 text-xs font-medium uppercase tracking-wider text-muted-foreground/80">
									<Icon className="h-3.5 w-3.5" />
									{section.title}
								</div>
								<ul className="space-y-0.5">
									{section.items.map((item) => {
										const isActive = pathname === item.href;
										return (
											<li key={item.href}>
												<Link
													href={item.href}
													className={cn(
														'block rounded-md px-2 py-1.5 text-sm transition-colors',
														isActive
															? 'bg-foreground/5 font-medium text-foreground'
															: 'text-muted-foreground hover:bg-foreground/3 hover:text-foreground'
													)}
												>
													{item.title}
												</Link>
											</li>
										);
									})}
								</ul>
							</div>
						);
					})}
				</nav>
			</div>
		</aside>
	);
}
