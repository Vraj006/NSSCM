const express = require('express');
const Item = require('../models/Item');
const multer = require('multer');
const csv = require('csv-parser');
const fs = require('fs');
const router = express.Router();

// Set up multer for file uploads
const upload = multer({ dest: 'uploads/' });

// Create a new item
router.post('/', async (req, res) => {
  try {
    const newItem = new Item({
      ...req.body,
      remainingUses: req.body.usageLimit, // Initialize remaining uses
      isWaste: false,
      wasteReason: null
    });
    await newItem.save();
    res.status(201).json(newItem);
  } catch (error) {
    res.status(400).json({ message: 'Error creating item: ' + error.message });
  }
});

// Get all items
router.get('/', async (req, res) => {
  try {
    const items = await Item.find();
    res.status(200).json(items);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching items: ' + error.message });
  }
});

// Get a single item by ID
router.get('/:id', async (req, res) => {
  try {
    const item = await Item.findById(req.params.id);
    if (!item) return res.status(404).json({ message: 'Item not found' });
    res.status(200).json(item);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching item: ' + error.message });
  }
});

// Update an item
router.put('/:id', async (req, res) => {
  try {
    const updatedItem = await Item.findByIdAndUpdate(
      req.params.id, 
      {
        ...req.body,
        lastModified: Date.now()
      },
      { new: true }
    );
    if (!updatedItem) return res.status(404).json({ message: 'Item not found' });
    res.status(200).json(updatedItem);
  } catch (error) {
    res.status(400).json({ message: 'Error updating item: ' + error.message });
  }
});

// Delete an item
router.delete('/:id', async (req, res) => {
  try {
    const deletedItem = await Item.findByIdAndDelete(req.params.id);
    if (!deletedItem) return res.status(404).json({ message: 'Item not found' });
    res.status(200).json({ message: 'Item deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting item: ' + error.message });
  }
});

// CSV Upload Route
router.post('/import', upload.single('file'), (req, res) => {
    const results = [];
    
    // Check if a file was uploaded
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded.' });
    }
  
    // Read the uploaded CSV file
    fs.createReadStream(req.file.path)
      .pipe(csv())
      .on('data', (data) => results.push(data))
      .on('end', async () => {
        try {
          // Process results and save to MongoDB
          for (const item of results) {
            await Item.create({
              itemId: item.itemId,
              name: item.name,
              dimensions: {
                width: parseFloat(item.width),
                depth: parseFloat(item.depth),
                height: parseFloat(item.height),
              },
              mass: parseFloat(item.mass),
              priority: parseInt(item.priority),
              expiryDate: new Date(item.expiryDate),
              usageLimit: parseInt(item.usageLimit),
              preferredZone: item.preferredZone,
            });
          }
          res.json({ success: true, itemsImported: results.length });
          fs.unlinkSync(req.file.path); // Clean up the uploaded file
        } catch (error) {
          console.error('Error saving items to database:', error);
          res.status(500).json({ success: false, message: 'Error saving items to database: ' + error.message });
        }
      })
      .on('error', (error) => {
        console.error('Error reading CSV file:', error);
        res.status(500).json({ success: false, message: 'Error reading CSV file: ' + error.message });
      });
  });

module.exports = router;