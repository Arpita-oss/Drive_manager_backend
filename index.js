require("dotenv").config();
const express = require("express");
const cors = require("cors");
const connectDB = require("./src/config/db");
const path = require("path");
const app = express();

// Use an environment variable for the client URL or default to localhost
const allowedOrigin = process.env.CLIENT_URL || "http://localhost:5173";

// Set up CORS with your custom configuration
app.use(cors({
  origin: allowedOrigin,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body parser middleware
app.use(express.json());

// Connect to MongoDB
connectDB();

// API routes
app.use("/api/auth", require("./src/routes/authRoutes"));
app.use("/api/folders", require("./src/routes/folderRoutes"));

// Serve static files for uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Optional: Serve React frontend in production
if (process.env.NODE_ENV === "production") {
  // Serve static files from the React app's build directory
  app.use(express.static(path.join(__dirname, "client", "build")));
  
  // Fallback to React's index.html for any unknown routes
  app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "client", "build", "index.html"));
  });
}

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
