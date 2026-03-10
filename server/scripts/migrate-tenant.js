/**
 * Migration script: populate tenantId on all records that don't have one.
 * Assigns all orphan records to the first tenant found.
 * Run with: node scripts/migrate-tenant.js
 */
require("dotenv").config();
const prisma = require("../db");

const MODELS = [
  "product", "supplier", "stockMovement", "client",
  "invoice", "quote", "deliveryNote", "clientRequest", "creance",
  "order", "promotion", "employee", "bankAccount", "bankTransaction",
  "purchaseOrder", "maintenanceTicket", "dailyPurchase", "cashSession",
  "shopSettings",
];

async function migrate() {
  // Find the first tenant (or all tenants)
  const tenants = await prisma.tenant.findMany({ orderBy: { createdAt: "asc" } });
  if (tenants.length === 0) {
    console.log("No tenants found. Nothing to migrate.");
    return;
  }

  const defaultTenant = tenants[0];
  console.log(`Default tenant: ${defaultTenant.name} (${defaultTenant.id})`);
  console.log(`Total tenants: ${tenants.length}\n`);

  for (const modelName of MODELS) {
    try {
      const model = prisma[modelName];
      if (!model) {
        console.log(`  [SKIP] ${modelName} - model not found`);
        continue;
      }

      // Count records without tenantId
      const count = await model.count({ where: { tenantId: null } });
      if (count === 0) {
        console.log(`  [OK] ${modelName} - all records have tenantId`);
        continue;
      }

      // Update all null tenantId to default tenant
      const result = await model.updateMany({
        where: { tenantId: null },
        data: { tenantId: defaultTenant.id },
      });

      console.log(`  [MIGRATED] ${modelName} - ${result.count} records updated`);
    } catch (err) {
      console.error(`  [ERROR] ${modelName} - ${err.message}`);
    }
  }

  console.log("\nMigration complete!");
}

migrate()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
