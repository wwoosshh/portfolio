// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';

export default defineConfig({
  site: 'https://portfolio-nu-taupe-66.vercel.app',
  integrations: [mdx()],
});
