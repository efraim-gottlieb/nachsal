import jwt from "jsonwebtoken";

export function generateToken(payload) {
  return jwt.sign(payload, process.env.SECRET_KEY, { expiresIn: "7d" });
}

export function verifyToken(token) {
  return jwt.verify(token, process.env.SECRET_KEY);
}
