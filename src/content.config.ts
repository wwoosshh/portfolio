import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { projectSchema } from './lib/schema';

const projects = defineCollection({
  loader: glob({ base: './src/content/projects', pattern: '**/*.mdx' }),
  schema: projectSchema,
});

export const collections = { projects };
