#!/usr/bin/env bash
# Starts the Toolshop app, waits until every layer is actually serving, and reseeds the database.
# CI calls this same script, so a green local run means the pipeline is running the same steps.
set -euo pipefail
cd "$(dirname "$0")/.."

API_URL="${API_URL:-http://localhost:8091}"
UI_URL="${BASE_URL:-http://localhost:4200}"

wait_for() {
  local name="$1" attempts="$2" check="$3"
  for i in $(seq 1 "$attempts"); do
    if eval "$check" >/dev/null 2>&1; then
      echo "$name is ready"
      return 0
    fi
    echo "Waiting for $name ($i/$attempts)..."
    sleep 5
  done
  echo "$name did not become ready" >&2
  docker compose logs --tail 50 >&2
  return 1
}

# The published UI image is x86-only; on Apple Silicon swap in a natively built one.
if [[ "$(uname -m)" == "arm64" || "$(uname -m)" == "aarch64" ]]; then
  export COMPOSE_FILE="docker-compose.yml:docker-compose.arm64.yml"
fi

docker compose up -d --build

wait_for "MariaDB" 30 "docker compose exec -T mariadb mysqladmin ping -h localhost -u root -proot --silent"

# Fresh seed on every run so tests start from the same data no matter what earlier runs created.
docker compose exec -T laravel-api php artisan migrate:fresh --seed --force

wait_for "API" 30 "curl -fsS $API_URL/status"
# ng serve compiles the Angular app on startup, which can take a few minutes on a cold runner.
wait_for "UI" 60 "curl -fsS -o /dev/null $UI_URL"
