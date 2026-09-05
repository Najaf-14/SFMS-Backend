const express = require("express");
const router = express.Router();
const {
  addExpense,
  fetchExpenses,
  modifyExpense,
  removeExpense,
} = require("../controllers/expenseController");
const { authenticateToken } = require("../middleware/authMiddleware");
const { authorizeRoles } = require("../middleware/roleMiddleware");

router.use(authenticateToken);

router.post("/", authorizeRoles("SUPER_ADMIN", "ACCOUNTANT"), addExpense);
router.get(
  "/",
  authorizeRoles("SUPER_ADMIN", "ACCOUNTANT", "PRINCIPAL"),
  fetchExpenses,
);
router.patch(
  "/:id",
  authorizeRoles("SUPER_ADMIN", "ACCOUNTANT"),
  modifyExpense,
);
router.delete("/:id", authorizeRoles("SUPER_ADMIN"), removeExpense);

module.exports = router;
