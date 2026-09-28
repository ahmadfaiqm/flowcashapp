function generateNextNumber(prefix, existingNumbers, padLength = 3) {
  let max = 0;
  const escaped = prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`^${escaped}(\\d+)$`);
  for (const n of existingNumbers) {
    const m = n.match(regex);
    if (m) {
      const val = parseInt(m[1], 10);
      if (val > max) max = val;
    }
  }
  const next = max + 1;
  const padded = String(next).padStart(padLength, '0');
  return `${prefix}${padded}`;
}

async function getNextNoTx(tx, model, field, businessId, prefix, padLength = 3) {
  const where = { businessId };
  where[field] = { startsWith: prefix };
  const rows = await tx[model].findMany({ where, select: { [field]: true } });
  const existing = rows.map((r) => r[field]);
  return generateNextNumber(prefix, existing, padLength);
}

module.exports = { generateNextNumber, getNextNoTx };
