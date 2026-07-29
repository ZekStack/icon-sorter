# Icon Sorter

A local-first React SPA for reviewing Hugeicons and HsH icons, assigning them to
groups, and building multilingual search metadata.

## Run locally

```bash
pnpm install
pnpm dev
```

## Pages

- `/` shows the next unseen icon for the selected icon type, supports creating
  groups and entering multilingual keywords in one whitespace-separated field,
  and persists each assignment immediately.
- `/library` displays saved icons by group and supports type filtering, search,
  importing saves, exporting the icon catalog, group management, moving icons,
  editing keywords, and returning icons to the sorting queue.
- `/discarded` lists discarded icons by type and restores them either to their
  previous group or to the sorting queue.

## Icon catalogs

Hugeicons are loaded from `@hugeicons/core-free-icons`.

The HsH font and stylesheet are committed under `public/hsh-icons`. After
updating those assets, regenerate and verify the typed name catalog:

```bash
pnpm generate:hsh-icons
pnpm check:hsh-icons
```

The generated TypeScript module must not be edited directly.

## Persistence

The application stores its dataset in `localStorage` under
`icon-sorter.library.v2`. The schema version is `4`.

Every saved, discarded, and reviewed icon is identified by its `name` and one of
the exact types `HugeIcon` or `HsHIcon`. Import accepts only the current
mixed-library persistence schema and replaces the current local dataset after
confirmation.

Export produces a flat JSON array containing only saved icons. Each item includes
`type`, `name`, the group name in `group`, and `keywords`. Persistence metadata
such as IDs, timestamps, version, supported types, and display color is omitted.

Saved icons store keywords as one flat `keywords: string[]` array. The textarea
accepts spaces, tabs, or new lines as keyword separators.

Removing an icon from the library removes it from the reviewed set so it appears
in the sorting queue again.
