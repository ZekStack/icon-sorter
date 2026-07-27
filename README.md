# Hugeicons Sorter

A local-first React SPA for reviewing every icon from `@hugeicons/core-free-icons`, assigning it to a group, and building multilingual search metadata.

## Run locally

```bash
pnpm install
pnpm dev
```

## Pages

- `/` shows the next unseen icon, supports creating groups and keyword buckets at any time, and persists each assignment immediately.
- `/library` displays saved icons by group and supports search, importing and exporting saves, group management, moving icons, editing keywords, and returning icons to the sorting queue.
- `/discarded` lists discarded icons and restores them either to their previous group or to the sorting queue.

## Persistence

The application stores its versioned dataset in `localStorage` under `icon-sorter.library.v1`. The current schema version is `3`.

Exports contain a top-level `type` field and a `type` field for every saved or discarded icon. The currently supported type is `Huge icons`. Older icon-sorter exports without an explicit type are migrated during import.

Importing a save replaces the current local dataset after confirmation. Removing an icon from the library removes it from the reviewed set so it appears in the sorting queue again.
