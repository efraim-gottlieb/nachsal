import bcrypt from "bcrypt";

export async function encrypt(password) {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

export async function compare(password, hashed) {
  return bcrypt.compare(password, hashed);
}
