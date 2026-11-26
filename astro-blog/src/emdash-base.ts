import { defineMiddleware } from 'astro:middleware';

const BASE = '/blog';

/**
 * The blog is served under /blog, so a request for the admin arrives as
 * /blog/_emdash/.... EmDash only attaches the database when the path starts
 * with /_emdash, so strip the blog prefix before its middleware runs.
 */
export const onRequest = defineMiddleware(async (context, next) => {
	const { pathname } = context.url;
	if (pathname === `${BASE}/_emdash` || pathname.startsWith(`${BASE}/_emdash/`)) {
		context.url.pathname = pathname.slice(BASE.length);
	}
	return next();
});
