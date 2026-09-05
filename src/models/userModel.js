const { pool } = require("../config/db");
const bcrypt = require("bcryptjs");

const findUserByEmail = async (email) => {
  const query = `
    SELECT u.*, r.name AS role_name
    FROM users u
    JOIN roles r ON u.role_id = r.id
    WHERE u.email = $1;
  `;

  const result = await pool.query(query, [email]);
  return result.rows[0] || null;
};

const findUserById = async (id) => {
  const query = `
    SELECT u.id, u.name, u.email, u.role_id, u.is_active, u.created_at, u.updated_at, r.name AS role_name
    FROM users u
    JOIN roles r ON u.role_id = r.id
    WHERE u.id = $1;
  `;
  const result = await pool.query(query, [id]);
  return result.rows[0] || null;
};

const getAllUsers = async (search = "", page = 1, limit = 10) => {
  const offset = (page - 1) * limit;
  const values = [];

  let countQuery = `
    SELECT COUNT(*) 
    FROM users u 
    JOIN roles r ON u.role_id = r.id 
    WHERE 1=1
  `;
  let dataQuery = `
    SELECT u.id, u.name, u.email, u.role_id, u.is_active, u.created_at, u.updated_at, r.name AS role_name
    FROM users u
    JOIN roles r ON u.role_id = r.id
    WHERE 1=1
  `;

  if (search && search.trim()) {
    values.push(`%${search.trim()}%`);
    const cond = ` AND (u.name ILIKE $${values.length} OR u.email ILIKE $${values.length} OR r.name ILIKE $${values.length})`;
    countQuery += cond;
    dataQuery += cond;
  }

  const countRes = await pool.query(countQuery, values);
  const total = parseInt(countRes.rows[0].count, 10);

  dataQuery += ` ORDER BY u.id ASC`;
  values.push(limit, offset);
  dataQuery += ` LIMIT $${values.length - 1} OFFSET $${values.length};`;

  const dataRes = await pool.query(dataQuery, values);

  return {
    total,
    data: dataRes.rows,
  };
};

const createUser = async ({ name, email, password, role_id }) => {
  const hashedPassword = await bcrypt.hash(password || "Password123!", 10);
  const query = `
    INSERT INTO users (name, email, password_hash, role_id)
    VALUES ($1, $2, $3, $4)
    RETURNING id, name, email, role_id, is_active, created_at;
  `;
  const res = await pool.query(query, [
    name.trim(),
    email.trim().toLowerCase(),
    hashedPassword,
    role_id,
  ]);
  return res.rows[0];
};

const updateUser = async (id, fields) => {
  const allowed = ["name", "email", "role_id", "is_active", "password"];
  const updates = [];
  const values = [];

  for (const key of Object.keys(fields)) {
    if (allowed.includes(key) && fields[key] !== undefined) {
      if (key === "password") {
        const hashedPassword = await bcrypt.hash(fields[key], 10);
        values.push(hashedPassword);
        updates.push(`password_hash = $${values.length}`);
      } else {
        values.push(fields[key]);
        updates.push(`${key} = $${values.length}`);
      }
    }
  }

  if (updates.length === 0) return null;

  values.push(id);
  const query = `
    UPDATE users 
    SET ${updates.join(", ")}, updated_at = CURRENT_TIMESTAMP 
    WHERE id = $${values.length}
    RETURNING id, name, email, role_id, is_active, updated_at;
  `;

  const result = await pool.query(query, values);
  return result.rows[0] || null;
};

const deleteUser = async (id) => {
  const result = await pool.query(
    `DELETE FROM users WHERE id = $1 RETURNING id, name, email;`,
    [id],
  );
  return result.rows[0] || null;
};

const getAllRoles = async () => {
  const result = await pool.query(
    `SELECT id, name FROM roles ORDER BY id ASC;`,
  );
  return result.rows;
};

module.exports = {
  findUserByEmail,
  findUserById,
  getAllUsers,
  createUser,
  updateUser,
  deleteUser,
  getAllRoles,
};
