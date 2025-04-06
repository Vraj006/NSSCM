const mongoose = require('mongoose');

const logSchema = new mongoose.Schema({
  actionType: {
    type: String,
    required: true,
    enum: [
      'WASTE_IDENTIFICATION', 
      'WASTE_UNDOCKING', 
      'ITEM_PLACEMENT', 
      'ITEM_REMOVAL', 
      'ITEM_RETRIEVAL', 
      'ITEM_SEARCH',
      'ITEM_DEPLETED',
      'ITEM_EXPIRED',
      'TIME_SIMULATION'
    ]
  },
  details: {
    type: String,
    required: true
  },
  items: [{
    type: String  // Array of itemIds
  }],
  userId: {
    type: String,
    default: 'SYSTEM'  // Default value for system actions
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

// Add index for efficient querying
logSchema.index({ timestamp: 1 });
logSchema.index({ userId: 1 });
logSchema.index({ actionType: 1 });
logSchema.index({ itemId: 1 });

const Log = mongoose.model('Log', logSchema);
module.exports = Log; 