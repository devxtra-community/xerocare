#!/bin/sh
# The official postgres image only auto-creates the single database named by
# POSTGRES_DB. This app is 4 separate TypeORM connections (billing/crm/employee/
# vendor), each its own database under the same xerouser — so the other 3 have
# to be created explicitly here, on first container init only.
set -e

for db in xerocare_billing xerocare_crm xerocare_employee xerocare_vendor; do
  # -d "$POSTGRES_DB" (not the bare default, which is a database named after the
  # connecting user — doesn't exist here) so every iteration has somewhere to connect.
  psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    SELECT 'CREATE DATABASE $db OWNER $POSTGRES_USER'
    WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '$db')\gexec
EOSQL
done
