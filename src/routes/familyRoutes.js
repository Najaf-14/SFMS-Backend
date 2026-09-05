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

router.use(authenticateToken);

router.post(
  "/",
  authorizeRoles("SUPER_ADMIN", "ADMIN", "PRINCIPAL"),
  addFamily,
);

router.get("/", fetchFamilies);

router.get("/:id", fetchFamilyById);

router.patch(
  "/:id",
  authorizeRoles("SUPER_ADMIN", "ADMIN", "PRINCIPAL"),
  editFamily,
);

router.delete(
  "/:id",
  authorizeRoles("SUPER_ADMIN", "ADMIN", "PRINCIPAL"),
  removeFamily,
);

module.exports = router;
