const express = require("express");
const Folder = require("../models/Folder");
const authenticateUser = require("../middleware/authMiddleware");
const multer = require('multer')
const Image = require("../models/Image");
const path = require('path');
const fs = require("fs");
const router = express.Router();
const cloudinary = require('../config/cloudinary');
const { CloudinaryStorage } = require('multer-storage-cloudinary');

const uploadsDir = path.join(__dirname, '../../uploads');

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'drive-app', // Change this to your preferred folder name
    allowed_formats: ['jpg', 'jpeg', 'png', 'gif'],
    transformation: [{ width: 1000, height: 1000, crop: 'limit' }] // Optional transformation
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (extname && mimetype) {
      return cb(null, true);
    }
    cb(new Error('Only image files are allowed!'));
  }
});

// Create a folder
router.post("/create-folder", authenticateUser, async (req, res) => {
  try {
    const { name, parentId } = req.body;

    // Debugging
    console.log("User from middleware:", req.user); 

    if (!req.user) {
      return res.status(401).json({ success: false, message: "Unauthorized: User not found" });
    }

    // Check if we have req.user.id or req.user._id
    const userId = req.user.id || req.user._id;
    console.log('User ID to be used:', userId);

    if (!userId) {
      return res.status(400).json({ success: false, message: "User ID not found in token" });
    }

    // Create new folder
    const newFolder = new Folder({
      name,
      parentId: parentId || null,
      userId: userId,
    });

    await newFolder.save();
    res.status(201).json({ success: true, message: "Folder created", folder: newFolder });
  } catch (error) {
    console.error("Folder Creation Error:", error);
    res.status(500).json({ success: false, message: "Error creating folder", error: error.message });
  }
});

router.get("/", authenticateUser, async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;

    if (!userId) {
      return res.status(400).json({ success: false, message: "User ID not found in token" });
    }

    // Only get folders where parentId is null or doesn't exist
    const folders = await Folder.find({
      userId: userId,
      $or: [
        { parentId: null },
        { parentId: { $exists: false } }
      ]
    });

    res.status(200).json({ success: true, folders });
  } catch (error) {
    console.error("Get Folders Error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching folders",
      error: error.message
    });
  }
});
router.get("/:folderId", authenticateUser, async (req, res) => {
  try {
    const folder = await Folder.findOne({
      _id: req.params.folderId,
      userId: req.user.id || req.user._id,
    });

    if (!folder) {
      return res.status(404).json({
        success: false,
        message: "Folder not found or access denied"
      });
    }

    res.status(200).json({ success: true, folder });
  } catch (error) {
    console.error("Get Folder Error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching folder",
      error: error.message
    });
  }
});

router.get("/subfolders/:parentId", authenticateUser, async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const { parentId } = req.params;

    const folders = await Folder.find({
      userId: userId,
      parentId: parentId
    });

    res.status(200).json({ success: true, folders });
  } catch (error) {
    console.error("Get Subfolders Error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching subfolders",
      error: error.message
    });
  }
});

router.delete('/delete-folder/:parentId', authenticateUser, async (req, res) => {
  try {
    const { parentId } = req.params;

    // Find and delete folder
    const folder = await Folder.findByIdAndDelete(parentId);
    if (!folder) {
      return res.status(404).json({ message: 'Folder not found' });
    }

    res.status(200).json({ message: 'Folder deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post("/upload-image/:folderId", authenticateUser, upload.single('image'), async (req, res) => {
  try {
    const { folderId } = req.params;
    const { name } = req.body;

    if (!req.file) {
      return res.status(400).json({ success: false, message: "No image uploaded" });
    }

    // Log Cloudinary response for debugging
    console.log('Cloudinary response:', req.file);

    const userId = req.user.id || req.user._id;

    // Extract image URL from Cloudinary response
    let imageUrl;
    
    if (req.file.secure_url) {
      // If using Cloudinary properly, secure_url should be available
      imageUrl = req.file.secure_url;
    } else if (req.file.path) {
      // If it's a file path from Cloudinary (sometimes it uses path instead of secure_url)
      if (req.file.path.startsWith('http')) {
        imageUrl = req.file.path;
      } else {
        // This assumes your server serves files from this path
        imageUrl = `http://localhost:5000/${req.file.path}`;
      }
    } else if (req.file.url) {
      // Some Cloudinary configurations might use url instead
      imageUrl = req.file.url;
    } else {
      console.error('Missing image URL in upload response:', req.file);
      return res.status(500).json({ success: false, message: "Failed to get image URL from upload" });
    }

    // Normalize public ID
    const publicId = req.file.public_id || req.file.filename || path.basename(imageUrl);

    // Create new image document with Cloudinary URL
    const newImage = new Image({
      name,
      url: imageUrl,
      publicId: publicId,
      folderId,
      userId
    });

    await newImage.save();
    
    // Return the complete image object including the URL
    res.status(201).json({ 
      success: true, 
      message: "Image uploaded", 
      image: {
        ...newImage.toObject(),
        url: imageUrl // Ensure URL is included in response
      }
    });
  } catch (error) {
    console.error("Image Upload Error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Error uploading image", 
      error: error.message 
    });
  }
});
router.get("/images/:folderId", authenticateUser, async (req, res) => {
  try {
    const { folderId } = req.params;
    const userId = req.user.id || req.user._id;

    const images = await Image.find({ folderId, userId });
    
    // Log image URLs for debugging
    console.log(`Found ${images.length} images for folder ${folderId}`);
    images.forEach(img => console.log(`Image ${img._id}: ${img.url}`));
    
    res.status(200).json({ success: true, images });
  } catch (error) {
    console.error("Get Images Error:", error);
    res.status(500).json({ success: false, message: "Error fetching images", error: error.message });
  }
});

router.delete('/delete-image/:imageId', authenticateUser, async (req, res) => {
  try {
    const { imageId } = req.params;
    const userId = req.user.id || req.user._id;

    // Find image
    const image = await Image.findOne({ _id: imageId, userId });
    
    if (!image) {
      return res.status(404).json({ 
        success: false, 
        message: 'Image not found or access denied' 
      });
    }

    // Delete from Cloudinary
    await cloudinary.uploader.destroy(image.publicId);

    // Delete image document
    await Image.findByIdAndDelete(imageId);

    res.status(200).json({ 
      success: true, 
      message: 'Image deleted successfully' 
    });
  } catch (error) {
    console.error('Delete Image Error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error deleting image', 
      error: error.message 
    });
  }
});

module.exports = router;