const {
  createConcession,
  getPaginatedConcessions,
  getRecentAuditLogs,
  updateConcessionStatus,
  deleteConcession,
} = require("../models/concessionModel");

const addConcession = async (req, res) => {
  try {
    const {
      record_type,
      applies_to,
      family_id,
      student_id,
      scholarship_name,
      discount_type,
      value,
      reason,
      status,
      approval,
      start_date,
      end_date,
      remarks,
    } = req.body;

    if (!reason || value === undefined || parseFloat(value) < 0) {
      return res
        .status(400)
        .json({
          error: "Reason and a valid non-negative discount value are required.",
        });
    }

    if (applies_to === "Family" && !family_id) {
      return res.status(400).json({ error: "Please select a target family." });
    }

    if (applies_to === "Student" && !student_id) {
      return res.status(400).json({ error: "Please select a target student." });
    }

    const newConcession = await createConcession({
      record_type,
      applies_to,
      family_id: family_id ? Number(family_id) : null,
      student_id: student_id ? Number(student_id) : null,
      scholarship_name,
      discount_type,
      value,
      reason,
      status,
      approval,
      start_date,
      end_date,
      remarks,
      user_id: req.user.id,
    });

    return res.status(201).json({
      success: true,
      message: `${record_type} created successfully.`,
      data: newConcession,
    });
  } catch (error) {
    console.error("ADD CONCESSION ERROR:", error);
    return res.status(500).json({ error: error.message });
  }
};

const fetchConcessions = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      search = "",
      status,
      record_type,
    } = req.query;

    const result = await getPaginatedConcessions({
      page: parseInt(page, 10) || 1,
      limit: parseInt(limit, 10) || 20,
      search,
      status,
      record_type,
    });

    const auditLogs = await getRecentAuditLogs(20);

    return res.json({
      success: true,
      ...result,
      auditLogs,
    });
  } catch (error) {
    console.error("FETCH CONCESSIONS ERROR:", error);
    return res.status(500).json({ error: error.message });
  }
};

const toggleStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const updated = await updateConcessionStatus(id, status, req.user.id);
    return res.json({
      success: true,
      message: "Status updated successfully.",
      data: updated,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

const removeConcession = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await deleteConcession(id, req.user.id);
    return res.json({
      success: true,
      message: `Concession ${deleted.concession_no} deleted.`,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

module.exports = {
  addConcession,
  fetchConcessions,
  toggleStatus,
  removeConcession,
};
