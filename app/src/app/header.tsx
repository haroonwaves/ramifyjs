import { ThemeToggle } from '@/components/theme-toggle';
import Image from 'next/image';

export default function Header() {
	return (
		<header className="flex items-center justify-between">
			<Image className="invert dark:invert-0" src="/vercel.svg" alt="Logo" width={32} height={32} />
			<ThemeToggle />
		</header>
	);
}
