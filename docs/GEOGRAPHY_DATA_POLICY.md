# Geography data policy

- **Law:** the India outline must match the Survey of India depiction (Criminal Law Amendment Act 1961, s.2(2); Geospatial Guidelines 2021 require SoI external boundary on political maps). `pipeline/geo.ts` fails the build unless Ladakh extends to ≥ 37.0°N and ≥ 80.0°E (includes Aksai Chin and Gilgit-Baltistan as depicted by SoI); J&K includes PoK.
- **Source:** DataMeet `States/Admin2` (CC BY 4.0), pinned commit and SHA-256 verified; 36 features joined to official names. Not GADM (licence forbids redistribution).
- **Display:** simplified (1% weighted, specks < 4 km² removed except small island UTs, which keep every part). Footer and terms say "simplified for display; not for legal or survey use".
- **Identifiers:** region ids are slugs of official names; LGD codes come from the LGD file via the manual lane. District counts are loaded, never hard-coded (~784 in 2026 per secondary sources; unverified).
- **Next levels:** districts per state (LGD + boundary source to be chosen and recorded in DECISIONS), loaded on demand; constituencies only where an official or clearly labelled boundary file exists. PIN codes map to constituencies many-to-many; show candidates, never one guessed answer.
- **Disputed areas:** shown as SoI depicts them, with no claim beyond that; no "neutral" alternative boundary.
