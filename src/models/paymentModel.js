const { pool } = require("../config/db");

const recordInvoicePayment = async ({
  invoice_id,
  amount_paid,
  payment_method = "Cash",
  payment_date = new Date().toISOString().split("T")[0],
  reference_number = null,
  notes = null,
  user_id,
}) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // 1. Fetch Invoice
    const invoiceRes = await client.query(
      `SELECT id, challan_no, family_id, total_payable, paid_amount, status 
       FROM invoices 
       WHERE id = $1 FOR UPDATE;`,
      [invoice_id],
    );

    if (invoiceRes.rows.length === 0) {
      throw new Error("Invoice not found.");
    }

    const invoice = invoiceRes.rows[0];
    if (
      invoice.status === "Paid" ||
      invoice.status === "Cancelled" ||
      invoice.status === "Waived"
    ) {
      throw new Error(
        `Cannot collect payment for an invoice with status '${invoice.status}'.`,
      );
    }

    const totalPayable = parseFloat(invoice.total_payable);
    const existingPaid = parseFloat(invoice.paid_amount || 0);
    const currentPayment = parseFloat(amount_paid);
    const remainingBalance = totalPayable - existingPaid;

    if (currentPayment > remainingBalance) {
      throw new Error(
        `Payment amount (Rs. ${currentPayment}) exceeds remaining balance (Rs. ${remainingBalance}).`,
      );
    }

    const newPaidAmount = existingPaid + currentPayment;
    let nextStatus = "Partially Paid";
    if (newPaidAmount >= totalPayable) {
      nextStatus = "Paid";
    }

    // 2. Generate Receipt Number
    const cleanDate = payment_date.replace(/-/g, "").slice(0, 6);
    const countRes = await client.query(`SELECT COUNT(*) FROM payments;`);
    const nextSeq = String(parseInt(countRes.rows[0].count, 10) + 1).padStart(
      5,
      "0",
    );
    const receiptNo = `REC-${cleanDate}-${nextSeq}`;

    // 3. Insert Payment
    const paymentInsertQuery = `
      INSERT INTO payments (
        receipt_no, invoice_id, family_id, amount_paid,
        payment_method, payment_date, reference_number, notes, received_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING 
        id, receipt_no, invoice_id, family_id, amount_paid,
        payment_method, TO_CHAR(payment_date, 'YYYY-MM-DD') AS payment_date,
        reference_number, notes, received_by, created_at;
    `;
    const paymentRes = await client.query(paymentInsertQuery, [
      receiptNo,
      invoice.id,
      invoice.family_id,
      currentPayment,
      payment_method,
      payment_date,
      reference_number,
      notes,
      user_id,
    ]);

    // 4. Update Invoice Balance & Status
    await client.query(
      `UPDATE invoices 
       SET paid_amount = $1, status = $2, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $3;`,
      [newPaidAmount, nextStatus, invoice.id],
    );

    // 5. Match Account and Record Ledger Inflow
    let accountType = "Cash";
    if (payment_method.includes("Bank")) accountType = "Bank";
    else if (payment_method.includes("JazzCash")) accountType = "JazzCash";
    else if (payment_method.includes("Easypaisa")) accountType = "Easypaisa";

    const accountRes = await client.query(
      `SELECT id FROM accounts WHERE type = $1 AND is_active = TRUE ORDER BY id ASC LIMIT 1;`,
      [accountType],
    );

    if (accountRes.rows.length > 0) {
      const targetAccountId = accountRes.rows[0].id;
      await client.query(
        `INSERT INTO account_transactions (
          account_id, amount, type, category, reference_id, description, transaction_date, created_by
        ) VALUES ($1, $2, 'INFLOW', 'FEE_PAYMENT', $3, $4, $5, $6);`,
        [
          targetAccountId,
          currentPayment,
          receiptNo,
          `Fee payment for challan ${invoice.challan_no}`,
          payment_date,
          user_id,
        ],
      );
    }

    await client.query("COMMIT");

    return {
      payment: paymentRes.rows[0],
      invoice: {
        id: invoice.id,
        total_payable: totalPayable,
        paid_amount: newPaidAmount,
        remaining_balance: totalPayable - newPaidAmount,
        status: nextStatus,
      },
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

const getPaginatedPayments = async ({
  page = 1,
  limit = 10,
  start_date,
  end_date,
  payment_method,
  search = "",
}) => {
  const offset = (page - 1) * limit;
  const values = [];

  let countQuery = `
    SELECT COUNT(*) 
    FROM payments p
    JOIN families f ON p.family_id = f.id
    JOIN invoices i ON p.invoice_id = i.id
    WHERE 1=1
  `;

  let dataQuery = `
    SELECT 
      p.id,
      p.receipt_no,
      p.invoice_id,
      p.family_id,
      p.student_id,
      p.amount_paid,
      p.payment_method,
      TO_CHAR(p.payment_date, 'YYYY-MM-DD') AS payment_date,
      p.reference_number,
      p.notes,
      p.created_at,
      f.father_parent_name,
      f.father_contact,
      i.challan_no,
      i.billing_month,
      u.name AS received_by_user
    FROM payments p
    JOIN families f ON p.family_id = f.id
    JOIN invoices i ON p.invoice_id = i.id
    LEFT JOIN users u ON p.received_by = u.id
    WHERE 1=1
  `;

  if (start_date) {
    values.push(start_date);
    const cond = ` AND p.payment_date >= $${values.length}`;
    countQuery += cond;
    dataQuery += cond;
  }

  if (end_date) {
    values.push(end_date);
    const cond = ` AND p.payment_date <= $${values.length}`;
    countQuery += cond;
    dataQuery += cond;
  }

  if (payment_method && payment_method !== "all") {
    values.push(payment_method);
    const cond = ` AND p.payment_method = $${values.length}`;
    countQuery += cond;
    dataQuery += cond;
  }

  if (search) {
    values.push(`%${search}%`);
    const idx = values.length;
    const cond = ` AND (p.receipt_no ILIKE $${idx} OR i.challan_no ILIKE $${idx} OR f.father_parent_name ILIKE $${idx})`;
    countQuery += cond;
    dataQuery += cond;
  }

  const countRes = await pool.query(countQuery, values);
  const totalCount = parseInt(countRes.rows[0].count, 10);

  dataQuery += ` ORDER BY p.id DESC`;
  values.push(limit, offset);
  dataQuery += ` LIMIT $${values.length - 1} OFFSET $${values.length};`;

  const dataRes = await pool.query(dataQuery, values);

  return {
    totalCount,
    totalPages: Math.ceil(totalCount / limit),
    currentPage: Number(page),
    limit: Number(limit),
    data: dataRes.rows,
  };
};

const getPaymentByReceipt = async (receiptNo) => {
  const query = `
    SELECT 
      p.id,
      p.receipt_no,
      p.invoice_id,
      p.family_id,
      p.student_id,
      p.amount_paid,
      p.payment_method,
      TO_CHAR(p.payment_date, 'YYYY-MM-DD') AS payment_date,
      p.reference_number,
      p.notes,
      p.created_at,
      f.father_parent_name,
      f.mother_name,
      f.father_contact,
      f.address,
      i.challan_no,
      i.billing_month,
      i.total_payable,
      i.paid_amount AS invoice_paid_total,
      i.status AS invoice_status,
      u.name AS received_by_user
    FROM payments p
    JOIN families f ON p.family_id = f.id
    JOIN invoices i ON p.invoice_id = i.id
    LEFT JOIN users u ON p.received_by = u.id
    WHERE p.receipt_no = $1;
  `;
  const res = await pool.query(query, [receiptNo]);
  return res.rows[0] || null;
};

const getPaymentsByStudentId = async (studentId) => {
  const query = `
    SELECT 
      p.id,
      p.receipt_no,
      p.amount_paid,
      p.payment_method,
      TO_CHAR(p.payment_date, 'YYYY-MM-DD') AS payment_date,
      i.challan_no,
      i.billing_month,
      u.name AS received_by_user
    FROM payments p
    JOIN invoices i ON p.invoice_id = i.id
    JOIN invoice_items ii ON ii.invoice_id = i.id
    LEFT JOIN users u ON p.received_by = u.id
    WHERE ii.student_id = $1
    GROUP BY p.id, i.challan_no, i.billing_month, u.name
    ORDER BY p.payment_date DESC;
  `;
  const res = await pool.query(query, [studentId]);
  return res.rows;
};

module.exports = {
  recordInvoicePayment,
  getPaginatedPayments,
  getPaymentByReceipt,
  getPaymentsByStudentId,
};
