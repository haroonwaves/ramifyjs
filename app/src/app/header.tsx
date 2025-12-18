import { ThemeToggle } from '@/components/theme-toggle';
import Link from 'next/link';
import { Zap } from 'lucide-react';

export default function Header() {
	return (
		<header className="sticky top-0 z-50 border-b border-border/40 bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
			<div className="flex h-16 items-center justify-between px-6">
				<Link href="/" className="flex items-center gap-2 transition-opacity hover:opacity-80">
					<div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
						<Zap className="h-5 w-5 text-primary-foreground" />
					</div>
					<span className="text-lg font-bold">Ramify DB</span>
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
