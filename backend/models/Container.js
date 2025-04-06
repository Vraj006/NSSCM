const mongoose = require('mongoose');

const containerSchema = new mongoose.Schema({
  containerId: { type: String, required: true, unique: true },
  zone: { type: String, required: true },
  dimensions: {
    width: { type: Number, required: true },
    depth: { type: Number, required: true },
    height: { type: Number, required: true }
  },
  capacity: { 
    type: Number, 
    default: function() {
      // Default capacity is the volume of the container
      return this.dimensions.width * this.dimensions.depth * this.dimensions.height;
    }
  },
  isUndocking: { type: Boolean, default: false },
  undockingDate: { type: Date },
  currentItems: [{
    itemId: { type: String, ref: 'Item' },
    position: {
      startCoordinates: {
        width: { type: Number },
        depth: { type: Number },
        height: { type: Number }
      },
      endCoordinates: {
        width: { type: Number },
        depth: { type: Number },
        height: { type: Number }
      }
    }
  }]
});

// Add index for efficient querying
containerSchema.index({ containerId: 1 });
containerSchema.index({ zone: 1 });

const Container = mongoose.model('Container', containerSchema);
module.exports = Container; 
