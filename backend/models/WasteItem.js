const mongoose = require('mongoose');

const wasteItemSchema = new mongoose.Schema({
  itemId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  volume: { type: Number, default: 0 },
  container: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Container',
    required: false
  },
  zone: { type: String },
  reason: { 
    type: String, 
    enum: ['Expired', 'Out of Uses', 'Damaged', 'Other'],
    default: 'Other'
  },
  status: {
    type: String,
    enum: ['Pending', 'Processed', 'Undocked'],
    default: 'Pending'
  },
  createdAt: { type: Date, default: Date.now },
  processingDate: { type: Date }
});

// Add index for efficient querying
wasteItemSchema.index({ itemId: 1 });
wasteItemSchema.index({ container: 1 });
wasteItemSchema.index({ zone: 1 });
wasteItemSchema.index({ status: 1 });

const WasteItem = mongoose.model('WasteItem', wasteItemSchema);

module.exports = WasteItem; 