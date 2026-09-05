const { getSettings, updateSettings } = require("../models/settingModel");

const fetchSettings = async (req, res) => {
  try {
    const settings = await getSettings();
    return res.json({ success: true, data: settings });
  } catch (error) {
    console.error("FETCH SETTINGS ERROR:", error);
    return res.status(500).json({ error: error.message });
  }
};

const saveSettings = async (req, res) => {
  try {
    const updated = await updateSettings(req.body);
    return res.json({
      success: true,
      message: "Settings updated successfully.",
      data: updated,
    });
  } catch (error) {
    console.error("SAVE SETTINGS ERROR:", error);
    return res.status(500).json({ error: error.message });
  }
};

module.exports = {
  fetchSettings,
  saveSettings,
};
