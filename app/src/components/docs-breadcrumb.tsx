'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight } from 'lucide-react';
import { Fragment } from 'react';

const pathToTitle: Record<string, string> = {
	'getting-started': 'Getting Started',
	'api-reference': 'API Reference',
	'advanced-queries': 'Advanced Queries',
	'live-queries': 'Live Queries',
	'best-practices': 'Best Practices',
	examples: 'Examples',
	comparison: 'Comparison',
	faq: 'FAQ',
};

export function DocsBreadcrumb() {
	const pathname = usePathname();
	const segments = pathname.split('/').filter(Boolean);

	if (segments.length <= 1) return null;

	return (
		<nav
			className="flex items-center gap-1.5 text-sm text-muted-foreground"
			aria-label="Breadcrumb"
		>
			{segments.map((segment, index) => {
				const href = '/' + segments.slice(0, index + 1).join('/');
				const isLast = index === segments.length - 1;
				const title = pathToTitle[segment] || segment.charAt(0).toUpperCase() + segment.slice(1);

				return (
					<Fragment key={href}>
						{index > 0 && <ChevronRight className="h-3.5 w-3.5 shrink-0" />}
						{isLast ? (
							<span className="font-medium text-foreground">{title}</span>
						) : (
							<Link href={href} className="hover:text-foreground">
								{title}
							</Link>
						)}
					</Fragment>
				);
			})}
		</nav>
	);
}
