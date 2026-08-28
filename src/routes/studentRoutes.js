const express = require("express");
const router = express.Router();
const {
  addStudent,
  fetchAllStudents,
  fetchStudentById,
} = require("../controllers/studentController");
const { authenticateToken } = require("../middleware/authMiddleware");
const { authorizeRoles } = require("../middleware/roleMiddleware");

router.use(authenticateToken);

router.post("/", authorizeRoles("SUPER_ADMIN", "ADMIN"), addStudent);
router.get("/", fetchAllStudents);
router.get("/:id", fetchStudentById);

module.exports = router;
