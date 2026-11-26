import rss from '@astrojs/rss';
import { SITE_DESCRIPTION, SITE_TITLE } from '../consts';
import { base } from '../lib/base';
import { dateOf, listCaseStudies } from '../lib/case-studies';

export async function GET(context) {
	const posts = await listCaseStudies();
	return rss({
		title: SITE_TITLE,
		description: SITE_DESCRIPTION,
		site: context.site,
		items: posts.map((post) => ({
			title: post.data.title,
			description: post.data.description,
			pubDate: dateOf(post),
			link: `${base}${post.id}/`,
		})),
	});
}
