# Implementation Plan: Employee Yearly Sales by Name Join

## Changes
- Backend: Extend `/api/v1/sales/employee-yearly` to accept `joinKey=emp_name` and `empNames` CSV.
  - Aggregate by emp_name (merge multiple emp_seq) and filter company totals via join to employee.
- Frontend (Right Panel): Pass `joinKey=emp_name` and `empNames` from center panel’s employee list.

## Tests
- Verify name-based query returns merged rows for duplicate names.
- Verify companyTotals respect name filter.
- Verify fallback to seq-based flow when names absent.

