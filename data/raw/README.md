# data/raw — every file downloaded from the internet

Owner rule (2026-10-10): everything downloaded is kept inside this project folder.

- `pipeline/lib/safe-fetch.ts` saves each fetched response to `data/raw/<host>/<YYYY-MM-DD>/<sha256-prefix>-<name>` and logs it in `data/raw/index.jsonl`.
- `_session-2026-10-09/` holds files downloaded by hand during the first build session.
- This folder is git-ignored because of its size; verified records in `data/records/` cite each file by SHA-256, so any copy can be checked.
