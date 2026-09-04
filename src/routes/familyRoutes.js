const express = require("express");
const router = express.Router();

const {
  addFamily,
  fetchFamilies,
  fetchFamilyById,
  editFamily,
  removeFamily,
} = require("../controllers/familyController");

const { authenticateToken } = require("../middleware/authMiddleware");

const { authorizeRoles } = require("../middleware/roleMiddleware");

// All family routes require login
router.use(authenticateToken);

// CREATE
router.post(
  "/",
  authorizeRoles("SUPER_ADMIN", "ADMIN", "PRINCIPAL"),
  addFamily,
);

// READ ALL
router.get("/", fetchFamilies);

// READ ONE
router.get("/:id", fetchFamilyById);

// UPDATE
router.patch(
  "/:id",
  authorizeRoles("SUPER_ADMIN", "ADMIN", "PRINCIPAL"),
  editFamily,
);

// DELETE / DEACTIVATE
router.delete(
  "/:id",
  authorizeRoles("SUPER_ADMIN", "ADMIN", "PRINCIPAL"),
  removeFamily,
);

module.exports = router;
