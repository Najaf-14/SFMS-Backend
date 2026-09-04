const {
  createClass,
  getAllClassesWithSections,
  getClassById,
  createSection,
  getSectionsByClassId,
  createAcademicSession,
  getAllAcademicSessions,
  getAcademicSessionById,
  updateAcademicSession,
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

const addAcademicSession = async (req, res) => {
  try {
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({
        error: "Academic session name is required.",
      });
    }

    const session = await createAcademicSession(name);

    return res.status(201).json({
      message: "Academic session created successfully",
      session,
    });
  } catch (error) {
    if (error.code === "23505") {
      return res.status(400).json({
        error: "Academic session already exists.",
      });
    }

    return res.status(500).json({
      error: error.message,
    });
  }
};

const fetchAcademicSessions = async (req, res) => {
  try {
    const sessions = await getAllAcademicSessions();

    return res.json({
      success: true,
      count: sessions.length,
      data: sessions,
    });
  } catch (error) {
    return res.status(500).json({
      error: error.message,
    });
  }
};

const fetchAcademicSessionById = async (req, res) => {
  try {
    const session = await getAcademicSessionById(req.params.id);

    if (!session) {
      return res.status(404).json({
        error: "Academic session not found.",
      });
    }

    return res.json({
      success: true,
      data: session,
    });
  } catch (error) {
    return res.status(500).json({
      error: error.message,
    });
  }
};

const editAcademicSession = async (req, res) => {
  try {
    const { id } = req.params;

    if (Object.keys(req.body).length === 0) {
      return res.status(400).json({
        error: "At least one field is required to update.",
      });
    }

    const existingSession = await getAcademicSessionById(id);

    if (!existingSession) {
      return res.status(404).json({
        error: "Academic session not found.",
      });
    }

    const updatedSession = await updateAcademicSession(id, req.body);

    if (!updatedSession) {
      return res.status(400).json({
        error: "No valid fields provided for update.",
      });
    }

    return res.json({
      success: true,
      message: "Academic session updated successfully.",
      session: updatedSession,
    });
  } catch (error) {
    if (error.code === "23505") {
      return res.status(400).json({
        error: "Academic session name already exists.",
      });
    }

    return res.status(500).json({
      error: error.message,
    });
  }
};

const promoteStudents = async (req, res) => {
  try {
    const { from_class_id, to_class_id, from_session_id, to_session_id } =
      req.body;

    if (!from_class_id || !to_class_id || !from_session_id || !to_session_id) {
      return res.status(400).json({
        error:
          "from_class_id, to_class_id, from_session_id, and to_session_id are required.",
      });
    }

    if (from_class_id === to_class_id && from_session_id === to_session_id) {
      return res.status(400).json({
        error:
          "Source and destination class and session cannot be the exact same.",
      });
    }

    const promotedList = await promoteStudentsBulk({
      from_class_id: Number(from_class_id),
      to_class_id: Number(to_class_id),
      from_session_id: Number(from_session_id),
      to_session_id: Number(to_session_id),
    });

    return res.json({
      success: true,
      message: `Successfully promoted ${promotedList.length} active students.`,
      count: promotedList.length,
      data: promotedList,
    });
  } catch (error) {
    console.error("BULK PROMOTION ERROR:", error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

module.exports = {
  addClass,
  fetchClasses,
  fetchClassById,
  addSection,
  fetchSectionsByClass,
  addAcademicSession,
  fetchAcademicSessions,
  fetchAcademicSessionById,
  editAcademicSession,
  promoteStudents,
};
