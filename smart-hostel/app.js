const express = require("express");
const authRoutes = require("./routes/authRoutes");
const wardenRoutes = require("./routes/wardenRoutes");
const studentRoutes = require("./routes/studentRoutes");

const app = express();
const PORT = 3500;

// Parses JSON body data from frontend fetch requests
app.use(express.json());

// Parses form-urlencoded body data
app.use(express.urlencoded({ extended: true }));

// Serves static files like style.css and script.js from /public
app.use(express.static("public"));

// Main route modules (each uses express.Router())
app.use(authRoutes);
app.use(wardenRoutes);
app.use(studentRoutes);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
