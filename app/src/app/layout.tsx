import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { ThemeProvider } from '@/components/theme-provider';
import Header from '@/app/header';

import './globals.css';
import '@haroonwaves/blog-kit-react/dist/index.css'; // For Prism styles
import '@haroonwaves/blog-kit-react/dist/style.css'; // For Component styles

const geistSans = Geist({
	variable: '--font-geist-sans',
	subsets: ['latin'],
});

const geistMono = Geist_Mono({
	variable: '--font-geist-mono',
	subsets: ['latin'],
});

export const metadata: Metadata = {
	title: {
		default: 'Ramify JS - Lightweight In-Memory JavaScript Database',
		template: '%s | Ramify JS',
	},
	description:
		'Ramify JS is a lightweight, reactive in-memory database for JavaScript. Perfect for client-side apps, edge runtimes, and Node.js.',
	keywords: [
		'in-memory database',
		'javascript database',
		'js database',
		'ramifyjs',
		'ramify js',
		'client-side database',
		'reactive database',
		'typescript database',
		'browser database',
		'edge database',
		'local database',
		'observable queries',
		'live queries',
		'in-process database',
	],
	authors: [{ name: 'Haroon' }],
	creator: 'Haroon',
	publisher: 'Haroon',
	icons: {
		icon: '/favicon.svg',
		apple: '/favicon.svg',
	},
	metadataBase: new URL('https://ramifyjs.haroonwaves.com'),
	alternates: {
		canonical: '/',
	},
	openGraph: {
		type: 'website',
		locale: 'en_US',
		url: 'https://ramifyjs.haroonwaves.com',
		title: 'Ramify JS - Lightweight In-Memory JavaScript Database',
		description:
			'Ramify JS is a lightweight, reactive in-memory database for JavaScript. Perfect for client-side apps, edge runtimes, and Node.js.',
		siteName: 'Ramify JS',
		images: [
			{
				url: 'https://ramifyjs.haroonwaves.com/og-image.png',
				width: 1200,
				height: 630,
				alt: 'Ramify JS - Lightweight In-Memory JavaScript Database',
			},
		],
	},
	twitter: {
		card: 'summary_large_image',
		title: 'Ramify JS - Lightweight In-Memory JavaScript Database',
		description:
			'Reactive in-memory database for JavaScript. Zero dependencies, TypeScript-first, with live query observation.',
		creator: '@haroonwaves',
		images: ['https://ramifyjs.haroonwaves.com/og-image.png'],
	},
	robots: {
		index: true,
		follow: true,
		googleBot: {
			index: true,
			follow: true,
			'max-video-preview': -1,
			'max-image-preview': 'large',
			'max-snippet': -1,
		},
	},
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="en" suppressHydrationWarning>
			<body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
				<ThemeProvider
					attribute="class"
					defaultTheme="system"
					enableSystem
					disableTransitionOnChange
				>
					<Header />
					{children}
				</ThemeProvider>
			</body>
		</html>
	);
}
