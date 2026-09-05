const {
  findUserById,
  getAllUsers,
  createUser,
  updateUser,
  deleteUser,
  getAllRoles,
} = require("../models/userModel");

const getUsers = async (req, res) => {
  try {
    const { search, page = 1, limit = 10 } = req.query;
    const pageNumber = Math.max(parseInt(page, 10) || 1, 1);
    const limitNumber = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 100);

    const result = await getAllUsers(search || "", pageNumber, limitNumber);
    const totalPages = Math.ceil(result.total / limitNumber);

    return res.json({
      success: true,
      count: result.total,
      pagination: {
        page: pageNumber,
        limit: limitNumber,
        total: result.total,
        totalPages,
        hasNextPage: pageNumber < totalPages,
        hasPreviousPage: pageNumber > 1,
      },
      data: result.data,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

const addUser = async (req, res) => {
  try {
    const { name, email, password, role_id } = req.body;

    if (!name || !email || !role_id) {
      return res
        .status(400)
        .json({ error: "Name, email, and role_id are required." });
    }

    const newUser = await createUser({
      name,
      email,
      password: password || "TempPass123!",
      role_id: Number(role_id),
    });

    return res.status(201).json({
      success: true,
      message: "User created successfully.",
      user: newUser,
    });
  } catch (error) {
    if (error.code === "23505") {
      return res
        .status(400)
        .json({ error: "A user with this email already exists." });
    }
    return res.status(500).json({ error: error.message });
  }
};

const editUser = async (req, res) => {
  try {
    const { id } = req.params;

    if (Object.keys(req.body).length === 0) {
      return res
        .status(400)
        .json({ error: "At least one field is required to update." });
    }

    const existingUser = await findUserById(id);
    if (!existingUser) {
      return res.status(404).json({ error: "User not found." });
    }

    const updatedUser = await updateUser(id, req.body);
    return res.json({
      success: true,
      message: "User updated successfully.",
      user: updatedUser,
    });
  } catch (error) {
    if (error.code === "23505") {
      return res
        .status(400)
        .json({ error: "A user with this email already exists." });
    }
    return res.status(500).json({ error: error.message });
  }
};

const removeUser = async (req, res) => {
  try {
    const { id } = req.params;

    if (Number(req.user.id) === Number(id)) {
      return res
        .status(400)
        .json({ error: "You cannot delete your own account." });
    }

    const deleted = await deleteUser(id);
    if (!deleted) {
      return res.status(404).json({ error: "User not found." });
    }

    return res.json({
      success: true,
      message: `User ${deleted.name} deleted successfully.`,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

const fetchRoles = async (req, res) => {
  try {
    const roles = await getAllRoles();
    return res.json({ success: true, data: roles });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getUsers,
  addUser,
  editUser,
  removeUser,
  fetchRoles,
};
