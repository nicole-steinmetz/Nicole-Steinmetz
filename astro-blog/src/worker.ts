import handler, {
	createScheduledHandler,
	EmDashRoom,
	EmDashRoomSite,
	PluginBridge,
} from '@emdash-cms/cloudflare/worker';

export { EmDashRoom, EmDashRoomSite, PluginBridge };

function routeEmDashUnderBlog(request: Request): Request {
	const url = new URL(request.url);
	if (url.pathname === '/_emdash' || url.pathname.startsWith('/_emdash/')) {
		url.pathname = `/blog${url.pathname}`;
		return new Request(url, request);
	}
	return request;
}

export default {
	...handler,
	fetch(request, env, ctx) {
		if (!handler.fetch) throw new Error('The Astro handler has no fetch');
		return handler.fetch(routeEmDashUnderBlog(request), env, ctx);
	},
	scheduled: createScheduledHandler(),
} satisfies ExportedHandler;
