# Orders Explorer

A focused, frontend-only operations workspace for reviewing, filtering, sorting, selecting, and exporting order data. Built with Next.js, React, and TypeScript, it provides an interactive order management interface with a virtualized data grid and a flexible filter builder.

## Features

- **Order Data:** Deterministic sample orders generated in `data/orders.ts`.
- **Virtualized Data Grid:** Custom grid with overscan for efficient rendering, sticky headers, and row selection.
- **Column Pinning:** Keep the ID and customer columns visible while horizontally scrolling.
- **Sorting:** Sort orders by supported column values.
- **Filter Builder:** Create filter conditions and one-level groups with OR conditions and live matching counts.
- **Search:** Search through orders to find relevant records.
- **Keyboard Navigation:** Navigate rows using the keyboard, press Enter to open order details, and press Escape to close the details panel.
- **Order Details:** Open a selected order to inspect its information.
- **CSV Export:** Export selected orders, including selected orders hidden by the current filters.
- **Responsive Layout:** Horizontally scroll the grid on narrower screens.
- **Empty State:** Display an empty-result state when no orders match the current criteria.

## Tech Stack

- **Framework:** Next.js 16
- **UI Library:** React 19
- **Language:** TypeScript
- **Styling:** Tailwind CSS 4
- **Icons:** Lucide React
- **Data:** Static, locally generated sample data
- **Grid:** Custom virtualized data grid

No backend or third-party table or virtualization library is required.

## Prerequisites

Before running the project, make sure you have installed:

- Node.js
- npm, which is included with Node.js

You can check your installed versions with:

```bash
node --version
npm --version
```

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/umar964/orders-explorer.git
cd orders-explorer
```

### 2. Install dependencies

```bash
npm install
```

### 3. Start the development server

```bash
npm run dev
```

### 4. Open the application

Visit the following URL in your browser:

http://localhost:3000

The development server provides hot reloading as you make changes to the application.

## Production Build

### Create a production build

```bash
npm run build
```

### Start the production server

```bash
npm run start
```

The production server starts locally using the port configured by Next.js, typically `3000` unless that port is already in use or overridden.

## Project Structure

```text
orders-explorer/
├── app/              # Application pages and layout
├── components/       # Reusable UI components
├── data/             # Order data and related definitions
├── design/           # Visual design references
├── docs/             # Project documentation and design PDF
├── hooks/            # Custom React hooks
├── lib/              # Shared utilities and application logic
├── public/            # Static assets
├── README.md          # Project documentation
└── package.json       # Dependencies and scripts
```

Some directories may contain additional files depending on the current implementation.

## Data and Behavior

The application uses static, deterministic sample data, making the prototype easy to run locally and straightforward to adapt to a future API integration.

- Orders are generated in `data/orders.ts`.
- Selection is ID-based and remains preserved while filtering.
- CSV export uses CSV escaping for values containing special characters.
- Export includes all selected orders, not just the orders currently visible after filtering.
- Filtering and sorting operate on the locally available order data.

## Known Limitations

- The application is frontend-only and does not currently use a backend API.
- Filter, sort, pin, and selection state are maintained in React memory for the current session.
- URL-based state persistence is reserved for a future data-router integration.
- Column resize handles are visual affordances in this version; functional column resizing is not implemented.
- The sample dataset is intended for demonstrating the interface rather than representing a live order management system.

## Design References

The project includes visual references for the Orders Explorer interface and its empty state.

The design documentation PDF is available in the `docs/` directory.

## License

This project was created as a frontend application prototype. Add a license file if you intend to distribute it under a specific open-source license.
