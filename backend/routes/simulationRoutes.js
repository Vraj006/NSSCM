const express = require('express');
const router = express.Router();
const Item = require('../models/Item');
const Log = require('../models/Log');

// POST /api/simulate/day
router.post('/day', async (req, res) => {
  try {
    const { numOfDays, toTimestamp, itemsToBeUsedPerDay } = req.body;
    
    // Validate input
    if (!itemsToBeUsedPerDay || !Array.isArray(itemsToBeUsedPerDay) || itemsToBeUsedPerDay.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one item to use daily must be provided'
      });
    }
    
    if ((numOfDays === undefined || numOfDays <= 0) && !toTimestamp) {
      return res.status(400).json({
        success: false,
        message: 'Either a valid number of days or a target timestamp must be provided'
      });
    }
    
    // Calculate simulation end date
    const currentDate = new Date();
    let endDate;
    let daysSimulated;
    
    if (toTimestamp) {
      endDate = new Date(toTimestamp);
      if (endDate <= currentDate) {
        return res.status(400).json({
          success: false,
          message: 'Target timestamp must be in the future'
        });
      }
      // Calculate number of days between dates
      const diffTime = Math.abs(endDate - currentDate);
      daysSimulated = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    } else {
      daysSimulated = parseInt(numOfDays);
      endDate = new Date(currentDate);
      endDate.setDate(endDate.getDate() + daysSimulated);
    }

    const changes = {
      itemsUsed: [],
      itemsExpired: [],
      itemsDepletedToday: []
    };

    // Process daily item usage
    if (itemsToBeUsedPerDay && itemsToBeUsedPerDay.length > 0) {
      for (const itemInfo of itemsToBeUsedPerDay) {
        try {
          const query = itemInfo.itemId ? { itemId: itemInfo.itemId } : { name: itemInfo.name };
          const item = await Item.findOne(query);

          if (!item) {
            console.log(`Item not found: ${itemInfo.itemId || itemInfo.name}`);
            continue; // Skip if item not found
          }

          if (item.remainingUses > 0) {
            const newUses = item.remainingUses - daysSimulated;
            const depleted = newUses <= 0;

            // Update item in database
            await Item.findByIdAndUpdate(item._id, {
              remainingUses: Math.max(0, newUses),
              lastUsed: new Date(),
              isWaste: depleted,
              wasteReason: depleted ? 'Out of Uses' : null
            });

            changes.itemsUsed.push({
              itemId: item.itemId,
              name: item.name,
              remainingUses: Math.max(0, newUses)
            });

            if (depleted) {
              changes.itemsDepletedToday.push({
                itemId: item.itemId,
                name: item.name
              });

              try {
                // Log depletion
                await Log.create({
                  actionType: 'ITEM_DEPLETED',
                  details: `Item ${item.name} (${item.itemId}) has been depleted through usage simulation`,
                  items: [item.itemId],
                  userId: 'SYSTEM',
                  timestamp: new Date()
                });
              } catch (logError) {
                console.error('Failed to create depletion log:', logError);
              }
            }
          }
        } catch (itemError) {
          console.error(`Error processing item ${itemInfo.itemId || itemInfo.name}:`, itemError);
        }
      }
    }

    // Find newly expired items 
    try {
      const newlyExpired = await Item.find({
        expiryDate: { $lte: endDate },
        isWaste: false
      });

      console.log(`Found ${newlyExpired.length} items that will expire by ${endDate.toISOString()}`);

      // Update expired items
      for (const item of newlyExpired) {
        try {
          await Item.findByIdAndUpdate(item._id, {
            isWaste: true,
            wasteReason: 'Expired'
          });

          changes.itemsExpired.push({
            itemId: item.itemId,
            name: item.name
          });

          // Log expiration
          await Log.create({
            actionType: 'ITEM_EXPIRED',
            details: `Item ${item.name} (${item.itemId}) has expired during time simulation`,
            items: [item.itemId],
            userId: 'SYSTEM',
            timestamp: new Date()
          });
        } catch (updateError) {
          console.error(`Error updating expired item ${item.itemId}:`, updateError);
        }
      }
    } catch (expiryError) {
      console.error('Error finding expired items:', expiryError);
    }

    // Log the simulation
    try {
      await Log.create({
        actionType: 'TIME_SIMULATION',
        details: `Simulated ${daysSimulated} days from ${currentDate.toISOString()} to ${endDate.toISOString()}`,
        items: changes.itemsUsed.map(item => item.itemId),
        userId: 'SYSTEM',
        timestamp: new Date()
      });
    } catch (logError) {
      console.error('Error logging simulation:', logError);
    }

    res.json({
      success: true,
      newDate: endDate.toISOString(),
      daysSimulated,
      startDate: currentDate.toISOString(),
      changes
    });
  } catch (error) {
    console.error('Simulation error:', error);
    res.status(500).json({
      success: false,
      message: 'Error processing simulation',
      error: error.message
    });
  }
});

module.exports = router; 