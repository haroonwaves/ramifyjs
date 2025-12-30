'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ArrowLeft, ArrowRight } from 'lucide-react';

import { pageOrder } from '@/config/docs';

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
