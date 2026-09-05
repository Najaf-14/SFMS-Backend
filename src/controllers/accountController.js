const {
  createAccount,
  getAccountsWithBalances,
  getAccountTransactions,
} = require("../models/accountModel");

const addAccount = async (req, res) => {
  try {
    const { name, type, account_number, opening_balance } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: "Account name is required." });
    }

    const account = await createAccount({
      name,
      type: type || "Cash",
      account_number,
      opening_balance,
    });

    return res.status(201).json({
      success: true,
      message: "Account created successfully.",
      data: account,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

const fetchAccounts = async (req, res) => {
  try {
    const accounts = await getAccountsWithBalances();
    return res.json({ success: true, data: accounts });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

const fetchAccountTransactions = async (req, res) => {
  try {
    const { id } = req.params;
    const transactions = await getAccountTransactions(id);
    return res.json({ success: true, data: transactions });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

module.exports = {
  addAccount,
  fetchAccounts,
  fetchAccountTransactions,
};
