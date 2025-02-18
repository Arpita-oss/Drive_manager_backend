const User = require("../models/User");
const bcryptjs = require("bcryptjs");
const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");

dotenv.config(); // Load environment variables

exports.signup = async (req, res) => {
    try {
      const { username, email, password } = req.body;
  
      // Validate input fields
      if (!username || !email || !password) {
        return res.status(400).json({ message: "All fields are required" });
      }
  
      // Check if user already exists
      let user = await User.findOne({ email });
      if (user) return res.status(400).json({ message: "User already exists" });
  
      // ✅ FIX: Generate salt properly
      const salt = await bcryptjs.genSalt(10);  // Ensure salt is a valid number
      const hashedPassword = await bcryptjs.hash(password, salt);
  
      // Create and save user
      user = new User({ username, email, password: hashedPassword });
      await user.save();
  
      res.status(201).json({ message: "User registered successfully" });
    } catch (err) {
      console.error("Signup Error:", err);
      res.status(500).json({ message: "Internal Server Error" });
    }
  };

// authRoutes.js - login endpoint
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    
    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // Create token
    const payload = {
      user: {
        id: user._id,
        email: user.email
      }
    };

    console.log('Creating token with payload:', payload); // Debug log
    console.log('Using JWT_SECRET:', process.env.JWT_SECRET); // Debug SECRET

    const token = jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    res.json({ token });
  } catch (err) {
    console.error("Login Error:", err);
    res.status(500).json({ message: "Server Error" });
  }
};