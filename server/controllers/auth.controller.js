import { createUser, getUserByEmail } from "../services/user.service.js";
import { compare } from "../utils/hash.js";
import { generateToken } from "../utils/token.js";

export async function register(req, res) {
  const { name, email, password, phone, user_type, commander_id } = req.body;

  if (!name || !email || !password || !phone) {
    return res.status(400).json({ message: "All fields are required" });
  }

  const existing = await getUserByEmail(email);
  if (existing) {
    return res.status(400).json({ message: "Email already exists" });
  }

  const user = await createUser(name, email, password, phone, user_type, commander_id);
  const token = generateToken({ id: user._id, user_type: user.user_type });

  res.status(201).json({
    token,
    user: {
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      user_type: user.user_type,
    },
  });
}

export async function login(req, res) {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required" });
  }

  const user = await getUserByEmail(email);
  if (!user) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  const isMatch = await compare(password, user.password);
  if (!isMatch) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  const token = generateToken({ id: user._id, user_type: user.user_type });

  res.json({
    token,
    user: {
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      user_type: user.user_type,
      city: user.city,
    },
  });
}

export async function getMe(req, res) {
  res.json(req.user);
}
