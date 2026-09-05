const { getLedgerSummaryAndTransactions } = require("../models/ledgerModel");

const fetchLedger = async (req, res) => {
  try {
    const {
      start_date,
      end_date,
      search = "",
      page = 1,
      limit = 20,
    } = req.query;

    const result = await getLedgerSummaryAndTransactions({
      start_date,
      end_date,
      search,
      page: parseInt(page, 10) || 1,
      limit: parseInt(limit, 10) || 20,
    });

    return res.json({ success: true, ...result });
  } catch (error) {
    console.error("FETCH LEDGER ERROR:", error);
    return res.status(500).json({ error: error.message });
  }
};

module.exports = {
  fetchLedger,
};
