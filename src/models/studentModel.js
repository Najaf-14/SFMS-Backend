const { pool } = require("../config/db");

const createStudent = async (data) => {
  const query = `
    INSERT INTO students (
      admission_number,
      student_name,
      family_id,
      mother_name,
      date_of_birth,
      gender,
      class_id,
      section_id,
      roll_number,
      admission_date,
      contact,
      address,
      academic_session_id,
      status
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
    RETURNING *;
  `;

  const values = [
    data.admission_number,
    data.student_name,
    data.family_id,
    data.mother_name || null,
    data.date_of_birth || null,
    data.gender || null,
    data.class_id || null,
    data.section_id || null,
    data.roll_number || null,
    data.admission_date || new Date(),
    data.contact || null,
    data.address || null,
    data.academic_session_id || null,
    data.status || "Active",
  ];

  const result = await pool.query(query, values);
  return result.rows[0];
};

const getAllStudents = async (filters = {}) => {
  const { search, class_id, section_id, status } = filters;
  let query = `
    SELECT 
      s.id,
      s.admission_number,
      s.student_name,
      s.mother_name,
      s.date_of_birth,
      s.gender,
      s.roll_number,
      s.admission_date,
      s.contact AS student_contact,
      s.address,
      s.status,
      f.id AS family_id,
      f.family_id_code,
      f.father_parent_name,
      f.father_contact,
      c.id AS class_id,
      c.name AS class_name,
      sec.id AS section_id,
      sec.name AS section_name,
      a.id AS session_id,
      a.name AS session_name
    FROM students s
    JOIN families f ON s.family_id = f.id
    LEFT JOIN classes c ON s.class_id = c.id
    LEFT JOIN sections sec ON s.section_id = sec.id
    LEFT JOIN academic_sessions a ON s.academic_session_id = a.id
    WHERE 1=1
  `;
  const values = [];

  if (search) {
    values.push(`%${search}%`);
    const idx = values.length;
    query += ` AND (
      s.student_name ILIKE $${idx} OR 
      s.admission_number ILIKE $${idx} OR 
      f.father_parent_name ILIKE $${idx} OR 
      f.father_contact ILIKE $${idx} OR 
      s.contact ILIKE $${idx}
    )`;
  }

  if (class_id) {
    values.push(class_id);
    query += ` AND s.class_id = $${values.length}`;
  }

  if (section_id) {
    values.push(section_id);
    query += ` AND s.section_id = $${values.length}`;
  }

  if (status) {
    values.push(status);
    query += ` AND s.status = $${values.length}`;
  }

  query += ` ORDER BY s.id DESC;`;

  const result = await pool.query(query, values);
  return result.rows;
};

const getStudentById = async (id) => {
  const query = `
    SELECT 
      s.*,
      f.family_id_code,
      f.father_parent_name,
      f.father_contact,
      f.whatsapp_number,
      c.name AS class_name,
      sec.name AS section_name,
      a.name AS session_name
    FROM students s
    JOIN families f ON s.family_id = f.id
    LEFT JOIN classes c ON s.class_id = c.id
    LEFT JOIN sections sec ON s.section_id = sec.id
    LEFT JOIN academic_sessions a ON s.academic_session_id = a.id
    WHERE s.id = $1;
  `;
  const result = await pool.query(query, [id]);
  return result.rows[0] || null;
};

module.exports = {
  createStudent,
  getAllStudents,
  getStudentById,
};
