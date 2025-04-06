const express = require('express');
const router = express.Router();
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const Container = require('../models/Container');
const Item = require('../models/Item');
const Log = require('../models/Log');
const { createObjectCsvWriter } = require('csv-writer');

const exportsDir = path.join(__dirname, '../exports');
if (!fs.existsSync(exportsDir)) {
  fs.mkdirSync(exportsDir, { recursive: true });
}

const placementDir = path.join(exportsDir, 'placements');
if (!fs.existsSync(placementDir)) {
  fs.mkdirSync(placementDir, { recursive: true });
}

router.get('/recommendation', async (req, res) => {
  try {
    const containers = await Container.find({ isUndocking: false });
    if (!containers || containers.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No available containers found'
      });
    }

    const unplacedItems = await Item.find({ 
      currentContainer: { $exists: false },
      isWaste: false
    });
    
    if (!unplacedItems || unplacedItems.length === 0) {
      return res.status(404).json({
        success: false, 
        message: 'No unplaced items found'
      });
    }

    const containersData = containers.map(container => ({
      containerId: container.containerId,
      zone: container.zone,
      dimensions: container.dimensions
    }));

    const itemsData = unplacedItems.map(item => ({
      itemId: item.itemId,
      name: item.name,
      dimensions: item.dimensions,
      mass: item.mass,
      priority: item.priority,
      expiryDate: item.expiryDate,
      preferredZone: item.preferredZone,
      usageLimit: item.usageLimit
    }));

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const outputDir = path.join(placementDir, `placement_${timestamp}`);
    
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    fs.writeFileSync(
      path.join(outputDir, 'containers.json'),
      JSON.stringify(containersData, null, 2)
    );
    
    fs.writeFileSync(
      path.join(outputDir, 'items.json'),
      JSON.stringify(itemsData, null, 2)
    );

    const pythonScriptPath = path.join(__dirname, '../utils/3d_placement_algorithm.py');

    const pythonProcess = spawn('python', [
      pythonScriptPath,
      JSON.stringify(containersData),
      JSON.stringify(itemsData),
      outputDir
    ]);

    let pythonData = '';
    let pythonError = '';

    pythonProcess.stdout.on('data', (data) => {
      pythonData += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
      pythonError += data.toString();
    });

    pythonProcess.on('close', async (code) => {
      if (code !== 0) {
        console.error('Python process exited with code', code);
        console.error('Error output:', pythonError);
        
        return res.status(500).json({
          success: false,
          message: 'Error running 3D placement algorithm',
          error: pythonError
        });
      }

      try {
        const results = JSON.parse(pythonData);

        fs.writeFileSync(
          path.join(outputDir, 'placement_results.json'),
          JSON.stringify(results, null, 2)
        );

        await Log.create({
          actionType: 'ITEM_PLACEMENT',
          details: `Generated placement recommendation for ${results.successful_placements.length} items`,
          items: results.successful_placements.map(p => p.item_id),
          userId: 'SYSTEM',
          timestamp: new Date()
        });

        res.json({
          success: true,
          timestamp,
          outputDir: outputDir.replace(/\\/g, '/'),
          placements: results.successful_placements,
          unplaced_items: results.unplaced_items,
          container_stats: results.container_stats
        });
      } catch (parseError) {
        console.error('Error parsing Python output:', parseError);
        console.error('Raw output:', pythonData);
        
        return res.status(500).json({
          success: false,
          message: 'Error parsing 3D placement results',
          error: parseError.message
        });
      }
    });
  } catch (error) {
    console.error('Placement recommendation error:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating placement recommendation',
      error: error.message
    });
  }
});

router.post('/', async (req, res) => {
    try {
    console.log('Received placement calculation request:', JSON.stringify(req.body, null, 2));
    
        const { items, containers } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0 ||
        !containers || !Array.isArray(containers) || containers.length === 0) {
            return res.status(400).json({
                success: false,
        message: 'Items and containers are required and must be non-empty arrays'
      });
    }
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const outputDir = path.join(placementDir, `placement_${timestamp}`);
    
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    fs.writeFileSync(
      path.join(outputDir, 'items_input.json'),
      JSON.stringify(items, null, 2)
    );
    
    fs.writeFileSync(
      path.join(outputDir, 'containers_input.json'),
      JSON.stringify(containers, null, 2)
    );
    
    const filteredData = {
      items: items.map(item => {
        if (!item.preferredZone) {
          item.preferredZone = 'A';
        }
        return item;
      }),
      containers: containers.map(container => {
        if (!container.zone) {
          container.zone = 'A'; // Default zone if not specified
        }
        return container;
      })
    };
    
    console.log('Filtered data for zone matching:', JSON.stringify(filteredData, null, 2));
    
    const pythonScriptPath = path.join(__dirname, '../utils/3d_placement_algorithm.py');
    
    const pythonProcess = spawn('python', [
      pythonScriptPath,
      JSON.stringify(filteredData.containers),
      JSON.stringify(filteredData.items),
      outputDir,
      '--enforce-zones' // Add flag to enforce zone restrictions
    ]);
    
    let pythonData = '';
    let pythonError = '';
    
    // Collect data from the Python script
    pythonProcess.stdout.on('data', (data) => {
      pythonData += data.toString();
      console.log(`Python stdout: ${data.toString()}`);
    });
    
    // Collect error messages
    pythonProcess.stderr.on('data', (data) => {
      pythonError += data.toString();
      console.error(`Python stderr: ${data.toString()}`);
    });
    
    // Define the output file path
    const outputFile = path.join(outputDir, 'placement_results.json');
    
    // Handle process completion
    pythonProcess.on('close', async (code) => {
      console.log('Python process exited with code:', code);
      
      if (code !== 0) {
        console.error('Python process exited with error code', code);
        console.error('Error output:', pythonError);
        
        return res.status(500).json({
          success: false,
          message: 'Error calculating placement',
          error: pythonError
        });
      }
      
      try {
        let results;
        
        // First try to parse the outputFile
        if (fs.existsSync(outputFile)) {
          console.log('Reading results from output file');
          const fileContents = fs.readFileSync(outputFile, 'utf8');
          results = JSON.parse(fileContents);
        } else {
          // If file doesn't exist, try parsing the stdout
          console.log('Parsing results from stdout');
          results = JSON.parse(pythonData);
        }
        
        // Log the placement calculation
        try {
          await Log.create({
            actionType: 'ITEM_PLACEMENT',
            details: `Generated placement calculation for ${results.successful_placements?.length || 0} items`,
            items: results.successful_placements?.map(p => p.item_id) || [],
            userId: 'SYSTEM',
            timestamp: new Date()
          });
        } catch (logError) {
          console.error('Error logging placement calculation:', logError);
        }
        
        // Return the placement calculation to the client in the format expected by the frontend
        const formattedResults = {
          success: true,
          placements: results.successful_placements || [],
          unplaced_items: results.unplaced_items || [],
          container_stats: (results.container_stats || []).map(container => ({
            container_id: container.container_id,
            zone: container.zone,
            utilization: parseFloat(container.utilization) || 0,
            items_count: parseInt(container.items_count, 10) || 0
          }))
        };
        
        console.log('Returning placement results:', JSON.stringify(formattedResults, null, 2));
        return res.json(formattedResults);
      } catch (parseError) {
        console.error('Error parsing placement results:', parseError);
        console.error('Raw output:', pythonData);
        
        return res.status(500).json({
          success: false,
          message: 'Error parsing placement results',
          error: parseError.message
        });
      }
    });
  } catch (error) {
    console.error('Placement calculation error:', error);
    res.status(500).json({
      success: false,
      message: 'Error calculating placement',
      error: error.message
    });
  }
});

// POST /api/placement/apply
// Apply a placement recommendation to update the container assignments
router.post('/apply', async (req, res) => {
  try {
    const { placements } = req.body;
    
    if (!placements || !Array.isArray(placements) || placements.length === 0) {
            return res.status(400).json({
                success: false,
        message: 'No valid placements provided'
      });
    }

    console.log('Applying placement for items:', placements.map(p => p.item_id).join(', '));
    
    // First verify all items and containers exist
    const updatePromises = [];
    const itemVerifications = [];
    
    for (const placement of placements) {
      const { item_id, container_id, position } = placement;
      
      try {
        // Find the container to get its ID for referencing
        const container = await Container.findOne({ containerId: container_id });
        if (!container) {
          throw new Error(`Container ${container_id} not found`);
        }
        
        // Find the item
        const item = await Item.findOne({ itemId: item_id });
        if (!item) {
          throw new Error(`Item ${item_id} not found`);
        }
        
        // Verify that the item's preferred zone matches the container's zone (if both are specified)
        if (item.preferredZone && container.zone && item.preferredZone !== container.zone) {
          console.warn(`Warning: Item ${item_id} has preferred zone ${item.preferredZone} but is being placed in container ${container_id} with zone ${container.zone}`);
        }
        
        // Convert position to the format stored in the database
        const itemPosition = {
          startCoordinates: {
            width: position.x,
            depth: position.y,
            height: position.z
          },
          // End coordinates are calculated by adding the item dimensions
          endCoordinates: {
            width: position.x + parseFloat(item.dimensions?.width || 0),
            depth: position.y + parseFloat(item.dimensions?.depth || 0),
            height: position.z + parseFloat(item.dimensions?.height || 0)
          }
        };
        
        console.log(`Setting position for item ${item_id} in container ${container_id}:`, itemPosition);
        
        // Add to update promises
        updatePromises.push(
          Item.findOneAndUpdate(
            { itemId: item_id },
            { 
              currentContainer: container_id,
              currentPosition: itemPosition
            },
            { new: true }
          )
        );
        
        itemVerifications.push({
          itemId: item_id,
          containerId: container_id,
          preferredZone: item.preferredZone,
          containerZone: container.zone,
          dimensions: item.dimensions,
          position: itemPosition
        });
      } catch (verificationError) {
        console.error(`Verification error for placement ${item_id} -> ${container_id}:`, verificationError);
        throw verificationError; // Re-throw to be caught by the main try/catch
      }
    }

    console.log('Item verifications completed successfully:', itemVerifications);
    
    // Wait for all updates to complete
    const updatedItems = await Promise.all(updatePromises);
    console.log(`Successfully updated ${updatedItems.length} items in database`);
    
    // Log the placement application
    await Log.create({
      actionType: 'ITEM_PLACEMENT',
      details: `Applied placement for ${updatedItems.length} items`,
      items: updatedItems.map(item => item.itemId),
      userId: req.body.userId || 'SYSTEM',
      timestamp: new Date()
    });

        res.json({
            success: true,
      message: `Successfully placed ${updatedItems.length} items`,
      updatedItems: updatedItems.map(item => ({
        itemId: item.itemId,
        containerId: item.currentContainer,
        position: item.currentPosition
      }))
    });
  } catch (error) {
    console.error('Apply placement error:', error);
    console.error('Stack trace:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Error applying placement',
      error: error.message
    });
  }
});

router.post('/visualize-container', async (req, res) => {
  try {
    const { containerId, includeDetails, forceRefresh, timestamp: clientTimestamp } = req.body;
    
    if (!containerId) {
      return res.status(400).json({
        success: false,
        message: 'Container ID is required'
      });
    }

    console.log('Visualizing container:', containerId, forceRefresh ? '(forced refresh)' : '');

    // Get container data
    const container = await Container.findOne({ containerId });
    if (!container) {
      return res.status(404).json({
        success: false,
        message: `Container ${containerId} not found`
      });
    }

    // Get all items in this container with full details
    const items = await Item.find({ currentContainer: containerId });
    console.log(`Found ${items.length} items in container ${containerId}`);

    // Create a timestamp for this visualization
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const outputDir = path.join(placementDir, `container_${containerId}_${timestamp}`);
    
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Format container data for the Python algorithm
    const containerData = {
      containerId: container.containerId,
      zone: container.zone,
      dimensions: {
        width: Number(container.dimensions.width) || 100,
        depth: Number(container.dimensions.depth) || 100,
        height: Number(container.dimensions.height) || 100
      }
    };

    // Format items data for the Python algorithm with spread positions
    const itemsData = [];
    const containerWidth = Number(container.dimensions.width) || 100;
    const containerDepth = Number(container.dimensions.depth) || 100;
    
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      
      // Get actual priority, default to item index-based priority if not set
      const priority = Number(item.priority) || (10 - Math.min(9, i));
      
      let position;
      
      // Check if DB has valid position data
      const hasValidPosition = (
        item.currentPosition && 
        item.currentPosition.startCoordinates && 
        item.currentPosition.startCoordinates.width !== undefined
      );
      if (hasValidPosition && !forceRefresh) {
        // Use the position from database if it's valid and not forcing refresh
        position = {
          x: Number(item.currentPosition.startCoordinates.width) || 0,
          y: Number(item.currentPosition.startCoordinates.depth) || 0,
          z: Number(item.currentPosition.startCoordinates.height) || 0
        };
        console.log(`Using existing position for ${item.itemId}:`, position);
      } else {
      
        const itemsPerRow = Math.ceil(Math.sqrt(items.length));
        const rowSize = containerWidth / (itemsPerRow + 1);
        const colSize = containerDepth / (itemsPerRow + 1);
        
        const row = Math.floor(i / itemsPerRow);
        const col = i % itemsPerRow;
        
        position = { 
          x: (col + 1) * rowSize - (Number(item.dimensions.width) || 50) / 2, 
          y: (row + 1) * colSize - (Number(item.dimensions.depth) || 50) / 2, 
          z: 0  // Always start on the floor
        };
        
        console.log(`Generated grid position for ${item.itemId}:`, position);
      }

      // Add the item to our data array
      itemsData.push({
        itemId: item.itemId,
        name: item.name || item.itemId,
        dimensions: {
          width: Number(item.dimensions.width) || 50,
          depth: Number(item.dimensions.depth) || 50,
          height: Number(item.dimensions.height) || 50
        },
        mass: Number(item.mass) || 1,
        priority: priority,
        expiryDate: item.expiryDate,
        preferredZone: item.preferredZone,
        description: item.description,
        usageLimit: item.usageLimit,
        isWaste: item.isWaste,
        position: position
      });
    }

    // Write the input data to JSON files for debugging/logging
    fs.writeFileSync(
      path.join(outputDir, 'container.json'),
      JSON.stringify(containerData, null, 2)
    );
    
    fs.writeFileSync(
      path.join(outputDir, 'items.json'),
      JSON.stringify(itemsData, null, 2)
    );

    // Create a reliable 3D visualization no matter what - skip Python for now
    const fallbackPath = path.join(outputDir, 'container_3d_visualization.html');
    const success = createContainerFallbackVisualization(containerData, itemsData, fallbackPath);
    
    if (success) {
        // Get just the path relative to the exports directory
      const relativeImagePath = `/exports/placements/container_${containerId}_${timestamp}/container_3d_visualization.html`;
        return res.json({
          success: true,
        imageUrl: relativeImagePath,
            message: 'Container visualization generated successfully'
          });
        } else {
      // If the visualization failed, return an error
      return res.status(500).json({
        success: false,
        message: 'Error generating container visualization'
      });
    }
  } catch (error) {
    console.error('Container visualization error:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating container visualization',
      error: error.message
    });
  }
});

// POST /api/placement/export-csv
router.post('/export-csv', async (req, res) => {
  try {
    const { containerId } = req.body;
    
    if (!containerId) {
      return res.status(400).json({
        success: false,
        message: 'Container ID is required'
      });
    }
    
    // Get container details
    const container = await Container.findOne({ containerId });
    if (!container) {
      return res.status(404).json({
        success: false,
        message: `Container with ID ${containerId} not found`
      });
    }
    
    // Get all items in the container
    const items = await Item.find({ currentContainer: containerId });
    
    if (!items || items.length === 0) {
      return res.status(404).json({
        success: false,
        message: `No items found in container ${containerId}`
      });
    }
    
    console.log(`Exporting CSV for ${items.length} items in container ${containerId}`);
    
    // Create a timestamp for this export
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const outputDir = path.join(exportsDir, 'csv');
    
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    const outputFile = path.join(outputDir, `container_${containerId}_${timestamp}.csv`);
    
    // Format items for CSV export
    const formattedItems = items.map(item => {
      // Ensure dimensions exist and have numeric values
      const width = item.dimensions?.width || 0;
      const depth = item.dimensions?.depth || 0;
      const height = item.dimensions?.height || 0;
      
      // Ensure position coordinates exist
      const posX = item.currentPosition?.startCoordinates?.width || 0;
      const posY = item.currentPosition?.startCoordinates?.depth || 0;
      const posZ = item.currentPosition?.startCoordinates?.height || 0;
      
      return {
        itemId: item.itemId,
        name: item.name,
        width: width,
        depth: depth,
        height: height,
        mass: item.mass || 0,
        priority: item.priority || 1,
        expiryDate: item.expiryDate ? new Date(item.expiryDate).toISOString() : '',
        preferredZone: item.preferredZone || 'A',
        positionX: posX,
        positionY: posY,
        positionZ: posZ
      };
    });
    
    // Create CSV Writer
    const csvWriter = createObjectCsvWriter({
      path: outputFile,
      header: [
        { id: 'itemId', title: 'Item ID' },
        { id: 'name', title: 'Name' },
        { id: 'width', title: 'Width' },
        { id: 'depth', title: 'Depth' },
        { id: 'height', title: 'Height' },
        { id: 'mass', title: 'Mass' },
        { id: 'priority', title: 'Priority' },
        { id: 'expiryDate', title: 'Expiry Date' },
        { id: 'preferredZone', title: 'Preferred Zone' },
        { id: 'positionX', title: 'Position X' },
        { id: 'positionY', title: 'Position Y' },
        { id: 'positionZ', title: 'Position Z' }
      ]
    });
    
    // Write CSV file
    await csvWriter.writeRecords(formattedItems);
    
    // Create download URL
    const downloadUrl = `/exports/csv/container_${containerId}_${timestamp}.csv`;
    
    // Log the export
    await Log.create({
      actionType: 'CONTAINER_EXPORT',
      details: `Exported ${items.length} items from container ${containerId} to CSV`,
      items: items.map(item => item.itemId),
      userId: req.body.userId || 'SYSTEM',
      timestamp: new Date()
    });
    
    res.json({
      success: true,
      message: `Successfully exported ${items.length} items to CSV`,
      csvFile: outputFile,
      downloadUrl: `http://localhost:8000${downloadUrl}`,
      items: items.length
    });
    } catch (error) {
    console.error('CSV export error:', error);
        res.status(500).json({
            success: false,
      message: 'Error exporting to CSV',
            error: error.message
        });
    }
});

// Helper function to create a fallback container visualization
function createContainerFallbackVisualization(container, items, outputPath) {
  try {
    const width = container.dimensions.width || 200;
    const depth = container.dimensions.depth || 200;
    const height = container.dimensions.height || 200;
    
    // Process each item with priority coloring
    const processedItems = items.map(item => {
      const itemWidth = item.dimensions.width || 50;
      const itemDepth = item.dimensions.depth || 50;
      const itemHeight = item.dimensions.height || 50;
      
      // Get position from item data, or use default center-bottom position
      let x = typeof item.position?.x === 'number' ? item.position.x : width/2 - itemWidth/2;
      let y = typeof item.position?.y === 'number' ? item.position.y : depth/2 - itemDepth/2;
      let z = typeof item.position?.z === 'number' ? item.position.z : 0; // Default to floor
      
      // Ensure items are visible within the container
      x = Math.max(0, Math.min(x, width - itemWidth)); 
      y = Math.max(0, Math.min(y, depth - itemDepth));
      z = Math.max(0, Math.min(z, height - itemHeight));
      
      // Priority-based coloring
      const priority = Number(item.priority) || 5;
      let color;
      if (priority >= 8) {
        color = '0xff3333'; // High priority - red
      } else if (priority >= 4) {
        color = '0xffcc00'; // Medium priority - yellow
      } else {
        color = '0x0099ff'; // Low priority - blue
      }
      
      return {
        name: item.name || item.itemId,
        width: itemWidth,
        depth: itemDepth,
        height: itemHeight,
        x: x,
        y: y,
        z: z,
        color: color,
        priority: priority
      };
    });
    
    // Generate the HTML with Three.js script for real 3D rendering
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Container ${container.containerId} - 3D Visualization</title>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.min.js"></script>
  <style>
    body {
      margin: 0;
      padding: 0;
      overflow: hidden;
      background-color: #000;
      color: #fff;
      font-family: Arial, sans-serif;
    }
    
    #info-panel {
          position: absolute;
      top: 10px;
      right: 10px;
      background: rgba(0, 10, 30, 0.8);
      padding: 15px;
      border-radius: 5px;
      max-width: 300px;
      z-index: 100;
      border: 1px solid rgba(100, 180, 255, 0.3);
      box-shadow: 0 0 20px rgba(0, 0, 0, 0.5);
    }
    
    #container-info {
            position: absolute;
      top: 10px;
      left: 10px;
      background: rgba(0, 10, 30, 0.8);
      padding: 15px;
      border-radius: 5px;
      z-index: 100;
      border: 1px solid rgba(100, 180, 255, 0.3);
      box-shadow: 0 0 20px rgba(0, 0, 0, 0.5);
    }
    
    #controls-info {
            position: absolute;
      bottom: 10px;
      left: 10px;
      background: rgba(0, 10, 30, 0.8);
      padding: 10px 15px;
      border-radius: 5px;
      z-index: 100;
      border: 1px solid rgba(100, 180, 255, 0.3);
      box-shadow: 0 0 20px rgba(0, 0, 0, 0.5);
            font-size: 12px;
    }
    
    .item-card {
          margin-bottom: 10px;
      padding: 8px;
            border-radius: 4px;
      border-left: 3px solid;
      background: rgba(0, 20, 50, 0.5);
      cursor: pointer;
      transition: all 0.2s;
    }
    
    .item-card:hover {
      background: rgba(20, 40, 80, 0.7);
      transform: translateX(2px);
    }
    
    .item-card.high-priority {
      border-left-color: #ff3333;
    }
    
    .item-card.medium-priority {
      border-left-color: #ffcc00;
    }
    
    .item-card.low-priority {
      border-left-color: #0099ff;
    }
    
    .item-card h4 {
      margin: 0 0 5px 0;
      font-size: 14px;
    }
    
    .item-card p {
      margin: 0;
      font-size: 12px;
      color: #ccc;
    }
    
    h3 {
      margin-top: 0;
      border-bottom: 1px solid rgba(255, 255, 255, 0.2);
      padding-bottom: 8px;
      font-size: 16px;
    }
    
    #canvas-container {
          position: absolute;
          top: 0;
          left: 0;
      width: 100%;
      height: 100%;
    }
    
    .highlight {
      box-shadow: 0 0 15px 2px white !important;
    }
  </style>
</head>
<body>
  <div id="canvas-container"></div>
  
  <div id="container-info">
    <h3>Container ${container.containerId}</h3>
    <p>Dimensions: ${width} × ${height} × ${depth}</p>
    <p>Items: ${items.length}</p>
  </div>
  
  <div id="info-panel">
    <h3>Container Items</h3>
    <div id="items-list">
      ${processedItems.map((item, index) => `
        <div class="item-card ${item.priority >= 8 ? 'high-priority' : item.priority >= 4 ? 'medium-priority' : 'low-priority'}" data-index="${index}">
          <h4>${item.name}</h4>
          <p>Size: ${item.width}×${item.height}×${item.depth}</p>
          <p>Position: (${item.x}, ${item.y}, ${item.z})</p>
        </div>
      `).join('')}
    </div>
  </div>
  
  <div id="controls-info">
    <p>Mouse: Left click + drag to rotate | Right click + drag to pan | Scroll to zoom</p>
    <p>Click on items in the list to highlight them in the 3D view</p>
  </div>

  <script>
    // Three.js setup
    let scene, camera, renderer, controls;
    let container, items = [], itemMeshes = [];
    let highlighted = null;
    
    // Container and item data from backend
    const containerData = {
      width: ${width},
      height: ${height},
      depth: ${depth}
    };
    
    const itemsData = ${JSON.stringify(processedItems)};
    
    // Initialize the scene
    function init() {
      // Create scene
      scene = new THREE.Scene();
      scene.background = new THREE.Color(0x050a14);
      
      // Create camera
      camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 5000);
      camera.position.set(containerData.width * 1.5, containerData.height * 1.5, containerData.depth * 1.5);
      
      // Create renderer
      renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.shadowMap.enabled = true;
      document.getElementById('canvas-container').appendChild(renderer.domElement);
      
      // Add orbit controls
      controls = new THREE.OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.1;
      
      // Add ambient light
      const ambientLight = new THREE.AmbientLight(0x606060);
      scene.add(ambientLight);
      
      // Add directional light
      const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
      directionalLight.position.set(containerData.width, containerData.height * 2, containerData.depth);
      directionalLight.castShadow = true;
      scene.add(directionalLight);
      
      // Add grid helper
      const size = Math.max(containerData.width, containerData.depth) * 2;
      const gridHelper = new THREE.GridHelper(size, size / 20, 0x444444, 0x222222);
      gridHelper.position.y = -0.5;
      scene.add(gridHelper);
      
      // Create container
      createContainer();
      
      // Create items
      createItems();
      
      // Add item selection event listeners
      const itemCards = document.querySelectorAll('.item-card');
      itemCards.forEach(card => {
        card.addEventListener('click', function() {
          const index = parseInt(this.dataset.index);
          highlightItem(index);
        });
      });
      
      // Handle window resize
      window.addEventListener('resize', onWindowResize);
      
      // Initial render
      animate();
    }
    
    // Create the container wireframe box
    function createContainer() {
      // Create wireframe material
      const material = new THREE.MeshBasicMaterial({
        color: 0x3080ff,
        wireframe: true,
        transparent: true,
        opacity: 0.3
      });
      
      // Create container box
      const geometry = new THREE.BoxGeometry(
        containerData.width,
        containerData.height,
        containerData.depth
      );
      
      container = new THREE.Mesh(geometry, material);
      
      // Center the container
      container.position.set(
        containerData.width / 2,
        containerData.height / 2,
        containerData.depth / 2
      );
      
      scene.add(container);
      
      // Add container edges for better visibility
      const edges = new THREE.EdgesGeometry(geometry);
      const edgesMaterial = new THREE.LineBasicMaterial({ color: 0x4090ff, linewidth: 2 });
      const containerEdges = new THREE.LineSegments(edges, edgesMaterial);
      containerEdges.position.copy(container.position);
      scene.add(containerEdges);
      
      // Add dimension lines and labels
      addDimensionHelper();
    }
    
    // Add dimension lines and labels
    function addDimensionHelper() {
      // Material for dimension lines
      const lineMaterial = new THREE.LineBasicMaterial({ color: 0xffffff });
      
      // Width dimension
      const widthGeometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, -10, 0),
        new THREE.Vector3(containerData.width, -10, 0)
      ]);
      const widthLine = new THREE.Line(widthGeometry, lineMaterial);
      scene.add(widthLine);
      
      // Height dimension
      const heightGeometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(-10, 0, 0),
        new THREE.Vector3(-10, containerData.height, 0)
      ]);
      const heightLine = new THREE.Line(heightGeometry, lineMaterial);
      scene.add(heightLine);
      
      // Depth dimension
      const depthGeometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, -10, -10),
        new THREE.Vector3(0, -10, containerData.depth)
      ]);
      const depthLine = new THREE.Line(depthGeometry, lineMaterial);
      scene.add(depthLine);
    }
    
    // Create items inside the container
    function createItems() {
      itemsData.forEach((item, index) => {
        // Create item material with the priority color
        const material = new THREE.MeshPhongMaterial({
          color: parseInt(item.color),
          transparent: true,
          opacity: 0.85,
          specular: 0x111111,
          shininess: 30
        });
        
        // Create item geometry
        const geometry = new THREE.BoxGeometry(item.width, item.height, item.depth);
        const mesh = new THREE.Mesh(geometry, material);
        
        // Position the item - adjust to place bottom of item at z=0
        mesh.position.set(
          item.x + item.width / 2,
          item.z + item.height / 2,
          item.y + item.depth / 2
        );
        
        // Add to scene and store reference
        scene.add(mesh);
        itemMeshes.push({
          mesh: mesh,
          data: item
        });
        
        // Add item edges for better visibility
        const edges = new THREE.EdgesGeometry(geometry);
        const edgesMaterial = new THREE.LineBasicMaterial({ color: 0xffffff });
        const itemEdges = new THREE.LineSegments(edges, edgesMaterial);
        itemEdges.position.copy(mesh.position);
        scene.add(itemEdges);
        
        // Add item label
        addItemLabel(item, mesh);
      });
    }
    
    // Add label to item
    function addItemLabel(item, mesh) {
      const canvas = document.createElement('canvas');
      canvas.width = 128;
      canvas.height = 64;
      const ctx = canvas.getContext('2d');
      
      // Draw background
      ctx.fillStyle = 'rgba(0, 20, 40, 0.8)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Draw border
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.lineWidth = 2;
      ctx.strokeRect(0, 0, canvas.width, canvas.height);
      
      // Draw text
      ctx.fillStyle = 'white';
      ctx.font = '14px Arial';
      ctx.fillText(item.name, 10, 20);
      ctx.font = '12px Arial';
      ctx.fillText(\`\${item.width}×\${item.height}×\${item.depth}\`, 10, 40);
      
      // Create texture and sprite
      const texture = new THREE.CanvasTexture(canvas);
      const spriteMaterial = new THREE.SpriteMaterial({ map: texture });
      const sprite = new THREE.Sprite(spriteMaterial);
      
      // Position sprite above the item
      sprite.position.set(
        mesh.position.x,
        mesh.position.y + item.height / 2 + 20,
        mesh.position.z
      );
      
      sprite.scale.set(40, 20, 1);
      scene.add(sprite);
    }
    
    // Highlight an item
    function highlightItem(index) {
      // Reset previous highlight
      if (highlighted !== null) {
        const prevMaterial = itemMeshes[highlighted].mesh.material;
        prevMaterial.emissive.setHex(0x000000);
        
        // Reset card highlighting
        document.querySelectorAll('.item-card').forEach(card => {
          card.classList.remove('highlight');
        });
      }
      
      // Highlight new item (unless clicking the same one to toggle off)
      if (highlighted !== index) {
        const material = itemMeshes[index].mesh.material;
        material.emissive.setHex(0x333333);
        highlighted = index;
        
        // Center camera on this item
        const item = itemMeshes[index];
        controls.target.copy(item.mesh.position);
        
        // Highlight the card
        document.querySelector(\`.item-card[data-index="\${index}"]\`).classList.add('highlight');
      } else {
        highlighted = null;
        // Reset orbit controls target to center of container
        controls.target.set(
          containerData.width / 2,
          containerData.height / 2,
          containerData.depth / 2
        );
      }
      
      controls.update();
    }
    
    // Handle window resize
    function onWindowResize() {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    }
    
    // Animation loop
    function animate() {
      requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    }
    
    // Initialize when page loads
    window.addEventListener('load', init);
      </script>
    </body>
</html>`;

    // Write the HTML file
    fs.writeFileSync(outputPath, html);
    
    return true;
  } catch (error) {
    console.error('Error creating container visualization:', error);
    return false;
  }
}

module.exports = router;