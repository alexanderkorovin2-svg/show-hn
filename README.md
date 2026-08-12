# Show HN volume surged; 20-point posts barely moved

An interactive OrangeCrumbs data story about the widening gap between Show HN
submission volume and posts that receive meaningful attention. Monthly Show HN
volume peaked at 6.3× its ChatGPT-launch level, while posts reaching 20 points
grew far less. The story compares raw volume, distinct submitters, and 20-point
posts across the ChatGPT and Claude Code milestones.

The monthly series runs from January 2018 through July 2026. August 2026 is
excluded because it is incomplete. Launch dates are contextual annotations,
not causal estimates.

## Run locally

Requires Node.js 22.13 or newer.

```bash
npm install
npm run dev
```

Open the local URL printed by the development server.

## Validate

```bash
npm test
```

This builds the site and runs rendered-page checks.

## Data definitions

- **Show HN:** a surviving URL story whose normalized title begins with
  `Show HN`, with or without a colon.
- **All URL submissions:** surviving URL stories in the local OpenIndex Hacker
  News archive; text-only submissions such as Ask HN are not included.
- **Successful Show HN:** a qualifying Show HN with a recorded score of at
  least 20 points.
- **Pre/post windows:** equal 12-month windows surrounding the ChatGPT and
  Claude Code milestones.

The page embeds aggregated monthly data derived from the local archive; it does
not include or require the multi-gigabyte source database.

## Stack

React, TypeScript, Vinext, Vite, and Cloudflare-compatible worker output.
