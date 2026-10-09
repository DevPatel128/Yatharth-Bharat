---
name: ad
description: Make a 5–10 second product ad or animated social board as MP4, or a static PNG card, with an LLM writing the HTML animation. Use for launch clips, feature teasers, X/LinkedIn video and post visuals.
---
# Ad

Tool: HyperFrames (Apache-2.0; needs Node 22+ and FFmpeg). Fallback with no new tool: Playwright `recordVideo` + ffmpeg.
Brand: colors, type and tone from `PRODUCT.md` design tokens. Use real product UI (screenshots or rebuilt in HTML), never fake features. Mark demo numbers as sample data in the post copy.

1. **Storyboard** (write it first, get a yes if the user is present). Three beats:
   - 0–2 s **pain**: the problem in the user's words, big text
   - 2–7 s **product**: the product doing the one job, with motion on the key action
   - 7–10 s **outcome + CTA**: the result, logo, URL
2. **Build:**
   - Setup, once per machine: `ffmpeg` and `ffprobe` on PATH. Without Homebrew, run `npm i ffmpeg-static @ffprobe-installer/darwin-arm64` in `~/.local/ffmpeg` and symlink both into `~/.local/bin`; the `ffprobe-static` binary is Intel-only.
   - Run `npx hyperframes telemetry disable`.
   - `HYPERFRAMES_SKIP_SKILLS=1 npx hyperframes init <name> --non-interactive --resolution square` (or `portrait` for 9:16; for 4:5, set 1080×1350 by hand).
   - Write `index.html`: each scene is a `.clip` with `data-start`, `data-duration` and `data-track-index`, plus a GSAP timeline registered on `window.__timelines["main"]`.
   - `npx hyperframes lint` (sub-composition warnings are fine for a short ad), then `npx hyperframes render -o <name>.mp4`. Render takes ~12 s for 8 s of video.
   - Check: `ffmpeg -i out.mp4 -vf "select='eq(n,30)+eq(n,120)+eq(n,225)',scale=360:-1,tile=3x1" -frames:v 1 strip.png`, then look at the strip.
3. **Formats:** 1:1 (1080×1080) and 4:5 (1080×1350) for feeds, 9:16 (1080×1920) for vertical. Burn captions in, because feeds autoplay muted. Keep text inside safe margins.
4. **Static card:** render the same HTML to PNG with Playwright `page.screenshot`.
5. **Check:** readable on a phone at arm's length, a message in the first 2 s, under 10 s, file under platform limits, brand-consistent, captions match the voiceover (if any).
6. **Output:** file paths, a one-line description per file, and which `post` draft each pairs with.
Install HyperFrames per project (`npx`), never globally without asking.
