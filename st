#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

profile="${1:-}"

print_help() {
  echo "Usage: ./st [postgres|mssql|postgres-nodb|mssql-nodb]"
  echo
  echo "Without args, an interactive menu is shown."
  echo
  echo "Examples:"
  echo "  ./st postgres"
  echo "  ./st mssql"
  echo "  ./st postgres-nodb"
  echo "  ./st mssql-nodb"
  echo
  echo "Starts backend (Spring Boot) and frontend (Vite) in background, and tails until exit."
  echo "Press Ctrl+C to stop both."
}

case "${profile}" in
  -h|--help|help) print_help; exit 0;;
esac

if [[ -z "${profile}" ]]; then
  echo "Select backend profile to run:"
  echo "  [1] postgres"
  echo "  [2] mssql"
  echo "  [3] postgres-nodb"
  echo "  [4] mssql-nodb"
  read -rp "Enter 1/2/3/4 [default 1]: " choice
  case "${choice}" in
    2) profile="mssql" ;;
    3) profile="postgres,nodb" ;;
    4) profile="mssql,nodb" ;;
    *) profile="postgres" ;;
  esac
fi

if [[ "${profile}" == "postgres-nodb" ]]; then profile="postgres,nodb"; fi
if [[ "${profile}" == "mssql-nodb" ]]; then profile="mssql,nodb"; fi

echo "Starting backend with profiles: ${profile}"
(
  cd "${SCRIPT_DIR}/backend"
  mvn spring-boot:run -Dspring-boot.run.profiles="${profile}"
) &
backend_pid=$!

sleep 2

echo "Starting frontend dev server..."
(
  cd "${SCRIPT_DIR}/frontend"
  if [[ ! -d node_modules ]]; then
    npm install
  fi
  npm run dev
) &
frontend_pid=$!

cleanup() {
  echo
  echo "Stopping processes..."
  if ps -p ${frontend_pid} >/dev/null 2>&1; then kill ${frontend_pid} 2>/dev/null || true; fi
  if ps -p ${backend_pid} >/dev/null 2>&1; then kill ${backend_pid} 2>/dev/null || true; fi
}
trap cleanup INT TERM EXIT

echo "Launched. Frontend: http://localhost:5173  |  Backend API: http://localhost:8080"
wait ${backend_pid} ${frontend_pid}

