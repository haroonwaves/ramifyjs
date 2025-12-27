'use client';

import { ThemeToggle } from '@/components/theme-toggle';
import Link from 'next/link';
import Image from 'next/image';
import { useTheme } from 'next-themes';

export default function Header() {
	const { theme, resolvedTheme } = useTheme();
	const currentTheme = theme === 'system' ? resolvedTheme : theme;

	return (
		<header className="sticky top-0 z-50 border-b border-border/40 bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
			<div className="flex h-16 items-center justify-between px-6">
				<Link href="/" className="flex items-center transition-opacity hover:opacity-80">
					<Image
						src={currentTheme === 'dark' ? '/logo-dark.svg' : '/logo.svg'}
						alt="Ramify"
						width={120}
						height={32}
					/>
				</Link>

				<nav className="flex items-center gap-6">
					<Link
						href="/docs"
						className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
					>
						Documentation
					</Link>
					<a
						href="https://github.com/haroonwaves/ramify-db"
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
