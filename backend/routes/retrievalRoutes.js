const express = require('express');
const router = express.Router();
const Item = require('../models/Item');
const Log = require('../models/Log');

// POST /api/retrieve
router.post('/', async (req, res) => {
  try {
    const { itemId } = req.body;

    // Validate required fields
    if (!itemId) {
      return res.status(400).json({
        success: false,
        message: 'Item ID is required'
      });
    }

    // Find the item
    const item = await Item.findOne({ itemId });
    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Item not found'
      });
    }

    // Create retrieval log with correct action type
    await Log.create({
      actionType: 'ITEM_RETRIEVAL',
      details: `Retrieved item ${itemId}`,
      items: [itemId],
      userId: 'SYSTEM',
      timestamp: new Date()
    });

    res.json({
      success: true,
      message: 'Item retrieved successfully',
      item: {
        itemId: item.itemId,
        name: item.name,
        containerId: item.currentContainer
      }
    });
  } catch (error) {
    console.error('Retrieval error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving item',
      error: error.message
    });
  }
});

module.exports = router; 