const express = require("express");
const router = express.Router();
const { fetchLedger } = require("../controllers/ledgerController");
const { authenticateToken } = require("../middleware/authMiddleware");
const { authorizeRoles } = require("../middleware/roleMiddleware");

router.use(authenticateToken);

router.get(
  "/",
  authorizeRoles("SUPER_ADMIN", "ACCOUNTANT", "PRINCIPAL"),
  fetchLedger,
);

module.exports = router;
