# Plan: 007-unit-price-popup

1. Backend API: aggregate by empName
2. Frontend icon: add to Simulation header
3. Popup UI: modal with table
4. Fetch + wire ESC/X close
5. Verify styles and basic manual check

## Notes
- Endpoint: `GET /api/v1/dashboard/unit-amounts-by-emp?empName=...`
- Result: `[ { sales_mgmt_unit, amount } ]`, amount as double.
- Read login name from `localStorage['tnt.sales.empName']`.
- Follow existing modal patterns (`useDraggableModal`, overlay no-click-close).

