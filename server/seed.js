const prisma = require("./db");
const bcrypt = require("bcryptjs");

async function seed() {
  const count = await prisma.user.count();
  if (count > 0) {
    try {
      const result = await prisma.tenant.updateMany({
        where: { onboardingCompleted: false },
        data: { onboardingCompleted: true, onboardingStep: 4 },
      });
      if (result.count > 0) {
        console.log(`Migration: ${result.count} existing tenants marked as onboarding completed`);
      }
    } catch (e) {
      console.error("Tenant migration error (non-fatal):", e.message);
    }
    return;
  }

  const tenant = await prisma.tenant.create({
    data: {
      name: "Entreprise Admin",
      plan: "entreprise",
      onboardingCompleted: true,
      onboardingStep: 4,
    },
  });

  const hashedPassword = await bcrypt.hash(process.env.ADMIN_PASSWORD || "admin123", 10);

  await prisma.user.create({
    data: {
      name: process.env.ADMIN_NAME || "Admin",
      email: process.env.ADMIN_EMAIL || "admin@mbayestock.com",
      password: hashedPassword,
      role: "admin",
      tenantId: tenant.id,
    },
  });

  // Create initial counters for auto-increment numbers
  for (const id of ["invoice", "quote", "delivery_note", "client_request", "creance", "salary", "purchase_order", "daily_purchase", "bank_transaction", "order", "maintenance"]) {
    await prisma.counter.upsert({
      where: { id },
      update: {},
      create: { id, seq: 0 },
    });
  }

  console.log("Admin seed created with tenant");
}

module.exports = seed;
