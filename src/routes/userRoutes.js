const express = require("express");
const router = express.Router();
const {
  getUsers,
  addUser,
  editUser,
  removeUser,
  fetchRoles,
} = require("../controllers/userController");
const { authenticateToken } = require("../middleware/authMiddleware");
const { authorizeRoles } = require("../middleware/roleMiddleware");

router.use(authenticateToken);

router.get("/roles", fetchRoles);
router.get("/", authorizeRoles("SUPER_ADMIN", "ADMIN", "PRINCIPAL"), getUsers);
router.post("/", authorizeRoles("SUPER_ADMIN", "ADMIN"), addUser);
router.patch("/:id", authorizeRoles("SUPER_ADMIN", "ADMIN"), editUser);
router.delete("/:id", authorizeRoles("SUPER_ADMIN"), removeUser);

module.exports = router;
