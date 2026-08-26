const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();

app.use(cors());
app.use(express.json());

const authRoutes = require("./src/routes/authRoutes");

const { initDB } = require("./src/config/db");

// routes
app.use("/api/auth", authRoutes);

//Test API
app.get("/", (req, res) => {
  res.json({
    message: "School API is running ",
  });
});

initDB();

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on PORT:${PORT}`);
});
