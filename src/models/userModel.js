const { pool } = require("../config/db");

const createUser = async (name, email, passwordHash, roleId) => {
  const query = `
    INSERT INTO users (name, email, password_hash, role_id)
    VALUES ($1, $2, $3, $4)
    RETURNING id, name, email, role_id, is_active, created_at;
  `;
  const values = [name, email, passwordHash, roleId];
  const result = await pool.query(query, values);
  return result.rows[0];
};

const findUserByEmail = async (email) => {
  const query = `
    SELECT u.*, r.name AS role_name
    FROM users u
    JOIN roles r ON u.role_id = r.id
    WHERE u.email = $1;
  `;
  const result = await pool.query(query, [email]);
  return result.rows[0];
};

const findUserById = async (id) => {
  const query = `
    SELECT u.id, u.name, u.email, u.is_active, u.created_at, r.name AS role_name
    FROM users u
    JOIN roles r ON u.role_id = r.id
    WHERE u.id = $1;
  `;
  const result = await pool.query(query, [id]);
  return result.rows[0];
};

const getAllUsers = async (search = "", page = 1, limit = 10) => {
  const offset = (page - 1) * limit;
  const searchValue = `%${search}%`;

  const countQuery = `
    SELECT COUNT(*) AS total
    FROM users u
    WHERE
      u.name ILIKE $1
      OR u.email ILIKE $1;
  `;

  const dataQuery = `
    SELECT
      u.id,
      u.name,
      u.email,
      u.role_id,
      r.name AS role_name,
      u.is_active,
      u.last_login_at,
      u.created_at,
      u.updated_at
    FROM users u
    JOIN roles r ON u.role_id = r.id
    WHERE
      u.name ILIKE $1
      OR u.email ILIKE $1
    ORDER BY u.id DESC
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

const updateUser = async (id, data) => {
  const allowedFields = ["name", "email", "is_active"];

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
    UPDATE users
    SET ${fields.join(", ")}
    WHERE id = $${values.length}
    RETURNING id, name, email, role_id, is_active, created_at;
  `;

  const result = await pool.query(query, values);

  return result.rows[0] || null;
};

module.exports = {
  createUser,
  findUserByEmail,
  findUserById,
  getAllUsers,
  updateUser,
};
