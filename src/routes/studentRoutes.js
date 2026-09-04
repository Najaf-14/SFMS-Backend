const express = require("express");
const router = express.Router();
const {
  addStudent,
  fetchAllStudents,
  fetchStudentById,
  editStudent,
  removeStudent,
} = require("../controllers/studentController");
const { authenticateToken } = require("../middleware/authMiddleware");
const { authorizeRoles } = require("../middleware/roleMiddleware");

router.use(authenticateToken);

router.post("/", authorizeRoles("SUPER_ADMIN", "ADMIN"), addStudent);
router.get("/", fetchAllStudents);
router.get("/:id", fetchStudentById);
router.patch("/:id", authorizeRoles("SUPER_ADMIN", "ADMIN"), editStudent);
router.delete("/:id", authorizeRoles("SUPER_ADMIN", "ADMIN"), removeStudent);

module.exports = router;
