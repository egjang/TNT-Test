Frontend — Main Screen Scaffold

What’s included
- Vite + React + TypeScript skeleton
- Three-column resizable layout (left menu / center work area / right reserved)
- First menu item: "수요관리" with placeholder view

Run locally
1) cd tnt_sales/frontend
2) nvm use || true && npm i
3) npm run dev
- Vite dev server: http://localhost:5173 (proxies /api → :8080)

Files
- index.html — entry
- src/App.tsx — page composition
- src/components/ResizableColumns.tsx — mouse-resizable columns
- src/features/menu/Menu.tsx — left menu (수요관리)
- src/features/main/MainView.tsx — center content area
- src/styles/index.css — minimal styling

Notes
- Pane widths persist to localStorage.
- Adjust min/max widths in ResizableColumns props if needed.
