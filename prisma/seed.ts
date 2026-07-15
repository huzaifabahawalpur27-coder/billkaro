/**
 * Development / demo seed: Babar General Store with realistic Pakistani
 * grocery catalogue, customers, and opening udhaar balances.
 *
 * Run: npm run db:seed
 * Login: babar@billkaro.pk / billkaro123
 */
import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { SYSTEM_ROLES } from "../src/lib/permissions";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const db = new PrismaClient({ adapter });

const BRANDS = ["Unilever", "Nestlé", "Coca-Cola", "PepsiCo", "National", "Shan", "Colgate", "Reckitt"];
const CATEGORIES = ["Soap", "Detergent", "Beverages", "Milk", "Spices", "Grocery", "Toothpaste", "Snacks"];
const UNITS = ["Piece", "Pack", "Bottle", "Kg", "Gram", "Liter", "ml", "Dozen"];
// Loose/weight units where the POS allows fractional quantities.
const FRACTIONAL_UNITS = new Set(["Kg", "Gram", "Liter", "ml"]);

// [name, sku, barcode, brand, category, unit, purchase, sale, wholesale]
const PRODUCTS: [string, string, string, string, string, string, number, number, number][] = [
  ["Surf Excel 500g", "SURF500", "8901030612345", "Unilever", "Detergent", "Pack", 280, 320, 305],
  ["Surf Excel 1kg", "SURF1KG", "8901030612352", "Unilever", "Detergent", "Pack", 510, 580, 550],
  ["Surf Excel 2kg", "SURF2KG", "8901030612369", "Unilever", "Detergent", "Pack", 940, 1050, 1000],
  ["Lux Soap 100g", "LUX100", "8901030512346", "Unilever", "Soap", "Piece", 170, 200, 190],
  ["Lifebuoy Soap 100g", "LIFEB100", "8901030512353", "Unilever", "Soap", "Piece", 125, 150, 140],
  ["Dettol Soap 100g", "DETT100", "8901396312347", "Reckitt", "Soap", "Piece", 155, 185, 175],
  ["Rin Detergent 1kg", "RIN1KG", "8901030712340", "Unilever", "Detergent", "Pack", 380, 430, 410],
  ["Coca-Cola 1.5L", "COKE15L", "5449000054227", "Coca-Cola", "Beverages", "Bottle", 190, 220, 210],
  ["Coca-Cola 500ml", "COKE500", "5449000054210", "Coca-Cola", "Beverages", "Bottle", 85, 100, 95],
  ["Sprite 1.5L", "SPRITE15L", "5449000054234", "Coca-Cola", "Beverages", "Bottle", 190, 220, 210],
  ["Pepsi 1.5L", "PEPSI15L", "4060800100221", "PepsiCo", "Beverages", "Bottle", 185, 215, 205],
  ["7UP 1.5L", "7UP15L", "4060800100238", "PepsiCo", "Beverages", "Bottle", 185, 215, 205],
  ["Sting Energy 500ml", "STING500", "4060800100245", "PepsiCo", "Beverages", "Bottle", 105, 120, 115],
  ["Milkpak 1L", "MILKPAK1L", "8964000112342", "Nestlé", "Milk", "Pack", 310, 350, 335],
  ["Milkpak 250ml", "MILKPAK250", "8964000112359", "Nestlé", "Milk", "Pack", 90, 105, 100],
  ["Nestlé Everyday 400g", "EVERYDAY400", "8964000212345", "Nestlé", "Milk", "Pack", 570, 640, 615],
  ["Nescafé Classic 50g", "NESCAFE50", "8964000312348", "Nestlé", "Grocery", "Piece", 480, 540, 520],
  ["Shan Biryani Masala 50g", "SHANBIR50", "8964001112340", "Shan", "Spices", "Pack", 105, 125, 118],
  ["Shan Karahi Masala 50g", "SHANKAR50", "8964001112357", "Shan", "Spices", "Pack", 105, 125, 118],
  ["Shan Nihari Masala 60g", "SHANNIH60", "8964001112364", "Shan", "Spices", "Pack", 110, 130, 122],
  ["National Ketchup 800g", "NATKET800", "8964002112349", "National", "Grocery", "Bottle", 330, 380, 360],
  ["National Salt 800g", "NATSALT800", "8964002112356", "National", "Grocery", "Pack", 55, 65, 60],
  ["National Chat Masala 50g", "NATCHAT50", "8964002112363", "National", "Spices", "Pack", 95, 110, 105],
  ["Colgate Toothpaste 150g", "COLG150", "8901314012345", "Colgate", "Toothpaste", "Piece", 275, 315, 300],
  ["Colgate Toothbrush", "COLGBRUSH", "8901314012352", "Colgate", "Toothpaste", "Piece", 90, 110, 100],
  ["Sugar 1kg", "SUGAR1KG", "2100000112348", "National", "Grocery", "Kg", 150, 165, 158],
  ["Basmati Rice 1kg", "RICE1KG", "2100000112355", "National", "Grocery", "Kg", 320, 360, 345],
  ["Cooking Oil 1L Pouch", "OIL1L", "2100000112362", "National", "Grocery", "Liter", 520, 570, 550],
];

const CUSTOMERS: { name: string; phone: string; address: string; opening: number }[] = [
  { name: "Muhammad Ali", phone: "0300 1234567", address: "Street 4, Model Town", opening: 12500 },
  { name: "Ahmed Raza", phone: "0301 9876543", address: "Main Bazar Road", opening: 8200 },
  { name: "Usman Khan", phone: "0333 5556677", address: "Block C, Johar Town", opening: 6500 },
  { name: "Bilal Hussain", phone: "0345 1112233", address: "Canal View", opening: 0 },
  { name: "Farhan Sheikh", phone: "0321 4445566", address: "Gulberg III", opening: 3200 },
];

async function main() {
  const email = "babar@billkaro.pk";
  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    console.log("Seed user already exists — skipping (delete .pgdata to reseed).");
    return;
  }

  const passwordHash = await bcrypt.hash("billkaro123", 11);

  await db.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: { email, passwordHash, name: "Babar Hussain", phone: "0300 1234567" },
    });

    const business = await tx.business.create({
      data: {
        name: "Babar General Store",
        ownerName: "Babar Hussain",
        phone: "0300 1234567",
        address: "Shop 12, Main Bazar, Lahore",
        businessType: "General Store",
        settings: { create: {} },
        counters: {
          createMany: {
            data: [
              { key: "INVOICE", nextNumber: 1 },
              { key: "PAYMENT", nextNumber: 1 },
            ],
          },
        },
      },
    });

    let ownerRoleId = "";
    for (const [name, permissions] of Object.entries(SYSTEM_ROLES)) {
      const role = await tx.role.create({
        data: { businessId: business.id, name, isSystem: true, permissions },
      });
      if (name === "Owner") ownerRoleId = role.id;
    }
    await tx.businessUser.create({
      data: { businessId: business.id, userId: user.id, roleId: ownerRoleId },
    });

    const brandIds = new Map<string, string>();
    for (const name of BRANDS) {
      const b = await tx.brand.create({ data: { businessId: business.id, name } });
      brandIds.set(name, b.id);
    }
    const categoryIds = new Map<string, string>();
    for (const name of CATEGORIES) {
      const c = await tx.category.create({ data: { businessId: business.id, name } });
      categoryIds.set(name, c.id);
    }
    const unitIds = new Map<string, string>();
    for (const name of UNITS) {
      const u = await tx.unit.create({
        data: { businessId: business.id, name, isFractional: FRACTIONAL_UNITS.has(name) },
      });
      unitIds.set(name, u.id);
    }

    await tx.product.createMany({
      data: PRODUCTS.map(([name, sku, barcode, brand, category, unit, purchase, sale, wholesale]) => ({
        businessId: business.id,
        name,
        sku,
        barcode,
        brandId: brandIds.get(brand),
        categoryId: categoryIds.get(category),
        unitId: unitIds.get(unit),
        purchasePrice: purchase,
        salePrice: sale,
        wholesalePrice: wholesale,
      })),
    });

    for (const c of CUSTOMERS) {
      const customer = await tx.customer.create({
        data: {
          businessId: business.id,
          name: c.name,
          phone: c.phone,
          address: c.address,
          currentBalance: c.opening,
          lastTransactionAt: c.opening > 0 ? new Date() : null,
        },
      });
      if (c.opening > 0) {
        await tx.ledgerEntry.create({
          data: {
            businessId: business.id,
            customerId: customer.id,
            type: "OPENING_BALANCE",
            amount: c.opening,
            balanceAfter: c.opening,
            description: "Opening balance (purana khata)",
            createdById: user.id,
          },
        });
      }
    }
  });

  console.log("Seed complete.");
  console.log("  Business: Babar General Store");
  console.log(`  Products: ${PRODUCTS.length}, Customers: ${CUSTOMERS.length}`);
  console.log("  Login:    babar@billkaro.pk / billkaro123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
