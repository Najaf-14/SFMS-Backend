const { pool } = require("../config/db");

const getClassById = async (classId) => {
  const result = await pool.query(
    `
    SELECT *
    FROM classes
    WHERE id = $1;
    `,
    [classId],
  );

  return result.rows[0] || null;
};

const createClassWithFees = async ({
  name,
  sections = [],
  academic_session_id,
  fees = [],
}) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const classResult = await client.query(
      `
      INSERT INTO classes (name)
      VALUES ($1)
      RETURNING *;
      `,
      [name],
    );

    const classData = classResult.rows[0];

    const createdSections = [];

    for (const sectionName of sections) {
      const sectionResult = await client.query(
        `
        INSERT INTO sections (
          class_id,
          name
        )
        VALUES ($1, $2)
        RETURNING *;
        `,
        [classData.id, sectionName],
      );

      createdSections.push(sectionResult.rows[0]);
    }

    let feeStructure = null;
    const createdFees = [];

    if (academic_session_id && fees.length > 0) {
      const structureResult = await client.query(
        `
        INSERT INTO class_fee_structures (
          class_id,
          academic_session_id
        )
        VALUES ($1, $2)
        RETURNING *;
        `,
        [classData.id, academic_session_id],
      );

      feeStructure = structureResult.rows[0];

      for (const fee of fees) {
        const feeResult = await client.query(
          `
          INSERT INTO class_fee_structure_items (
            fee_structure_id,
            fee_component_id,
            amount
          )
          VALUES ($1, $2, $3)
          RETURNING *;
          `,
          [feeStructure.id, fee.fee_component_id, fee.amount],
        );

        createdFees.push(feeResult.rows[0]);
      }
    }

    await client.query("COMMIT");

    return {
      class: classData,
      sections: createdSections,
      fee_structure: feeStructure,
      fees: createdFees,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

const getClassesWithFees = async ({
  page = 1,
  limit = 10,
  search = "",
  sessionId = null,
}) => {
  const offset = (page - 1) * limit;
  const searchValue = `%${search}%`;

  const query = `
    SELECT
      c.id AS class_id,
      c.name AS class_name,

      COALESCE(
        (
          SELECT JSON_AGG(
            JSON_BUILD_OBJECT(
              'id', sec.id,
              'name', sec.name
            )
            ORDER BY sec.id
          )
          FROM sections sec
          WHERE sec.class_id = c.id
        ),
        '[]'::json
      ) AS sections,

      COALESCE(
        (
          SELECT JSON_AGG(
            JSON_BUILD_OBJECT(
              'fee_component_id', fc.id,
              'name', fc.name,
              'amount', cfsi.amount
            )
            ORDER BY fc.id
          )
          FROM class_fee_structures cfs

          INNER JOIN class_fee_structure_items cfsi
            ON cfsi.fee_structure_id = cfs.id

          INNER JOIN fee_components fc
            ON fc.id = cfsi.fee_component_id

          WHERE cfs.class_id = c.id
            AND (
              $4::INT IS NULL
              OR cfs.academic_session_id = $4
            )
        ),
        '[]'::json
      ) AS fees,

      COALESCE(
        (
          SELECT SUM(cfsi.amount)
          FROM class_fee_structures cfs

          INNER JOIN class_fee_structure_items cfsi
            ON cfsi.fee_structure_id = cfs.id

          WHERE cfs.class_id = c.id
            AND (
              $4::INT IS NULL
              OR cfs.academic_session_id = $4
            )
        ),
        0
      ) AS total_base_fee

    FROM classes c

    WHERE
      c.name ILIKE $1
      OR CAST(c.id AS TEXT) ILIKE $1

    ORDER BY c.id DESC

    LIMIT $2
    OFFSET $3;
  `;

  const result = await pool.query(query, [
    searchValue,
    limit,
    offset,
    sessionId,
  ]);

  const countResult = await pool.query(
    `
    SELECT COUNT(*) AS total
    FROM classes
    WHERE
      name ILIKE $1
      OR CAST(id AS TEXT) ILIKE $1;
    `,
    [searchValue],
  );

  const total = parseInt(countResult.rows[0].total, 10);

  return {
    data: result.rows,
    total,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

const getClassWithFees = async (classId, sessionId = null) => {
  const query = `
    SELECT
      c.id AS class_id,
      c.name AS class_name,

      COALESCE(
        (
          SELECT JSON_AGG(
            JSON_BUILD_OBJECT(
              'id', sec.id,
              'name', sec.name
            )
            ORDER BY sec.id
          )
          FROM sections sec
          WHERE sec.class_id = c.id
        ),
        '[]'::json
      ) AS sections,

      COALESCE(
        (
          SELECT JSON_AGG(
            JSON_BUILD_OBJECT(
              'fee_component_id', fc.id,
              'name', fc.name,
              'amount', cfsi.amount
            )
            ORDER BY fc.id
          )
          FROM class_fee_structures cfs

          INNER JOIN class_fee_structure_items cfsi
            ON cfsi.fee_structure_id = cfs.id

          INNER JOIN fee_components fc
            ON fc.id = cfsi.fee_component_id

          WHERE cfs.class_id = c.id
            AND (
              $2::INT IS NULL
              OR cfs.academic_session_id = $2
            )
        ),
        '[]'::json
      ) AS fees,

      COALESCE(
        (
          SELECT SUM(cfsi.amount)
          FROM class_fee_structures cfs

          INNER JOIN class_fee_structure_items cfsi
            ON cfsi.fee_structure_id = cfs.id

          WHERE cfs.class_id = c.id
            AND (
              $2::INT IS NULL
              OR cfs.academic_session_id = $2
            )
        ),
        0
      ) AS total_base_fee

    FROM classes c

    WHERE c.id = $1;
  `;

  const result = await pool.query(query, [classId, sessionId]);

  return result.rows[0] || null;
};

const updateClassWithFees = async (
  classId,
  { name, sections = [], academic_session_id, fees = [] },
) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const classResult = await client.query(
      `
      UPDATE classes
      SET name = $1
      WHERE id = $2
      RETURNING *;
      `,
      [name, classId],
    );

    if (classResult.rows.length === 0) {
      throw new Error("Class not found.");
    }

    await client.query(
      `
      DELETE FROM sections
      WHERE class_id = $1;
      `,
      [classId],
    );

    const updatedSections = [];

    for (const sectionName of sections) {
      const sectionResult = await client.query(
        `
        INSERT INTO sections (
          class_id,
          name
        )
        VALUES ($1, $2)
        RETURNING *;
        `,
        [classId, sectionName],
      );

      updatedSections.push(sectionResult.rows[0]);
    }

    let feeStructure = null;
    const updatedFees = [];

    if (academic_session_id) {
      const structureResult = await client.query(
        `
        SELECT *
        FROM class_fee_structures
        WHERE class_id = $1
          AND academic_session_id = $2
        LIMIT 1;
        `,
        [classId, academic_session_id],
      );

      if (structureResult.rows.length > 0) {
        feeStructure = structureResult.rows[0];

        await client.query(
          `
          DELETE FROM class_fee_structure_items
          WHERE fee_structure_id = $1;
          `,
          [feeStructure.id],
        );
      } else {
        const newStructure = await client.query(
          `
          INSERT INTO class_fee_structures (
            class_id,
            academic_session_id
          )
          VALUES ($1, $2)
          RETURNING *;
          `,
          [classId, academic_session_id],
        );

        feeStructure = newStructure.rows[0];
      }

      for (const fee of fees) {
        const feeResult = await client.query(
          `
          INSERT INTO class_fee_structure_items (
            fee_structure_id,
            fee_component_id,
            amount
          )
          VALUES ($1, $2, $3)
          RETURNING *;
          `,
          [feeStructure.id, fee.fee_component_id, fee.amount],
        );

        updatedFees.push(feeResult.rows[0]);
      }
    }

    await client.query("COMMIT");

    return {
      class: classResult.rows[0],
      sections: updatedSections,
      fee_structure: feeStructure,
      fees: updatedFees,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

const deleteClassWithData = async (classId) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    await client.query(
      `
      DELETE FROM class_fee_structure_items
      WHERE fee_structure_id IN (
        SELECT id
        FROM class_fee_structures
        WHERE class_id = $1
      );
      `,
      [classId],
    );

    await client.query(
      `
      DELETE FROM class_fee_structures
      WHERE class_id = $1;
      `,
      [classId],
    );

    await client.query(
      `
      DELETE FROM sections
      WHERE class_id = $1;
      `,
      [classId],
    );

    const result = await client.query(
      `
      DELETE FROM classes
      WHERE id = $1
      RETURNING *;
      `,
      [classId],
    );

    if (result.rows.length === 0) {
      await client.query("ROLLBACK");
      return null;
    }

    await client.query("COMMIT");

    return result.rows[0];
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

const createSection = async (classId, name) => {
  const result = await pool.query(
    `
    INSERT INTO sections (
      class_id,
      name
    )
    VALUES ($1, $2)
    RETURNING *;
    `,
    [classId, name],
  );

  return result.rows[0];
};

const getSectionsByClass = async (classId) => {
  const result = await pool.query(
    `
    SELECT *
    FROM sections
    WHERE class_id = $1
    ORDER BY id;
    `,
    [classId],
  );

  return result.rows;
};

const getSectionById = async (sectionId) => {
  const result = await pool.query(
    `
    SELECT *
    FROM sections
    WHERE id = $1;
    `,
    [sectionId],
  );

  return result.rows[0] || null;
};

const updateSection = async (sectionId, name) => {
  const result = await pool.query(
    `
    UPDATE sections
    SET name = $1
    WHERE id = $2
    RETURNING *;
    `,
    [name, sectionId],
  );

  return result.rows[0] || null;
};

const deleteSection = async (sectionId) => {
  const result = await pool.query(
    `
    DELETE FROM sections
    WHERE id = $1
    RETURNING *;
    `,
    [sectionId],
  );

  return result.rows[0] || null;
};

module.exports = {
  getClassById,
  createClassWithFees,
  getClassesWithFees,
  getClassWithFees,
  updateClassWithFees,
  deleteClassWithData,
  createSection,
  getSectionsByClass,
  getSectionById,
  updateSection,
  deleteSection,
};
