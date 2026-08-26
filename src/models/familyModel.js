const { pool } = require("../config/db");

const createFamily = async (data) => {
  const query = `
    INSERT INTO families (
      family_id_code,
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
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
    RETURNING *;
  `;

  const values = [
    data.family_id_code,
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
    data.admission_date || new Date(),
    data.family_concession || 0.0,
    data.scholarship_info || null,
    data.is_active !== undefined ? data.is_active : true,
  ];

  const result = await pool.query(query, values);
  return result.rows[0];
};

const getAllFamilies = async (search = "") => {
  const query = `
    SELECT * FROM families
    WHERE father_parent_name ILIKE $1 
       OR father_contact ILIKE $1 
       OR family_id_code ILIKE $1
    ORDER BY id DESC;
  `;
  const result = await pool.query(query, [`%${search}%`]);
  return result.rows;
};

const getFamilyById = async (id) => {
  const query = `SELECT * FROM families WHERE id = $1;`;
  const result = await pool.query(query, [id]);
  return result.rows[0] || null;
};

module.exports = {
  createFamily,
  getAllFamilies,
  getFamilyById,
};
