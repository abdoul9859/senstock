const express = require("express");
const prisma = require("../db");

const router = express.Router();

// GET /trends — monthly aggregation for last 12 months
router.get("/trends", async (req, res) => {
  try {
    const now = new Date();
    const months = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
        label: d.toLocaleDateString("fr-FR", { month: "short", year: "2-digit" }),
        start: new Date(d.getFullYear(), d.getMonth(), 1),
        end: new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999),
      });
    }

    const [invoices, purchases, salaries] = await Promise.all([
      prisma.invoice.findMany({
        where: { status: { in: ["payee", "partielle", "envoyee"] }, tenantId: req.tenantId },
        select: { createdAt: true, items: { select: { total: true } } },
      }),
      prisma.dailyPurchase.findMany({
        where: { tenantId: req.tenantId },
        select: { date: true, subtotal: true },
      }),
      prisma.salary.findMany({
        where: { status: "payee", tenantId: req.tenantId },
        select: { period: true, netSalary: true },
      }),
    ]);

    const data = months.map((m) => {
      const monthInvoices = invoices.filter(
        (inv) => new Date(inv.createdAt) >= m.start && new Date(inv.createdAt) <= m.end
      );
      const revenue = monthInvoices.reduce(
        (s, inv) => s + inv.items.reduce((t, it) => t + (it.total || 0), 0),
        0
      );

      const monthPurchases = purchases.filter(
        (p) => new Date(p.date) >= m.start && new Date(p.date) <= m.end
      );
      const expenses = monthPurchases.reduce((s, p) => s + p.subtotal, 0);

      const monthSalaries = salaries.filter((sal) => sal.period === m.key);
      const salaryTotal = monthSalaries.reduce((s, sal) => s + sal.netSalary, 0);

      return {
        month: m.label,
        key: m.key,
        revenue,
        expenses,
        salaries: salaryTotal,
      };
    });

    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message || "Erreur serveur" });
  }
});

// GET /breakdown — distribution data
router.get("/breakdown", async (req, res) => {
  try {
    const [invoices, products] = await Promise.all([
      prisma.invoice.findMany({
        where: { tenantId: req.tenantId },
        select: {
          status: true,
          createdAt: true,
          items: {
            select: {
              type: true,
              description: true,
              total: true,
              product: {
                select: { category: { select: { name: true } } },
              },
            },
          },
        },
      }),
      prisma.product.findMany({
        where: { archived: { not: true }, tenantId: req.tenantId },
        select: {
          name: true,
          quantity: true,
          sellingPrice: true,
          category: { select: { name: true } },
        },
      }),
    ]);

    // Invoices by status
    const statusCounts = {};
    invoices.forEach((inv) => {
      statusCounts[inv.status] = (statusCounts[inv.status] || 0) + 1;
    });
    const invoicesByStatus = Object.entries(statusCounts).map(([status, count]) => ({
      name: status,
      value: count,
    }));

    // Products by category
    const catCounts = {};
    products.forEach((p) => {
      const cat = p.category?.name || "Sans catégorie";
      catCounts[cat] = (catCounts[cat] || 0) + 1;
    });
    const productsByCategory = Object.entries(catCounts).map(([name, value]) => ({ name, value }));

    // Revenue by category
    const catRevenue = {};
    invoices
      .filter((inv) => ["payee", "partielle", "envoyee"].includes(inv.status))
      .forEach((inv) => {
        inv.items.forEach((it) => {
          if (it.type === "section") return;
          const cat = it.product?.category?.name || "Autre";
          catRevenue[cat] = (catRevenue[cat] || 0) + (it.total || 0);
        });
      });
    const revenueByCategory = Object.entries(catRevenue)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    // Top 10 products by revenue
    const productRevenue = {};
    invoices
      .filter((inv) => ["payee", "partielle", "envoyee"].includes(inv.status))
      .forEach((inv) => {
        inv.items.forEach((it) => {
          if (it.type === "section" || !it.description) return;
          const name = it.description.substring(0, 30);
          productRevenue[name] = (productRevenue[name] || 0) + (it.total || 0);
        });
      });
    const topProducts = Object.entries(productRevenue)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);

    res.json({
      invoicesByStatus,
      productsByCategory,
      revenueByCategory,
      topProducts,
    });
  } catch (e) {
    res.status(500).json({ error: e.message || "Erreur serveur" });
  }
});

// GET /profitability — rentabilite par produit et par categorie
router.get("/profitability", async (req, res) => {
  try {
    const invoices = await prisma.invoice.findMany({
      where: {
        status: { in: ["payee", "partielle", "envoyee"] },
        tenantId: req.tenantId,
      },
      select: {
        items: {
          select: {
            total: true,
            quantity: true,
            type: true,
            product: {
              select: {
                name: true,
                purchasePrice: true,
                sellingPrice: true,
                category: { select: { name: true } },
              },
            },
          },
        },
      },
    });

    const productMap = {};

    invoices.forEach((inv) => {
      inv.items.forEach((item) => {
        if (item.type === "section" || !item.product) return;
        const name = item.product.name;
        const revenue = item.total || 0;
        const cost = (item.quantity || 0) * (item.product.purchasePrice || 0);

        if (!productMap[name]) {
          productMap[name] = {
            name,
            category: item.product.category?.name || "Sans catégorie",
            revenue: 0,
            cost: 0,
            quantity: 0,
          };
        }
        productMap[name].revenue += revenue;
        productMap[name].cost += cost;
        productMap[name].quantity += item.quantity || 0;
      });
    });

    // Product-level profitability (top 20 by profit)
    const products = Object.values(productMap)
      .map((p) => ({
        name: p.name,
        revenue: p.revenue,
        cost: p.cost,
        profit: p.revenue - p.cost,
        margin: p.revenue > 0 ? ((p.revenue - p.cost) / p.revenue) * 100 : 0,
        quantity: p.quantity,
      }))
      .sort((a, b) => b.profit - a.profit)
      .slice(0, 20);

    // Category-level profitability
    const categoryMap = {};
    Object.values(productMap).forEach((p) => {
      const cat = p.category;
      if (!categoryMap[cat]) {
        categoryMap[cat] = { name: cat, revenue: 0, cost: 0 };
      }
      categoryMap[cat].revenue += p.revenue;
      categoryMap[cat].cost += p.cost;
    });

    const categories = Object.values(categoryMap)
      .map((c) => ({
        name: c.name,
        revenue: c.revenue,
        cost: c.cost,
        profit: c.revenue - c.cost,
        margin: c.revenue > 0 ? ((c.revenue - c.cost) / c.revenue) * 100 : 0,
      }))
      .sort((a, b) => b.revenue - a.revenue);

    // Totals
    const totalRevenue = Object.values(productMap).reduce((s, p) => s + p.revenue, 0);
    const totalCost = Object.values(productMap).reduce((s, p) => s + p.cost, 0);
    const totalProfit = totalRevenue - totalCost;

    res.json({
      products,
      categories,
      totals: {
        revenue: totalRevenue,
        cost: totalCost,
        profit: totalProfit,
        margin: totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0,
      },
    });
  } catch (e) {
    res.status(500).json({ error: e.message || "Erreur serveur" });
  }
});

module.exports = router;
