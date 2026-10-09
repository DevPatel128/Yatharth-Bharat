// One schema for every verified record: used by the ingestion pipeline (to validate before publishing)
// and by the app (to validate again at build time). A record that fails here never reaches a page.
import { z } from 'zod';

export const LANGS = ['en', 'hi'] as const;
export type Lang = (typeof LANGS)[number];

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM-DD');
const isoDateTime = z.string().datetime({ offset: true });
const httpsUrl = z.url({ protocol: /^https$/ });

/** Text in both languages. `hi` is null until it passes the Hindi gate (G8); pages then show English with a notice. */
export const Bilingual = z.object({ en: z.string().min(1), hi: z.string().min(1).nullable() });
export type Bilingual = z.infer<typeof Bilingual>;

/** Where a fact came from, and the exact words that support it (G4 quote anchoring). */
export const Evidence = z.object({
  sourceId: z.string().min(1),
  url: httpsUrl,
  retrievedAt: isoDateTime,
  /** SHA-256 of the stored snapshot the quote was checked against. */
  snapshotSha256: z.string().regex(/^[a-f0-9]{64}$/),
  /** Verbatim text (or canonical JSON fragment) found in the snapshot. */
  quote: z.string().min(1).max(2000),
  /** Who fetched it: the scheduled pipeline, or the owner via the manual-download lane. */
  method: z.enum(['pipeline', 'manual-download', 'browser-capture']),
});
export type Evidence = z.infer<typeof Evidence>;

export const SourceCategory = z.enum([
  'indian-government', // ministries, departments, statutory bodies of the Government of India
  'indian-state-government',
  'indian-constitutional-body', // ECI, CAG, courts, Parliament
  'international-organisation', // World Bank, IMF, UNDP: never labelled as Indian government
  'community-open-data', // e.g. DataMeet: used only where no official machine-readable file exists, always labelled
]);

export const Source = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  publisher: z.string().min(1),
  name: Bilingual,
  category: SourceCategory,
  homepage: httpsUrl,
  /** Hosts the pipeline may fetch from. Redirects outside this list fail G1. */
  allowedHosts: z.array(z.string().min(1)).min(1),
  access: z.enum(['json-api', 'csv-download', 'html-page', 'pdf', 'shapefile', 'manual-download']),
  updateFrequency: z.enum(['daily', 'weekly', 'monthly', 'quarterly', 'annual', 'irregular']),
  licence: z.string().min(1),
  limitations: z.string().min(1),
  requiresKeyEnv: z.string().optional(),
});
export type Source = z.infer<typeof Source>;

/** One published value. Revisions keep every earlier value; nothing is overwritten (spec §23). */
export const Observation = z.object({
  /** Reporting period as published, e.g. "2026-08" (month), "2025" (year), "2024-25" (fiscal year). */
  period: z.string().min(4),
  value: z.number().finite(),
  status: z.enum(['provisional', 'revised', 'final', 'estimate', 'unknown']),
  /** Base year or series this value belongs to. Values from different series are never drawn as one line. */
  series: z.string().min(1),
  publishedAt: isoDate.nullable(),
  evidence: z.array(Evidence).min(1),
  revisions: z.array(z.object({ value: z.number().finite(), supersededAt: isoDateTime, evidence: z.array(Evidence).min(1) })).default([]),
});
export type Observation = z.infer<typeof Observation>;

export const Indicator = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  category: z.enum([
    'economy', 'employment', 'education', 'healthcare', 'poverty-inequality', 'infrastructure',
    'governance', 'public-safety-justice', 'environment', 'innovation-industry', 'international', 'wellbeing',
  ]),
  name: Bilingual,
  definition: Bilingual,
  unit: Bilingual,
  /** "higher" / "lower" is better, or "neutral" where judging direction would be editorialising. */
  direction: z.enum(['higher', 'lower', 'neutral']),
  geography: z.string().min(1), // "IN" for all-India; region ids otherwise
  methodology: Bilingual,
  limitations: Bilingual,
  sourceId: z.string().min(1),
  observations: z.array(Observation),
  /** Freshness: when the pipeline last confirmed the source still says this. */
  lastVerifiedAt: isoDateTime.nullable(),
  /** "stale" when the source failed or has not been re-checked within its freshness window. */
  state: z.enum(['verified', 'stale', 'unavailable']),
});
export type Indicator = z.infer<typeof Indicator>;

export const Region = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  kind: z.enum(['state', 'union-territory']),
  name: Bilingual,
  capital: Bilingual.nullable(),
  /** Feature name in the boundary file, used to join geometry to this record. */
  boundaryName: z.string().min(1),
  evidence: z.array(Evidence).min(1),
});
export type Region = z.infer<typeof Region>;

export const RegionsFile = z.object({ schemaVersion: z.literal(1), regions: z.array(Region) });
