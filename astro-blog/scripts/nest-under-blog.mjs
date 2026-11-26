import { mkdirSync, readdirSync, renameSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const dist = fileURLToPath(new URL('../dist', import.meta.url));
const dest = join(dist, 'blog');

mkdirSync(dest, { recursive: true });

for (const name of readdirSync(dist)) {
	if (name === 'blog') continue;
	renameSync(join(dist, name), join(dest, name));
}

writeFileSync(
	join(dist, 'index.html'),
	`<!doctype html>
<title>Redirecting to the blog</title>
<meta http-equiv="refresh" content="0;url=/blog/">
<link rel="canonical" href="/blog/">
<a href="/blog/">Go to the blog</a>
`,
);

writeFileSync(
	join(dist, '_redirects'),
	`/ /blog/ 302
/about /blog/ 302
/about/ /blog/ 302
`,
);
