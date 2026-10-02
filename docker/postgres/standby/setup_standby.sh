#!/bin/sh
set -e

PGDATA="${PGDATA:-/var/lib/postgresql/data}"
PRIMARY_HOST="${PRIMARY_HOST:-postgres}"
PRIMARY_PORT="${PRIMARY_PORT:-5432}"
REPLICATOR_USER="${REPLICATOR_USER:-replicator}"
REPLICATOR_PASSWORD="${REPLICATOR_PASSWORD:-replicator_password}"

export PGPASSWORD="$REPLICATOR_PASSWORD"

# Detect whether to use gosu (Debian) or su-exec (Alpine)
if command -v gosu >/dev/null 2>&1; then
  SU_CMD="gosu"
else
  SU_CMD="su-exec"
fi

echo "[standby] Waiting for primary at ${PRIMARY_HOST}:${PRIMARY_PORT}..."
until pg_isready -h "$PRIMARY_HOST" -p "$PRIMARY_PORT" -q; do
  echo "[standby] Primary not ready, retrying in 2s..."
  sleep 2
done
echo "[standby] Primary is ready."

if [ ! -s "${PGDATA}/PG_VERSION" ]; then
  echo "[standby] Fresh setup. Running pg_basebackup from primary..."

  mkdir -p "$PGDATA"
  find "$PGDATA" -mindepth 1 -delete 2>/dev/null || true

  chown postgres:postgres "$PGDATA"
  chmod 0700 "$PGDATA"

  $SU_CMD postgres pg_basebackup \
    -h "$PRIMARY_HOST" \
    -p "$PRIMARY_PORT" \
    -U "$REPLICATOR_USER" \
    -D "$PGDATA" \
    -Fp -Xs -P -R

  echo "[standby] Base backup complete. standby.signal created."
else
  echo "[standby] Existing data found. Resuming standby mode."
fi

echo "[standby] Starting PostgreSQL in hot-standby (read-only) mode..."
exec $SU_CMD postgres postgres -D "$PGDATA" -c hot_standby=on