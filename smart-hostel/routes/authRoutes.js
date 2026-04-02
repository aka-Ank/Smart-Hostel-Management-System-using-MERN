const express = require("express");
const path = require("path");
const { users } = require("../data/store");

const router = express.Router();

// Serve Home page
router.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../views/home.html"));
});

// Serve Signup page
router.get("/signup", (req, res) => {
  res.sendFile(path.join(__dirname, "../views/signup.html"));
});

// Serve Login page
router.get("/login", (req, res) => {
  res.sendFile(path.join(__dirname, "../views/login.html"));
});

// Signup API: stores user in dummy users array
router.post("/auth/signup", (req, res) => {
  const { name, email, password, role } = req.body;

  if (!name || !email || !password || !role) {
    return res.status(400).json({ message: "All fields are required." });
  }

  const existingUser = users.find((user) => user.email === email);
  if (existingUser) {
    return res.status(400).json({ message: "User already exists with this email." });
  }

  users.push({ name, email, password, role });
  return res.json({ message: "Signup successful. Please login." });
});

// Login API: basic match check using dummy data (no sessions)
router.post("/auth/login", (req, res) => {
  const { email, password, role } = req.body;

  if (!email || !password || !role) {
    return res.status(400).json({ message: "All fields are required." });
  }

  const foundUser = users.find(
    (user) => user.email === email && user.password === password && user.role === role
  );

  if (!foundUser) {
    return res.status(401).json({ message: "Invalid credentials or role." });
  }

  // Frontend uses this URL for redirection after successful login.
  if (role === "student") {
    return res.json({ message: "Login successful", redirectTo: `/student?email=${encodeURIComponent(email)}` });
  }

  return res.json({ message: "Login successful", redirectTo: "/warden" });
});

module.exports = router;
