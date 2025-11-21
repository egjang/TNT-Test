# Implementation Plan: Assignment Save/Confirm

## Changes
- Backend: New controller `SalesTargetAssignedController`
  - POST `/api/v1/targets/assigned/upsert` — upsert by (target_year, emp_name, company_name)
  - POST `/api/v1/targets/assigned/confirm?year=` — bulk set `target_stage='확정'`
- Frontend: `SalesAssign.tsx`
  - Add buttons and `saveAssigned(confirm)`
  - Build payload from current targets and employee list

## Notes
- Uses `X-EMP-SEQ` header when present for audit columns
- Rounds amounts to integers to match UI

