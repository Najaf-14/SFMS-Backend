const express = require("express");
const router = express.Router();
const {
  addClass,
  fetchClasses,
  fetchClassById,
  addSection,
  fetchSectionsByClass,
} = require("../controllers/academicController");
const { authenticateToken } = require("../middleware/authMiddleware");
const { authorizeRoles } = require("../middleware/roleMiddleware");

router.use(authenticateToken);

router.post(
  "/classes",
  authorizeRoles("SUPER_ADMIN", "ADMIN", "PRINCIPAL"),
  addClass,
);
router.get("/classes", fetchClasses);
router.get("/classes/:id", fetchClassById);
router.post(
  "/sections",
  authorizeRoles("SUPER_ADMIN", "ADMIN", "PRINCIPAL"),
  addSection,
);
router.get("/classes/:classId/sections", fetchSectionsByClass);

module.exports = router;
