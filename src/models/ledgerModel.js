const { pool } = require("../config/db");

const getLedgerSummaryAndTransactions = async ({
  start_date,
  end_date,
  search = "",
  page = 1,
  limit = 20,
}) => {
  const offset = (page - 1) * limit;

  // 1. Calculate Base Opening Balance across all accounts
  const openBalRes = await pool.query(
    `SELECT COALESCE(SUM(opening_balance), 0) AS initial_opening FROM accounts WHERE is_active = TRUE;`,
  );
  let baseOpening = parseFloat(openBalRes.rows[0].initial_opening);

  // If a date filter is applied, add net cash flow prior to start_date to opening balance
  if (start_date) {
    const priorTxnsRes = await pool.query(
      `SELECT 
        COALESCE(SUM(CASE WHEN type = 'INFLOW' THEN amount ELSE 0 END), 0) AS prior_inflows,
        COALESCE(SUM(CASE WHEN type = 'OUTFLOW' THEN amount ELSE 0 END), 0) AS prior_outflows
       FROM account_transactions
       WHERE transaction_date < $1;`,
      [start_date],
    );
    const priorInflows = parseFloat(priorTxnsRes.rows[0].prior_inflows);
    const priorOutflows = parseFloat(priorTxnsRes.rows[0].prior_outflows);
    baseOpening += priorInflows - priorOutflows;
  }

  // 2. Aggregate Inflows & Outflows for the current filtered window
  const sumValues = [];
  let sumQuery = `
    SELECT 
      COALESCE(SUM(CASE WHEN type = 'INFLOW' THEN amount ELSE 0 END), 0) AS total_income,
      COALESCE(SUM(CASE WHEN type = 'OUTFLOW' THEN amount ELSE 0 END), 0) AS total_expense
    FROM account_transactions
    WHERE 1=1
  `;

  if (start_date) {
    sumValues.push(start_date);
    sumQuery += ` AND transaction_date >= $${sumValues.length}`;
  }
  if (end_date) {
    sumValues.push(end_date);
    sumQuery += ` AND transaction_date <= $${sumValues.length}`;
  }

  const sumRes = await pool.query(sumQuery, sumValues);
  const totalIncome = parseFloat(sumRes.rows[0].total_income);
  const totalExpense = parseFloat(sumRes.rows[0].total_expense);
  const closingBalance = baseOpening + totalIncome - totalExpense;

  // 3. Paginated Transactions Query
  const txnValues = [];
  let countQuery = `
    SELECT COUNT(*) 
    FROM account_transactions t
    JOIN accounts a ON t.account_id = a.id
    WHERE 1=1
  `;

  let dataQuery = `
    SELECT 
      t.id,
      t.transaction_date AS date,
      t.description,
      t.category,
      t.type,
      t.amount,
      t.reference_id,
      a.name AS account_name,
      u.name AS created_by_name
    FROM account_transactions t
    JOIN accounts a ON t.account_id = a.id
    LEFT JOIN users u ON t.created_by = u.id
    WHERE 1=1
  `;

  if (start_date) {
    txnValues.push(start_date);
    const cond = ` AND t.transaction_date >= $${txnValues.length}`;
    countQuery += cond;
    dataQuery += cond;
  }
  if (end_date) {
    txnValues.push(end_date);
    const cond = ` AND t.transaction_date <= $${txnValues.length}`;
    countQuery += cond;
    dataQuery += cond;
  }
  if (search && search.trim()) {
    txnValues.push(`%${search.trim()}%`);
    const cond = ` AND (t.description ILIKE $${txnValues.length} OR t.category ILIKE $${txnValues.length} OR CAST(t.reference_id AS TEXT) ILIKE $${txnValues.length} OR a.name ILIKE $${txnValues.length})`;
    countQuery += cond;
    dataQuery += cond;
  }

  const countRes = await pool.query(countQuery, txnValues);
  const totalCount = parseInt(countRes.rows[0].count, 10);

  dataQuery += ` ORDER BY t.transaction_date DESC, t.id DESC`;
  txnValues.push(limit, offset);
  dataQuery += ` LIMIT $${txnValues.length - 1} OFFSET $${txnValues.length};`;

  const dataRes = await pool.query(dataQuery, txnValues);

  return {
    summary: {
      opening_balance: baseOpening,
      total_income: totalIncome,
      total_expense: totalExpense,
      closing_balance: closingBalance,
    },
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total: totalCount,
      totalPages: Math.ceil(totalCount / limit) || 1,
    },
    transactions: dataRes.rows,
  };
};

module.exports = {
  getLedgerSummaryAndTransactions,
};
