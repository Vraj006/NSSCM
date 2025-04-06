const express = require('express');
const router = express.Router();
const Log = require('../models/Log');

// GET /api/logs
router.get('/', async (req, res) => {
  try {
    const { startDate, endDate, itemId, userId, actionType } = req.query;
    
    // Build query
    const query = {};
    
    if (startDate && endDate) {
      query.timestamp = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }
    
    if (itemId) query.itemId = itemId;
    if (userId) query.userId = userId;
    if (actionType) query.actionType = actionType;

    // Get logs with pagination
    const logs = await Log.find(query)
      .sort({ timestamp: -1 })
      .limit(100); // Limit results for performance

    res.json({ logs });
  } catch (error) {
    console.error('Log retrieval error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving logs'
    });
  }
});

module.exports = router; 