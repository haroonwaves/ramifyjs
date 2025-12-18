'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ArrowLeft, ArrowRight } from 'lucide-react';

interface PageLink {
	title: string;
	href: string;
}

const pageOrder: PageLink[] = [
	{ title: 'Getting Started', href: '/docs/getting-started' },
	{ title: 'Store & Collections', href: '/docs/core/store-and-collections' },
	{ title: 'Indexes', href: '/docs/core/indexes' },
	{ title: 'Queries', href: '/docs/core/queries' },
	{ title: 'Live Queries (React)', href: '/docs/core/live-queries' },
	{ title: 'CRUD Patterns', href: '/docs/guides/crud' },
	{ title: 'Pagination & Sorting', href: '/docs/guides/pagination-sorting' },
	{ title: 'Search', href: '/docs/guides/search' },
	{ title: 'Performance', href: '/docs/guides/performance' },
	{ title: 'Persistence', href: '/docs/guides/persistence' },
	{ title: 'Store API', href: '/docs/api/store' },
	{ title: 'Collection API', href: '/docs/api/collection' },
	{ title: 'Query API', href: '/docs/api/query' },
	{ title: 'React Hooks', href: '/docs/api/react-hooks' },
	{ title: 'Examples', href: '/docs/examples' },
	{ title: 'FAQ', href: '/docs/faq' },
];

export function DocsNavigation() {
	const pathname = usePathname();
	const currentIndex = pageOrder.findIndex((page) => page.href === pathname);

	if (currentIndex === -1) return null;

	const prevPage = currentIndex > 0 ? pageOrder[currentIndex - 1] : null;
	const nextPage = currentIndex < pageOrder.length - 1 ? pageOrder[currentIndex + 1] : null;

	if (!prevPage && !nextPage) return null;

	return (
		<div className="mt-16 grid gap-4 border-t border-border/40 pt-8 sm:grid-cols-2">
			{prevPage ? (
				<Link
					href={prevPage.href}
					className="group flex items-center gap-3 rounded-lg border border-border/40 p-4 transition-colors hover:border-border hover:bg-foreground/2"
				>
					<ArrowLeft className="h-4 w-4 shrink-0 text-muted-foreground" />
					<div className="flex flex-col">
						<span className="text-xs text-muted-foreground">Previous</span>
						<span className="text-sm font-medium">{prevPage.title}</span>
					</div>
				</Link>
			) : (
				<div />
			)}
			{nextPage && (
				<Link
					href={nextPage.href}
					className="group flex items-center justify-end gap-3 rounded-lg border border-border/40 p-4 transition-colors hover:border-border hover:bg-foreground/2 sm:col-start-2"
				>
					<div className="flex flex-col text-right">
						<span className="text-xs text-muted-foreground">Next</span>
						<span className="text-sm font-medium">{nextPage.title}</span>
					</div>
					<ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
				</Link>
			)}
		</div>
	);
}
