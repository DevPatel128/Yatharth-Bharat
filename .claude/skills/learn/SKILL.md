---
name: learn
description: Turn a mistake, incident, worse metric or decision into a recorded entry plus an enforced check so it never repeats. Use after any failure, rollback, review miss, or metric regression over 20%.
---
# Learn

A lesson without an enforcing check is not done.
1. **Facts:** what happened, when, impact, how it was detected. Evidence, not memory.
2. **Root cause:** ask "why" until you reach something the system can prevent. "The AI forgot" is not a root cause; "nothing checks X" is.
3. **Enforce,** strongest first:
   1. CI check, lint rule or test (preferred)
   2. a hook (`.claude/hooks/guard.sh`)
   3. an `AGENTS.md` hard rule (max 15; merge or retire one to add one)
   4. a `WOLF/CHECKLIST.md` line
4. **Prove it:** show the new check failing on the old behavior and passing on the fix.
5. **Record:** a row in `MISTAKES.md` (ID, date, what, root cause, impact, enforcing check, verified). Decisions go in `DECISIONS.md` (never delete; supersede).
6. **Spread:** if the lesson applies to every product, note it for `evolve` (framework PR) in the same message.
Metric regressions: name the metric, the 5-PR median and the new value; find the cause in the diff or CI log; enforce as above.
