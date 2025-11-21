# Implementation Plan: 고객관리 (Customer Management)

## Scope
- Add top-level "고객관리" menu
- Show placeholder view in center pane when selected
- Gate by `VITE_FEATURE_CUSTOMER_MANAGEMENT`

## Steps
1. Add feature flag in frontend config
2. Add top-level menu item under Menu.tsx
3. Render placeholder when `selectedKey === 'customer'`
4. Basic styles follow existing app theme
5. Prepare future API/contracts placeholder (deferred)
6. Add submenu '거래처 조회' under customer
7. Implement frontend search view with input + table
8. Add backend endpoint GET /api/v1/customers?name= (ILIKE, limit 100)
9. Handle nodb profile with mock data

## Non-Goals
- Actual customer CRUD, search, permissions, backend API

## Risks
- Naming collisions with future routes/keys → prefix with `customer`

## Validation
- Menu shows/hides with flag
- Selecting "고객관리" updates main view
