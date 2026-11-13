import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';

export default defineConfig({
  base: '/puzzle-games/',
  plugins: [react(), {
    name: 'offline-precache',
    closeBundle() {
      const walk = dir => readdirSync(dir, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name).replaceAll('\\', '/').replace(/^dist\//, '')]);
      const files = walk('dist').filter(f => f !== 'sw.js');
      const template = readFileSync('public/sw.js', 'utf8');
      const revision = createHash('sha256').update(template);
      for (const file of files) revision.update(file).update(readFileSync(join('dist',file)));
      const source = template.replace('/*PRECACHE*/[]', JSON.stringify(files)).replace('/*VERSION*/"dev"', JSON.stringify(revision.digest('hex').slice(0,16)));
      writeFileSync('dist/sw.js', source);
    }
  }],
  test: { environment: 'node', include: ['src/tests/**/*.test.js'] }
});
