#!/bin/sh
set -e
cd /app/server
node dist/db/migrate.js
exec node dist/index.js
