const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();

app.use(cors());
app.use(express.json());

// routes paths
const authRoutes = require("./src/routes/authRoutes");
const familyRoutes = require("./src/routes/familyRoutes");

const { initDB } = require("./src/config/db");

// api routes
app.use("/api/auth", authRoutes);
app.use("/api/families", familyRoutes);

//Test API
app.get("/", (req, res) => {
  res.json({
    message: "School API is running ",
  });
});

const startServer = async () => {
  await initDB();

  const PORT = process.env.PORT || 5000;

  app.listen(PORT, () => {
    console.log(`Server running on PORT:${PORT}`);
  });
};

startServer();
