const { pool } = require("../config/db");

const createFeeComponent = async (name, description) => {
  const query = `
    INSERT INTO fee_components (name, description)
    VALUES ($1, $2)
    RETURNING *;
  `;
  const result = await pool.query(query, [name, description || null]);
  return result.rows[0];
};

const getFeeComponents = async ({ page = 1, limit = 10, search = "" }) => {
  const offset = (page - 1) * limit;
  const values = [];

  let countQuery = `SELECT COUNT(*) FROM fee_components WHERE 1=1`;
  let dataQuery = `SELECT * FROM fee_components WHERE 1=1`;

  if (search) {
    values.push(`%${search}%`);
    const searchCondition = ` AND (name ILIKE $${values.length} OR description ILIKE $${values.length})`;
    countQuery += searchCondition;
    dataQuery += searchCondition;
  }

  const countResult = await pool.query(countQuery, values);
  const totalCount = parseInt(countResult.rows[0].count, 10);

  values.push(limit, offset);
  dataQuery += ` ORDER BY id ASC LIMIT $${values.length - 1} OFFSET $${values.length};`;

  const dataResult = await pool.query(dataQuery, values);

  return {
    totalCount,
    totalPages: Math.ceil(totalCount / limit),
    currentPage: Number(page),
    limit: Number(limit),
    data: dataResult.rows,
  };
};

const assignClassFeeStructure = async (classId, sessionId, items) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const structureQuery = `
      INSERT INTO class_fee_structures (class_id, academic_session_id)
      VALUES ($1, $2)
      ON CONFLICT (class_id, academic_session_id) DO UPDATE 
      SET class_id = EXCLUDED.class_id
      RETURNING id;
    `;
    const structRes = await client.query(structureQuery, [classId, sessionId]);
    const structureId = structRes.rows[0].id;

    await client.query(
      `DELETE FROM class_fee_structure_items WHERE fee_structure_id = $1;`,
      [structureId],
    );

    for (const item of items) {
      const itemQuery = `
        INSERT INTO class_fee_structure_items (fee_structure_id, fee_component_id, amount)
        VALUES ($1, $2, $3);
      `;
      await client.query(itemQuery, [
        structureId,
        item.fee_component_id,
        item.amount,
      ]);
    }

    await client.query("COMMIT");
    return {
      structure_id: structureId,
      class_id: classId,
      items_count: items.length,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

const getClassFeeStructures = async ({ page = 1, limit = 10, sessionId }) => {
  const offset = (page - 1) * limit;
  const values = [];

  let countQuery = `SELECT COUNT(*) FROM class_fee_structures WHERE 1=1`;
  let dataQuery = `
    SELECT 
      cfs.id AS structure_id,
      c.id AS class_id,
      c.name AS class_name,
      a.id AS session_id,
      a.name AS session_name,
      COALESCE(
        json_agg(
          json_build_object(
            'item_id', cfsi.id,
            'component_id', fc.id,
            'component_name', fc.name,
            'amount', cfsi.amount
          )
        ) FILTER (WHERE cfsi.id IS NOT NULL),
        '[]'
      ) AS items,
      COALESCE(SUM(cfsi.amount), 0) AS total_fee
    FROM class_fee_structures cfs
    JOIN classes c ON cfs.class_id = c.id
    JOIN academic_sessions a ON cfs.academic_session_id = a.id
    LEFT JOIN class_fee_structure_items cfsi ON cfs.id = cfsi.fee_structure_id
    LEFT JOIN fee_components fc ON cfsi.fee_component_id = fc.id
    WHERE 1=1
  `;

  if (sessionId) {
    values.push(sessionId);
    const sessionCondition = ` AND cfs.academic_session_id = $${values.length}`;
    countQuery += sessionCondition;
    dataQuery += sessionCondition;
  }

  const countResult = await pool.query(countQuery, values);
  const totalCount = parseInt(countResult.rows[0].count, 10);

  dataQuery += ` GROUP BY cfs.id, c.id, a.id ORDER BY c.id ASC`;

  values.push(limit, offset);
  dataQuery += ` LIMIT $${values.length - 1} OFFSET $${values.length};`;

  const dataResult = await pool.query(dataQuery, values);

  return {
    totalCount,
    totalPages: Math.ceil(totalCount / limit),
    currentPage: Number(page),
    limit: Number(limit),
    data: dataResult.rows,
  };
};

const getClassFeeStructure = async (classId, sessionId) => {
  const query = `
    SELECT 
      cfs.id AS structure_id,
      c.id AS class_id,
      c.name AS class_name,
      a.id AS session_id,
      a.name AS session_name,
      COALESCE(
        json_agg(
          json_build_object(
            'item_id', cfsi.id,
            'component_id', fc.id,
            'component_name', fc.name,
            'amount', cfsi.amount
          )
        ) FILTER (WHERE cfsi.id IS NOT NULL),
        '[]'
      ) AS items,
      COALESCE(SUM(cfsi.amount), 0) AS total_fee
    FROM class_fee_structures cfs
    JOIN classes c ON cfs.class_id = c.id
    JOIN academic_sessions a ON cfs.academic_session_id = a.id
    LEFT JOIN class_fee_structure_items cfsi ON cfs.id = cfsi.fee_structure_id
    LEFT JOIN fee_components fc ON cfsi.fee_component_id = fc.id
    WHERE cfs.class_id = $1 AND cfs.academic_session_id = $2
    GROUP BY cfs.id, c.id, a.id;
  `;
  const result = await pool.query(query, [classId, sessionId]);
  return result.rows[0] || null;
};

module.exports = {
  createFeeComponent,
  getFeeComponents,
  assignClassFeeStructure,
  getClassFeeStructures,
  getClassFeeStructure,
};
