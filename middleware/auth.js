const jwt = require("jsonwebtoken");
const config = require("config");

module.exports = function (req, res, next) {
  // get token from the header
  const token = req.header("x-auth-token");

  // check if no token exists
  if (!token) {
    return res.status(401).json({
      msg: "No token found, authorization denied",
    });
  }

  // verify token

  try {
    const decoded = jwt.verify(token, config.get("jwtSECRET"));

    req.user = decoded.user;
    next();
  } catch (err) {
    res.status(401).json({ msg: "Token not valid" });
  }
};
