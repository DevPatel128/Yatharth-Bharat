# Contributing

Thank you for helping. Yatharth Bharat is maintained by one person, so small, focused contributions are easiest to review.

## The most useful contributions

- **Corrections:** a figure, name or explanation that does not match the official source. Use the "Correction" issue template and link the official source.
- **Hindi:** a Hindi name or phrase that is wrong or non-standard, with an official Hindi source (Gazette, Sansad, ministry Hindi site).
- **New official sources:** a government or international dataset with a stable, machine-readable URL. Explain what it measures and its licence.
- **Accessibility and bugs:** anything that does not work with a keyboard, a screen reader, a small screen or slow connection.

## Rules every change must follow

1. **Official sources only.** No news articles, blogs, Wikipedia or model output as a source of facts.
2. **Every published value needs evidence:** source URL, retrieval date, stored copy and the exact fragment that supports it. The pipeline enforces this; do not hand-edit `data/records/`.
3. **Neutral wording.** No evaluative words about people, parties or governments (`pipeline/gates.ts` lists the banned terms).
4. **English and Hindi together.** Any new UI text needs both (`src/lib/dict/en.ts` and `hi.ts`; TypeScript enforces matching keys).
5. **Never disguise a client** to get past a block. Blocked sources go through `data/manual-inbox/` with a `SOURCE.txt` note.

## Development

```bash
npm ci
npx next typegen
npm run dev        # http://localhost:3000
npm run check      # must pass before a pull request
npm run e2e        # Playwright + accessibility
```

Pull requests run the full CI (typecheck, lint, tests, build, end-to-end and accessibility, audit, secret scan) and must pass before merge. Describe what changed, why, and how you tested it.

By contributing you agree that your contribution is published under the project's licence once one is chosen (see the README).
