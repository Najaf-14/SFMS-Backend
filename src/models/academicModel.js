const { pool } = require("../config/db");

const createClass = async (name) => {
  const query = `
    INSERT INTO classes (name)
    VALUES ($1)
    RETURNING *;
  `;
  const result = await pool.query(query, [name]);
  return result.rows[0];
};

const getAllClassesWithSections = async () => {
  const query = `
    SELECT 
      c.id AS class_id,
      c.name AS class_name,
      c.created_at,
      COALESCE(
        json_agg(
          json_build_object('id', s.id, 'name', s.name, 'created_at', s.created_at)
        ) FILTER (WHERE s.id IS NOT NULL),
        '[]'
      ) AS sections
    FROM classes c
    LEFT JOIN sections s ON c.id = s.class_id
    GROUP BY c.id
    ORDER BY c.id ASC;
  `;
  const result = await pool.query(query);
  return result.rows;
};

const getClassById = async (id) => {
  const query = `
    SELECT 
      c.id AS class_id,
      c.name AS class_name,
      COALESCE(
        json_agg(
          json_build_object('id', s.id, 'name', s.name)
        ) FILTER (WHERE s.id IS NOT NULL),
        '[]'
      ) AS sections
    FROM classes c
    LEFT JOIN sections s ON c.id = s.class_id
    WHERE c.id = $1
    GROUP BY c.id;
  `;
  const result = await pool.query(query, [id]);
  return result.rows[0] || null;
};

const createSection = async (classId, name) => {
  const query = `
    INSERT INTO sections (class_id, name)
    VALUES ($1, $2)
    RETURNING *;
  `;
  const result = await pool.query(query, [classId, name]);
  return result.rows[0];
};

const getSectionsByClassId = async (classId) => {
  const query = `
    SELECT * FROM sections
    WHERE class_id = $1
    ORDER BY name ASC;
  `;
  const result = await pool.query(query, [classId]);
  return result.rows;
};

const createAcademicSession = async (name) => {
  const query = `
    INSERT INTO academic_sessions (name)
    VALUES ($1)
    RETURNING *;
  `;

  const result = await pool.query(query, [name]);

  return result.rows[0];
};

const getAllAcademicSessions = async () => {
  const query = `
    SELECT *
    FROM academic_sessions
    ORDER BY id DESC;
  `;

  const result = await pool.query(query);

  return result.rows;
};

const getAcademicSessionById = async (id) => {
  const query = `
    SELECT *
    FROM academic_sessions
    WHERE id = $1;
  `;

  const result = await pool.query(query, [id]);

  return result.rows[0] || null;
};

const updateAcademicSession = async (id, data) => {
  const allowedFields = ["name", "is_active"];

  const fields = [];
  const values = [];

  for (const field of allowedFields) {
    if (data[field] !== undefined) {
      fields.push(`${field} = $${values.length + 1}`);
      values.push(data[field]);
    }
  }

  if (fields.length === 0) {
    return null;
  }

  values.push(id);

  const query = `
    UPDATE academic_sessions
    SET ${fields.join(", ")}
    WHERE id = $${values.length}
    RETURNING *;
  `;

  const result = await pool.query(query, values);

  return result.rows[0] || null;
};

const promoteStudentsBulk = async ({
  from_class_id,
  to_class_id,
  from_session_id,
  to_session_id,
}) => {
  const query = `
    UPDATE students
    SET 
      class_id = $1,
      academic_session_id = $2,
      section_id = NULL,
      updated_at = CURRENT_TIMESTAMP
    WHERE 
      class_id = $3
      AND (academic_session_id = $4 OR academic_session_id IS NULL)
      AND status = 'Active'
    RETURNING id, admission_number, student_name, class_id, academic_session_id;
  `;

  const values = [to_class_id, to_session_id, from_class_id, from_session_id];
  const result = await pool.query(query, values);
  return result.rows;
};

module.exports = {
  createClass,
  getAllClassesWithSections,
  getClassById,
  createSection,
  getSectionsByClassId,
  createAcademicSession,
  getAllAcademicSessions,
  getAcademicSessionById,
  updateAcademicSession,
  promoteStudentsBulk,
};
