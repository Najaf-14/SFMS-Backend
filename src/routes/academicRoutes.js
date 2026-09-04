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
  promoteStudents,
} = require("../controllers/academicController");

const { authenticateToken } = require("../middleware/authMiddleware");
const { authorizeRoles } = require("../middleware/roleMiddleware");

router.use(authenticateToken);

// Classes & Sections
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

// Academic Sessions
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

// Bulk Promotion Transition
router.post(
  "/promote",
  authorizeRoles("SUPER_ADMIN", "ADMIN", "PRINCIPAL"),
  promoteStudents,
);

module.exports = router;
