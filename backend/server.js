// server.js
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const itemRoutes = require('./routes/itemRoutes');
const placementRoutes = require('./routes/placementRoutes');
const searchRoutes = require('./routes/searchRoutes');
const wasteRoutes = require('./routes/wasteRoutes');
const simulationRoutes = require('./routes/simulationRoutes');
const logRoutes = require('./routes/logRoutes');
const importExportRoutes = require('./routes/importExportRoutes');
const containerRoutes = require('./routes/containerRoutes');
const retrievalRoutes = require('./routes/retrievalRoutes');
require('dotenv').config();
// ... existing imports
const dashboardRoutes = require('./routes/dashboardRoutes');
const fs = require('fs');

// Add code to ensure the exports directory exists
const exportsDir = path.join(__dirname, 'exports');
if (!fs.existsSync(exportsDir)) {
  fs.mkdirSync(exportsDir, { recursive: true });
  console.log('Created exports directory:', exportsDir);
}

// Create placements directory if it doesn't exist
const placementsDir = path.join(exportsDir, 'placements');
if (!fs.existsSync(placementsDir)) {
  fs.mkdirSync(placementsDir, { recursive: true });
  console.log('Created placements directory:', placementsDir);
}

// ... rest of your server code

const app = express();
const PORT = process.env.PORT || 8000;

// Middleware
app.use(cors());
app.use(express.json());

// Ensure uploads directory exists
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Serve exports directory for visualizations
app.use('/exports', express.static(path.join(__dirname, 'exports')));

// Add a route for directly viewing HTML files
app.get('/view/:file', (req, res) => {
  const filePath = path.join(__dirname, 'exports', 'placements', req.params.file);
  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    res.status(404).send('File not found');
  }
});

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

// Routes
app.use('/api/items', itemRoutes);
app.use('/api/containers', containerRoutes);
app.use('/api/waste', wasteRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/placement', placementRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/simulate', simulationRoutes);
app.use('/api/logs', logRoutes);
app.use('/api/import', importExportRoutes);
app.use('/api/export', importExportRoutes);
app.use('/api/retrieve', retrievalRoutes);

// Serve static files from the React frontend app in production
// Check if the frontend build directory exists
const frontendBuildPath = path.join(__dirname, '..', 'frontend', 'build');
if (fs.existsSync(frontendBuildPath)) {
  console.log('Serving React frontend from:', frontendBuildPath);
  app.use(express.static(frontendBuildPath));

  // Handles any requests that don't match the ones above
  app.get('*', (req, res) => {
    res.sendFile(path.join(frontendBuildPath, 'index.html'));
  });
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    success: false, 
    message: 'Internal server error',
    error: err.message 
  });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on http://0.0.0.0:${PORT}`);
});