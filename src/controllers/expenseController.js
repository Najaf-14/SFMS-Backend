const {
  createExpense,
  getPaginatedExpenses,
  updateExpense,
  deleteExpense,
} = require("../models/expenseModel");

const addExpense = async (req, res) => {
  try {
    const {
      title,
      category,
      amount,
      payment_method,
      paid_to,
      reference_no,
      expense_date,
      remarks,
      account_id,
    } = req.body;

    if (!title || !category || !amount || parseFloat(amount) <= 0) {
      return res.status(400).json({
        error: "Title, category, and an amount greater than 0 are required.",
      });
    }

    const expense = await createExpense({
      title,
      category,
      amount,
      payment_method,
      paid_to,
      reference_no,
      expense_date,
      remarks,
      account_id: account_id ? Number(account_id) : undefined,
      user_id: req.user.id,
    });

    return res.status(201).json({
      success: true,
      message: "Expense recorded successfully.",
      data: expense,
    });
  } catch (error) {
    console.error("ADD EXPENSE ERROR:", error);
    return res.status(500).json({ error: error.message });
  }
};

const fetchExpenses = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      category,
      start_date,
      end_date,
      search = "",
    } = req.query;

    const result = await getPaginatedExpenses({
      page: parseInt(page, 10) || 1,
      limit: parseInt(limit, 10) || 10,
      category,
      start_date,
      end_date,
      search,
    });

    return res.json({ success: true, ...result });
  } catch (error) {
    console.error("FETCH EXPENSES ERROR:", error);
    return res.status(500).json({ error: error.message });
  }
};

const modifyExpense = async (req, res) => {
  try {
    const { id } = req.params;
    const updated = await updateExpense(id, {
      ...req.body,
      user_id: req.user.id,
    });
    return res.json({
      success: true,
      message: "Expense updated successfully.",
      data: updated,
    });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
};

const removeExpense = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await deleteExpense(id);
    return res.json({
      success: true,
      message: `Expense ${deleted.expense_no} deleted and ledger reversed successfully.`,
    });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
};

module.exports = {
  addExpense,
  fetchExpenses,
  modifyExpense,
  removeExpense,
};
