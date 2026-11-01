# Security policy

This is a static front-end (no server, no database, no secrets in the bundle).

- Dependencies are pinned and installed with `npm ci --ignore-scripts`; CI fails on high-severity `npm audit` findings.
- Dependabot opens update PRs with a 14-day cooldown so brand-new releases are not pulled in immediately.
- A strict Content-Security-Policy (`default-src 'self'`, no inline scripts or styles) is injected into the production HTML by `vite.config.ts`; no third-party scripts, fonts, trackers or cookies.
- Forms are client-side demos: input is validated and rendered with `textContent`, never `innerHTML`.

Found a problem? Please open a private security advisory on this repository rather than a public issue.
