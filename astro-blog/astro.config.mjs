// @ts-check

import cloudflare from '@astrojs/cloudflare';
import mdx from '@astrojs/mdx';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import { d1, r2 } from '@emdash-cms/cloudflare';
import { defineConfig } from 'astro/config';
import emdash from 'emdash/astro';

// https://astro.build/config
// Cloudflare guide: https://docs.emdashcms.com/deployment/cloudflare/
// Sandboxed plugins are not used, so there is no LOADER binding or sandboxRunner.
export default defineConfig({
	site: 'https://nicolesteinmetz.com',
	base: '/blog',
	// 'ignore' so the EmDash admin API (no trailing slash) and the blog's
	// trailing-slash links both resolve. 'always' rewrites /_emdash routes to
	// a slash and they 404.
	trailingSlash: 'ignore',
	output: 'server',
	adapter: cloudflare(),
	vite: {
		plugins: [
			{
				name: 'emdash-outside-base',
				enforce: 'post',
				configureServer(server) {
					// Astro's base check answers browsers with a 404 for any URL
					// that is not under /blog, before the admin route can run.
					// Run ahead of that check and present /_emdash as /blog/_emdash.
					return () => {
						server.middlewares.stack.unshift({
							route: '',
							handle(req, _res, next) {
								const url = req.url ?? '';
								const path = url.split('?')[0];
								if (path === '/_emdash' || path.startsWith('/_emdash/')) {
									req.url = `/blog${url}`;
								}
								next();
							},
						});
					};
				},
			},
		],
	},
	build: {
		// Keep hashed assets off /_astro/ so they cannot collide with the
		// marketing Pages project once both share nicolesteinmetz.com.
		assets: '_ns-blog',
	},
	integrations: [
		mdx(),
		sitemap(),
		react(),
		emdash({
			database: d1({ binding: 'DB' }),
			storage: r2({ binding: 'MEDIA' }),
			middleware: { outer: './src/emdash-base.ts' },
		}),
	],
});
