const mongoose = require("mongoose");

const FolderSchema = new mongoose.Schema({
  name: { type: String, required: true },
  parentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Folder',
    default: null,
    index: true  // Add this index
  },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
});



module.exports = mongoose.model("Folder", FolderSchema);
