
const express = require('express')
const User = require('../models/User.js')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
 // ✅ Import the User model

const router = express.Router();
bcrypt.setRandomFallback((len) => {
    const buf = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        buf[i] = Math.floor(Math.random() * 256);
    }
    return buf;
});
router.post('/register', async (req, res) => {
  try {
      const { username,email, password } = req.body;

      if (!username || !email || !password ) {
          return res.status(400).json({ message: "All fields are required" });
      }

      let existingUser = await User.findOne({
          $or: [{ email }, { username }]
      });

      if (existingUser) {
          return res.status(400).json({
              message: 'User already exists'
          });
      }

      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      const user = new User({
          username,
          email,
          password: hashedPassword
      });

      await user.save();

      // Create token without 'Bearer' prefix - we'll add it in the response
      const token = jwt.sign(
          { id: user._id },
          process.env.JWT_SECRET,
          { expiresIn: '1h' }
      );

      return res.status(201).json({
          success: true,
          token: `Bearer ${token}`,
          user: {
              id: user._id,
              username: user.username,

              email: user.email
          }
      });
  } catch (error) {
      console.error("Error in /register:", error);
      return res.status(500).json({
          success: false,
          message: 'Signup failed',
          error: error.message
      });
  }
});
router.post('/login', async(req,res)=>{
  try {
    const { email, password } = req.body;
    
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({
        message: 'Invalid login credentials'
      });
    }
    
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({
        message: 'Invalid login credentials'
      });
    }
    
    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
    
    res.status(200).json({
      success: true,
      token: `Bearer ${token}`,
      user: {
        id: user._id,
        username: user.username,
        email: user.email
      }
    });
  } catch (error) {
    res.status(500).json({
      message: 'Login failed',
      error: error.message
    });
  }
});





module.exports=router
