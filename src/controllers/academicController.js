const {
  createClass,
  getAllClassesWithSections,
  getClassById,
  createSection,
  getSectionsByClassId,
} = require("../models/academicModel");

const addClass = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) {
      return res.status(400).json({ error: "Class name is required." });
    }

    const newClass = await createClass(name);
    return res.status(201).json({
      message: "Class created successfully",
      class: newClass,
    });
  } catch (error) {
    if (error.code === "23505") {
      return res
        .status(400)
        .json({ error: "Class with this name already exists." });
    }
    return res.status(500).json({ error: error.message });
  }
};

const fetchClasses = async (req, res) => {
  try {
    const classes = await getAllClassesWithSections();
    return res.json({ success: true, count: classes.length, data: classes });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

const fetchClassById = async (req, res) => {
  try {
    const classData = await getClassById(req.params.id);
    if (!classData) {
      return res.status(404).json({ error: "Class not found." });
    }
    return res.json({ success: true, data: classData });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

const addSection = async (req, res) => {
  try {
    const { class_id, name } = req.body;
    if (!class_id || !name) {
      return res
        .status(400)
        .json({ error: "class_id and section name are required." });
    }

    const newSection = await createSection(class_id, name);
    return res.status(201).json({
      message: "Section created successfully",
      section: newSection,
    });
  } catch (error) {
    if (error.code === "23505") {
      return res
        .status(400)
        .json({ error: "Section name already exists for this class." });
    }
    if (error.code === "23503") {
      return res
        .status(400)
        .json({ error: "Referenced class_id does not exist." });
    }
    return res.status(500).json({ error: error.message });
  }
};

const fetchSectionsByClass = async (req, res) => {
  try {
    const sections = await getSectionsByClassId(req.params.classId);
    return res.json({ success: true, count: sections.length, data: sections });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

module.exports = {
  addClass,
  fetchClasses,
  fetchClassById,
  addSection,
  fetchSectionsByClass,
};
