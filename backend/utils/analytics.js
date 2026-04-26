function buildDayKeys(days) {
  const n = Math.min(31, Math.max(1, days));
  const dayKeys = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date();
    d.setUTCHours(0, 0, 0, 0);
    d.setUTCDate(d.getUTCDate() - i);
    dayKeys.push(d.toISOString().split("T")[0]);
  }
  return dayKeys;
}

module.exports = { buildDayKeys };
