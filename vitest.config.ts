import { defineConfig } from 'vitest/config';
export default defineConfig({
  resolve: { alias: { 'npm:zod@4.4.3': 'zod' } },
});
