const { pool } = require("../config/db");

const createFamily = async (data) => {
  const query = `
    INSERT INTO families (
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
      is_active
    )
    VALUES (
      $1, $2, $3, $4, $5, $6, $7,
      $8, $9, $10, $11, $12, $13, $14
    )
    RETURNING *;
  `;

  const values = [
    data.father_parent_name,
    data.mother_name || null,
    data.cnic || null,
    data.father_contact,
    data.mother_contact || null,
    data.whatsapp_number || null,
    data.email || null,
    data.address || null,
    data.emergency_contact || null,
    data.notes || null,
    data.admission_date || null,
    data.family_concession ?? 0,
    data.scholarship_info || null,
    data.is_active ?? true,
  ];

  const result = await pool.query(query, values);

  return result.rows[0];
};

const getAllFamilies = async (search = "", page = 1, limit = 10) => {
  const offset = (page - 1) * limit;
  const searchValue = `%${search}%`;

  const countQuery = `
    SELECT COUNT(*) AS total
    FROM families
    WHERE father_parent_name ILIKE $1
       OR mother_name ILIKE $1
       OR cnic ILIKE $1
       OR father_contact ILIKE $1
       OR mother_contact ILIKE $1
       OR whatsapp_number ILIKE $1
       OR email ILIKE $1
       OR CAST(id AS TEXT) ILIKE $1;
  `;

  const dataQuery = `
    SELECT *
    FROM families
    WHERE father_parent_name ILIKE $1
       OR mother_name ILIKE $1
       OR cnic ILIKE $1
       OR father_contact ILIKE $1
       OR mother_contact ILIKE $1
       OR whatsapp_number ILIKE $1
       OR email ILIKE $1
       OR CAST(id AS TEXT) ILIKE $1
    ORDER BY id DESC
    LIMIT $2
    OFFSET $3;
  `;

  const [countResult, dataResult] = await Promise.all([
    pool.query(countQuery, [searchValue]),
    pool.query(dataQuery, [searchValue, limit, offset]),
  ]);

  return {
    data: dataResult.rows,
    total: Number(countResult.rows[0].total),
  };
};

const getFamilyById = async (id) => {
  const query = `
    SELECT *
    FROM families
    WHERE id = $1;
  `;

  const result = await pool.query(query, [id]);

  return result.rows[0] || null;
};

const updateFamily = async (id, data) => {
  const query = `
    UPDATE families
    SET
      father_parent_name = $1,
      mother_name = $2,
      cnic = $3,
      father_contact = $4,
      mother_contact = $5,
      whatsapp_number = $6,
      email = $7,
      address = $8,
      emergency_contact = $9,
      notes = $10,
      admission_date = $11,
      family_concession = $12,
      scholarship_info = $13,
      is_active = $14,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = $15
    RETURNING *;
  `;

  const values = [
    data.father_parent_name,
    data.mother_name || null,
    data.cnic || null,
    data.father_contact,
    data.mother_contact || null,
    data.whatsapp_number || null,
    data.email || null,
    data.address || null,
    data.emergency_contact || null,
    data.notes || null,
    data.admission_date || null,
    data.family_concession ?? 0,
    data.scholarship_info || null,
    data.is_active ?? true,
    id,
  ];

  const result = await pool.query(query, values);

  return result.rows[0] || null;
};

const deleteFamily = async (id) => {
  const query = `
    UPDATE families
    SET
      is_active = false,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = $1
    RETURNING *;
  `;

  const result = await pool.query(query, [id]);

  return result.rows[0] || null;
};

module.exports = {
  createFamily,
  getAllFamilies,
  getFamilyById,
  updateFamily,
  deleteFamily,
};
