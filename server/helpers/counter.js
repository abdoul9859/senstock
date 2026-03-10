const prisma = require("../db");

async function getNextSequence(name) {
  const counter = await prisma.counter.upsert({
    where: { id: name },
    update: { seq: { increment: 1 } },
    create: { id: name, seq: 1 },
  });
  return counter.seq;
}

module.exports = { getNextSequence };
