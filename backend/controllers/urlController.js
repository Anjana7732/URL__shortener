const Url = require("../models/Url");
const Click = require("../models/Click");
const { generateShortCode } = require("../utils/shortCode");

async function list(req, res) {
  const urls = await Url.find()
    .sort({ createdAt: -1 })
    .select("shortCode originalUrl createdAt")
    .lean();
  res.json(urls);
}

async function redirect(req, res) {
  const url = await Url.findOne({ shortCode: req.params.code });
  if (!url) return res.status(404).send("Not found");
  await Click.create({ shortCode: req.params.code });

  res.redirect(url.originalUrl);
}

async function shorten(req, res) {
  const { url } = req.body;

  const shortCode = generateShortCode();

  const newUrl = await Url.create({
    shortCode,
    originalUrl: url,
  });

  res.json({ newUrl });
}

module.exports = { list, redirect, shorten };
