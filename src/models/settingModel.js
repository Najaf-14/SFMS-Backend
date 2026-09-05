const { pool } = require("../config/db");

const getSettings = async () => {
  const res = await pool.query(`SELECT * FROM system_settings WHERE id = 1;`);
  if (res.rows.length === 0) {
    const initRes = await pool.query(
      `INSERT INTO system_settings (id) VALUES (1) RETURNING *;`,
    );
    return initRes.rows[0];
  }
  return res.rows[0];
};

const updateSettings = async (fields) => {
  const allowed = [
    "school_name",
    "phone",
    "email",
    "address",
    "bank_name",
    "account_no",
    "late_fee_per_day",
    "challan_instructions",
  ];

  const updates = [];
  const values = [];

  for (const key of Object.keys(fields)) {
    if (allowed.includes(key) && fields[key] !== undefined) {
      values.push(fields[key]);
      updates.push(`${key} = $${values.length}`);
    }
  }

  if (updates.length === 0) return getSettings();

  const query = `
    UPDATE system_settings
    SET ${updates.join(", ")}, updated_at = CURRENT_TIMESTAMP
    WHERE id = 1
    RETURNING *;
  `;

  const res = await pool.query(query, values);
  return res.rows[0];
};

module.exports = {
  getSettings,
  updateSettings,
};
