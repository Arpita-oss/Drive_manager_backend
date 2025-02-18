import express from "express";
import upload from "../middlewares/upload"; // Import the multer upload middleware
import Folder from "../models/Folder"; // Folder model
import Image from "../models/Image"; // Assuming you have an Image model

const router = express.Router();

// Upload image to a folder
router.post("/upload-image/:folderId", upload.single("image"), async (req, res) => {
    try {
        const { folderId } = req.params;
        const userId = req.user.id; // Get user ID from authentication

        // Validate folder existence
        const folder = await Folder.findById(folderId);
        if (!folder) {
            return res.status(404).json({ success: false, message: "Folder not found" });
        }

        // Create a new image entry
        const newImage = new Image({
            userId,
            folderId,
            filename: req.file.filename,
            path: req.file.path,
        });

        // Save the image to the database
        await newImage.save();
        res.status(201).json({
            success: true,
            message: "Image uploaded successfully",
            image: newImage,
        });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error uploading image", error: error.message });
    }
});

export default router;
