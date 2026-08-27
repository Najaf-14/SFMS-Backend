const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const {
  createUser,
  findUserByEmail,
  findUserById,
} = require("../models/userModel");

const {
  saveRefreshToken,
  findRefreshToken,
  deleteRefreshToken,
} = require("../models/refreshTokenModel");

const {
  generateAccessToken,
  generateRefreshToken,
} = require("../utils/tokenUtil");

const register = async (req, res) => {
  try {
    const { name, email, password, roleId } = req.body;

    if (!name || !email || !password || !roleId) {
      return res.status(400).json({ error: "All fields are required." });
    }

    const existingUser = await findUserByEmail(email);
    if (existingUser) {
      return res.status(400).json({ error: "Email already registered." });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const newUser = await createUser(name, email, passwordHash, roleId);
    return res
      .status(201)
      .json({ message: "User created successfully", user: newUser });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ error: "Email and password are required." });
    }

    const user = await findUserByEmail(email);
    if (!user || !user.is_active) {
      return res
        .status(401)
        .json({ error: "Invalid credentials or inactive account." });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: "Incorrect password" });
    }

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    await saveRefreshToken(user.id, refreshToken, expiresAt);

    return res.json({
      message: "Login successful",
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role_name,
      },
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

const refreshAccessToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(401).json({ error: "Refresh token is required." });
    }

    const storedToken = await findRefreshToken(refreshToken);
    if (!storedToken) {
      return res
        .status(403)
        .json({ error: "Invalid or revoked refresh token." });
    }

    jwt.verify(
      refreshToken,
      process.env.JWT_REFRESH_SECRET,
      async (err, decoded) => {
        if (err)
          return res.status(403).json({ error: "Expired refresh token." });

        const user = await findUserById(decoded.id);
        if (!user) return res.status(404).json({ error: "User not found." });

        const newAccessToken = generateAccessToken(user);
        return res.json({ accessToken: newAccessToken });
      },
    );
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

const logout = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (refreshToken) {
      await deleteRefreshToken(refreshToken);
    }
    return res.json({ message: "Logged out successfully." });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

module.exports = {
  register,
  login,
  refreshAccessToken,
  logout,
};
