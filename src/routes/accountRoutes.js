const express = require("express");
const router = express.Router();
const {
  addAccount,
  fetchAccounts,
  fetchAccountTransactions,
} = require("../controllers/accountController");
const { authenticateToken } = require("../middleware/authMiddleware");
const { authorizeRoles } = require("../middleware/roleMiddleware");

router.use(authenticateToken);

router.post("/", authorizeRoles("SUPER_ADMIN", "ACCOUNTANT"), addAccount);
router.get(
  "/",
  authorizeRoles("SUPER_ADMIN", "ACCOUNTANT", "PRINCIPAL"),
  fetchAccounts,
);
router.get(
  "/:id/transactions",
  authorizeRoles("SUPER_ADMIN", "ACCOUNTANT", "PRINCIPAL"),
  fetchAccountTransactions,
);

module.exports = router;
