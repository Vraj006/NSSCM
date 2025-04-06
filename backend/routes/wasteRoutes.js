const express = require('express');
const router = express.Router();
const Item = require('../models/Item');
const Container = require('../models/Container');
const Log = require('../models/Log');

// GET /api/waste/identify
router.get('/identify', async (req, res) => {
  try {
    const currentDate = new Date();
    console.log('Checking for waste items as of:', currentDate);
    
    // Find expired or depleted items that haven't been marked as waste yet
    const wasteItems = await Item.find({
      $or: [
        // Items that are already marked as waste
        { isWaste: true },
        // Items that should be waste (expired or depleted)
        {
          $or: [
            { expiryDate: { $lt: currentDate } },
            { remainingUses: { $lte: 0 } }
          ]
        }
      ]
    }).lean();

    console.log('Found waste items:', wasteItems);

    // Format response
    const formattedWaste = wasteItems.map(item => ({
      itemId: item.itemId,
      name: item.name,
      reason: item.wasteReason || (item.expiryDate < currentDate ? 'Expired' : 'Out of Uses'),
      containerId: item.currentContainer || 'Not Assigned',
      position: item.currentPosition || null,
      expiryDate: item.expiryDate,
      remainingUses: item.remainingUses,
      isMarkedAsWaste: item.isWaste || false
    }));

    console.log('Formatted waste items:', formattedWaste);

    // Mark any new waste items
    const newWasteItems = wasteItems.filter(item => !item.isWaste);
    if (newWasteItems.length > 0) {
      console.log(`Marking ${newWasteItems.length} new items as waste`);
      
      const updatePromises = newWasteItems.map(item => 
        Item.findByIdAndUpdate(
          item._id,
          { 
            isWaste: true,
            wasteReason: item.expiryDate < currentDate ? 'Expired' : 'Out of Uses'
          },
          { new: true }
        )
      );

      await Promise.all(updatePromises);

      // Log the waste identification
      await Log.create({
        actionType: 'WASTE_IDENTIFICATION',
        details: `Identified ${newWasteItems.length} new waste items`,
        items: newWasteItems.map(item => item.itemId),
        userId: 'SYSTEM',
        timestamp: new Date()
      });
    }

    res.json({
      success: true,
      wasteItems: formattedWaste
    });
  } catch (error) {
    console.error('Waste identification error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error identifying waste items',
      error: error.message 
    });
  }
});

// POST /api/waste/return-plan
router.post('/return-plan', async (req, res) => {
  try {
    const { undockingContainerId, undockingDate, maxWeight } = req.body;

    // Validate input
    if (!undockingContainerId) {
      return res.status(400).json({
        success: false,
        message: 'Undocking container ID is required'
      });
    }

    if (!maxWeight || isNaN(maxWeight) || maxWeight <= 0) {
      return res.status(400).json({
        success: false,
        message: 'A valid maximum weight (greater than 0) is required'
      });
    }

    // Check if container exists
    const containerExists = await Container.findOne({ containerId: undockingContainerId });
    if (!containerExists) {
      return res.status(404).json({
        success: false,
        message: `Container with ID ${undockingContainerId} not found`
      });
    }

    // Get all waste items
    const wasteItems = await Item.find({ isWaste: true }).sort({ mass: -1 });
    
    if (wasteItems.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No waste items found to include in return plan'
      });
    }
    
    // Ensure we respect the weight limit
    const selectedItems = [];
    let currentWeight = 0;
    let rejectedItems = [];
    
    for (const item of wasteItems) {
      // If adding this item would exceed the weight limit, skip it
      if (currentWeight + (item.mass || 0) > maxWeight) {
        rejectedItems.push({
          itemId: item.itemId,
          name: item.name,
          mass: item.mass || 0,
          reason: 'Exceeds weight limit'
        });
        continue;
      }
      
      selectedItems.push(item);
      currentWeight += (item.mass || 0);
      
      // If we've reached near the weight limit, stop adding items
      if (currentWeight >= maxWeight * 0.95) {
        break;
      }
    }
    
    if (selectedItems.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No items could fit within the specified weight limit'
      });
    }

    // Create return plan with steps for selected items
    const returnPlan = selectedItems.map((item, index) => ({
      step: index + 1,
      itemId: item.itemId,
      itemName: item.name,
      fromContainer: item.currentContainer || 'Current Location',
      toContainer: undockingContainerId
    }));

    // Create retrieval steps to minimize movements
    // Sort by container to minimize movement between locations
    const itemsByContainer = {};
    selectedItems.forEach(item => {
      if (!itemsByContainer[item.currentContainer]) {
        itemsByContainer[item.currentContainer] = [];
      }
      itemsByContainer[item.currentContainer].push(item);
    });
    
    // Generate retrieval steps
    const retrievalSteps = [];
    let stepCounter = 1;
    
    for (const containerId in itemsByContainer) {
      const containerItems = itemsByContainer[containerId];
      
      // Add step to move to the container
      retrievalSteps.push({
        step: stepCounter++,
        action: "moveToContainer",
        containerId: containerId
      });
      
      // Add steps for each item in this container
      containerItems.forEach(item => {
        retrievalSteps.push({
          step: stepCounter++,
          action: "retrieve",
          itemId: item.itemId,
          itemName: item.name
        });
        
        retrievalSteps.push({
          step: stepCounter++,
          action: "moveToUndocking",
          itemId: item.itemId,
          itemName: item.name
        });
      });
    }

    // Calculate manifest
    const totalWeight = selectedItems.reduce((sum, item) => sum + (item.mass || 0), 0);
    const totalVolume = selectedItems.reduce((sum, item) => 
      sum + (item.dimensions.width * item.dimensions.depth * item.dimensions.height), 0
    );

    // Log return plan creation
    await Log.create({
      actionType: 'WASTE_UNDOCKING',
      details: `Created return plan for container ${undockingContainerId}`,
      items: selectedItems.map(item => item.itemId),
      userId: 'SYSTEM',
      timestamp: new Date()
    });

    res.json({
      success: true,
      returnPlan,
      retrievalSteps,
      rejectedItems: rejectedItems.length > 0 ? rejectedItems : undefined,
      returnManifest: {
        undockingContainerId,
        undockingDate: undockingDate || new Date().toISOString(),
        returnItems: selectedItems.map(item => ({
          itemId: item.itemId,
          name: item.name,
          mass: item.mass || 0,
          reason: item.expiryDate < new Date() ? 'Expired' : 'Out of Uses'
        })),
        totalWeight,
        totalVolume,
        weightLimit: maxWeight
      }
    });
  } catch (error) {
    console.error('Return plan error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating return plan',
      error: error.message
    });
  }
});

// POST /api/waste/complete-undocking
router.post('/complete-undocking', async (req, res) => {
  try {
    const { undockingContainerId, timestamp } = req.body;

    // Validate input
    if (!undockingContainerId) {
      return res.status(400).json({
        success: false,
        message: 'Undocking container ID is required'
      });
    }

    // Find the container and verify it exists
    const container = await Container.findOne({ containerId: undockingContainerId });
    if (!container) {
      return res.status(404).json({
        success: false,
        message: `Container with ID ${undockingContainerId} not found`
      });
    }
    
    console.log(`Starting undocking process for container ${undockingContainerId}`);

    // Get items being undocked for logging
    const undockedItems = await Item.find({
      isWaste: true,
      currentContainer: undockingContainerId
    });
    
    console.log(`Found ${undockedItems.length} waste items to undock`);

    // Mark the container as undocking
    await Container.updateOne(
      { containerId: undockingContainerId },
      { 
        isUndocking: true,
        undockingDate: new Date(timestamp || Date.now())
      }
    );
    
    console.log(`Container ${undockingContainerId} marked as undocking`);

    // Update all waste items in the undocking container
    const updateResult = await Item.updateMany(
      { 
        isWaste: true, 
        currentContainer: undockingContainerId 
      },
      { 
        currentContainer: null,
        currentPosition: null,
        status: 'UNDOCKED'
      }
    );
    
    console.log(`Updated ${updateResult.modifiedCount} items to undocked status`);

    // Log the undocking with correct schema
    await Log.create({
      actionType: 'WASTE_UNDOCKING',
      details: `Completed waste undocking for container ${undockingContainerId}`,
      items: undockedItems.map(item => item.itemId),
      userId: req.body.userId || 'SYSTEM',
      timestamp: new Date(timestamp || Date.now())
    });
    
    console.log(`Created log entry for undocking container ${undockingContainerId}`);

    res.json({
      success: true,
      message: 'Undocking completed successfully',
      undockedItems: undockedItems.length,
      containerId: undockingContainerId
    });
  } catch (error) {
    console.error('Undocking error:', error);
    res.status(500).json({
      success: false,
      message: 'Error completing undocking',
      error: error.message
    });
  }
});

module.exports = router; 