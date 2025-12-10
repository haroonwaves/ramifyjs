import { getAllBlogsMeta, type BlogMeta } from '@haroonwaves/blog-kit-core';
import { BlogList } from '@haroonwaves/blog-kit-react';
import Link from 'next/link';

export default function Docs() {
	const blogsMeta: BlogMeta[] = getAllBlogsMeta({
		contentDirectory: process.cwd(),
		blogSubdirectory: 'content/docs',
	});

	return (
		<BlogList
			metadata={blogsMeta}
			basePath="/docs"
			renderLink={(href, children) => <Link href={href}>{children}</Link>}
		/>
	);
}
