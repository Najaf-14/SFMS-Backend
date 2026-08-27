const {
  createFeeComponent,
  getFeeComponents,
  assignClassFeeStructure,
  getClassFeeStructures,
  getClassFeeStructure,
} = require("../models/feeStructureModel");

const addComponent = async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: "Component name is required." });
    }

    const component = await createFeeComponent(name.trim(), description);
    return res.status(201).json({ success: true, component });
  } catch (error) {
    if (error.code === "23505") {
      return res
        .status(400)
        .json({ error: "A fee component with this name already exists." });
    }
    return res.status(500).json({ error: error.message });
  }
};

const fetchComponents = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = "" } = req.query;
    const paginatedResult = await getFeeComponents({
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      search,
    });
    return res.json({ success: true, ...paginatedResult });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

const setupClassFee = async (req, res) => {
  try {
    const { class_id, academic_session_id, items } = req.body;

    if (
      !class_id ||
      !academic_session_id ||
      !Array.isArray(items) ||
      items.length === 0
    ) {
      return res.status(400).json({
        error:
          "class_id, academic_session_id, and an array of items (fee_component_id, amount) are required.",
      });
    }

    const result = await assignClassFeeStructure(
      class_id,
      academic_session_id,
      items,
    );
    return res.status(201).json({
      message: "Class fee structure configured successfully.",
      data: result,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

const fetchAllStructures = async (req, res) => {
  try {
    const { page = 1, limit = 10, session_id } = req.query;
    const paginatedResult = await getClassFeeStructures({
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      sessionId: session_id ? parseInt(session_id, 10) : null,
    });
    return res.json({ success: true, ...paginatedResult });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

const fetchClassFee = async (req, res) => {
  try {
    const { classId, sessionId } = req.params;
    const structure = await getClassFeeStructure(classId, sessionId);
    if (!structure) {
      return res
        .status(404)
        .json({ error: "No fee structure found for this class and session." });
    }
    return res.json({ success: true, data: structure });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

module.exports = {
  addComponent,
  fetchComponents,
  setupClassFee,
  fetchAllStructures,
  fetchClassFee,
};
