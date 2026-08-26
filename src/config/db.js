const { Pool } = require("pg");
const fs = require("fs");
const path = require("path");

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

pool.on("error", (err) => {
  console.error("Unexpected PostgreSQL error:", err);
});

const initDB = async () => {
  try {
    await pool.query("SELECT 1");
    console.log("PostgreSQL connected successfully.");

    const sqlPath = path.join(__dirname, "database.sql");
    const sql = fs.readFileSync(sqlPath, "utf-8");

    await pool.query(sql);

    console.log("Database tables and initial roles initialized.");
  } catch (error) {
    console.error("Error initializing database:", error.message);
  }
};
module.exports = { pool, initDB };
