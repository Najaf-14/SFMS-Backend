const express = require("express");
const router = express.Router();
const {
  getReportSummaryStats,
  exportFeeCollections,
  exportDefaulters,
  exportConcessions,
  exportProfitAndLoss,
} = require("../controllers/reportController");
const { authenticateToken } = require("../middleware/authMiddleware");
const { authorizeRoles } = require("../middleware/roleMiddleware");

router.use(authenticateToken);

router.get(
  "/summary",
  authorizeRoles("SUPER_ADMIN", "ADMIN", "ACCOUNTANT", "PRINCIPAL"),
  getReportSummaryStats,
);
router.get(
  "/export/fee-collections",
  authorizeRoles("SUPER_ADMIN", "ADMIN", "ACCOUNTANT", "PRINCIPAL"),
  exportFeeCollections,
);
router.get(
  "/export/defaulters",
  authorizeRoles("SUPER_ADMIN", "ADMIN", "ACCOUNTANT", "PRINCIPAL"),
  exportDefaulters,
);
router.get(
  "/export/concessions",
  authorizeRoles("SUPER_ADMIN", "ADMIN", "ACCOUNTANT", "PRINCIPAL"),
  exportConcessions,
);
router.get(
  "/export/pnl",
  authorizeRoles("SUPER_ADMIN", "ADMIN", "ACCOUNTANT", "PRINCIPAL"),
  exportProfitAndLoss,
);

module.exports = router;
