#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

PROFILE="postgres"          # default DB profile
USE_NODB="0"                # nodb stub off by default
API_PORT="8080"             # backend port
API_HOST="127.0.0.1"        # backend host

usage() {
  cat <<USAGE
TNT Sales — Start

Usage: ./start.sh [--postgres|--mssql] [--nodb] [--api-port <port>] [--api-host <host>]

Options:
  --postgres         Use Postgres profile (default)
  --mssql            Use MSSQL profile
  --nodb             Add 'nodb' profile (backend runs without real DB; stubs enabled)
  --api-port <port>  Backend port (default: 8080)
  --api-host <host>  Backend host for proxy/env (default: 127.0.0.1)
USAGE
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --postgres) PROFILE="postgres"; shift ;;
    --mssql) PROFILE="mssql"; shift ;;
    --nodb) USE_NODB="1"; shift ;;
    --api-port) API_PORT="${2:-8080}"; shift 2 ;;
    --api-host) API_HOST="${2:-127.0.0.1}"; shift 2 ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown option: $1"; usage; exit 1 ;;
  esac
done

SELECTED_PROFILES="$PROFILE"
if [[ "$USE_NODB" == "1" ]]; then
  SELECTED_PROFILES="$SELECTED_PROFILES,nodb"
fi

echo "TNT Sales — Start (profiles: $SELECTED_PROFILES)"
echo
echo "Runs backend (Spring Boot) and frontend (Vite)."
echo "Press Enter to start. Ctrl+C to stop."
read -r _

echo "Starting backend (profiles: $SELECTED_PROFILES)..."
(
  cd "${SCRIPT_DIR}/backend"
  mvn spring-boot:run -Dspring-boot.run.profiles="$SELECTED_PROFILES"
) &
backend_pid=$!

# Wait for backend port to accept (up to ~60s)
echo "Waiting for backend to listen on ${API_HOST}:${API_PORT}..."
for i in $(seq 1 60); do
  if bash -c ">/dev/tcp/${API_HOST}/${API_PORT}" 2>/dev/null; then
    echo "Backend is up."
    break
  fi
  sleep 1
  [[ $i -eq 60 ]] && echo "Backend not reachable yet; starting frontend anyway." || true
done

echo "Starting PC frontend (http://localhost:5173) with proxy target http://${API_HOST}:${API_PORT} ..."
(
  cd "${SCRIPT_DIR}/frontend"
  if [[ ! -d node_modules ]]; then
    echo "Installing dependencies..."
    npm install
  fi
  export VITE_API_BASE_URL="http://${API_HOST}:${API_PORT}"
  if [[ ! -f .env.local ]]; then
    echo "VITE_API_BASE_URL=${VITE_API_BASE_URL}" > .env.local
  fi
  npm run dev
) &
frontend_pid=$!

# Start mobile frontend if present
if [[ -d "${SCRIPT_DIR}/frontend_mb" ]]; then
  echo "Starting Mobile frontend (http://localhost:5174) with proxy target http://${API_HOST}:${API_PORT} ..."
  (
    cd "${SCRIPT_DIR}/frontend_mb"
    if [[ ! -d node_modules ]]; then
      echo "Installing dependencies..."
      npm install
    fi
    export VITE_API_BASE_URL="http://${API_HOST}:${API_PORT}"
    if [[ ! -f .env.local ]]; then
      echo "VITE_API_BASE_URL=${VITE_API_BASE_URL}" > .env.local
    fi
    npm run dev
  ) &
  frontend_mb_pid=$!
else
  echo "[WARN] frontend_mb directory not found. Mobile frontend will not start."
fi

cleanup() {
  echo
  echo "Stopping processes..."
  if ps -p ${frontend_pid} >/dev/null 2>&1; then kill ${frontend_pid} 2>/dev/null || true; fi
  if [[ -n "${frontend_mb_pid:-}" ]] && ps -p ${frontend_mb_pid} >/dev/null 2>&1; then kill ${frontend_mb_pid} 2>/dev/null || true; fi
  if ps -p ${backend_pid} >/dev/null 2>&1; then kill ${backend_pid} 2>/dev/null || true; fi
}
trap cleanup INT TERM EXIT

echo "Launched. Frontend: http://localhost:5173  |  Backend API: http://${API_HOST}:${API_PORT}  |  Profiles: ${SELECTED_PROFILES}"
wait ${backend_pid} ${frontend_pid}
