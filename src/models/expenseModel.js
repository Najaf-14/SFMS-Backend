const { pool } = require("../config/db");

const createExpense = async ({
  title,
  category,
  amount,
  payment_method = "Cash",
  paid_to,
  reference_no,
  expense_date = new Date().toISOString().split("T")[0],
  remarks,
  account_id,
  user_id,
}) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const cleanDate = expense_date.replace(/-/g, "").slice(0, 6);
    const countRes = await client.query(`SELECT COUNT(*) FROM expenses;`);
    const nextSeq = String(parseInt(countRes.rows[0].count, 10) + 1).padStart(
      5,
      "0",
    );
    const expenseNo = `EXP-${cleanDate}-${nextSeq}`;

    let targetAccountId = account_id;
    if (!targetAccountId) {
      let accountType = "Cash";
      if (payment_method.includes("Bank")) accountType = "Bank";
      else if (payment_method.includes("JazzCash")) accountType = "JazzCash";
      else if (payment_method.includes("Easypaisa")) accountType = "Easypaisa";

      const accRes = await client.query(
        `SELECT id FROM accounts WHERE type = $1 AND is_active = TRUE ORDER BY id ASC LIMIT 1;`,
        [accountType],
      );
      if (accRes.rows.length > 0) {
        targetAccountId = accRes.rows[0].id;
      } else {
        const fallbackAcc = await client.query(
          `SELECT id FROM accounts WHERE is_active = TRUE ORDER BY id ASC LIMIT 1;`,
        );
        targetAccountId = fallbackAcc.rows[0]?.id;
      }
    }

    const insertExpenseQuery = `
      INSERT INTO expenses (
        expense_no, title, category, amount, payment_method,
        paid_to, reference_no, expense_date, remarks, account_id, recorded_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *;
    `;
    const expenseRes = await client.query(insertExpenseQuery, [
      expenseNo,
      title.trim(),
      category,
      parseFloat(amount),
      payment_method,
      paid_to ? paid_to.trim() : null,
      reference_no ? reference_no.trim() : null,
      expense_date,
      remarks ? remarks.trim() : null,
      targetAccountId,
      user_id,
    ]);

    if (targetAccountId) {
      await client.query(
        `INSERT INTO account_transactions (
          account_id, amount, type, category, reference_id, description, transaction_date, created_by
        ) VALUES ($1, $2, 'OUTFLOW', $3, $4, $5, $6, $7);`,
        [
          targetAccountId,
          parseFloat(amount),
          category || "EXPENSE",
          expenseNo,
          title.trim(),
          expense_date,
          user_id,
        ],
      );
    }

    await client.query("COMMIT");
    return expenseRes.rows[0];
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

const getPaginatedExpenses = async ({
  page = 1,
  limit = 10,
  category,
  start_date,
  end_date,
  search = "",
}) => {
  const offset = (page - 1) * limit;
  const values = [];

  let countQuery = `SELECT COUNT(*) FROM expenses e WHERE 1=1`;
  let dataQuery = `
    SELECT 
      e.*,
      a.name AS account_name,
      u.name AS recorded_by_name
    FROM expenses e
    LEFT JOIN accounts a ON e.account_id = a.id
    LEFT JOIN users u ON e.recorded_by = u.id
    WHERE 1=1
  `;

  if (category && category !== "all") {
    values.push(category);
    const cond = ` AND e.category = $${values.length}`;
    countQuery += cond;
    dataQuery += cond;
  }

  if (start_date) {
    values.push(start_date);
    const cond = ` AND e.expense_date >= $${values.length}`;
    countQuery += cond;
    dataQuery += cond;
  }

  if (end_date) {
    values.push(end_date);
    const cond = ` AND e.expense_date <= $${values.length}`;
    countQuery += cond;
    dataQuery += cond;
  }

  if (search && search.trim()) {
    values.push(`%${search.trim()}%`);
    const cond = ` AND (e.title ILIKE $${values.length} OR e.expense_no ILIKE $${values.length} OR e.paid_to ILIKE $${values.length} OR e.category ILIKE $${values.length})`;
    countQuery += cond;
    dataQuery += cond;
  }

  const countRes = await pool.query(countQuery, values);
  const totalCount = parseInt(countRes.rows[0].count, 10);

  const sumRes = await pool.query(
    `SELECT COALESCE(SUM(amount), 0) AS total_sum FROM expenses;`,
  );
  const totalExpensesSum = parseFloat(sumRes.rows[0].total_sum);

  dataQuery += ` ORDER BY e.expense_date DESC, e.id DESC`;
  values.push(limit, offset);
  dataQuery += ` LIMIT $${values.length - 1} OFFSET $${values.length};`;

  const dataRes = await pool.query(dataQuery, values);

  return {
    totalCount,
    totalExpensesSum,
    totalPages: Math.ceil(totalCount / limit) || 1,
    currentPage: Number(page),
    limit: Number(limit),
    data: dataRes.rows,
  };
};

const updateExpense = async (
  id,
  {
    title,
    category,
    amount,
    payment_method,
    paid_to,
    reference_no,
    expense_date,
    remarks,
    account_id,
    user_id,
  },
) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const existingRes = await client.query(
      `SELECT * FROM expenses WHERE id = $1 FOR UPDATE;`,
      [id],
    );
    if (existingRes.rows.length === 0) {
      throw new Error("Expense not found.");
    }
    const oldExpense = existingRes.rows[0];

    let targetAccountId = account_id || oldExpense.account_id;
    if (!targetAccountId && payment_method) {
      let accountType = "Cash";
      if (payment_method.includes("Bank")) accountType = "Bank";
      else if (payment_method.includes("JazzCash")) accountType = "JazzCash";
      else if (payment_method.includes("Easypaisa")) accountType = "Easypaisa";

      const accRes = await client.query(
        `SELECT id FROM accounts WHERE type = $1 AND is_active = TRUE ORDER BY id ASC LIMIT 1;`,
        [accountType],
      );
      if (accRes.rows.length > 0) targetAccountId = accRes.rows[0].id;
    }

    const newAmount =
      amount !== undefined ? parseFloat(amount) : parseFloat(oldExpense.amount);
    const newTitle = title !== undefined ? title.trim() : oldExpense.title;
    const newCategory = category !== undefined ? category : oldExpense.category;
    const newDate =
      expense_date !== undefined ? expense_date : oldExpense.expense_date;

    const updateQuery = `
      UPDATE expenses
      SET 
        title = $1,
        category = $2,
        amount = $3,
        payment_method = $4,
        paid_to = $5,
        reference_no = $6,
        expense_date = $7,
        remarks = $8,
        account_id = $9,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $10
      RETURNING *;
    `;
    const res = await client.query(updateQuery, [
      newTitle,
      newCategory,
      newAmount,
      payment_method || oldExpense.payment_method,
      paid_to !== undefined ? paid_to : oldExpense.paid_to,
      reference_no !== undefined ? reference_no : oldExpense.reference_no,
      newDate,
      remarks !== undefined ? remarks : oldExpense.remarks,
      targetAccountId,
      id,
    ]);

    await client.query(
      `UPDATE account_transactions
       SET 
         account_id = $1,
         amount = $2,
         category = $3,
         description = $4,
         transaction_date = $5
       WHERE reference_id = $6 AND type = 'OUTFLOW';`,
      [
        targetAccountId,
        newAmount,
        newCategory,
        newTitle,
        newDate,
        oldExpense.expense_no,
      ],
    );

    await client.query("COMMIT");
    return res.rows[0];
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

const deleteExpense = async (id) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const expRes = await client.query(
      `SELECT * FROM expenses WHERE id = $1 FOR UPDATE;`,
      [id],
    );
    if (expRes.rows.length === 0) {
      throw new Error("Expense not found.");
    }
    const expense = expRes.rows[0];

    await client.query(
      `DELETE FROM account_transactions WHERE reference_id = $1 AND type = 'OUTFLOW';`,
      [expense.expense_no],
    );

    await client.query(`DELETE FROM expenses WHERE id = $1;`, [id]);

    await client.query("COMMIT");
    return expense;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

module.exports = {
  createExpense,
  getPaginatedExpenses,
  updateExpense,
  deleteExpense,
};
