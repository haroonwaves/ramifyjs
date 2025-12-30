import { getBlog } from '@haroonwaves/blog-kit-core';
import { BlogRenderer } from '@haroonwaves/blog-kit-react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { DocsNavigation } from '@/components/docs-navigation';
import { readdirSync, statSync } from 'fs';
import { join } from 'path';

// Recursively find all markdown files in a directory
function getAllMarkdownFiles(dir: string, baseDir: string = dir): string[] {
	const files: string[] = [];
	const items = readdirSync(dir);

	for (const item of items) {
		const fullPath = join(dir, item);
		const stat = statSync(fullPath);

		if (stat.isDirectory()) {
			// Recursively scan subdirectories
			files.push(...getAllMarkdownFiles(fullPath, baseDir));
		} else if (item.endsWith('.md')) {
			// Convert absolute path to relative slug
			// e.g., "/path/to/content/docs/core/indexes.md" -> "core/indexes"
			const relativePath = fullPath.substring(baseDir.length + 1);
			const slug = relativePath.replace(/\.md$/, '');
			files.push(slug);
		}
	}

	return files;
}

export function generateStaticParams() {
	const contentDir = join(process.cwd(), 'content/docs');
	const allSlugs = getAllMarkdownFiles(contentDir);

	return allSlugs.map((slug) => {
		// Convert slug to array for catch-all route
		// e.g., "core/store-and-collections" -> ["core", "store-and-collections"]
		const slugParts = slug.split('/');
		return { slug: slugParts };
	});
}

export async function generateMetadata({
	params,
}: {
	params: Promise<{ slug: string[] }>;
}): Promise<Metadata> {
	const { slug } = await params;

	// Join slug parts back together
	const slugPath = slug.join('/');

	const blog = getBlog(slugPath, {
		contentDirectory: process.cwd(),
		blogSubdirectory: 'content/docs',
	});

	if (!blog) {
		return {
			title: 'Documentation Not Found',
		};
	}

	return {
		title: `${blog.metadata.title} | Ramify JS`,
		description: blog.metadata.description,
		openGraph: {
			title: blog.metadata.title,
			description: blog.metadata.description,
			type: 'article',
			publishedTime: blog.metadata.date,
		},
	};
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string[] }> }) {
	const { slug } = await params;

	// Join slug parts back together
	const slugPath = slug.join('/');

	const blog = getBlog(slugPath, {
		contentDirectory: process.cwd(),
		blogSubdirectory: 'content/docs',
	});

	if (!blog) notFound();

	return (
		<article className="space-y-8">
			<BlogRenderer
				content={blog.content}
				metadata={blog.metadata}
				showCategory={false}
				showDate={false}
				showReadingTime={false}
			/>
			<DocsNavigation />
		</article>
	);
}
