const express = require("express");
const router = express.Router();
const {
  addFamily,
  fetchFamilies,
  fetchFamilyById,
  editFamily,
} = require("../controllers/familyController");
const { authenticateToken } = require("../middleware/authMiddleware");
const { authorizeRoles } = require("../middleware/roleMiddleware");

router.use(authenticateToken);

router.post(
  "/",
  authorizeRoles("SUPER_ADMIN", "ADMIN", "PRINCIPAL"),
  addFamily,
);
router.get("/", fetchFamilies);
router.get("/:id", fetchFamilyById);
router.patch("/:id", editFamily);

module.exports = router;
