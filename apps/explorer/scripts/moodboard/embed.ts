#!/usr/bin/env bun
/**
 * SprawlOS Moodboard Embedding Tool
 *
 * Embeds reference images and OKLCH token descriptions into a shared
 * vector space using Gemini Embedding 2 for taste-based queries.
 *
 * Usage:
 *   bun run apps/explorer/scripts/moodboard/embed.ts --images <glob>
 *   bun run apps/explorer/scripts/moodboard/embed.ts --tokens
 *   bun run apps/explorer/scripts/moodboard/embed.ts --help
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { basename, resolve } from 'path';
import { glob } from 'glob';
import type { EmbeddingEntry, EmbeddingFile } from './types';

const MODEL = 'text-embedding-004';
const DIMENSION = 768;
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

const TOKENS_OUTPUT = resolve('grimoires/loa/embeddings/token-vectors.json');
const IMAGES_OUTPUT = resolve('grimoires/loa/embeddings/moodboard-vectors.json');

function usage() {
  console.log(`
SprawlOS Moodboard Embedding Tool

Usage:
  bun run embed.ts --images <glob>    Embed image files (uses filename as description)
  bun run embed.ts --tokens           Embed OKLCH token descriptions from globals.css
  bun run embed.ts --help             Show this help

Environment:
  GEMINI_API_KEY                      Required. Google AI API key.

Output:
  grimoires/loa/embeddings/moodboard-vectors.json   Image embeddings
  grimoires/loa/embeddings/token-vectors.json        Token embeddings
`);
}

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function embedText(
  client: GoogleGenerativeAI,
  text: string,
  retries = MAX_RETRIES
): Promise<number[]> {
  const model = client.getGenerativeModel({ model: MODEL });
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const result = await model.embedContent(text);
      return result.embedding.values;
    } catch (err) {
      if (attempt === retries) throw err;
      console.error(`  Retry ${attempt}/${retries}...`);
      await sleep(RETRY_DELAY_MS * attempt);
    }
  }
  throw new Error('unreachable');
}

function extractTokensFromCSS(cssPath: string): Array<{ name: string; value: string; description: string }> {
  const css = readFileSync(cssPath, 'utf-8');
  const tokens: Array<{ name: string; value: string; description: string }> = [];
  const lines = css.split('\n');

  let lastComment = '';
  for (const line of lines) {
    const commentMatch = line.match(/\/\*\s*(.+?)\s*\*\//);
    if (commentMatch) {
      lastComment = commentMatch[1];
      continue;
    }

    const varMatch = line.match(/^\s*--color-([^:]+):\s*(.+?);/);
    if (varMatch) {
      tokens.push({
        name: varMatch[1],
        value: varMatch[2].trim(),
        description: `${lastComment}: ${varMatch[1]} = ${varMatch[2].trim()}`,
      });
    }
  }

  return tokens;
}

function saveEmbeddings(path: string, entries: EmbeddingEntry[]) {
  const file: EmbeddingFile = {
    metadata: {
      model: MODEL,
      dimension: DIMENSION,
      sdk_version: '@google/generative-ai',
      created: new Date().toISOString(),
    },
    entries,
  };
  writeFileSync(path, JSON.stringify(file, null, 2));
  console.log(`Saved ${entries.length} embeddings to ${path}`);
}

async function embedImages(pattern: string) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('Error: GEMINI_API_KEY not set');
    process.exit(1);
  }

  const client = new GoogleGenerativeAI(apiKey);
  const files = await glob(pattern);

  if (files.length === 0) {
    console.error(`No files matched pattern: ${pattern}`);
    process.exit(1);
  }

  console.log(`Embedding ${files.length} images...`);
  const entries: EmbeddingEntry[] = [];

  // Load existing entries if file exists (partial resume)
  const existingIds = new Set<string>();
  if (existsSync(IMAGES_OUTPUT)) {
    try {
      const existing: EmbeddingFile = JSON.parse(readFileSync(IMAGES_OUTPUT, 'utf-8'));
      for (const entry of existing.entries) {
        entries.push(entry);
        existingIds.add(entry.id);
      }
      console.log(`  Resuming: ${existingIds.size} already embedded`);
    } catch {
      // Corrupted file, start fresh
    }
  }

  for (const file of files) {
    const name = basename(file, '.png').replace(/Screenshot \d{4}-\d{2}-\d{2} at /, '');
    const id = `img-${basename(file).replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}`;

    if (existingIds.has(id)) {
      console.log(`  Skip (cached): ${name}`);
      continue;
    }

    console.log(`  Embedding: ${name}`);
    try {
      const description = `Moodboard reference image: ${name}`;
      const vector = await embedText(client, description);
      entries.push({ id, type: 'image', source: file, description, vector });
      // Save after each successful embed (partial write safety)
      saveEmbeddings(IMAGES_OUTPUT, entries);
    } catch (err) {
      console.error(`  Failed to embed ${name}:`, err);
    }
  }

  saveEmbeddings(IMAGES_OUTPUT, entries);
}

async function embedTokens() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('Error: GEMINI_API_KEY not set');
    process.exit(1);
  }

  const cssPath = resolve('apps/explorer/app/globals.css');
  if (!existsSync(cssPath)) {
    console.error(`globals.css not found at ${cssPath}`);
    process.exit(1);
  }

  const client = new GoogleGenerativeAI(apiKey);
  const tokens = extractTokensFromCSS(cssPath);

  console.log(`Embedding ${tokens.length} OKLCH tokens...`);
  const entries: EmbeddingEntry[] = [];

  for (const token of tokens) {
    console.log(`  Embedding: ${token.name}`);
    try {
      const vector = await embedText(client, token.description);
      entries.push({
        id: `token-${token.name}`,
        type: 'text',
        source: cssPath,
        description: token.description,
        vector,
      });
    } catch (err) {
      console.error(`  Failed to embed ${token.name}:`, err);
    }
  }

  saveEmbeddings(TOKENS_OUTPUT, entries);
}

// CLI parsing
const args = process.argv.slice(2);

if (args.length === 0 || args.includes('--help')) {
  usage();
  process.exit(0);
}

if (args.includes('--tokens')) {
  embedTokens().catch(console.error);
} else if (args.includes('--images')) {
  const idx = args.indexOf('--images');
  const pattern = args[idx + 1];
  if (!pattern) {
    console.error('Error: --images requires a glob pattern');
    process.exit(1);
  }
  embedImages(pattern).catch(console.error);
} else {
  console.error('Unknown arguments. Use --help for usage.');
  process.exit(1);
}
