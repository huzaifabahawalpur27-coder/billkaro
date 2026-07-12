/**
 * Development-only embedded PostgreSQL.
 *
 * The dev machine has no Docker or system Postgres, so this boots real
 * PostgreSQL binaries (via the embedded-postgres package) with a persistent
 * data directory at .pgdata/. Production and self-hosted installs use
 * docker-compose.yml instead.
 *
 * Usage: npm run dev:db   (keep it running, Ctrl+C to stop)
 */
import EmbeddedPostgres from "embedded-postgres";
import fs from "node:fs";
import path from "node:path";

const dataDir = path.resolve(".pgdata");

const pg = new EmbeddedPostgres({
  databaseDir: dataDir,
  user: "billkaro",
  password: "billkaro_dev",
  port: 5433,
  persistent: true,
  // UTF-8 so Urdu product/customer names store correctly.
  initdbFlags: ["--encoding=UTF8", "--locale-provider=builtin", "--builtin-locale=C.UTF-8"],
});

async function main() {
  if (!fs.existsSync(path.join(dataDir, "PG_VERSION"))) {
    console.log("Initialising dev database cluster at .pgdata/ ...");
    await pg.initialise();
  }
  await pg.start();
  try {
    await pg.createDatabase("billkaro");
  } catch {
    // already exists
  }
  console.log(
    "Dev PostgreSQL running: postgresql://billkaro:***@localhost:5433/billkaro"
  );
  console.log("Press Ctrl+C to stop.");

  const stop = async () => {
    console.log("Stopping dev PostgreSQL...");
    await pg.stop();
    process.exit(0);
  };
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
