/**
 * Recalculates every Customer.currentBalance from the LedgerEntry history
 * (the source of truth) and reports/fixes any drift. Safe to run any time.
 *
 * Run: npm run db:reconcile [-- --fix]
 */
import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { D } from "../src/lib/money";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const db = new PrismaClient({ adapter });

const fix = process.argv.includes("--fix");

async function main() {
  const customers = await db.customer.findMany({
    select: { id: true, businessId: true, name: true, currentBalance: true },
  });

  let drifted = 0;
  for (const customer of customers) {
    const entries = await db.ledgerEntry.findMany({
      where: { customerId: customer.id, businessId: customer.businessId },
      select: { amount: true },
    });
    const computed = entries.reduce((sum, e) => sum.add(D(e.amount)), D(0));
    const cached = D(customer.currentBalance);

    if (!computed.eq(cached)) {
      drifted++;
      console.log(
        `DRIFT ${customer.name}: cached=${cached.toFixed(2)} ledger=${computed.toFixed(2)}`
      );
      if (fix) {
        await db.customer.update({
          where: { id: customer.id },
          data: { currentBalance: computed.toFixed(2) },
        });
        console.log(`  -> fixed to ${computed.toFixed(2)}`);
      }
    }
  }

  console.log(
    `Checked ${customers.length} customers. ${drifted} drifted${
      fix && drifted ? " (fixed)" : drifted ? " (run with --fix to repair)" : ""
    }.`
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
