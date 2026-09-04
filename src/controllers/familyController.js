const {
  createFamily,
  getAllFamilies,
  getFamilyById,
  updateFamily,
} = require("../models/familyModel");

const addFamily = async (req, res) => {
  try {
    const { father_parent_name, father_contact } = req.body;

    if (!father_parent_name || !father_contact) {
      return res.status(400).json({
        error: "father_parent_name and father_contact are required.",
      });
    }

    const newFamily = await createFamily(req.body);
    return res.status(201).json({
      message: "Family registered successfully",
      family: newFamily,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

const fetchFamilies = async (req, res) => {
  try {
    const { search, page = 1, limit = 10 } = req.query;

    const pageNumber = Math.max(parseInt(page, 10) || 1, 1);
    const limitNumber = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 100);
    const result = await getAllFamilies(search || "", pageNumber, limitNumber);
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
    console.error("Fetch families error:", error);
    return res.status(500).json({
      error: error.message,
    });
  }
};

const fetchFamilyById = async (req, res) => {
  try {
    const family = await getFamilyById(req.params.id);
    if (!family) {
      return res.status(404).json({ error: "Family not found." });
    }
    return res.json({ success: true, data: family });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

const editFamily = async (req, res) => {
  try {
    const { id } = req.params;

    if (Object.keys(req.body).length === 0) {
      return res.status(400).json({
        error: "At least one field is required to update.",
      });
    }

    const existingFamily = await getFamilyById(id);
    if (!existingFamily) {
      return res.status(404).json({
        error: "Family not found.",
      });
    }

    const updatedFamily = await updateFamily(id, req.body);
    if (!updatedFamily) {
      return res.status(400).json({
        error: "No valid fields provided for update.",
      });
    }

    return res.json({
      success: true,
      message: "Family updated successfully.",
      family: updatedFamily,
    });
  } catch (error) {
    return res.status(500).json({
      error: error.message,
    });
  }
};

module.exports = {
  addFamily,
  fetchFamilies,
  fetchFamilyById,
  editFamily,
};
