#!/bin/sh
set -e

echo "Applying database migrations..."
./node_modules/.bin/prisma migrate deploy

echo "Starting BillKaro on port ${PORT:-3000}..."
exec node server.js
