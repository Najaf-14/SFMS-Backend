const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// routes paths
const authRoutes = require("./src/routes/authRoutes");
const userRoutes = require("./src/routes/userRoutes");
const familyRoutes = require("./src/routes/familyRoutes");
const studentRoutes = require("./src/routes/studentRoutes");
const academicRoutes = require("./src/routes/academicRoutes");
const feesRoutes = require("./src/routes/feeStructureRoutes");
const feeGenerationRoutes = require("./src/routes/feeGenerationRoutes");

const classFeeRoutes = require("./src/routes/classFeeRoutes");
const paymentRoutes = require("./src/routes/paymentRoutes");

const { initDB } = require("./src/config/db");

// api routes
app.use("/api/auth", authRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/users", userRoutes);
app.use("/api/families", familyRoutes);
app.use("/api/students", studentRoutes);
app.use("/api/academic", academicRoutes);
app.use("/api/fees", feesRoutes);
app.use("/api/billing", feeGenerationRoutes);
app.use("/api/class-fees", classFeeRoutes);

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
