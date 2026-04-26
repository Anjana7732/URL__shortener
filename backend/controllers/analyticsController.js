const Click = require("../models/Click");
const { buildDayKeys } = require("../utils/analytics");

async function getScale(req, res) {
  const days = Math.min(31, Math.max(1, parseInt(String(req.query.days), 10) || 7));
  const dayKeys = buildDayKeys(days);
  if (dayKeys.length === 0) {
    return res.json({ maxClicks: 0, yMax: 2 });
  }
  const startOfRange = new Date(dayKeys[0] + "T00:00:00.000Z");
  const endOfRange = new Date(
    dayKeys[dayKeys.length - 1] + "T23:59:59.999Z"
  );
  const keySet = new Set(dayKeys);
  const clicks = await Click.find({
    timestamp: { $gte: startOfRange, $lte: endOfRange },
  });
  const perKey = {};
  for (const c of clicks) {
    const day = c.timestamp.toISOString().split("T")[0];
    if (!keySet.has(day)) continue;
    const k = `${c.shortCode}\t${day}`;
    perKey[k] = (perKey[k] || 0) + 1;
  }
  let maxClicks = 0;
  for (const n of Object.values(perKey)) {
    if (n > maxClicks) maxClicks = n;
  }
  const yMax =
    maxClicks === 0
      ? 2
      : Math.max(9, Math.ceil(maxClicks * 1.35) + 1);
  res.json({ maxClicks, yMax });
}

/**
 * Clicks per calendar day (UTC) for the last N days, including zeros for days with no clicks.
 * @query days — default 7, max 31
 */
async function getByCode(req, res) {
  const { code } = req.params;
  const days = Math.min(31, Math.max(1, parseInt(String(req.query.days), 10) || 7));
  const dayKeys = buildDayKeys(days);

  if (dayKeys.length === 0) {
    return res.json([]);
  }

  const startOfRange = new Date(dayKeys[0] + "T00:00:00.000Z");
  const endOfRange = new Date(dayKeys[dayKeys.length - 1] + "T23:59:59.999Z");

  const clicks = await Click.find({
    shortCode: code,
    timestamp: { $gte: startOfRange, $lte: endOfRange },
  });

  const result = Object.fromEntries(dayKeys.map((k) => [k, 0]));
  clicks.forEach((c) => {
    const key = c.timestamp.toISOString().split("T")[0];
    if (key in result) {
      result[key] += 1;
    }
  });

  const formatted = dayKeys.map((date) => ({
    date,
    clicks: result[date],
  }));
  res.json(formatted);
}

module.exports = { getScale, getByCode };
