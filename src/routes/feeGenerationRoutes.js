const express = require("express");
const router = express.Router();
const {
  generateFees,
  fetchInvoices,
  fetchInvoiceById,
} = require("../controllers/feeGenerationController");
const { authenticateToken } = require("../middleware/authMiddleware");
const { authorizeRoles } = require("../middleware/roleMiddleware");

router.use(authenticateToken);

router.post(
  "/generate",
  authorizeRoles("SUPER_ADMIN", "ACCOUNTANT"),
  generateFees,
);
router.get(
  "/invoices",
  authorizeRoles("SUPER_ADMIN", "ACCOUNTANT", "PRINCIPAL"),
  fetchInvoices,
);
router.get(
  "/invoices/:id",
  authorizeRoles("SUPER_ADMIN", "ACCOUNTANT", "PRINCIPAL"),
  fetchInvoiceById,
);
module.exports = router;
