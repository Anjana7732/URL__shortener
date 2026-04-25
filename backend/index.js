const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const app = express();
app.use(express.json());
app.use(cors());

const  rateLimiter = require("./middleware/rateLimiter");
const Url = require("./models/Url");
const Click = require("./models/Click");

mongoose.connect("mongodb://127.0.0.1:27017/urlshortner")
.then(() => console.log("MongoDB connected"))
.catch(err => console.log(err));

app.get("/:code", async (req, res) => {
    const url = await Url.findOne({ shortCode: req.params.code });
    if (!url) return res.status(404).send("Not found");
    await Click.create({ shortCode: req.params.code });

    res.redirect(url.originalUrl);
})

app.get("/analytics/:code", async (req, res) => {
    const clicks = await Click.find({shortCode: req.params.code});

    const result = {}

    clicks.forEach(c => {
        const date = c.timestamp.toISOString().split("T")[0];
        result[date] = (result[date] || 0) + 1;
    });

    const formatted =  Object.keys(result).map(date => ({
        date,
        clicks: result[date]
    }));
    res.json(formatted);
})

function generateShortCode() {
    return Math.random().toString(36).substring(2, 8);
}

app.post("/shorten", rateLimiter, async (req, res) => {
    const { url } =req.body;

    const shortCode = generateShortCode();

    const newUrl =await Url.create({
        shortCode,
        originalUrl: url
    });

    res.json({ newUrl });
});

app.get("/", (req, res) => {
    res.send("URL Shortener API is running");
})

app.listen(3000, () => console.log("Server running on port 3000"));
