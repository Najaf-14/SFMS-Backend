const { pool } = require("../config/db");

const generateMonthlyInvoices = async ({
  billing_month,
  due_date,
  session_id,
  user_id,
}) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const familiesRes = await client.query(
      `SELECT id, family_concession FROM families WHERE is_active = TRUE ORDER BY id ASC;`,
    );
    const families = familiesRes.rows;

    let createdCount = 0;
    let skippedCount = 0;

    for (const family of families) {
      const existingInv = await client.query(
        `SELECT id FROM invoices WHERE family_id = $1 AND billing_month = $2;`,
        [family.id, billing_month],
      );

      if (existingInv.rows.length > 0) {
        skippedCount++;
        continue;
      }

      const studentsRes = await client.query(
        `SELECT id, class_id FROM students WHERE family_id = $1 AND status = 'Active';`,
        [family.id],
      );
      const students = studentsRes.rows;

      if (students.length === 0) {
        skippedCount++;
        continue;
      }

      const arrearsRes = await client.query(
        `SELECT COALESCE(SUM(total_payable - paid_amount), 0) AS remaining_arrears
         FROM invoices 
         WHERE family_id = $1 AND billing_month < $2 AND status NOT IN ('Paid', 'Cancelled', 'Waived');`,
        [family.id, billing_month],
      );
      const previousArrears = parseFloat(
        arrearsRes.rows[0].remaining_arrears || 0,
      );

      let subtotal = 0;
      const lineItems = [];

      for (const student of students) {
        if (!student.class_id) continue;

        const feeItemsRes = await client.query(
          `SELECT cfsi.fee_component_id, cfsi.amount 
           FROM class_fee_structure_items cfsi
           JOIN class_fee_structures cfs ON cfsi.fee_structure_id = cfs.id
           WHERE cfs.class_id = $1 AND cfs.academic_session_id = $2;`,
          [student.class_id, session_id],
        );

        for (const item of feeItemsRes.rows) {
          const itemAmt = parseFloat(item.amount);
          subtotal += itemAmt;
          lineItems.push({
            student_id: student.id,
            fee_component_id: item.fee_component_id,
            amount: itemAmt,
          });
        }
      }

      if (lineItems.length === 0 && previousArrears === 0) {
        skippedCount++;
        continue;
      }

      const concession = parseFloat(family.family_concession || 0);
      const currentNet = Math.max(0, subtotal - concession);
      const totalPayable = currentNet + previousArrears;

      const cleanMonth = billing_month.replace("-", "");
      const countRes = await client.query(
        `SELECT COUNT(*) FROM invoices WHERE billing_month = $1;`,
        [billing_month],
      );
      const nextSeq = String(parseInt(countRes.rows[0].count, 10) + 1).padStart(
        5,
        "0",
      );
      const challanNo = `FC-${cleanMonth}-${nextSeq}`;

      const invoiceInsert = `
        INSERT INTO invoices (
          challan_no, family_id, billing_month, due_date,
          subtotal_amount, concession_amount, previous_arrears,
          total_payable, paid_amount, status, generated_by
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 0.00, 'Unpaid', $9)
        RETURNING id;
      `;
      const invRes = await client.query(invoiceInsert, [
        challanNo,
        family.id,
        billing_month,
        due_date,
        subtotal,
        concession,
        previousArrears,
        totalPayable,
        user_id,
      ]);
      const invoiceId = invRes.rows[0].id;

      for (const line of lineItems) {
        await client.query(
          `INSERT INTO invoice_items (invoice_id, student_id, fee_component_id, amount)
           VALUES ($1, $2, $3, $4);`,
          [invoiceId, line.student_id, line.fee_component_id, line.amount],
        );
      }

      createdCount++;
    }

    await client.query("COMMIT");
    return { createdCount, skippedCount, billing_month };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

const getPaginatedInvoices = async ({
  page = 1,
  limit = 10,
  billing_month,
  status,
  search = "",
}) => {
  const offset = (page - 1) * limit;
  const values = [];

  let countQuery = `
    SELECT COUNT(*) 
    FROM invoices i
    JOIN families f ON i.family_id = f.id
    WHERE 1=1
  `;
  let dataQuery = `
    SELECT 
      i.*,
      f.family_id_code,
      f.father_parent_name,
      f.father_contact
    FROM invoices i
    JOIN families f ON i.family_id = f.id
    WHERE 1=1
  `;

  if (billing_month) {
    values.push(billing_month);
    const monthCondition = ` AND i.billing_month = $${values.length}`;
    countQuery += monthCondition;
    dataQuery += monthCondition;
  }

  if (status) {
    values.push(status);
    const statusCondition = ` AND i.status = $${values.length}`;
    countQuery += statusCondition;
    dataQuery += statusCondition;
  }

  if (search) {
    values.push(`%${search}%`);
    const searchIdx = values.length;
    const searchCond = ` AND (i.challan_no ILIKE $${searchIdx} OR f.father_parent_name ILIKE $${searchIdx} OR f.family_id_code ILIKE $${searchIdx})`;
    countQuery += searchCond;
    dataQuery += searchCond;
  }

  const countRes = await pool.query(countQuery, values);
  const totalCount = parseInt(countRes.rows[0].count, 10);

  dataQuery += ` ORDER BY i.id DESC`;
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

const getInvoiceById = async (id) => {
  const invoiceQuery = `
    SELECT 
      i.*,
      f.family_id_code,
      f.father_parent_name,
      f.mother_name,
      f.father_contact,
      f.whatsapp_number,
      f.address,
      u.name AS generated_by_user
    FROM invoices i
    JOIN families f ON i.family_id = f.id
    LEFT JOIN users u ON i.generated_by = u.id
    WHERE i.id = $1;
  `;
  const invoiceRes = await pool.query(invoiceQuery, [id]);

  if (invoiceRes.rows.length === 0) {
    return null;
  }

  const itemsQuery = `
    SELECT 
      ii.id AS item_id,
      ii.amount,
      s.id AS student_id,
      s.student_name,
      s.admission_number,
      s.roll_number,
      c.name AS class_name,
      sec.name AS section_name,
      fc.id AS component_id,
      fc.name AS component_name
    FROM invoice_items ii
    JOIN students s ON ii.student_id = s.id
    JOIN fee_components fc ON ii.fee_component_id = fc.id
    LEFT JOIN classes c ON s.class_id = c.id
    LEFT JOIN sections sec ON s.section_id = sec.id
    WHERE ii.invoice_id = $1
    ORDER BY s.id ASC, fc.id ASC;
  `;
  const itemsRes = await pool.query(itemsQuery, [id]);

  return {
    ...invoiceRes.rows[0],
    items: itemsRes.rows,
  };
};

module.exports = {
  generateMonthlyInvoices,
  getPaginatedInvoices,
  getInvoiceById,
};
