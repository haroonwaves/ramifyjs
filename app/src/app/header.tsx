'use client';

import { ThemeToggle } from '@/components/theme-toggle';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useTheme } from 'next-themes';
import { cn } from '@/lib/utils';
import * as React from 'react';

export default function Header() {
	const { theme, resolvedTheme } = useTheme();
	const [mounted, setMounted] = React.useState(false);

	React.useEffect(() => {
		setMounted(true);
	}, []);

	const currentTheme = theme === 'system' ? resolvedTheme : theme;
	const pathname = usePathname();
	const isDocs = pathname.startsWith('/docs');

	return (
		<header className="sticky top-0 z-50 border-b border-border/40 bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
			<div className="flex h-16 items-center justify-between px-6">
				<Link
					href="/"
					className={cn(
						'flex items-center transition-opacity hover:opacity-80',
						isDocs && 'pl-8 lg:pl-0'
					)}
				>
					{mounted ? (
						<Image
							src={currentTheme === 'dark' ? '/logo-dark.svg' : '/logo.svg'}
							alt="Ramify"
							width={120}
							height={32}
						/>
					) : (
						<div className="w-[120px] h-8" /> // Spacer to prevent layout shift
					)}
				</Link>

				<nav className="flex items-center gap-6">
					<Link
						href="/docs/getting-started"
						className="text-sm hidden lg:inline-block font-medium text-muted-foreground transition-colors hover:text-foreground"
					>
						Documentation
					</Link>
					<a
						href="https://github.com/haroonwaves/ramifyjs"
						target="_blank"
						rel="noopener noreferrer"
						className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
					>
						GitHub
					</a>
					<ThemeToggle />
				</nav>
			</div>
		</header>
	);
}
