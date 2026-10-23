# Orders Explorer

A focused, frontend-only operations workspace for reviewing, filtering, sorting, selecting, and exporting order data.

## Features

- 1,200 deterministic sample orders generated in `data/orders.ts`
- Custom virtualized grid with overscan, sticky header, row selection, sorting, and pinned ID/customer column
- Filter builder with one-level groups, OR conditions, and live matching counts
- Search, keyboard row navigation, Enter-to-open details, and Escape-to-close
- CSV export for all selected orders, including orders hidden by current filters
- Responsive horizontal grid scrolling and empty-result state
- Generated visual references in `design/main-screen.png` and `design/empty-state.png`

## Stack

- Next.js 16, React 19, TypeScript
- Tailwind CSS 4 and Lucide React
- No backend or third-party table/virtualization library

## Development

```bash
pnpm install
pnpm dev
```

Build for production with `pnpm build` and run with `pnpm start`.

## Data and behavior

The dataset is static and deterministic, making it safe to refresh and easy to replace with a future API layer. Selection is ID-based and preserved while filtering. Export uses RFC-style CSV escaping and includes every selected order, not only currently visible rows.

## Known limitations

The current prototype keeps filter, sort, pin, and selection state in React memory for the session; the URL persistence contract is reserved for a future data-router integration. Column resize handles are visual affordances in this first pass, while grid virtualization and pinning are fully implemented.
