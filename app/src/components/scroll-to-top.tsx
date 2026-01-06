'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

export function ScrollToTop() {
	const pathname = usePathname();

	useEffect(() => {
		// Scroll to top with a small delay to ensure content is rendered
		// Using setTimeout to avoid conflicts with Next.js default scroll behavior
		const timeoutId = setTimeout(() => {
			window.scrollTo({
				top: 0,
				behavior: 'smooth', // Use 'instant' for immediate scroll, or 'smooth' for animated
			});
		}, 0);

		return () => clearTimeout(timeoutId);
	}, [pathname]);

	return null;
}
