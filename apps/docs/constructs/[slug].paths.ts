import { readFileSync } from 'fs';
import { resolve } from 'path';

const DATA_FILE = resolve(__dirname, '../.vitepress/data/constructs.json');

export default {
  paths() {
    const raw = JSON.parse(readFileSync(DATA_FILE, 'utf-8'));
    return raw.constructs.map((c: { slug: string }) => ({
      params: { slug: c.slug },
    }));
  },
};
