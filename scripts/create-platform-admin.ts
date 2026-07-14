/**
 * Create (or promote) a platform superadmin for SaaS mode.
 *
 *   PLATFORM_ADMIN_PASSWORD=... npm run admin:create -- --email you@x.com --name "Your Name"
 *
 * Safe on production databases: upserts a single User with
 * isPlatformAdmin = true and touches nothing else.
 */
import bcrypt from "bcryptjs";
import { db } from "../src/server/db";

function arg(flag: string): string | undefined {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function main() {
  const email = arg("--email")?.trim().toLowerCase();
  const name = arg("--name")?.trim() || "Platform Admin";
  const password = process.env.PLATFORM_ADMIN_PASSWORD;

  if (!email || !email.includes("@")) {
    console.error("Usage: npm run admin:create -- --email you@example.com [--name \"Your Name\"]");
    process.exit(1);
  }

  const existing = await db.user.findUnique({ where: { email } });

  if (existing) {
    if (!password && existing.isPlatformAdmin) {
      console.log(`${email} is already a platform admin — nothing to do.`);
      return;
    }
    await db.user.update({
      where: { id: existing.id },
      data: {
        isPlatformAdmin: true,
        ...(password ? { passwordHash: await bcrypt.hash(password, 11) } : {}),
      },
    });
    console.log(`Promoted existing user ${email} to platform admin${password ? " (password updated)" : ""}.`);
    return;
  }

  if (!password || password.length < 8) {
    console.error("Set PLATFORM_ADMIN_PASSWORD (8+ chars) to create a new admin user.");
    process.exit(1);
  }

  await db.user.create({
    data: {
      email,
      name,
      passwordHash: await bcrypt.hash(password, 11),
      isPlatformAdmin: true,
    },
  });
  console.log(`Created platform admin ${email}.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => process.exit());
