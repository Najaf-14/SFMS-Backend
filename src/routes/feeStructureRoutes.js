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
  authorizeRoles("SUPER_ADMIN", "ADMIN"),
  addComponent,
);
router.get("/components", fetchComponents);
router.post(
  "/structures",
  authorizeRoles("SUPER_ADMIN", "ADMIN"),
  setupClassFee,
);
router.get("/structures", fetchAllStructures);
router.get("/structures/class/:classId/session/:sessionId", fetchClassFee);

module.exports = router;
