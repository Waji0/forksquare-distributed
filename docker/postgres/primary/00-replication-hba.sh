#!/bin/sh
set -e
# Allow replication connections from any host on the Docker network.
# Allow general connections (trust) so the app can reach primary + standby easily.
echo "host all all 0.0.0.0/0 trust" >> "$PGDATA/pg_hba.conf"
echo "host replication replicator 0.0.0.0/0 md5" >> "$PGDATA/pg_hba.conf"
echo "[primary-init] pg_hba.conf updated for replication"