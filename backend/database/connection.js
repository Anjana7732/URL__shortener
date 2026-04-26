const mongoose = require("mongoose");

const MONGODB_URI =
  "mongodb+srv://anjanabudhathoki201_db_user:A9sUs5Qt71E5HFN9@cluster0.bod5dzs.mongodb.net/?appName=Cluster0";

function connect() {
  return mongoose
    .connect(MONGODB_URI)
    .then(() => console.log("MongoDB connected"))
    .catch((err) => console.log(err));
}

module.exports = { connect };
