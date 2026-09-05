const { pool } = require("../config/db");

// 1. Get Live Summary Dashboard Stats
const getReportSummaryStats = async (req, res) => {
  try {
    const currentMonth = new Date().toISOString().slice(0, 7); // e.g. '2026-09'

    // Total Revenue (Current Month Payments)
    const revRes = await pool.query(
      `SELECT COALESCE(SUM(amount_paid), 0) AS total_revenue
       FROM payments
       WHERE TO_CHAR(payment_date, 'YYYY-MM') = $1;`,
      [currentMonth],
    );

    // Pending Dues across unpaid / overdue invoices
    const duesRes = await pool.query(
      `SELECT 
        COALESCE(SUM(total_payable - paid_amount), 0) AS pending_dues,
        COUNT(DISTINCT family_id) AS defaulter_families_count
       FROM invoices
       WHERE status IN ('Unpaid', 'Partially Paid', 'Overdue');`,
    );

    // Active Students Count & Classes Count
    const stuRes = await pool.query(
      `SELECT 
        COUNT(*) FILTER (WHERE status = 'Active') AS active_students,
        COUNT(DISTINCT class_id) AS active_classes
       FROM students;`,
    );

    return res.json({
      success: true,
      data: {
        totalRevenueMonth: parseFloat(revRes.rows[0].total_revenue),
        pendingDues: parseFloat(duesRes.rows[0].pending_dues),
        defaulterFamiliesCount: parseInt(
          duesRes.rows[0].defaulter_families_count,
          10,
        ),
        activeStudents: parseInt(stuRes.rows[0].active_students, 10),
        activeClasses: parseInt(stuRes.rows[0].active_classes, 10),
      },
    });
  } catch (error) {
    console.error("REPORT STATS ERROR:", error);
    return res.status(500).json({ error: error.message });
  }
};

// Helper: Convert array of objects to CSV string
function jsonToCsv(headers, rows) {
  const headerLine = headers.map((h) => `"${h.label}"`).join(",");
  const dataLines = rows.map((row) =>
    headers
      .map((h) => {
        let val = row[h.key];
        if (val === null || val === undefined) val = "";
        const stringVal = String(val).replace(/"/g, '""');
        return `"${stringVal}"`;
      })
      .join(","),
  );
  return [headerLine, ...dataLines].join("\n");
}

// 2. Export Fee Collections CSV
const exportFeeCollections = async (req, res) => {
  try {
    const { month } = req.query; // format 'YYYY-MM' (optional)
    const values = [];
    let query = `
      SELECT 
        p.receipt_no,
        i.challan_no,
        f.father_parent_name AS family_name,
        p.amount_paid,
        p.payment_method,
        TO_CHAR(p.payment_date, 'YYYY-MM-DD') AS payment_date,
        u.name AS collected_by
      FROM payments p
      JOIN invoices i ON p.invoice_id = i.id
      JOIN families f ON p.family_id = f.id
      LEFT JOIN users u ON p.received_by = u.id
      WHERE 1=1
    `;

    if (month) {
      values.push(month);
      query += ` AND (TO_CHAR(p.payment_date, 'YYYY-MM') = $1 OR i.billing_month = $1)`;
    }

    query += ` ORDER BY p.payment_date DESC, p.id DESC;`;

    const result = await pool.query(query, values);

    const headers = [
      { key: "receipt_no", label: "Receipt No" },
      { key: "challan_no", label: "Challan No" },
      { key: "family_name", label: "Family / Payer" },
      { key: "amount_paid", label: "Amount Paid (PKR)" },
      { key: "payment_method", label: "Payment Method" },
      { key: "payment_date", label: "Payment Date" },
      { key: "collected_by", label: "Collected By" },
    ];

    const csvData = jsonToCsv(headers, result.rows);

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="fee_collection_${month || "all"}.csv"`,
    );
    return res.status(200).send(csvData);
  } catch (error) {
    console.error("EXPORT COLLECTIONS ERROR:", error);
    return res.status(500).json({ error: error.message });
  }
};

// 3. Export Defaulters / Pending Dues CSV
const exportDefaulters = async (req, res) => {
  try {
    const { status } = req.query; // 'unpaid', 'overdue', or 'all'
    const values = [];
    let query = `
      SELECT 
        f.id AS family_id,
        f.father_parent_name AS family_name,
        f.father_contact AS phone,
        i.challan_no,
        i.billing_month,
        i.total_payable,
        i.paid_amount,
        (i.total_payable - i.paid_amount) AS pending_balance,
        TO_CHAR(i.due_date, 'YYYY-MM-DD') AS due_date,
        i.status
      FROM invoices i
      JOIN families f ON i.family_id = f.id
      WHERE i.status IN ('Unpaid', 'Partially Paid', 'Overdue')
    `;

    if (status === "overdue") {
      query += ` AND (i.status = 'Overdue' OR i.due_date < CURRENT_DATE)`;
    } else if (status === "unpaid") {
      query += ` AND i.status = 'Unpaid'`;
    }

    query += ` ORDER BY pending_balance DESC, i.id DESC;`;

    const result = await pool.query(query, values);

    const headers = [
      { key: "family_id", label: "Family ID" },
      { key: "family_name", label: "Family Name" },
      { key: "phone", label: "Phone Number" },
      { key: "challan_no", label: "Challan No" },
      { key: "billing_month", label: "Billing Month" },
      { key: "total_payable", label: "Total Payable" },
      { key: "paid_amount", label: "Paid Amount" },
      { key: "pending_balance", label: "Pending Due (PKR)" },
      { key: "due_date", label: "Due Date" },
      { key: "status", label: "Status" },
    ];

    const csvData = jsonToCsv(headers, result.rows);

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="defaulters_report.csv"`,
    );
    return res.status(200).send(csvData);
  } catch (error) {
    console.error("EXPORT DEFAULTERS ERROR:", error);
    return res.status(500).json({ error: error.message });
  }
};

// 4. Export Concessions & Scholarships CSV
const exportConcessions = async (req, res) => {
  try {
    const query = `
      SELECT 
        c.concession_no,
        c.record_type,
        c.applies_to,
        f.father_parent_name AS family_name,
        s.student_name,
        s.admission_number,
        c.scholarship_name,
        c.discount_type,
        c.value AS discount_value,
        c.reason,
        c.status,
        c.approval,
        TO_CHAR(c.start_date, 'YYYY-MM-DD') AS start_date,
        TO_CHAR(c.end_date, 'YYYY-MM-DD') AS end_date
      FROM concessions c
      LEFT JOIN families f ON c.family_id = f.id
      LEFT JOIN students s ON c.student_id = s.id
      ORDER BY c.id DESC;
    `;

    const result = await pool.query(query);

    const headers = [
      { key: "concession_no", label: "ID" },
      { key: "record_type", label: "Type" },
      { key: "applies_to", label: "Scope" },
      { key: "family_name", label: "Family Name" },
      { key: "student_name", label: "Student Name" },
      { key: "admission_number", label: "Admission No" },
      { key: "scholarship_name", label: "Scholarship Name" },
      { key: "discount_type", label: "Calculation" },
      { key: "discount_value", label: "Value" },
      { key: "reason", label: "Reason / Category" },
      { key: "status", label: "Status" },
      { key: "approval", label: "Approval" },
      { key: "start_date", label: "Start Date" },
      { key: "end_date", label: "End Date" },
    ];

    const csvData = jsonToCsv(headers, result.rows);

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="concessions_scholarships.csv"`,
    );
    return res.status(200).send(csvData);
  } catch (error) {
    console.error("EXPORT CONCESSIONS ERROR:", error);
    return res.status(500).json({ error: error.message });
  }
};

// 5. Export Profit & Loss (P&L) Statement CSV
const exportProfitAndLoss = async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    const values = [];
    let dateCond = "";

    if (start_date && end_date) {
      values.push(start_date, end_date);
      dateCond = ` AND transaction_date BETWEEN $1 AND $2`;
    } else if (start_date) {
      values.push(start_date);
      dateCond = ` AND transaction_date >= $1`;
    } else if (end_date) {
      values.push(end_date);
      dateCond = ` AND transaction_date <= $1`;
    }

    const query = `
      SELECT 
        category,
        type,
        SUM(amount) AS total_amount
      FROM account_transactions
      WHERE 1=1 ${dateCond}
      GROUP BY category, type
      ORDER BY type DESC, total_amount DESC;
    `;

    const result = await pool.query(query, values);

    let totalInflow = 0;
    let totalOutflow = 0;

    const rows = result.rows.map((r) => {
      const amt = parseFloat(r.total_amount);
      if (r.type === "INFLOW") totalInflow += amt;
      else totalOutflow += amt;

      return {
        category: r.category,
        type: r.type === "INFLOW" ? "Income" : "Expense",
        amount:
          r.type === "INFLOW"
            ? `Rs. ${amt.toLocaleString()}`
            : `-Rs. ${amt.toLocaleString()}`,
      };
    });

    const net = totalInflow - totalOutflow;
    rows.push({
      category: "TOTAL NET PROFIT / LOSS",
      type: net >= 0 ? "Net Profit" : "Net Loss",
      amount: `Rs. ${net.toLocaleString()}`,
    });

    const headers = [
      { key: "category", label: "Category / Description" },
      { key: "type", label: "Financial Flow" },
      { key: "amount", label: "Amount (PKR)" },
    ];

    const csvData = jsonToCsv(headers, rows);

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="pnl_statement_${start_date || "all"}_to_${end_date || "today"}.csv"`,
    );
    return res.status(200).send(csvData);
  } catch (error) {
    console.error("EXPORT PNL ERROR:", error);
    return res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getReportSummaryStats,
  exportFeeCollections,
  exportDefaulters,
  exportConcessions,
  exportProfitAndLoss,
};
