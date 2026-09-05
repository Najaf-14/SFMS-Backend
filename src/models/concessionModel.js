const { pool } = require("../config/db");

const syncFamilyConcessionTotal = async (client, familyId) => {
  if (!familyId) return;

  const sumRes = await client.query(
    `SELECT 
      COALESCE(SUM(value), 0) AS total_val,
      STRING_AGG(scholarship_name, ', ') AS scholarship_names
     FROM concessions
     WHERE family_id = $1 AND status = 'Active' AND approval = 'Approved';`,
    [familyId],
  );

  const totalConcession = parseFloat(sumRes.rows[0]?.total_val || 0);
  const scholarshipInfo = sumRes.rows[0]?.scholarship_names || null;

  await client.query(
    `UPDATE families 
     SET family_concession = $1, scholarship_info = $2, updated_at = CURRENT_TIMESTAMP 
     WHERE id = $3;`,
    [totalConcession, scholarshipInfo, familyId],
  );
};

const createConcession = async ({
  record_type = "Concession",
  applies_to = "Family",
  family_id,
  student_id,
  scholarship_name,
  discount_type = "Percentage",
  value,
  reason,
  status = "Active",
  approval = "Approved",
  start_date,
  end_date,
  remarks,
  user_id,
}) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    let resolvedFamilyId = family_id;
    if (applies_to === "Student" && student_id && !resolvedFamilyId) {
      const studentRes = await client.query(
        `SELECT family_id FROM students WHERE id = $1;`,
        [student_id],
      );
      resolvedFamilyId = studentRes.rows[0]?.family_id;
    }

    if (!resolvedFamilyId) {
      throw new Error(
        "A valid family association is required for this discount.",
      );
    }

    const prefix = record_type === "Scholarship" ? "SCH" : "CON";
    const cleanDate = new Date().toISOString().slice(0, 7).replace("-", "");
    const countRes = await client.query(
      `SELECT COUNT(*) FROM concessions WHERE record_type = $1;`,
      [record_type],
    );
    const nextSeq = String(parseInt(countRes.rows[0].count, 10) + 1).padStart(
      4,
      "0",
    );
    const concessionNo = `${prefix}-${cleanDate}-${nextSeq}`;

    const query = `
      INSERT INTO concessions (
        concession_no, record_type, applies_to, family_id, student_id,
        scholarship_name, discount_type, value, reason, status,
        approval, start_date, end_date, remarks, created_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING *;
    `;
    const values = [
      concessionNo,
      record_type,
      applies_to,
      resolvedFamilyId,
      applies_to === "Student" ? student_id : null,
      scholarship_name || null,
      discount_type,
      parseFloat(value),
      reason.trim(),
      status,
      approval,
      start_date || null,
      end_date || null,
      remarks || null,
      user_id,
    ];

    const result = await client.query(query, values);
    const newRecord = result.rows[0];
    await syncFamilyConcessionTotal(client, resolvedFamilyId);

    const targetLabel =
      applies_to === "Family"
        ? `Family #${resolvedFamilyId}`
        : `Student #${student_id}`;
    const auditDetails = `Created ${record_type} ${concessionNo} for ${targetLabel} (${discount_type === "Percentage" ? `${value}%` : `Rs. ${value}`})`;

    await client.query(
      `INSERT INTO concession_audit_logs (concession_id, action, details, performed_by) VALUES ($1, $2, $3, $4);`,
      [newRecord.id, `Created ${record_type}`, auditDetails, user_id],
    );

    await client.query("COMMIT");
    return newRecord;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

const getPaginatedConcessions = async ({
  page = 1,
  limit = 20,
  search = "",
  status,
  record_type,
}) => {
  const offset = (page - 1) * limit;
  const values = [];

  let countQuery = `
    SELECT COUNT(*) 
    FROM concessions c
    LEFT JOIN families f ON c.family_id = f.id
    LEFT JOIN students s ON c.student_id = s.id
    WHERE 1=1
  `;

  let dataQuery = `
    SELECT 
      c.*,
      f.father_parent_name,
      s.student_name,
      s.admission_number,
      u.name AS created_by_name
    FROM concessions c
    LEFT JOIN families f ON c.family_id = f.id
    LEFT JOIN students s ON c.student_id = s.id
    LEFT JOIN users u ON c.created_by = u.id
    WHERE 1=1
  `;

  if (status && status !== "all") {
    values.push(status);
    const cond = ` AND c.status = $${values.length}`;
    countQuery += cond;
    dataQuery += cond;
  }

  if (record_type && record_type !== "all") {
    values.push(record_type);
    const cond = ` AND c.record_type = $${values.length}`;
    countQuery += cond;
    dataQuery += cond;
  }

  if (search && search.trim()) {
    values.push(`%${search.trim()}%`);
    const cond = ` AND (
      c.concession_no ILIKE $${values.length} OR 
      c.reason ILIKE $${values.length} OR 
      f.father_parent_name ILIKE $${values.length} OR 
      s.student_name ILIKE $${values.length} OR
      c.scholarship_name ILIKE $${values.length}
    )`;
    countQuery += cond;
    dataQuery += cond;
  }

  const countRes = await pool.query(countQuery, values);
  const totalCount = parseInt(countRes.rows[0].count, 10);

  dataQuery += ` ORDER BY c.id DESC`;
  values.push(limit, offset);
  dataQuery += ` LIMIT $${values.length - 1} OFFSET $${values.length};`;

  const dataRes = await pool.query(dataQuery, values);

  return {
    totalCount,
    totalPages: Math.ceil(totalCount / limit) || 1,
    currentPage: Number(page),
    data: dataRes.rows,
  };
};

const getRecentAuditLogs = async (limit = 20) => {
  const query = `
    SELECT 
      a.id,
      a.action,
      a.details,
      a.created_at AS date,
      u.name AS performed_by_name
    FROM concession_audit_logs a
    LEFT JOIN users u ON a.performed_by = u.id
    ORDER BY a.id DESC
    LIMIT $1;
  `;
  const res = await pool.query(query, [limit]);
  return res.rows;
};

const updateConcessionStatus = async (id, status, user_id) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const res = await client.query(
      `UPDATE concessions SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *;`,
      [status, id],
    );
    if (res.rows.length === 0) throw new Error("Concession not found");

    const item = res.rows[0];
    await syncFamilyConcessionTotal(client, item.family_id);

    await client.query(
      `INSERT INTO concession_audit_logs (concession_id, action, details, performed_by) VALUES ($1, $2, $3, $4);`,
      [
        item.id,
        `Status Update`,
        `Changed status of ${item.concession_no} to ${status}`,
        user_id,
      ],
    );

    await client.query("COMMIT");
    return item;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

const deleteConcession = async (id, user_id) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const check = await client.query(
      `SELECT * FROM concessions WHERE id = $1;`,
      [id],
    );
    if (check.rows.length === 0) throw new Error("Concession not found");
    const item = check.rows[0];

    await client.query(`DELETE FROM concessions WHERE id = $1;`, [id]);
    await syncFamilyConcessionTotal(client, item.family_id);

    await client.query(
      `INSERT INTO concession_audit_logs (action, details, performed_by) VALUES ($1, $2, $3);`,
      [`Deleted ${item.record_type}`, `Removed ${item.concession_no}`, user_id],
    );

    await client.query("COMMIT");
    return item;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

module.exports = {
  createConcession,
  getPaginatedConcessions,
  getRecentAuditLogs,
  updateConcessionStatus,
  deleteConcession,
};
