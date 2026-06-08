import Page from '@/components/Page';
import Hero from '@/components/Hero';
import Testimonial from '@/components/Testimonial';
import CaseStudy from '@/components/CaseStudy';
import TeamMember from '@/components/TeamMember';
import ServiceItem from '@/components/ServiceItem';
import { apiPlugin, storyblokInit } from '@storyblok/react/rsc';

export const getStoryblokApi = storyblokInit({
	accessToken: process.env.STORYBLOK_DELIVERY_API_TOKEN,
	use: [apiPlugin],
	components: {
		page: Page,
		hero: Hero,
		testimonial: Testimonial,
		case_study: CaseStudy,
		team_member: TeamMember,
		service_item: ServiceItem,
	},
	apiOptions: {
		/** Set the correct region for your space. Learn more: https://www.storyblok.com/docs/packages/storyblok-js#example-region-parameter */
		region: process.env.STORYBLOK_REGION || 'eu',
		/** The following code is only required when creating a Storyblok space directly via the Blueprints feature. */
		endpoint: process.env.STORYBLOK_API_BASE_URL
			? `${new URL(process.env.STORYBLOK_API_BASE_URL).origin}/v2`
			: undefined,
	},
});
