const {
  createStudent,
  getAllStudents,
  getStudentById,
  updateStudent,
  deleteStudent,
} = require("../models/studentModel");

const addStudent = async (req, res) => {
  try {
    const { admission_number, student_name, family_id } = req.body;

    if (!admission_number || !student_name || !family_id) {
      return res.status(400).json({
        error: "admission_number, student_name, and family_id are required.",
      });
    }

    const newStudent = await createStudent(req.body);

    return res.status(201).json({
      message: "Student registered successfully",
      student: newStudent,
    });
  } catch (error) {
    if (error.code === "23505") {
      return res.status(400).json({
        error: "Admission number already exists.",
      });
    }

    if (error.code === "23503") {
      return res.status(400).json({
        error:
          "Referenced Family, Class, Section, or Session ID does not exist.",
      });
    }

    return res.status(500).json({
      error: error.message,
    });
  }
};

const fetchAllStudents = async (req, res) => {
  try {
    const {
      search,
      class_id,
      section_id,
      status,
      page = 1,
      limit = 10,
    } = req.query;

    const pageNumber = Math.max(parseInt(page, 10) || 1, 1);
    const limitNumber = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 100);

    const result = await getAllStudents(
      {
        search,
        class_id,
        section_id,
        status,
      },
      pageNumber,
      limitNumber,
    );

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
    console.error("FETCH ALL STUDENTS ERROR:", error);
    console.error("ERROR CODE:", error.code);
    console.error("ERROR DETAIL:", error.detail);
    console.error("ERROR HINT:", error.hint);

    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

const fetchStudentById = async (req, res) => {
  try {
    const student = await getStudentById(req.params.id);

    if (!student) {
      return res.status(404).json({
        error: "Student not found.",
      });
    }

    return res.json({
      success: true,
      data: student,
    });
  } catch (error) {
    return res.status(500).json({
      error: error.message,
    });
  }
};

const editStudent = async (req, res) => {
  try {
    const { id } = req.params;

    if (!/^\d+$/.test(id)) {
      return res.status(400).json({
        error: "Invalid student ID.",
      });
    }

    const { student_name, family_id } = req.body;

    if (!student_name || !family_id) {
      return res.status(400).json({
        error: "student_name and family_id are required.",
      });
    }

    const updatedStudent = await updateStudent(id, req.body);

    if (!updatedStudent) {
      return res.status(404).json({
        error: "Student not found.",
      });
    }

    return res.json({
      success: true,
      message: "Student updated successfully.",
      student: updatedStudent,
    });
  } catch (error) {
    if (error.code === "23503") {
      return res.status(400).json({
        error:
          "Referenced Family, Class, Section, or Session ID does not exist.",
      });
    }

    return res.status(500).json({
      error: error.message,
    });
  }
};

const removeStudent = async (req, res) => {
  try {
    const { id } = req.params;

    if (!/^\d+$/.test(id)) {
      return res.status(400).json({
        error: "Invalid student ID.",
      });
    }

    const deletedStudent = await deleteStudent(id);

    if (!deletedStudent) {
      return res.status(404).json({
        error: "Student not found.",
      });
    }

    return res.json({
      success: true,
      message: "Student deleted successfully.",
      student: deletedStudent,
    });
  } catch (error) {
    return res.status(500).json({
      error: error.message,
    });
  }
};

module.exports = {
  addStudent,
  fetchAllStudents,
  fetchStudentById,
  editStudent,
  removeStudent,
};
