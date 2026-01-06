import { readdirSync, statSync } from 'fs';
import { join } from 'path';

export const dynamic = 'force-static';

// Recursively find all markdown files in a directory
function getAllMarkdownFiles(dir: string, baseDir: string = dir): string[] {
	const files: string[] = [];
	const items = readdirSync(dir);

	for (const item of items) {
		const fullPath = join(dir, item);
		const stat = statSync(fullPath);

		if (stat.isDirectory()) {
			files.push(...getAllMarkdownFiles(fullPath, baseDir));
		} else if (item.endsWith('.md')) {
			const relativePath = fullPath.substring(baseDir.length + 1);
			const slug = relativePath.replace(/\.md$/, '');
			files.push(slug);
		}
	}

	return files;
}

export default function sitemap() {
	const baseUrl = 'https://ramifyjs.haroonwaves.com';

	// Get all documentation pages
	const contentDir = join(process.cwd(), 'content/docs');
	const docSlugs = getAllMarkdownFiles(contentDir);

	const docUrls = docSlugs.map((slug) => ({
		url: `${baseUrl}/docs/${slug}`,
		lastModified: new Date(),
		changeFrequency: 'weekly' as const,
		priority: 0.8,
	}));

	return [
		{
			url: baseUrl,
			lastModified: new Date(),
			changeFrequency: 'monthly' as const,
			priority: 1,
		},
		{
			url: `${baseUrl}/docs`,
			lastModified: new Date(),
			changeFrequency: 'weekly' as const,
			priority: 0.9,
		},
		...docUrls,
	];
}
