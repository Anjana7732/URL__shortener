const express = require("express");
const cors = require("cors");
const { connect } = require("./database/connection");
const rateLimiter = require("./middleware/rateLimiter");
const urlController = require("./controllers/urlController");
const analyticsController = require("./controllers/analyticsController");

connect();

const app = express();
app.use(express.json());
app.use(
  cors({
    exposedHeaders: ["Retry-After"],
  })
);

app.get("/urls", urlController.list);
app.get("/analytics/scale", analyticsController.getScale);
app.get("/analytics/:code", analyticsController.getByCode);
app.get("/", (req, res) => {
  res.send("URL Shortener API is running");
});
app.get("/:code", urlController.redirect);
app.post("/shorten", rateLimiter, urlController.shorten);

app.listen(3000, () => console.log("Server running on port 3000"));
