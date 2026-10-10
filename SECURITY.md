# Security policy

## Reporting a vulnerability

Please report security problems **privately**, not in a public issue:

1. Open https://github.com/DevPatel128/Yatharth-Bharat/security/advisories/new
2. Describe the problem, the affected page or file, and how to reproduce it.

You will get an acknowledgement within 7 days. Please give us a reasonable time to fix the problem before you disclose it publicly.

## Scope

In scope: the site at https://yatharth-bharat.dvpatel.workers.dev, the Cloudflare Worker (`worker/`), the data pipeline (`pipeline/`) and the GitHub Actions workflows.

Out of scope: the official sources themselves (report those to the publisher), denial-of-service testing, and automated scanning that sends large volumes of requests.

## Wrong data is not a security issue

If a figure looks wrong, please open a normal issue using the "Correction" template, with the page link and the official source for the correct value.

## How the project is protected

See [`docs/SECURITY.md`](docs/SECURITY.md) and the threat model in [`SYSTEM.md`](SYSTEM.md).
