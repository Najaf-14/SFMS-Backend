const jwt = require("jsonwebtoken");

const generateAccessToken = (user) => {
  return jwt.sign(
    {
      id: user.id,
      role: user.role_name,
    },
    process.env.JWT_ACCESS_SECRET,
    {
      expiresIn: "1d",
    },
  );
};

module.exports = {
  generateAccessToken,
};
