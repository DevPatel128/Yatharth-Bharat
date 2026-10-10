import { describe, expect, it } from 'vitest';
import { aiProvider, askAI, AiUnconfigured, parseVerdict } from '../src/lib/ai.ts';

describe('AI gateway', () => {
  it('prefers a direct Anthropic key, falls back to OpenRouter, else none', () => {
    expect(aiProvider({ ANTHROPIC_API_KEY: 'a', OPENROUTER_API_KEY: 'o' })).toBe('anthropic');
    expect(aiProvider({ OPENROUTER_API_KEY: 'o' })).toBe('openrouter');
    expect(aiProvider({})).toBeNull();
  });
  it('throws AiUnconfigured without any key', async () => {
    await expect(askAI('adversarial-review', 's', 'u', {})).rejects.toBeInstanceOf(AiUnconfigured);
  });
  it('treats unparseable verdicts as failures', () => {
    expect(parseVerdict('looks fine').ok).toBe(false);
    expect(parseVerdict('{"ok":true,"problems":[]}').ok).toBe(true);
  });
});
