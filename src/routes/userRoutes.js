const express = require("express");
const router = express.Router();
const { getUsers, editUser } = require("../controllers/userController");
const { authenticateToken } = require("../middleware/authMiddleware");
const { authorizeRoles } = require("../middleware/roleMiddleware");

router.get("/", authenticateToken, getUsers);
router.patch(
  "/:id",
  authenticateToken,
  authorizeRoles("SUPER_ADMIN"),
  editUser,
);

module.exports = router;
