# AI research policy

- AI is never the authority. Code owns calculations, validation, permissions and publication decisions. A model can only **fail** a record (G6/G8); it can never publish, edit or invent one.
- One gateway: `src/lib/ai.ts` `askAI(task, …)`. Business code names a task, never a model. Registry today: adversarial review and Hindi back-translation → `claude-sonnet-5-5`; answers (Stage 1f) → `claude-haiku-5-5`.
- Retrieved documents are untrusted data: passed inside `<document>` tags with an explicit instruction that nothing inside is an instruction. Verdicts are parsed strictly; anything unparseable counts as a failed review.
- Keys are server-side only (pipeline env, Worker secrets). Never in the browser bundle.
- **Stage 1f AI search (not built yet):** retrieval only over our verified records and stored source documents; Citations API; every citation re-checked by code (quote must exist in the stored document); per-IP and global daily caps, a hard monthly spend cap in code (AI Gateway has none), Turnstile on the endpoint, no open web search, answers labelled "AI-generated summary of the cited sources" (IT Rules amendment, in force 20 Feb 2026). If it is not configured, the UI says so; it never fakes an answer.
- Facts already in records are answered by deterministic queries, not a model.
- User questions are not stored beyond a hashed 24-hour cache and never used for training.
