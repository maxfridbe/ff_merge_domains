# Merge Tabs by Domain

Firefox extension that gathers every tab for a domain, from all windows, into a
new or existing window. The toolbar popup lists open domains with 2+ tabs,
sorted by count (e.g. `github.com (3)`).

Tabs are moved, not reloaded; tabs that were unloaded are put back to sleep
after the move.

## Install

Download `merge-tabs-by-domain.xpi` from the
[latest release](https://github.com/maxfridbe/ff_merge_domains/releases/latest)
and open it in Firefox. Installed copies update themselves from new releases.

## Releasing

1. Bump `version` in `manifest.json`.
2. Push to `main`.

The [Release workflow](.github/workflows/release.yml) signs the extension with
addons.mozilla.org (unlisted) and publishes a GitHub release containing the
signed `.xpi` and `updates.json`. Pushes that don't change the version are
linted but not released.

Required repository secrets (from
https://addons.mozilla.org/developers/addon/api/key/):

- `AMO_JWT_ISSUER`
- `AMO_JWT_SECRET`

## Development

```sh
npx web-ext lint
npx web-ext run   # launches a throwaway Firefox profile with the extension
```
