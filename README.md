# Nuxt Starter Template

[![Nuxt UI](https://img.shields.io/badge/Made%20with-Nuxt%20UI-00DC82?logo=nuxt&labelColor=020420)](https://ui.nuxt.com)

Use this template to get started with [Nuxt UI](https://ui.nuxt.com) quickly.

- [Live demo](https://starter-template.nuxt.dev/)
- [Documentation](https://ui.nuxt.com/docs/getting-started/installation/nuxt)

<a href="https://starter-template.nuxt.dev/" target="_blank">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://ui.nuxt.com/assets/templates/nuxt/starter-dark.png">
    <source media="(prefers-color-scheme: light)" srcset="https://ui.nuxt.com/assets/templates/nuxt/starter-light.png">
    <img alt="Nuxt Starter Template" src="https://ui.nuxt.com/assets/templates/nuxt/starter-light.png" width="830" height="466">
  </picture>
</a>

> The starter template for Vue is on https://github.com/nuxt-ui-templates/starter-vue.

## Quick Start

```bash [Terminal]
npm create nuxt@latest -- -t ui
```

## Deploy your own

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-name=starter&repository-url=https%3A%2F%2Fgithub.com%2Fnuxt-ui-templates%2Fstarter&demo-image=https%3A%2F%2Fui.nuxt.com%2Fassets%2Ftemplates%2Fnuxt%2Fstarter-dark.png&demo-url=https%3A%2F%2Fstarter-template.nuxt.dev%2F&demo-title=Nuxt%20Starter%20Template&demo-description=A%20minimal%20template%20to%20get%20started%20with%20Nuxt%20UI.)

## Setup

Make sure to install the dependencies:

```bash
pnpm install
```

### Mushaf (Quran) assets

The mushaf page data and fonts (~46 MB) are **not committed** — build them once
after cloning with a single command (no login needed):

```bash
pnpm setup:quran
```

This downloads all page data + per-page fonts from public sources and applies the
KFGQPC print layout from the committed `scripts/data/*.sqlite`. Details in
[`public/quran/README.md`](public/quran/README.md).

## Development Server

Start the development server on `http://localhost:3000`:

```bash
pnpm dev
```

## Production

Build the application for production:

```bash
pnpm build
```

That is `.env.prod` → `.env`, then `setup:quran`, then `nuxt build`, then
`verify:quran`. **Use `pnpm build`, not `nuxt build` directly.** The mushaf
corpus is gitignored, so a build that skips `setup:quran` still succeeds and
still boots — the assets simply 404, the host answers with the SPA shell under
a `.woff2`/`.json` URL, and every recitation screen reads *تعذّر عرض الصفحة N*.
Nothing fails until a user opens the page. `verify:quran` is the backstop: it
checks all 604 page JSONs and 604 fonts are in `.output/public/quran` and exits
non-zero if any are missing.

Locally preview production build:

```bash
pnpm preview
```

### Deploying

The origin server builds from a checkout, behind Cloudflare:

```bash
git pull
pnpm install --frozen-lockfile
pnpm build
# then restart the Node process (pm2 / systemd / whatever supervises it)
```

Requires Node ≥ 22.5 — `build-mushaf-layout.mjs` runs with
`--experimental-sqlite`.

`setup:quran` skips any corpus file already on disk, and `public/quran` is
gitignored so it survives `git pull` — only the first build on a machine pays
the ~46 MB download.

Check out the [deployment documentation](https://nuxt.com/docs/getting-started/deployment) for more information.

## Renovate integration

Install [Renovate GitHub app](https://github.com/apps/renovate/installations/select_target) on your repository and you are good to go.
