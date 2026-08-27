const express = require("express");
const router = express.Router();

const {
  addClass,
  fetchClasses,
  fetchClassById,
  addSection,
  fetchSectionsByClass,
  addAcademicSession,
  fetchAcademicSessions,
  fetchAcademicSessionById,
  editAcademicSession,
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

router.post(
  "/sessions",
  authorizeRoles("SUPER_ADMIN", "ADMIN", "PRINCIPAL"),
  addAcademicSession,
);

router.get("/sessions", fetchAcademicSessions);
router.get("/sessions/:id", fetchAcademicSessionById);
router.patch(
  "/sessions/:id",
  authorizeRoles("SUPER_ADMIN", "ADMIN", "PRINCIPAL"),
  editAcademicSession,
);

module.exports = router;
