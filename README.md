# Hugeicons Sorter

A local-first React SPA for reviewing every icon from `@hugeicons/core-free-icons`, assigning it to a group, and building multilingual search metadata.

## Run locally

```bash
pnpm install
pnpm dev
```

## Pages

- `/` shows the next unseen icon, supports creating groups and keyword buckets at any time, and persists each assignment immediately.
- `/library` displays saved icons by group and supports search, group creation/renaming, moving icons, editing keywords, returning icons to the sorting queue, and JSON export.

## Persistence

The application stores its versioned dataset in `localStorage` under `icon-sorter.library.v1`. Exported JSON includes groups, saved icons, reviewed icon names, keyword bucket definitions, and an export timestamp.

Removing an icon from the library also removes it from the reviewed set so it appears in the sorting queue again.
