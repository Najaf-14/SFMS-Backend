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
    VALUES (
      $1, $2, $3, $4, $5, $6, $7,
      $8, $9, $10, $11, $12, $13, $14
    )
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

const getAllStudents = async (filters = {}, page = 1, limit = 10) => {
  const { search, class_id, section_id, status } = filters;

  const offset = (page - 1) * limit;

  let whereClause = `WHERE 1=1`;
  const values = [];

  // Search
  if (search) {
    values.push(`%${search}%`);

    const idx = values.length;

    whereClause += `
      AND (
        s.student_name ILIKE $${idx}
        OR s.admission_number ILIKE $${idx}
        OR f.father_parent_name ILIKE $${idx}
        OR f.father_contact ILIKE $${idx}
        OR s.contact ILIKE $${idx}
      )
    `;
  }

  // Filter by class
  if (class_id) {
    values.push(class_id);

    whereClause += `
      AND s.class_id = $${values.length}
    `;
  }

  // Filter by section
  if (section_id) {
    values.push(section_id);

    whereClause += `
      AND s.section_id = $${values.length}
    `;
  }

  // Filter by status
  if (status) {
    values.push(status);

    whereClause += `
      AND s.status = $${values.length}
    `;
  }

  // Count query
  const countQuery = `
    SELECT COUNT(*) AS total

    FROM students s

    JOIN families f
      ON s.family_id = f.id

    ${whereClause};
  `;

  const countResult = await pool.query(countQuery, values);

  const total = Number(countResult.rows[0].total);

  // Pagination values
  const dataValues = [...values, limit, offset];

  const limitPosition = values.length + 1;
  const offsetPosition = values.length + 2;

  // Data query
  const dataQuery = `
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

      -- Family information
      f.id AS family_id,
      f.father_parent_name,
      f.father_contact,

      -- Class information
      c.id AS class_id,
      c.name AS class_name,

      -- Section information
      sec.id AS section_id,
      sec.name AS section_name,

      -- Academic session information
      a.id AS session_id,
      a.name AS session_name

    FROM students s

    JOIN families f
      ON s.family_id = f.id

    LEFT JOIN classes c
      ON s.class_id = c.id

    LEFT JOIN sections sec
      ON s.section_id = sec.id

    LEFT JOIN academic_sessions a
      ON s.academic_session_id = a.id

    ${whereClause}

    ORDER BY s.id DESC

    LIMIT $${limitPosition}
    OFFSET $${offsetPosition};
  `;

  const dataResult = await pool.query(dataQuery, dataValues);

  return {
    data: dataResult.rows,
    total,
  };
};

const getStudentById = async (id) => {
  const query = `
    SELECT 
      s.*,

      -- Family information
      f.id AS family_id,
      f.father_parent_name,
      f.father_contact,
      f.whatsapp_number,

      -- Class information
      c.name AS class_name,

      -- Section information
      sec.name AS section_name,

      -- Academic session information
      a.name AS session_name

    FROM students s

    JOIN families f
      ON s.family_id = f.id

    LEFT JOIN classes c
      ON s.class_id = c.id

    LEFT JOIN sections sec
      ON s.section_id = sec.id

    LEFT JOIN academic_sessions a
      ON s.academic_session_id = a.id

    WHERE s.id = $1;
  `;

  const result = await pool.query(query, [id]);

  return result.rows[0] || null;
};

const updateStudent = async (id, data) => {
  const query = `
    UPDATE students
    SET
      student_name = $1,
      family_id = $2,
      mother_name = $3,
      date_of_birth = $4,
      gender = $5,
      class_id = $6,
      section_id = $7,
      roll_number = $8,
      admission_date = $9,
      contact = $10,
      address = $11,
      academic_session_id = $12,
      status = $13,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = $14
    RETURNING *;
  `;

  const values = [
    data.student_name,
    data.family_id,
    data.mother_name || null,
    data.date_of_birth || null,
    data.gender || null,
    data.class_id || null,
    data.section_id || null,
    data.roll_number || null,
    data.admission_date || null,
    data.contact || null,
    data.address || null,
    data.academic_session_id || null,
    data.status || "Active",
    id,
  ];

  const result = await pool.query(query, values);

  return result.rows[0] || null;
};

const deleteStudent = async (id) => {
  const result = await pool.query(
    `
    DELETE FROM students
    WHERE id = $1
    RETURNING *;
    `,
    [id],
  );

  return result.rows[0] || null;
};

module.exports = {
  createStudent,
  getAllStudents,
  getStudentById,
  updateStudent,
  deleteStudent,
};
