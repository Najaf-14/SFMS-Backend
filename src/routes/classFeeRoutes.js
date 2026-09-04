const express = require("express");

const router = express.Router();

const {
  addClassWithFees,
  fetchClassesWithFees,
  fetchClassWithFees,
  editClassWithFees,
  removeClass,

  addSection,
  fetchSections,
  editSection,
  removeSection,
} = require("../controllers/classFeeController");

const { authenticateToken } = require("../middleware/authMiddleware");

const { authorizeRoles } = require("../middleware/roleMiddleware");

router.use(authenticateToken);

router.post(
  "/sections",
  authorizeRoles("SUPER_ADMIN", "ADMIN", "PRINCIPAL"),
  addSection,
);

router.get("/classes/:classId/sections", fetchSections);

router.patch(
  "/sections/:id",
  authorizeRoles("SUPER_ADMIN", "ADMIN", "PRINCIPAL"),
  editSection,
);

router.delete(
  "/sections/:id",
  authorizeRoles("SUPER_ADMIN", "ADMIN", "PRINCIPAL"),
  removeSection,
);

router.post(
  "/",
  authorizeRoles("SUPER_ADMIN", "ADMIN", "PRINCIPAL"),
  addClassWithFees,
);

router.get("/", fetchClassesWithFees);

router.get("/:id", fetchClassWithFees);

router.patch(
  "/:id",
  authorizeRoles("SUPER_ADMIN", "ADMIN", "PRINCIPAL"),
  editClassWithFees,
);

router.delete(
  "/:id",
  authorizeRoles("SUPER_ADMIN", "ADMIN", "PRINCIPAL"),
  removeClass,
);

module.exports = router;
