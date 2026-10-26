#!/bin/sh
# Disposable local PostgreSQL for the DivineMain test suite.
#
# Required tools: Docker, and the project virtualenv at backend/venv.
#
# The published port is 127.0.0.1:54330. The container name is divine-pgtest
# and the database name is divine_pgtest. Django then creates and drops
# test_divine_pgtest through the existing test-database guard.
#
# This script does not read DATABASE_URL or application environment files.
# It does not select another database engine. start reuses a matching container and
# refuses to replace a container that is bound somewhere else. remove deletes
# the container only when --confirm-remove is passed.
#
#   backend/scripts/disposable_postgres.sh start
#   backend/scripts/disposable_postgres.sh test
#   backend/scripts/disposable_postgres.sh stop
#   backend/scripts/disposable_postgres.sh remove --confirm-remove
#
# DIVINE_PGTEST_PASSWORD overrides the local-only password. Keep it free of
# URL-reserved characters. The default is divine-pgtest-local.

set -eu

CONTAINER=divine-pgtest
IMAGE=postgres:16
HOST=127.0.0.1
PORT=54330
DB=divine_pgtest
DB_USER=divine
DB_PASSWORD="${DIVINE_PGTEST_PASSWORD:-divine-pgtest-local}"

ROOT=$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)

usage() {
    echo "Usage: $0 start | test | stop | remove --confirm-remove" >&2
}

container_exists() {
    docker container inspect "$CONTAINER" >/dev/null 2>&1
}

require_local_binding() {
    binding=$(docker inspect -f '{{(index (index .HostConfig.PortBindings "5432/tcp") 0).HostIp}} {{(index (index .HostConfig.PortBindings "5432/tcp") 0).HostPort}}' "$CONTAINER")
    if [ "$binding" != "$HOST $PORT" ]; then
        echo "Container ${CONTAINER} exists but is not bound to ${HOST}:${PORT}. Refusing to replace it." >&2
        exit 1
    fi
}

wait_until_ready() {
    attempt=1
    while [ "$attempt" -le 30 ]; do
        if docker exec "$CONTAINER" pg_isready -U "$DB_USER" -d "$DB" >/dev/null 2>&1; then
            echo "Ready. PostgreSQL database ${DB} is listening on ${HOST}:${PORT}."
            return 0
        fi
        attempt=$((attempt + 1))
        sleep 1
    done
    echo "PostgreSQL in ${CONTAINER} did not become ready. Tests were not started." >&2
    exit 1
}

start_database() {
    if container_exists; then
        require_local_binding
        docker start "$CONTAINER" >/dev/null
        echo "Using the existing ${CONTAINER} container. It was not recreated."
    else
        docker run -d \
            --name "$CONTAINER" \
            -e POSTGRES_PASSWORD="$DB_PASSWORD" \
            -e POSTGRES_USER="$DB_USER" \
            -e POSTGRES_DB="$DB" \
            -p "${HOST}:${PORT}:5432" \
            "$IMAGE" >/dev/null
        echo "Started ${CONTAINER} from ${IMAGE}, bound to ${HOST}:${PORT}."
    fi
    wait_until_ready
}

run_tests() {
    start_database
    cd "$ROOT"
    # shellcheck disable=SC2086
    env -u DATABASE_URL \
        DIVINE_TEST_DATABASE_URL="postgres://${DB_USER}:${DB_PASSWORD}@${HOST}:${PORT}/${DB}" \
        ./venv/bin/python manage.py test --verbosity 1
}

stop_database() {
    if container_exists; then
        docker stop "$CONTAINER" >/dev/null
        echo "Stopped ${CONTAINER}. The container and its data are still present."
    else
        echo "Container ${CONTAINER} is not present."
    fi
}

remove_container() {
    if [ "${1:-}" != "--confirm-remove" ]; then
        echo "Refusing to remove ${CONTAINER}. Re-run: $0 remove --confirm-remove" >&2
        exit 1
    fi
    if container_exists; then
        docker rm -f "$CONTAINER" >/dev/null
        echo "Removed ${CONTAINER}."
    else
        echo "Container ${CONTAINER} is not present."
    fi
}

case "${1:-}" in
    start) start_database ;;
    test) run_tests ;;
    stop) stop_database ;;
    remove) shift; remove_container "$@" ;;
    *) usage; exit 1 ;;
esac
