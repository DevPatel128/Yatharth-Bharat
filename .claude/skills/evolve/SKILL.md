---
name: evolve
description: Improve the WOLF framework and kit from real evidence across all products, keeping it small. Use every 10 merged PRs, weekly, or when the same lesson shows up in two products.
---
# Evolve WOLF

Framework changes always need human approval. Open a PR on the WOLF repo; never push to main.
1. **Gather:** `MISTAKES.md`, `DECISIONS.md` and `scripts/wolf-stats.sh` output from each product using WOLF; open `evolve` notes from `learn`.
2. **Find patterns:** a mistake in 2+ products, a hard rule that keeps firing, a check that never fires (candidate to delete), a skill step agents skip, metrics that stopped improving.
3. **Propose** edits. Each one cites its evidence (a mistake ID or a metric delta) and says what it removes.
4. **Budget:** the 9 core docs (all root `*.md` except COVERAGE, LICENSES, CHANGELOG) stay ≤44 KB. Any addition removes or merges something of at least equal size. Skills stay ≤80 lines.
5. **Integrity:** run `scripts/coverage-check.sh` (0 unmapped) and the link check. Keep one home per concept.
6. **Version:** bump `VERSION` (patch: wording; minor: new check or skill; major: removed concept) and add a `CHANGELOG.md` entry.
7. **Roll out** after approval: `kit/scripts/wolf-sync.sh <product>` per product, in its own PR.
Report: proposed changes, evidence, size before → after, products affected.
