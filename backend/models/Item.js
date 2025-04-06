const mongoose = require('mongoose');

const positionSchema = new mongoose.Schema({
  startCoordinates: {
    width: { type: Number, required: true },
    depth: { type: Number, required: true },
    height: { type: Number, required: true }
  },
  endCoordinates: {
    width: { type: Number, required: true },
    depth: { type: Number, required: true },
    height: { type: Number, required: true }
  }
});

const itemSchema = new mongoose.Schema({
  itemId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  dimensions: {
    width: { type: Number, required: true },
    depth: { type: Number, required: true },
    height: { type: Number, required: true },
  },
  mass: { type: Number, required: true },
  priority: { type: Number, required: true },
  expiryDate: { type: Date, required: true },
  usageLimit: { type: Number, required: true },
  preferredZone: { type: String, required: true },
  currentContainer: { type: String, ref: 'Container' },
  currentPosition: positionSchema,
  remainingUses: { type: Number, default: function() { return this.usageLimit; } },
  isWaste: { type: Boolean, default: false },
  wasteReason: { type: String, enum: ['Expired', 'Out of Uses', null], default: null },
  lastUsed: { type: Date },
  status: { type: String, enum: ['ACTIVE', 'UNDOCKED', null], default: 'ACTIVE' },
  lastModified: { type: Date, default: Date.now }
});

// Pre-save middleware to initialize remainingUses if not set
itemSchema.pre('save', function(next) {
  if (this.isNew && this.remainingUses === undefined) {
    this.remainingUses = this.usageLimit;
  }
  next();
});

// Add index for efficient querying
itemSchema.index({ itemId: 1, name: 1 });
itemSchema.index({ isWaste: 1 });
itemSchema.index({ expiryDate: 1 });

const Item = mongoose.model('Item', itemSchema);
module.exports = Item;