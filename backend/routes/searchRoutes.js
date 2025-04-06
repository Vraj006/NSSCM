const express = require('express');
const router = express.Router();
const Item = require('../models/Item');
const Container = require('../models/Container');
const Log = require('../models/Log');
const { calculateRetrievalSteps } = require('../utils/retrievalAlgorithm');

// GET /api/search
router.get('/', async (req, res) => {
  try {
    const { itemId, itemName, userId } = req.query;
    
    // Find item by ID or name
    const query = itemId ? { itemId } : { name: itemName };
    const item = await Item.findOne(query);

    if (!item) {
      return res.json({
        success: true,
        found: false
      });
    }

    // Get container information
    const container = await Container.findOne({ containerId: item.currentContainer });
    
    // Calculate retrieval steps
    const retrievalSteps = await calculateRetrievalSteps(item, container);

    // Log the search action if userId is provided
    if (userId) {
      await Log.create({
        actionType: 'ITEM_SEARCH',
        details: `Item ${item.itemId} searched by user ${userId}`,
        items: [item.itemId],
        userId,
        timestamp: new Date()
      });
    }

    res.json({
      success: true,
      found: true,
      item: {
        itemId: item.itemId,
        name: item.name,
        containerId: item.currentContainer,
        zone: container?.zone || 'Unknown',
        position: item.currentPosition
      },
      retrievalSteps
    });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error processing search request',
      error: error.message
    });
  }
});

module.exports = router; 