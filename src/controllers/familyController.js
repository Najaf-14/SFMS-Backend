const {
  createFamily,
  getAllFamilies,
  getFamilyById,
  updateFamily,
  deleteFamily,
} = require("../models/familyModel");

const addFamily = async (req, res) => {
  try {
    const { father_parent_name, father_contact } = req.body;

    if (!father_parent_name || !father_parent_name.trim()) {
      return res.status(400).json({
        error: "father_parent_name is required.",
      });
    }

    if (!father_contact || !father_contact.trim()) {
      return res.status(400).json({
        error: "father_contact is required.",
      });
    }

    const newFamily = await createFamily(req.body);

    return res.status(201).json({
      success: true,
      message: "Family registered successfully.",
      data: newFamily,
    });
  } catch (error) {
    console.error("Create family error:", error);

    return res.status(500).json({
      error: error.message,
    });
  }
};

const fetchFamilies = async (req, res) => {
  try {
    const { search = "", page = 1, limit = 10 } = req.query;

    const pageNumber = Math.max(parseInt(page, 10) || 1, 1);

    const limitNumber = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 100);

    const result = await getAllFamilies(search, pageNumber, limitNumber);

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
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        error: "Invalid family ID.",
      });
    }

    const family = await getFamilyById(id);

    if (!family) {
      return res.status(404).json({
        error: "Family not found.",
      });
    }

    return res.json({
      success: true,
      data: family,
    });
  } catch (error) {
    console.error("Fetch family error:", error);

    return res.status(500).json({
      error: error.message,
    });
  }
};

const editFamily = async (req, res) => {
  try {
    const { id } = req.params;

    if (!/^\d+$/.test(id)) {
      return res.status(400).json({
        success: false,
        error: "Invalid family ID.",
      });
    }

    const {
      father_parent_name,
      father_contact,
      mother_name,
      cnic,
      mother_contact,
      whatsapp_number,
      email,
      address,
      emergency_contact,
      notes,
      admission_date,
      family_concession,
      scholarship_info,
      is_active,
    } = req.body;

    if (!father_parent_name || !father_parent_name.trim()) {
      return res.status(400).json({
        success: false,
        error: "father_parent_name is required.",
      });
    }

    if (!father_contact || !father_contact.trim()) {
      return res.status(400).json({
        success: false,
        error: "father_contact is required.",
      });
    }

    const existingFamily = await getFamilyById(id);

    if (!existingFamily) {
      return res.status(404).json({
        success: false,
        error: "Family not found.",
      });
    }

    const updatedFamily = await updateFamily(id, {
      father_parent_name,
      mother_name,
      cnic,
      father_contact,
      mother_contact,
      whatsapp_number,
      email,
      address,
      emergency_contact,
      notes,
      admission_date,
      family_concession,
      scholarship_info,
      is_active,
    });

    return res.status(200).json({
      success: true,
      message: "Family updated successfully.",
      data: updatedFamily,
    });
  } catch (error) {
    console.error("Update family error:", error);

    return res.status(500).json({
      success: false,
      error: "Failed to update family.",
    });
  }
};

const removeFamily = async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        error: "Invalid family ID.",
      });
    }

    const existingFamily = await getFamilyById(id);

    if (!existingFamily) {
      return res.status(404).json({
        error: "Family not found.",
      });
    }

    const deletedFamily = await deleteFamily(id);

    return res.json({
      success: true,
      message: "Family deactivated successfully.",
      data: deletedFamily,
    });
  } catch (error) {
    console.error("Delete family error:", error);

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
  removeFamily,
};
