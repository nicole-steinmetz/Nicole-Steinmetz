// @ts-check

import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
	site: 'https://nicolesteinmetz.com',
	base: '/blog',
	trailingSlash: 'always',
	build: {
		// Keep hashed assets off /_astro/ so they cannot collide with the
		// marketing Pages project once both share nicolesteinmetz.com.
		assets: '_ns-blog',
	},
	integrations: [mdx(), sitemap()],
});
