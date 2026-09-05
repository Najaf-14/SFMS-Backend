const express = require("express");
const router = express.Router();
const {
  collectPayment,
  fetchPayments,
  fetchPaymentByReceipt,
  fetchStudentPayments,
} = require("../controllers/paymentController");
const { authenticateToken } = require("../middleware/authMiddleware");
const { authorizeRoles } = require("../middleware/roleMiddleware");

router.use(authenticateToken);

router.post(
  "/collect",
  authorizeRoles("SUPER_ADMIN", "ACCOUNTANT"),
  collectPayment,
);

router.get(
  "/",
  authorizeRoles("SUPER_ADMIN", "ACCOUNTANT", "PRINCIPAL"),
  fetchPayments,
);

router.get(
  "/receipt/:receiptNo",
  authorizeRoles("SUPER_ADMIN", "ACCOUNTANT", "PRINCIPAL"),
  fetchPaymentByReceipt,
);

router.get(
  "/student/:studentId",
  authorizeRoles("SUPER_ADMIN", "ACCOUNTANT", "PRINCIPAL"),
  fetchStudentPayments,
);

module.exports = router;
