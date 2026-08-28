const express = require("express");
const router = express.Router();
const {
  addComponent,
  fetchComponents,
  setupClassFee,
  fetchAllStructures,
  fetchClassFee,
} = require("../controllers/feeStructureController");
const { authenticateToken } = require("../middleware/authMiddleware");
const { authorizeRoles } = require("../middleware/roleMiddleware");

router.use(authenticateToken);

router.post(
  "/components",
  authorizeRoles("SUPER_ADMIN", "ACCOUNTANT"),
  addComponent,
);
router.get(
  "/components",
  authorizeRoles("SUPER_ADMIN", "ACCOUNTANT", "PRINCIPAL"),
  fetchComponents,
);
router.post(
  "/structures",
  authorizeRoles("SUPER_ADMIN", "ACCOUNTANT"),
  setupClassFee,
);
router.get("/structures", fetchAllStructures);
router.get("/structures/class/:classId/session/:sessionId", fetchClassFee);

module.exports = router;
