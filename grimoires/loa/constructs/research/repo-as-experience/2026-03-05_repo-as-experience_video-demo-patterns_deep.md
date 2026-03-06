# Visual Proof — Demo Videos, GIFs, and Screenshots That Sell — Deep Research

_Generated: 2026-03-05 | Model: gemini-3-pro-preview + Google Search + Firecrawl | Config: repo-as-experience_

# The Definitive Guide to Visual Proof for Developer Tools
**Produced for The Constructs Network**

This document codifies the mental models, technical stacks, and production workflows used by the top 0.1% of developer tools (Linear, Vercel, Stripe, Supabase) to demonstrate software.

For **The Constructs Network**, where the product is an invisible "perceptual shift" (AI expertise), standard marketing fails. You cannot describe a new way of seeing; you must simulate the experience. The following framework transforms "marketing assets" into **Proof of Velocity**.

---

## Part 1: The Expert Mental Model
Top practitioners do not view demos as "videos." They view them as **choreographed software**.

### 1. The "15-Second Aha" Framework
The viewer is a skeptical developer. You have 3 seconds to prove relevance and 15 seconds to prove value.
*   **0:00–0:03: The "Impossible" State.** Start *in media res*. A blank file, a broken component, or a complex terminal error. No logos, no intros, no "Hey guys."
*   **0:03–0:06: The "Spark."** The specific trigger (hotkey, prompt, or command) that activates the Construct.
*   **0:06–0:12: The "Intelligence."** The visual proof of reasoning. For a Construct, this is not just text generation; it is **structural understanding** (refactoring, refusing unsafe patterns, architectural injection).
*   **0:12–0:15: The "Result."** Green checkmarks, passing tests, or a rendered UI.

### 2. Immersion > Explanation
*   **Amateur:** Explains what the feature is ("This is our new refactoring agent").
*   **Pro:** Shows the workflow implication ("Cycles are now automated").
*   **The Linear Rule:** Narration must be a "Statement of Fact." Strip all adjectives.
    *   *Bad:* "We hope you love this powerful new feature."
    *   *Good:* "Constructs now carry memory. This reduces context switching by 40%."

### 3. The "Uncanny Valley" of Cursors
Human mouse movement is jittery and distracting.
*   **The Decision:** Never record raw mouse input for a hero video.
*   **The Fix:** Separate **Content** (the screen) from **Camera** (the viewport). Record the screen at full resolution, then programmatically smooth the cursor and zoom the viewport in post-production.

---

## Part 2: The "Elite" Tooling Stack
You cannot achieve the "Linear Look" with QuickTime or OBS alone.

| Component | Tool | Why the Top 0.1% Use It |
| :--- | :--- | :--- |
| **Mac Recording** | **[Screen Studio](https://screen.studio/)** | **Mandatory.** Records screen + cursor metadata separately. Allows for non-destructive, mathematically smooth zooming and cursor re-positioning. |
| **Terminal GIFs** | **[VHS](https://github.com/charmbracelet/vhs)** | **Mandatory for README.** Scriptable terminal recording. Generates pixel-perfect SVGs/GIFs via a headless browser. |
| **Scripted Web** | **[Webreel](https://github.com/vercel-labs/webreel)** | Used by Vercel. Scripts Puppeteer/Playwright to record browser interactions at a locked 60fps without human error. |
| **Code Animation** | **[Code Hike](https://codehike.org/)** | Used by Stripe/Remotion. Animates code "diffs" (transitions) rather than recording typing. |
| **Comparison** | **[React Compare Slider](https://github.com/nerdyman/react-compare-slider)** | Interactive before/after slider. Essential for showing "Perceptual Shifts" (Old Code vs. Construct Code). |
| **Video Framework** | **[Remotion](https://www.remotion.dev/)** | Allows you to write video in React. Essential for combining code animation with timeline logic. |

---

## Part 3: Visualizing "Intelligence" (The Constructs Challenge)
Since a Construct is "installable expertise," you must visualize the *mind* of the agent.

### Technique A: The "Ghost Stream" (Visualizing Thought)
Don't show a loader. Show the text appearing at a specific velocity that implies intelligence.
*   **Velocity:** **50–80 tokens/second**. Slower feels laggy; faster feels fake.
*   **Visual Cue:** A "blinking block cursor" must lead the stream.

### Technique B: The "Construct Lens" (The Shimmer)
When the Construct is analyzing code, overlay a CSS shimmer on the specific code block it is "reading." This visualizes the *boundary* of its attention.

**Implementation (Tailwind/CSS):**
```css
/* The "Thinking" State */
.construct-shimmer {
  position: relative;
  overflow: hidden;
}
.construct-shimmer::after {
  content: "";
  position: absolute;
  top: 0; right: 0; bottom: 0; left: 0;
  background: linear-gradient(
    90deg,
    rgba(255, 255, 255, 0) 0%,
    rgba(255, 255, 255, 0.05) 50%, /* Subtle highlight */
    rgba(255, 255, 255, 0) 100%
  );
  transform: translateX(-100%);
  animation: shimmer 1.5s infinite;
}

@keyframes shimmer {
  100% { transform: translateX(100%); }
}
```

### Technique C: The "Diff" (Visualizing Change)
For the Constructs Network, the most powerful visual is the **Diff View**.
*   **Red:** The "Junior" code (insecure, verbose).
*   **Green:** The "Construct" code (idiomatic, secure, performant).
*   **Action:** Don't just swap them. Animate the transition using `Code Hike` or `framer-motion` to show the code *morphing* into the better state.

---

## Part 4: Technical Implementation Recipes

### 1. The "Perfect" Hero Video (Landing Page)
Replace heavy GIFs with this HTML5 pattern. It ensures 60fps playback and instant loading.

```jsx
// React Component for Landing Page Hero
export function HeroVideo() {
  return (
    <div className="relative rounded-lg shadow-2xl overflow-hidden border border-white/10">
      <video
        autoPlay
        loop
        muted
        playsInline // Critical for iOS
        poster="/poster-frame.jpg" // Prevents layout shift
        className="w-full h-auto"
      >
        {/* WebM: 50% smaller, use for Chrome/Firefox */}
        <source src="/demo.webm" type="video/webm" />
        {/* MP4: Fallback for Safari/iOS */}
        <source src="/demo.mp4" type="video/mp4" />
      </video>
    </div>
  );
}
```
*   **Constraint:** Keep WebM under **2MB**. Keep MP4 under **4MB**.

### 2. The "Crystal Clear" GIF (README / Email)
If you must use GIF, use **Palette Generation**. Standard converters use a generic palette, causing banding. This FFmpeg recipe analyzes *your* video to create a custom color map.

```bash
# Step 1: Generate custom palette based on the video content
ffmpeg -i input.mp4 -vf "fps=15,scale=1200:-1:flags=lanczos,palettegen" palette.png

# Step 2: Output GIF using that specific palette
ffmpeg -i input.mp4 -i palette.png -filter_complex "fps=15,scale=1200:-1:flags=lanczos[x];[x][1:v]paletteuse" output.gif
```
*   **Why 1200px?** High-DPI screens need 2x density. Display at 600px width in Markdown (`<img width="600" ...>`).

### 3. The "VHS" Terminal Tape (Docs)
For the Constructs CLI, use `vhs`. Create a `.tape` file:

```bash
# demo.tape
Output demo.gif

Set FontSize 32
Set Width 1200
Set Height 600
Set Padding 40
Set FontFamily "JetBrains Mono"
Set Theme "Dracula"

Type "construct install @security/guardrails"
Sleep 500ms
Enter
Sleep 2s
Type "Checking codebase..."
Sleep 1s
# Simulate AI output
Type "Found 3 vulnerabilities. Patching..."
Sleep 2s
```
*   **Run:** `vhs demo.tape`

### 4. Programmatic Code Morphing (Marketing Video)
Use **Code Hike v1 + Remotion**. This allows you to animate code "diffs" where tokens fly to their new positions (Token Morphing), proving the structural change.

**Setup:** `npm install codehike zode remotion`

```tsx
// src/CodeTransition.tsx
import { z } from "zod";
import { Block, parseRoot, highlight, Pre, tokenTransitions } from "codehike/blocks";
import { AbsoluteFill, useCurrentFrame, interpolate } from "remotion";

const Schema = Block.extend({ code: z.string() });

export const CodeAnimation = ({ oldCode, newCode }) => {
  const frame = useCurrentFrame();
  
  // 1. Define the "progress" of the animation (0 to 1)
  // This drives the transition based on the video timeline (frames 30 to 60)
  const progress = interpolate(frame, [30, 60], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // 2. Render the "Pre" component
  // Code Hike automatically calculates the FLIP animation for tokens
  return (
    <AbsoluteFill style={{ backgroundColor: "#0D1117", padding: 50 }}>
      <Pre
        code={progress < 0.5 ? oldCode : newCode} // Switch source at 50%
        handlers={[tokenTransitions]} // The magic sauce
        style={{
          fontSize: 40,
          lineHeight: 1.5,
          fontFamily: "JetBrains Mono",
        }}
        t={progress} // Pass progress to control flight time
      />
    </AbsoluteFill>
  );
};
```

### 5. High-Performance Typing (Alternative)
If Code Hike is too heavy, or you just need "typing" effects without the morphing, use **Shiki Magic Move**.

```tsx
import { ShikiMagicMove } from 'shiki-magic-move/react';
import { getHighlighter } from 'shiki';
import { useCurrentFrame } from 'remotion';

// Initialize highlighter outside render loop
const highlighter = await getHighlighter({
  themes: ['nord'],
  langs: ['javascript', 'python'],
});

export const FastCodeAnim = ({ steps }) => {
  const frame = useCurrentFrame();
  const stepIndex = Math.floor(frame / 60); // Change step every 60 frames
  
  return (
    <ShikiMagicMove
      lang="javascript"
      theme="nord"
      highlighter={highlighter}
      code={steps[stepIndex]}
      options={{ duration: 800, stagger: 0 }}
    />
  );
};
```

---

## Part 5: Production Thresholds & Standards

| Parameter | Professional Standard | Why This Number |
| :--- | :--- | :--- |
| **Resolution** | **1280x720 (720p)** | 1080p is often too heavy for web autoplay. 720p at high bitrate looks better than 1080p at low bitrate. |
| **Frame Rate** | **60 FPS** | Non-negotiable for video. 15 FPS for GIFs. |
| **Audio Loudness** | **-16 LUFS** | Standard web loudness. |
| **Voiceover** | **-6dB Peak** | Clear, authoritative presence. |
| **Music** | **-25dB** | Background texture only. Must "duck" (lower volume) when voice speaks. |
| **Zoom Factor** | **1.5x - 2.0x** | Code is unreadable on mobile without aggressive zooming. |
| **Background** | **Solid Hex / Gradient** | Never show the desktop wallpaper. Use brand colors (e.g., `#08090A`). |
| **Font** | **JetBrains Mono** | The industry standard for legibility in demos. |

---

## Part 6: The "Speed Run" (Social Proof)
For Twitter/X and LinkedIn, the format shifts to **"Vibe Coding"**.

**The Workflow:**
1.  **The Setup:** Don't code. Write a `PRD.md` (Product Requirements Document).
2.  **The Prompt:** "Act as a Construct. Implement the features in `@PRD.md`."
3.  **The Visual:** Record the AI writing 5 files at once (Cursor Composer mode).
4.  **The Audio:** Fast-paced, rhythmic music. No voiceover required if the visual text is large enough.

**Twitter/X Specifics:**
*   **Aspect Ratio:** **1:1 (Square)** or **4:5**. Takes up more vertical real estate on mobile feeds.
*   **Bitrate:** **5-8 Mbps**. Twitter compresses aggressively; give them a high-quality source.

---

## Part 7: Amateur vs. Professional Comparison

| Aspect | Amateur Approach | Professional Approach | Why It Matters |
| :--- | :--- | :--- | :--- |
| **Cursor** | Jittery, moving randomly, circling things. | Smooth, invisible until needed, straight lines. | Jitter signals "human struggle." Smoothness signals "software precision." |
| **Start** | "Hey guys, today I'll show you..." | **0:00** Black screen fade to UI. Action starts immediately. | Respects the viewer's time. Establishes confidence. |
| **Code** | Full screen IDE, tiny font (12px). | Zoomed in to specific function, font equivalent to 32px. | 60% of traffic is mobile. Tiny code = scroll past. |
| **Latency** | Shows loading spinners. | Cuts the wait time or speeds it up 400%. | "Waiting" is not a feature. Velocity is the product. |
| **Format** | One 5-minute video for everything. | **Hero Loop** (Web), **GIF** (Docs), **Speed Run** (Social). | Context determines format constraints. |

---

## Part 8: Key People & Learning Path

To master this domain, study these sources in order:

1.  **Rauno Freiberg (Vercel):** The godfather of the "invisible interface" demo. Study his use of easing curves.
2.  **Steven Tey (Vercel/Dub):** Master of the "Launch Video" format.
3.  **Pomber (Code Hike):** The technical pioneer of code animation.

**The Learning Path:**
1.  Master **Screen Studio** for quick, high-quality recordings.
2.  Master **VHS** for terminal documentation.
3.  Master **Remotion + Code Hike** for "Hero" assets that require perfect choreography.