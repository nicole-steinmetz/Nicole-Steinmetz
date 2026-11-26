/** Public prefix, always with a trailing slash (`/blog/`). */
export const base = import.meta.env.BASE_URL.endsWith('/')
	? import.meta.env.BASE_URL
	: `${import.meta.env.BASE_URL}/`;
