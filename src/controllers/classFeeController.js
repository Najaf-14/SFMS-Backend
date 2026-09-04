const {
  getClassById,

  createSection,
  getSectionsByClass,
  getSectionById,
  updateSection,
  deleteSection,

  createClassWithFees,
  getClassesWithFees,
  getClassWithFees,
  updateClassWithFees,
  deleteClassWithData,
} = require("../models/classFeeModel");

const addClassWithFees = async (req, res) => {
  try {
    const {
      name,
      description,
      sections = [],
      academic_session_id,
      fees = [],
    } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        error: "Class name is required.",
      });
    }

    if (!Array.isArray(sections)) {
      return res.status(400).json({
        success: false,
        error: "sections must be an array.",
      });
    }

    if (!Array.isArray(fees)) {
      return res.status(400).json({
        success: false,
        error: "fees must be an array.",
      });
    }

    for (const section of sections) {
      if (typeof section !== "string" || !section.trim()) {
        return res.status(400).json({
          success: false,
          error: "Every section must have a valid name.",
        });
      }
    }

    for (const fee of fees) {
      if (
        !fee.fee_component_id ||
        fee.amount === undefined ||
        Number(fee.amount) < 0
      ) {
        return res.status(400).json({
          success: false,
          error: "Each fee must contain fee_component_id and a valid amount.",
        });
      }
    }

    const result = await createClassWithFees({
      name: name.trim(),
      description,
      sections: sections.map((section) => section.trim()),
      academic_session_id,
      fees,
    });

    return res.status(201).json({
      success: true,
      message: "Class, sections and fee structure created successfully.",
      data: result,
    });
  } catch (error) {
    console.error("Create class with fees error:", error);

    if (error.code === "23505") {
      return res.status(400).json({
        success: false,
        error: "Class, section or fee structure already exists.",
      });
    }

    return res.status(500).json({
      success: false,
      error: "Failed to create class.",
    });
  }
};

const fetchClassesWithFees = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = "", session_id } = req.query;

    const parsedPage = parseInt(page, 10);

    const parsedLimit = parseInt(limit, 10);

    if (isNaN(parsedPage) || parsedPage < 1) {
      return res.status(400).json({
        success: false,
        error: "Page must be greater than 0.",
      });
    }

    if (isNaN(parsedLimit) || parsedLimit < 1 || parsedLimit > 100) {
      return res.status(400).json({
        success: false,
        error: "Limit must be between 1 and 100.",
      });
    }

    const sessionId = session_id ? parseInt(session_id, 10) : null;

    if (session_id && isNaN(sessionId)) {
      return res.status(400).json({
        success: false,
        error: "Invalid session_id.",
      });
    }

    const result = await getClassesWithFees({
      page: parsedPage,
      limit: parsedLimit,
      search: search.trim(),
      sessionId,
    });

    const totalPages = Math.ceil(result.total / parsedLimit);

    return res.status(200).json({
      success: true,

      pagination: {
        page: parsedPage,
        limit: parsedLimit,
        total: result.total,
        totalPages,
        hasNextPage: parsedPage < totalPages,
        hasPreviousPage: parsedPage > 1,
      },

      data: result.data,
    });
  } catch (error) {
    console.error("Fetch classes with fees error:", error);

    return res.status(500).json({
      success: false,
      error: "Failed to fetch classes and fees.",
    });
  }
};

const fetchClassWithFees = async (req, res) => {
  try {
    const { id } = req.params;

    if (!/^\d+$/.test(id)) {
      return res.status(400).json({
        success: false,
        error: "Invalid class ID.",
      });
    }

    const sessionId = req.query.session_id
      ? parseInt(req.query.session_id, 10)
      : null;

    const result = await getClassWithFees(id, sessionId);

    if (!result) {
      return res.status(404).json({
        success: false,
        error: "Class not found.",
      });
    }

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Fetch class with fees error:", error);

    return res.status(500).json({
      success: false,
      error: "Failed to fetch class.",
    });
  }
};

const editClassWithFees = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || isNaN(id)) {
      return res.status(400).json({
        error: "Valid class ID is required.",
      });
    }

    const { name, sections = [], academic_session_id, fees = [] } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        error: "Class name is required.",
      });
    }

    if (!Array.isArray(sections)) {
      return res.status(400).json({
        error: "Sections must be an array.",
      });
    }

    if (!Array.isArray(fees)) {
      return res.status(400).json({
        error: "Fees must be an array.",
      });
    }

    const updatedClass = await updateClassWithFees(parseInt(id, 10), {
      name: name.trim(),
      sections,
      academic_session_id: academic_session_id
        ? parseInt(academic_session_id, 10)
        : null,
      fees,
    });

    return res.status(200).json({
      success: true,
      message: "Class updated successfully.",
      data: updatedClass,
    });
  } catch (error) {
    console.error("Update class with fees error:", error);

    return res.status(500).json({
      error: error.message,
    });
  }
};

const removeClass = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || isNaN(id)) {
      return res.status(400).json({
        error: "Valid class ID is required.",
      });
    }

    const deletedClass = await deleteClassWithData(parseInt(id, 10));

    if (!deletedClass) {
      return res.status(404).json({
        error: "Class not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Class deleted successfully.",
      data: deletedClass,
    });
  } catch (error) {
    console.error("Delete class error:", error);

    return res.status(500).json({
      error: error.message,
    });
  }
};

const addSection = async (req, res) => {
  try {
    const { class_id, name } = req.body;

    if (!class_id || !name || !name.trim()) {
      return res.status(400).json({
        success: false,
        error: "class_id and section name are required.",
      });
    }

    const existingClass = await getClassById(class_id);

    if (!existingClass) {
      return res.status(404).json({
        success: false,
        error: "Class not found.",
      });
    }

    const section = await createSection(class_id, name.trim());

    return res.status(201).json({
      success: true,
      message: "Section created successfully.",
      data: section,
    });
  } catch (error) {
    console.error("Create section error:", error);

    return res.status(500).json({
      success: false,
      error: "Failed to create section.",
    });
  }
};

const fetchSections = async (req, res) => {
  try {
    const { classId } = req.params;

    if (!/^\d+$/.test(classId)) {
      return res.status(400).json({
        success: false,
        error: "Invalid class ID.",
      });
    }

    const existingClass = await getClassById(classId);

    if (!existingClass) {
      return res.status(404).json({
        success: false,
        error: "Class not found.",
      });
    }

    const sections = await getSectionsByClass(classId);

    return res.status(200).json({
      success: true,
      data: sections,
    });
  } catch (error) {
    console.error("Fetch sections error:", error);

    return res.status(500).json({
      success: false,
      error: "Failed to fetch sections.",
    });
  }
};

const editSection = async (req, res) => {
  try {
    const { id } = req.params;

    const { name } = req.body;

    if (!/^\d+$/.test(id)) {
      return res.status(400).json({
        success: false,
        error: "Invalid section ID.",
      });
    }

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        error: "Section name is required.",
      });
    }

    const section = await getSectionById(id);

    if (!section) {
      return res.status(404).json({
        success: false,
        error: "Section not found.",
      });
    }

    const updatedSection = await updateSection(id, name.trim());

    return res.status(200).json({
      success: true,
      message: "Section updated successfully.",
      data: updatedSection,
    });
  } catch (error) {
    console.error("Update section error:", error);

    return res.status(500).json({
      success: false,
      error: "Failed to update section.",
    });
  }
};

const removeSection = async (req, res) => {
  try {
    const { id } = req.params;

    if (!/^\d+$/.test(id)) {
      return res.status(400).json({
        success: false,
        error: "Invalid section ID.",
      });
    }

    const section = await getSectionById(id);

    if (!section) {
      return res.status(404).json({
        success: false,
        error: "Section not found.",
      });
    }

    const deletedSection = await deleteSection(id);

    return res.status(200).json({
      success: true,
      message: "Section deleted successfully.",
      data: deletedSection,
    });
  } catch (error) {
    console.error("Delete section error:", error);

    return res.status(500).json({
      success: false,
      error: "Failed to delete section.",
    });
  }
};

module.exports = {
  addClassWithFees,
  fetchClassesWithFees,
  fetchClassWithFees,
  editClassWithFees,
  removeClass,

  addSection,
  fetchSections,
  editSection,
  removeSection,
};
