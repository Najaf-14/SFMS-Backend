const express = require("express");
const router = express.Router();
const {
  fetchSettings,
  saveSettings,
} = require("../controllers/settingController");
const { authenticateToken } = require("../middleware/authMiddleware");
const { authorizeRoles } = require("../middleware/roleMiddleware");

router.use(authenticateToken);

router.get(
  "/",
  authorizeRoles("SUPER_ADMIN", "ADMIN", "ACCOUNTANT", "PRINCIPAL"),
  fetchSettings,
);
router.patch("/", authorizeRoles("SUPER_ADMIN", "ADMIN"), saveSettings);

module.exports = router;
