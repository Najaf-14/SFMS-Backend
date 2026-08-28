const {
  generateMonthlyInvoices,
  getPaginatedInvoices,
  getInvoiceById,
} = require("../models/feeGenerationModel");

const generateFees = async (req, res) => {
  try {
    const { billing_month, due_date, session_id } = req.body;

    if (!billing_month || !due_date || !session_id) {
      return res.status(400).json({
        error:
          "billing_month (YYYY-MM), due_date (YYYY-MM-DD), and session_id are required.",
      });
    }

    const result = await generateMonthlyInvoices({
      billing_month,
      due_date,
      session_id,
      user_id: req.user.id,
    });

    return res.status(201).json({
      message: `Fee generation complete. ${result.createdCount} invoices created, ${result.skippedCount} skipped (already exists or inactive).`,
      data: result,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

const fetchInvoices = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      billing_month,
      status,
      search = "",
    } = req.query;
    const result = await getPaginatedInvoices({
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      billing_month,
      status,
      search,
    });
    return res.json({ success: true, ...result });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

const fetchInvoiceById = async (req, res) => {
  try {
    const invoice = await getInvoiceById(req.params.id);
    if (!invoice) {
      return res.status(404).json({ error: "Invoice not found." });
    }
    return res.json({ success: true, data: invoice });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

module.exports = {
  generateFees,
  fetchInvoices,
  fetchInvoiceById,
};
