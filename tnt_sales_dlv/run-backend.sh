#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="${SCRIPT_DIR}/backend"
JAR_NAME="backend-0.0.1-SNAPSHOT.jar"
SPRING_PROFILES_ACTIVE="${SPRING_PROFILES_ACTIVE:-postgres}"
JAVA_OPTS="${JAVA_OPTS:--Xms512m -Xmx1024m}"
LOG_DIR="${LOG_DIR:-${SCRIPT_DIR}/logs}"

mkdir -p "${LOG_DIR}"
if [[ ! -f "${BACKEND_DIR}/${JAR_NAME}" ]]; then
  echo "[ERROR] ${JAR_NAME} not found in ${BACKEND_DIR}" >&2
  exit 1
fi

echo "Starting backend with profile=${SPRING_PROFILES_ACTIVE} ..."
cd "${BACKEND_DIR}"
exec java ${JAVA_OPTS} -Dspring.profiles.active="${SPRING_PROFILES_ACTIVE}" -jar "${JAR_NAME}" \
  >>"${LOG_DIR}/stdout.log" 2>>"${LOG_DIR}/stderr.log"
