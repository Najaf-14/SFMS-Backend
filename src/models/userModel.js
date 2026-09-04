const { pool } = require("../config/db");

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

module.exports = {
  findUserByEmail,
};
