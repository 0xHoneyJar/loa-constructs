/**
 * Analyze Visual — Feed images/video frames to Gemini Vision for aesthetic decomposition.
 *
 * Usage:
 *   GOOGLE_API_KEY=... npx tsx scripts/moodboard/analyze-visual.ts --images "/tmp/frames/*.png" --prompt "Decompose the visual aesthetic"
 *   GOOGLE_API_KEY=... npx tsx scripts/moodboard/analyze-visual.ts --images "grimoires/artisan/inspiration/moodboard/*.png"
 *
 * Sends images to Gemini's multimodal model and returns structured aesthetic analysis.
 */

import { readFileSync, readdirSync, writeFileSync } from "fs";
import { join, basename, resolve } from "path";
import { argv } from "process";

const API_KEY = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
if (!API_KEY) {
  console.error("Set GOOGLE_API_KEY or GEMINI_API_KEY");
  process.exit(1);
}

const MODEL = "gemini-2.5-flash";
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`;

// Parse args
function parseArgs() {
  let imagesGlob = "";
  let prompt = "";
  let output = "";

  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === "--images" && argv[i + 1]) imagesGlob = argv[++i];
    else if (argv[i] === "--prompt" && argv[i + 1]) prompt = argv[++i];
    else if (argv[i] === "--output" && argv[i + 1]) output = argv[++i];
  }

  return { imagesGlob, prompt, output };
}

// Resolve glob-like pattern (simple: dir + extension match)
function resolveImages(pattern: string): string[] {
  const dir = pattern.substring(0, pattern.lastIndexOf("/"));
  const ext = pattern.substring(pattern.lastIndexOf("."));
  const resolvedDir = resolve(dir);

  try {
    return readdirSync(resolvedDir)
      .filter((f) => f.endsWith(ext))
      .sort()
      .map((f) => join(resolvedDir, f));
  } catch {
    console.error(`Cannot read directory: ${resolvedDir}`);
    return [];
  }
}

function imageToBase64Part(filePath: string) {
  const data = readFileSync(filePath);
  const base64 = data.toString("base64");
  const ext = filePath.split(".").pop()?.toLowerCase();
  const mime =
    ext === "jpg" || ext === "jpeg"
      ? "image/jpeg"
      : ext === "png"
        ? "image/png"
        : ext === "gif"
          ? "image/gif"
          : ext === "webp"
            ? "image/webp"
            : "image/png";

  return {
    inline_data: {
      mime_type: mime,
      data: base64,
    },
  };
}

async function analyzeImages(imagePaths: string[], userPrompt: string) {
  // Build multimodal content: images + text prompt
  const parts: any[] = [];

  // Add images (limit to 10 to stay within token budget)
  const selected = imagePaths.slice(0, 10);
  for (const img of selected) {
    console.error(`[analyze] Loading ${basename(img)}`);
    parts.push(imageToBase64Part(img));
  }

  // Add the analysis prompt
  const systemPrompt = `You are a visual design analyst specializing in UI/UX aesthetics, motion design, and creative direction for digital products. You analyze reference images to extract actionable design decisions.

Analyze the provided images and produce a structured decomposition covering:

1. **Color Palette** — Extract the dominant colors. Describe in OKLCH terms (lightness, chroma, hue angle). Note the ratio of dark vs light, warm vs cool.

2. **Lighting & Atmosphere** — How is light used? Volumetric? Directional? Ambient? What creates depth?

3. **Texture & Surface** — What surface qualities are present? Grain, noise, gloss, matte? CRT phosphor? Digital artifacts?

4. **Motion & Animation** (if frames suggest motion) — What moves? How fast? What stays still? What's the rhythm?

5. **Typography & Grid** — Any text treatment visible? Monospace? Serif? How is information organized spatially?

6. **Emotional Register** — What feeling does this create? Use precise language, not vague adjectives.

7. **Transferable Patterns** — What specific techniques could be extracted and applied to a dark-mode, OKLCH-based, terminal-aesthetic web application? Be concrete — CSS properties, shader techniques, animation parameters.

8. **Anti-Patterns** — What should NOT be transferred? What looks good here but would break in a minimal, pixel-grid UI system?`;

  parts.push({ text: `${systemPrompt}\n\n${userPrompt}` });

  const body = {
    contents: [{ parts }],
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 16384,
    },
  };

  console.error(`[analyze] Sending ${selected.length} images to ${MODEL}...`);

  const res = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gemini API error ${res.status}: ${err}`);
  }

  const json = await res.json();
  const text = json.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!text) {
    throw new Error("No text response from Gemini");
  }

  return text;
}

async function main() {
  const { imagesGlob, prompt, output } = parseArgs();

  if (!imagesGlob) {
    console.error(
      'Usage: npx tsx analyze-visual.ts --images "/path/to/*.png" --prompt "your question"'
    );
    process.exit(1);
  }

  const defaultPrompt =
    "Decompose the visual aesthetic of these reference images. Focus on what makes them feel the way they feel — the specific techniques, not just the vibes.";
  const userPrompt = prompt || defaultPrompt;

  const imagePaths = resolveImages(imagesGlob);
  if (imagePaths.length === 0) {
    console.error("No images found matching pattern");
    process.exit(1);
  }

  console.error(`[analyze] Found ${imagePaths.length} images`);

  const analysis = await analyzeImages(imagePaths, userPrompt);

  if (output) {
    writeFileSync(output, analysis);
    console.error(`[analyze] Written to ${output}`);
  } else {
    console.log(analysis);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
