const express = require("express");
const router = express.Router();
const {
  register,
  login,
  refreshAccessToken,
  logout,
  editUser,
} = require("../controllers/authController");
const { authenticateToken } = require("../middleware/authMiddleware");

router.post("/register", register);
router.post("/login", login);
router.post("/refresh", refreshAccessToken);
router.post("/logout", logout);
router.get("/me", authenticateToken, (req, res) => {
  res.json({ message: "Authorized profile view", user: req.user });
});
router.patch("/:id", editUser);

module.exports = router;
