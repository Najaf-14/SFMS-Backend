const express = require("express");
const router = express.Router();
const {
  addConcession,
  fetchConcessions,
  toggleStatus,
  removeConcession,
} = require("../controllers/concessionController");
const { authenticateToken } = require("../middleware/authMiddleware");
const { authorizeRoles } = require("../middleware/roleMiddleware");

router.use(authenticateToken);

router.get(
  "/",
  authorizeRoles("SUPER_ADMIN", "ADMIN", "ACCOUNTANT", "PRINCIPAL"),
  fetchConcessions,
);
router.post(
  "/",
  authorizeRoles("SUPER_ADMIN", "ADMIN", "ACCOUNTANT"),
  addConcession,
);
router.patch(
  "/:id/status",
  authorizeRoles("SUPER_ADMIN", "ADMIN", "ACCOUNTANT"),
  toggleStatus,
);
router.delete("/:id", authorizeRoles("SUPER_ADMIN", "ADMIN"), removeConcession);

module.exports = router;
