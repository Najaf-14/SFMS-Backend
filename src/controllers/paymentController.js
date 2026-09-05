const {
  recordInvoicePayment,
  getPaginatedPayments,
  getPaymentByReceipt,
  getPaymentsByStudentId,
} = require("../models/paymentModel");

const collectPayment = async (req, res) => {
  try {
    const {
      invoice_id,
      amount_paid,
      payment_method,
      payment_date,
      reference_number,
      notes,
    } = req.body;

    if (!invoice_id || !amount_paid || parseFloat(amount_paid) <= 0) {
      return res.status(400).json({
        error: "Valid invoice_id and amount_paid greater than 0 are required.",
      });
    }

    const result = await recordInvoicePayment({
      invoice_id: Number(invoice_id),
      amount_paid: parseFloat(amount_paid),
      payment_method,
      payment_date,
      reference_number,
      notes,
      user_id: req.user.id,
    });

    return res.status(201).json({
      success: true,
      message: `Payment of Rs. ${amount_paid} recorded successfully.`,
      data: result,
    });
  } catch (error) {
    console.error("COLLECT PAYMENT ERROR:", error);
    return res.status(400).json({ error: error.message });
  }
};

const fetchPayments = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      start_date,
      end_date,
      payment_method,
      search = "",
    } = req.query;

    const result = await getPaginatedPayments({
      page: parseInt(page, 10) || 1,
      limit: parseInt(limit, 10) || 10,
      start_date,
      end_date,
      payment_method,
      search,
    });

    return res.json({ success: true, ...result });
  } catch (error) {
    console.error("FETCH PAYMENTS ERROR:", error);
    return res.status(500).json({ error: error.message });
  }
};

const fetchPaymentByReceipt = async (req, res) => {
  try {
    const payment = await getPaymentByReceipt(req.params.receiptNo);
    if (!payment) {
      return res.status(404).json({ error: "Receipt not found." });
    }
    return res.json({ success: true, data: payment });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

const fetchStudentPayments = async (req, res) => {
  try {
    const payments = await getPaymentsByStudentId(req.params.studentId);
    return res.json({ success: true, data: payments });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

module.exports = {
  collectPayment,
  fetchPayments,
  fetchPaymentByReceipt,
  fetchStudentPayments,
};
