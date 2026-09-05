const { pool } = require("../config/db");

const createAccount = async ({
  name,
  type,
  account_number,
  opening_balance,
}) => {
  const query = `
    INSERT INTO accounts (name, type, account_number, opening_balance)
    VALUES ($1, $2, $3, $4)
    RETURNING *;
  `;
  const values = [
    name.trim(),
    type,
    type === "Cash" ? null : account_number?.trim() || null,
    parseFloat(opening_balance) || 0.0,
  ];
  const res = await pool.query(query, values);
  return res.rows[0];
};

const getAccountsWithBalances = async () => {
  const query = `
    SELECT 
      a.id,
      a.name,
      a.type,
      a.account_number,
      a.opening_balance,
      a.is_active,
      COALESCE(SUM(CASE WHEN t.type = 'INFLOW' THEN t.amount ELSE 0 END), 0) AS total_inflow,
      COALESCE(SUM(CASE WHEN t.type = 'OUTFLOW' THEN t.amount ELSE 0 END), 0) AS total_outflow,
      (a.opening_balance 
        + COALESCE(SUM(CASE WHEN t.type = 'INFLOW' THEN t.amount ELSE 0 END), 0) 
        - COALESCE(SUM(CASE WHEN t.type = 'OUTFLOW' THEN t.amount ELSE 0 END), 0)
      ) AS closing_balance
    FROM accounts a
    LEFT JOIN account_transactions t ON a.id = t.account_id
    WHERE a.is_active = TRUE
    GROUP BY a.id
    ORDER BY a.id ASC;
  `;
  const res = await pool.query(query);
  return res.rows;
};

const getAccountTransactions = async (accountId, limit = 50) => {
  const query = `
    SELECT 
      t.*,
      u.name AS created_by_name
    FROM account_transactions t
    LEFT JOIN users u ON t.created_by = u.id
    WHERE t.account_id = $1
    ORDER BY t.transaction_date DESC, t.id DESC
    LIMIT $2;
  `;
  const res = await pool.query(query, [accountId, limit]);
  return res.rows;
};

module.exports = {
  createAccount,
  getAccountsWithBalances,
  getAccountTransactions,
};
