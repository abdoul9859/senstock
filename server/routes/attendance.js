const express = require("express");
const prisma = require("../db");
const router = express.Router();

function addId(obj) {
  if (!obj) return obj;
  if (Array.isArray(obj)) return obj.map(addId);
  return { ...obj, _id: obj.id };
}

// GET /stats - Monthly attendance stats
router.get("/stats", async (req, res) => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    const attendances = await prisma.attendance.findMany({
      where: {
        tenantId: req.tenantId,
        date: { gte: startOfMonth, lt: endOfMonth },
      },
    });

    const present = attendances.filter((a) => a.status === "present").length;
    const absent = attendances.filter((a) => a.status === "absent").length;
    const late = attendances.filter((a) => a.status === "retard").length;
    const leave = attendances.filter((a) => a.status === "conge").length;

    res.json({ present, absent, late, leave });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET / - List attendances for a specific date
router.get("/", async (req, res) => {
  try {
    const dateStr = req.query.date || new Date().toISOString().split("T")[0];
    const date = new Date(dateStr + "T00:00:00.000Z");
    const nextDay = new Date(date);
    nextDay.setDate(nextDay.getDate() + 1);

    const attendances = await prisma.attendance.findMany({
      where: {
        tenantId: req.tenantId,
        date: { gte: date, lt: nextDay },
      },
      include: {
        employee: {
          select: { id: true, firstName: true, lastName: true, position: true, department: true },
        },
      },
    });

    res.json(
      attendances.map((a) => {
        const result = addId(a);
        if (result.employee) result.employee = addId(result.employee);
        return result;
      })
    );
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST / - Create or update attendance (upsert by employeeId + date)
router.post("/", async (req, res) => {
  try {
    const { employeeId, date, checkIn, checkOut, status, notes } = req.body;
    const attendanceDate = new Date(date + "T00:00:00.000Z");

    const attendance = await prisma.attendance.upsert({
      where: {
        employeeId_date: { employeeId, date: attendanceDate },
      },
      update: {
        checkIn: checkIn ? new Date(checkIn) : undefined,
        checkOut: checkOut ? new Date(checkOut) : undefined,
        status: status || undefined,
        notes: notes !== undefined ? notes : undefined,
      },
      create: {
        employeeId,
        date: attendanceDate,
        checkIn: checkIn ? new Date(checkIn) : null,
        checkOut: checkOut ? new Date(checkOut) : null,
        status: status || "present",
        notes: notes || "",
        tenantId: req.tenantId,
      },
      include: {
        employee: {
          select: { id: true, firstName: true, lastName: true, position: true, department: true },
        },
      },
    });

    const result = addId(attendance);
    if (result.employee) result.employee = addId(result.employee);
    res.status(201).json(result);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// POST /bulk - Bulk mark attendance
router.post("/bulk", async (req, res) => {
  try {
    const { date, entries } = req.body;
    if (!entries || !entries.length) {
      return res.status(400).json({ error: "Aucune entree fournie" });
    }

    const attendanceDate = new Date(date + "T00:00:00.000Z");
    const results = [];

    for (const entry of entries) {
      const attendance = await prisma.attendance.upsert({
        where: {
          employeeId_date: { employeeId: entry.employeeId, date: attendanceDate },
        },
        update: {
          status: entry.status || "present",
          checkIn: entry.checkIn ? new Date(entry.checkIn) : undefined,
          checkOut: entry.checkOut ? new Date(entry.checkOut) : undefined,
        },
        create: {
          employeeId: entry.employeeId,
          date: attendanceDate,
          status: entry.status || "present",
          checkIn: entry.checkIn ? new Date(entry.checkIn) : null,
          checkOut: entry.checkOut ? new Date(entry.checkOut) : null,
          notes: "",
          tenantId: req.tenantId,
        },
      });
      results.push(addId(attendance));
    }

    res.status(201).json(results);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

module.exports = router;
