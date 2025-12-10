import { getAllBlogsMeta, getBlog } from '@haroonwaves/blog-kit-core';
import { BlogRenderer } from '@haroonwaves/blog-kit-react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

export async function generateStaticParams() {
	const blogsMeta = getAllBlogsMeta({
		contentDirectory: process.cwd(),
		blogSubdirectory: 'content/docs',
	});
	return blogsMeta.map((meta) => ({ slug: meta.slug }));
}

export async function generateMetadata({
	params,
}: {
	params: { slug: string };
}): Promise<Metadata> {
	const blog = getBlog(params.slug, {
		contentDirectory: process.cwd(),
		blogSubdirectory: 'content/docs',
	});

	if (!blog) {
		return {
			title: 'Blog Post Not Found',
		};
	}

	return {
		title: blog.metadata.title,
		description: blog.metadata.description,
		openGraph: {
			title: blog.metadata.title,
			description: blog.metadata.description,
			type: 'article',
			publishedTime: blog.metadata.date,
		},
	};
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
	const { slug } = await params;

	const blog = getBlog(slug, {
		contentDirectory: process.cwd(),
		blogSubdirectory: 'content/docs',
	});

	if (!blog) notFound();

	return (
		<article>
			<BlogRenderer content={blog.content} metadata={blog.metadata} />
		</article>
	);
}
