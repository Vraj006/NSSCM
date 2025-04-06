const express = require('express');
const router = express.Router();
const Item = require('../models/Item');
const Container = require('../models/Container');
const Log = require('../models/Log');
const WasteItem = require('../models/WasteItem');

// GET /api/dashboard
router.get('/', async (req, res) => {
  try {
    // Get total items count
    const totalItems = await Item.countDocuments();
    
    // Get total containers count
    const totalContainers = await Container.countDocuments();
    
    // Get items placed count (items with a container assigned)
    const itemsPlaced = await Item.countDocuments({ currentContainer: { $exists: true, $ne: null } });
    
    // Get waste items count
    const wasteItems = await Item.countDocuments({ isWaste: true });
    
    // Get recent activities
    const recentActivities = await Log.find()
      .sort({ timestamp: -1 })
      .limit(5);
    
    // DEBUG: Log all containers to check if they exist
    const allContainers = await Container.find();
    console.log('All containers:', JSON.stringify(allContainers));
    
    // Create a mapping from container ID to zone
    const containerIdToZone = {};
    allContainers.forEach(container => {
      containerIdToZone[container.containerId] = container.zone;
    });
    
    // Container Utilization by Zone
    let containerUtilization = [];
    try {
      // Get all containers
      const containers = await Container.find();
      
      // Get all items with container assignments
      const items = await Item.find({ currentContainer: { $exists: true, $ne: null } });
      
      console.log(`Found ${containers.length} containers and ${items.length} placed items`);
      if (items.length > 0) {
        console.log('Placed items:', JSON.stringify(items));
      }
      
      // Define all possible zones
      const allZones = ['A', 'B', 'C', 'D', 'E'];
      
      // Group containers by zone and calculate total volume capacity
      const zoneData = {};
      allZones.forEach(zone => {
        zoneData[zone] = {
          containers: [],
          totalCapacity: 0,
          usedVolume: 0,
          utilization: 0
        };
      });
      
      // Add containers to their respective zones
      containers.forEach(container => {
        const zone = container.zone || 'A'; // Default to zone A if not specified
        
        if (!zoneData[zone]) {
          zoneData[zone] = {
            containers: [],
            totalCapacity: 0,
            usedVolume: 0,
            utilization: 0
          };
        }
        
        // Calculate container volume from dimensions
        const containerVolume = 
          (container.dimensions?.width || 100) * 
          (container.dimensions?.depth || 100) * 
          (container.dimensions?.height || 100);
        
        zoneData[zone].containers.push(container.containerId);
        zoneData[zone].totalCapacity += containerVolume;
      });
      
      // Calculate used volume for each zone from items
      items.forEach(item => {
        // Find which zone this container belongs to
        const container = containers.find(c => c.containerId === item.currentContainer);
        if (container) {
          const zone = container.zone || 'A';
          
          // Calculate item volume
          const itemVolume = 
            (item.dimensions?.width || 10) * 
            (item.dimensions?.depth || 10) * 
            (item.dimensions?.height || 10);
          
          zoneData[zone].usedVolume += itemVolume;
          console.log(`Added item ${item.itemId} with volume ${itemVolume} to zone ${zone}`);
        } else {
          console.log(`WARNING: Item ${item.itemId} references container ${item.currentContainer} that doesn't exist`);
        }
      });
      
      // Check if there are containers with currentItems populated directly
      containers.forEach(container => {
        if (container.currentItems && container.currentItems.length > 0) {
          const zone = container.zone || 'A';
          // Add any items that might be directly in the container.currentItems array
          container.currentItems.forEach(item => {
            // If the item has dimensions, use them, otherwise use default
            const itemVolume = 
              (item.dimensions?.width || 10) * 
              (item.dimensions?.depth || 10) * 
              (item.dimensions?.height || 10);
            
            zoneData[zone].usedVolume += itemVolume;
          });
        }
      });
      
      // Calculate utilization percentages for each zone
      Object.keys(zoneData).forEach(zone => {
        const data = zoneData[zone];
        console.log(`Zone ${zone} - Total capacity: ${data.totalCapacity}, Used volume: ${data.usedVolume}`);
        if (data.totalCapacity > 0) {
          // Calculate utilization percentage, ensuring small values are still visible
          const rawUtilization = (data.usedVolume / data.totalCapacity) * 100;
          data.utilization = rawUtilization < 1 && rawUtilization > 0 ? 1 : Math.round(rawUtilization);
          console.log(`Zone ${zone} - Raw utilization: ${rawUtilization}%, Displayed utilization: ${data.utilization}%`);
        }
        
        // Add to array for chart display
        containerUtilization.push({
          name: `Zone ${zone}`,
          value: data.utilization
        });
      });
      
      console.log("Container utilization data:", JSON.stringify(containerUtilization));
    } catch (error) {
      console.error('Error calculating container utilization:', error);
      containerUtilization = [
        { name: 'Zone A', value: 0 },
        { name: 'Zone B', value: 0 },
        { name: 'Zone C', value: 0 },
        { name: 'Zone D', value: 0 },
        { name: 'Zone E', value: 0 }
      ];
    }
    
    // Get items by zone over time (using logs to estimate historical data)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    
    const placementLogs = await Log.find({
      actionType: 'ITEM_PLACEMENT',
      timestamp: { $gte: sixMonthsAgo }
    }).sort({ timestamp: 1 });
    
    const monthlyData = {};
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    // Initialize monthly data
    for (let i = 0; i < 6; i++) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const monthName = months[d.getMonth()];
      monthlyData[monthName] = {
        name: monthName,
        Zone_A: 0,
        Zone_B: 0,
        Zone_C: 0,
        Zone_D: 0
      };
    }
    
    // Process logs to get historical data
    placementLogs.forEach(log => {
      const month = months[new Date(log.timestamp).getMonth()];
      if (monthlyData[month]) {
        // Extract zone from log details if possible
        const zoneMatch = log.details.match(/Zone ([A-D])/);
        if (zoneMatch && zoneMatch[1]) {
          const zone = zoneMatch[1];
          monthlyData[month][`Zone_${zone}`] += 1;
        }
      }
    });
    
    // Convert to array and reverse for chronological order
    const itemsByZone = Object.values(monthlyData).reverse();
    
    // Get items expiring soon (within 30 days)
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    
    const expiringItems = await Item.find({
      expiryDate: { 
        $exists: true, 
        $ne: null,
        $lte: thirtyDaysFromNow,
        $gte: new Date()
      }
    }).sort({ expiryDate: 1 })
      .limit(5);
    
    // Format expiring items for display
    const formattedExpiringItems = expiringItems.map(item => ({
      itemId: item.itemId,
      name: item.name,
      expiryDate: item.expiryDate,
      zone: containerIdToZone[item.currentContainer] || 'Unknown'
    }));
    
    res.json({
      totalItems,
      totalContainers,
      itemsPlaced,
      wasteItems,
      recentActivities,
      containerUtilization,
      itemsByZone,
      expiringItems: formattedExpiringItems
    });
    
  } catch (error) {
    console.error('Dashboard data error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching dashboard data',
      error: error.message
    });
  }
});

module.exports = router; 