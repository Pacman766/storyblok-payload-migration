import { notFound } from 'next/navigation';
import { StoryblokStory } from '@storyblok/react/rsc';
import { getStoryblokApi } from '@/lib/storyblok';

export default async function Page({ params }) {
	const { slug } = await params;

	let fullSlug = slug ? slug.join('/') : 'home';

	let sbParams = {
		version: 'draft',
	};

	let data;
	try {
		const storyblokApi = getStoryblokApi();
		({ data } = await storyblokApi.get(`cdn/stories/${fullSlug}`, sbParams));
	} catch {
		// Missing token, story not found, or network error → render a 404, not a 500.
		notFound();
	}

	if (!data?.story) {
		notFound();
	}

	return <StoryblokStory story={data.story} />;
}
