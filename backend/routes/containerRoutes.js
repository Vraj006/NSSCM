const express = require('express');
const router = express.Router();
const Container = require('../models/Container');

// GET all containers
router.get('/', async (req, res) => {
  try {
    const containers = await Container.find();
    res.json(containers);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET container by ID
router.get('/:containerId', async (req, res) => {
  try {
    const { containerId } = req.params;
    const container = await Container.findOne({ containerId });
    
    if (!container) {
      return res.status(404).json({ 
        success: false, 
        message: `Container with ID ${containerId} not found` 
      });
    }
    
    res.json(container);
  } catch (error) {
    console.error('Error fetching container by ID:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

module.exports = router; 