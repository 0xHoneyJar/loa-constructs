#!/usr/bin/env bun
/**
 * SprawlOS Moodboard Query Tool
 *
 * Finds nearest neighbors in the shared embedding space.
 * Supports text and image queries against token or moodboard corpora.
 *
 * Usage:
 *   bun run apps/explorer/scripts/moodboard/query.ts --text "warm cyberpunk glow" --against tokens
 *   bun run apps/explorer/scripts/moodboard/query.ts --text "dark void panel" --against images
 *   bun run apps/explorer/scripts/moodboard/query.ts --help
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import type { EmbeddingEntry, EmbeddingFile } from './types';

const MODEL = 'text-embedding-004';
const TOP_K = 5;
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

const TOKENS_PATH = resolve('grimoires/loa/embeddings/token-vectors.json');
const IMAGES_PATH = resolve('grimoires/loa/embeddings/moodboard-vectors.json');

function usage() {
  console.log(`
SprawlOS Moodboard Query Tool

Usage:
  bun run query.ts --text <description> --against <tokens|images>
  bun run query.ts --help

Options:
  --text <description>       Text query to embed and search
  --against <tokens|images>  Corpus to search against
  --top <n>                  Number of results (default: 5)
  --help                     Show this help

Environment:
  GEMINI_API_KEY             Required. Google AI API key.

Output:
  Top-N nearest neighbors with cosine similarity scores.
`);
}

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error(`Vector dimension mismatch: ${a.length} vs ${b.length}`);
  }

  let dot = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  if (denom === 0) return 0;
  return dot / denom;
}

function findNearest(
  query: number[],
  entries: EmbeddingEntry[],
  topK: number
): Array<{ entry: EmbeddingEntry; similarity: number }> {
  const scored = entries.map((entry) => ({
    entry,
    similarity: cosineSimilarity(query, entry.vector),
  }));

  scored.sort((a, b) => b.similarity - a.similarity);
  return scored.slice(0, topK);
}

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function embedQuery(
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

function loadCorpus(corpus: 'tokens' | 'images'): EmbeddingFile {
  const path = corpus === 'tokens' ? TOKENS_PATH : IMAGES_PATH;
  if (!existsSync(path)) {
    console.error(`Corpus not found: ${path}`);
    console.error(`Run embed.ts --${corpus === 'tokens' ? 'tokens' : 'images <glob>'} first.`);
    process.exit(1);
  }

  return JSON.parse(readFileSync(path, 'utf-8'));
}

async function runQuery(text: string, against: 'tokens' | 'images', topK: number) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('Error: GEMINI_API_KEY not set');
    process.exit(1);
  }

  const client = new GoogleGenerativeAI(apiKey);
  const corpus = loadCorpus(against);

  console.log(`Query: "${text}"`);
  console.log(`Corpus: ${against} (${corpus.entries.length} entries, model: ${corpus.metadata.model})`);
  console.log('');

  const queryVector = await embedQuery(client, text);
  const results = findNearest(queryVector, corpus.entries, topK);

  console.log(`Top ${results.length} matches:`);
  console.log('─'.repeat(60));

  for (let i = 0; i < results.length; i++) {
    const { entry, similarity } = results[i];
    const score = (similarity * 100).toFixed(1);
    console.log(`  ${i + 1}. [${score}%] ${entry.description}`);
    console.log(`     id: ${entry.id}  source: ${entry.source}`);
  }
}

// CLI parsing
const args = process.argv.slice(2);

if (args.length === 0 || args.includes('--help')) {
  usage();
  process.exit(0);
}

const textIdx = args.indexOf('--text');
const againstIdx = args.indexOf('--against');
const topIdx = args.indexOf('--top');

if (textIdx === -1 || !args[textIdx + 1]) {
  console.error('Error: --text <description> is required');
  process.exit(1);
}

if (againstIdx === -1 || !args[againstIdx + 1]) {
  console.error('Error: --against <tokens|images> is required');
  process.exit(1);
}

const text = args[textIdx + 1];
const against = args[againstIdx + 1] as 'tokens' | 'images';
const topK = topIdx !== -1 && args[topIdx + 1] ? parseInt(args[topIdx + 1], 10) : TOP_K;

if (against !== 'tokens' && against !== 'images') {
  console.error('Error: --against must be "tokens" or "images"');
  process.exit(1);
}

if (isNaN(topK) || topK < 1) {
  console.error('Error: --top must be a positive integer');
  process.exit(1);
}

runQuery(text, against, topK).catch(console.error);
