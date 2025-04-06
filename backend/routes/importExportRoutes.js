const express = require('express');
const router = express.Router();
const multer = require('multer');
const csv = require('csv-parser');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const fs = require('fs');
const path = require('path');
const Item = require('../models/Item');
const Container = require('../models/Container');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/')
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname)
  }
});

const upload = multer({ storage: storage });

// POST /api/import/items
router.post('/items', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    const results = [];
    const errors = [];

    fs.createReadStream(req.file.path)
      .pipe(csv())
      .on('data', (data) => {
        try {
          // Transform CSV data to match Item schema
          const transformedData = {
            itemId: data.itemId,
            name: data.name,
            dimensions: {
              width: parseFloat(data.width),
              depth: parseFloat(data.depth),
              height: parseFloat(data.height)
            },
            mass: parseFloat(data.mass),
            priority: parseInt(data.priority),
            expiryDate: new Date(data.expiryDate),
            usageLimit: parseInt(data.usageLimit),
            remainingUses: parseInt(data.usageLimit), // Initialize with usageLimit
            preferredZone: data.preferredZone,
            isWaste: false,
            wasteReason: null
          };
          results.push(transformedData);
        } catch (error) {
          errors.push({
            row: results.length + 1,
            error: error.message
          });
        }
      })
      .on('end', async () => {
        try {
          // Process and save items
          const savedItems = await Item.insertMany(results);
          
          // Clean up uploaded file
          fs.unlinkSync(req.file.path);

          res.json({
            success: true,
            itemsImported: savedItems.length,
            errors: errors
          });
        } catch (error) {
          console.error('Error saving items:', error);
          res.status(500).json({
            success: false,
            message: 'Error saving items',
            error: error.message,
            details: errors
          });
        }
      });
  } catch (error) {
    console.error('Import error:', error);
    res.status(500).json({
      success: false,
      message: 'Error processing file',
      error: error.message
    });
  }
});

// POST /api/import/containers
router.post('/containers', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    const results = [];
    const errors = [];

    fs.createReadStream(req.file.path)
      .pipe(csv())
      .on('data', (data) => {
        try {
          // Transform CSV data to match Container schema
          const transformedData = {
            containerId: data.containerId,
            zone: data.zone,
            dimensions: {
              width: parseFloat(data.width),
              depth: parseFloat(data.depth),
              height: parseFloat(data.height)
            }
          };
          results.push(transformedData);
        } catch (error) {
          errors.push({
            row: results.length + 1,
            error: error.message
          });
        }
      })
      .on('end', async () => {
        try {
          const savedContainers = await Container.insertMany(results);
          
          // Clean up uploaded file
          fs.unlinkSync(req.file.path);

          res.json({
            success: true,
            containersImported: savedContainers.length,
            errors: errors
          });
        } catch (error) {
          console.error('Error saving containers:', error);
          res.status(500).json({
            success: false,
            message: 'Error saving containers',
            error: error.message,
            details: errors
          });
        }
      });
  } catch (error) {
    console.error('Import error:', error);
    res.status(500).json({
      success: false,
      message: 'Error processing file',
      error: error.message
    });
  }
});

// GET /api/export/arrangement
router.get('/arrangement', async (req, res) => {
  try {
    // Ensure exports directory exists
    const exportDir = path.join(__dirname, '../exports');
    if (!fs.existsSync(exportDir)) {
      fs.mkdirSync(exportDir, { recursive: true });
    }

    // Generate a unique filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `cargo_arrangement_${timestamp}.csv`;
    const filePath = path.join(exportDir, filename);

    // Get all items with their current positions
    const items = await Item.find({}).lean();
    
    // Fetch all containers to get zone information
    const containers = await Container.find({}).lean();
    
    // Create a lookup map for containers
    const containerMap = {};
    containers.forEach(container => {
      containerMap[container.containerId] = container;
    });

    console.log(`Exporting arrangement data for ${items.length} items and ${containers.length} containers`);

    // Create CSV writer with enhanced fields
    const csvWriter = createCsvWriter({
      path: filePath,
      header: [
        { id: 'itemId', title: 'Item ID' },
        { id: 'name', title: 'Item Name' },
        { id: 'containerId', title: 'Container ID' },
        { id: 'containerZone', title: 'Container Zone' },
        { id: 'preferredZone', title: 'Preferred Zone' },
        { id: 'positionX', title: 'Position X' },
        { id: 'positionY', title: 'Position Y' },
        { id: 'positionZ', title: 'Position Z' },
        { id: 'width', title: 'Width' },
        { id: 'depth', title: 'Depth' },
        { id: 'height', title: 'Height' },
        { id: 'mass', title: 'Mass (kg)' },
        { id: 'priority', title: 'Priority' },
        { id: 'expiryDate', title: 'Expiry Date' },
        { id: 'isWaste', title: 'Is Waste' },
        { id: 'placementDate', title: 'Placement Date' }
      ]
    });

    // Format data for CSV with enhanced information
    const records = items.map(item => {
      // Get container information if available
      const container = item.currentContainer ? containerMap[item.currentContainer] : null;
      
      // Check if position data is valid/exists
      let posX = item.currentPosition?.startCoordinates?.width;
      let posY = item.currentPosition?.startCoordinates?.depth;
      let posZ = item.currentPosition?.startCoordinates?.height;
      
      // Determine if position data is valid (not undefined and not all zeros)
      const hasValidPosition = posX !== undefined && posY !== undefined && posZ !== undefined && 
                              (posX !== 0 || posY !== 0 || posZ !== 0);
                              
      // If position data is missing or invalid, generate grid-based position
      if (!hasValidPosition && container) {
        console.log(`Generating placement position for item ${item.itemId} in container ${container.containerId}`);
        
        // Get container dimensions
        const containerWidth = container.dimensions.width || 200;
        const containerDepth = container.dimensions.depth || 200;
        
        // Get all items in this container to calculate grid
        const containerItems = items.filter(i => i.currentContainer === container.containerId);
        const itemIndex = containerItems.findIndex(i => i.itemId === item.itemId);
        
        // Create a grid-based placement
        const itemsPerRow = Math.ceil(Math.sqrt(containerItems.length));
        const rowSize = containerWidth / (itemsPerRow + 1);
        const colSize = containerDepth / (itemsPerRow + 1);
        
        const row = Math.floor(itemIndex / itemsPerRow);
        const col = itemIndex % itemsPerRow;
        
        const itemWidth = item.dimensions?.width || 50;
        const itemDepth = item.dimensions?.depth || 50;
        
        posX = (col + 1) * rowSize - (itemWidth / 2);
        posY = (row + 1) * colSize - (itemDepth / 2);
        posZ = 0; // Place on floor
      }
      
      return {
        itemId: item.itemId,
        name: item.name || 'Unnamed Item',
        containerId: item.currentContainer || 'Not Assigned',
        containerZone: container ? container.zone : 'N/A',
        preferredZone: item.preferredZone || 'N/A',
        positionX: posX || 0,
        positionY: posY || 0,
        positionZ: posZ || 0,
        width: item.dimensions?.width || 0,
        depth: item.dimensions?.depth || 0,
        height: item.dimensions?.height || 0,
        mass: item.mass || 0,
        priority: item.priority || 1,
        expiryDate: item.expiryDate ? new Date(item.expiryDate).toISOString().split('T')[0] : 'N/A',
        isWaste: item.isWaste ? 'Yes' : 'No',
        placementDate: item.placementDate ? new Date(item.placementDate).toISOString() : 'N/A'
      };
    });

    // Write to CSV file
    await csvWriter.writeRecords(records);
    console.log(`CSV file written to ${filePath}`);

    // Make the file available for download
    const downloadPath = `/exports/${filename}`;
    
    // Send success response with download link
    res.json({
      success: true,
      message: 'Arrangement data exported successfully',
      fileName: filename,
      downloadUrl: `http://localhost:8000${downloadPath}`,
      recordCount: records.length
    });
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({
      success: false,
      message: 'Error exporting arrangement data',
      error: error.message
    });
  }
});

// GET /api/export/arrangement/download/:filename
router.get('/arrangement/download/:filename', (req, res) => {
  try {
    const { filename } = req.params;
    
    // Sanitize filename to prevent directory traversal
    const sanitizedFilename = path.basename(filename);
    const filePath = path.join(__dirname, '../exports', sanitizedFilename);
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: 'File not found'
      });
    }
    
    // Set headers for file download
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${sanitizedFilename}"`);
    
    // Create read stream to send file
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
    
    // Handle stream errors
    fileStream.on('error', (error) => {
      console.error('Error streaming file:', error);
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          message: 'Error downloading file',
          error: error.message
        });
      }
    });
  } catch (error) {
    console.error('Download error:', error);
    res.status(500).json({
      success: false,
      message: 'Error downloading file',
      error: error.message
    });
  }
});

module.exports = router; 