# claude-fashion-collage

## Project purpose
A personal fashion moodboard tool. Users upload inspiration photos into named canvases, Gemini identifies clothing items, and users check off what they want to buy.

## Tech stack
- **Framework:** Next.js (React, App Router)
- **AI:** Google Gemini 2.0 Flash (`@google/generative-ai`)
- **Photo storage:** IndexedDB via `idb-keyval`
- **Metadata storage:** localStorage

## Behavior rules
- Only build what is asked — no bonus features or additions
- Do not add inline comments unless the logic is genuinely unclear
- Do not refactor existing code unless explicitly asked
- Keep solutions simple — prefer the straightforward approach over clever ones
