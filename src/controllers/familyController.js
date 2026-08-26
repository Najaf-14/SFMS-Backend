const {
  createFamily,
  getAllFamilies,
  getFamilyById,
} = require("../models/familyModel");

const addFamily = async (req, res) => {
  try {
    const { family_id_code, father_parent_name, father_contact } = req.body;

    if (!family_id_code || !father_parent_name || !father_contact) {
      return res.status(400).json({
        error:
          "family_id_code, father_parent_name, and father_contact are required.",
      });
    }

    const newFamily = await createFamily(req.body);
    return res.status(201).json({
      message: "Family registered successfully",
      family: newFamily,
    });
  } catch (error) {
    if (error.code === "23505") {
      return res
        .status(400)
        .json({ error: "A family with this family_id_code already exists." });
    }
    return res.status(500).json({ error: error.message });
  }
};

const fetchFamilies = async (req, res) => {
  try {
    const { search } = req.query;
    const families = await getAllFamilies(search || "");
    return res.json({ success: true, count: families.length, data: families });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

const fetchFamilyById = async (req, res) => {
  try {
    const family = await getFamilyById(req.params.id);
    if (!family) {
      return res.status(404).json({ error: "Family not found." });
    }
    return res.json({ success: true, data: family });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

module.exports = {
  addFamily,
  fetchFamilies,
  fetchFamilyById,
};
