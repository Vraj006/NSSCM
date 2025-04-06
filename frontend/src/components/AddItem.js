import React, { useState } from 'react';
import axios from 'axios';
import { TextField, Button, Container, Typography, Box, Alert } from '@mui/material';

const AddItem = () => {
  const [item, setItem] = useState({
    itemId: '',
    name: '',
    dimensions: { width: '', depth: '', height: '' },
    mass: '',
    priority: '',
    expiryDate: '',
    usageLimit: '',
    preferredZone: '',
    remainingUses: '',
    isWaste: false,
    wasteReason: null,
  });
  const [error, setError] = useState(null); // State for error messages

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name.startsWith('dimensions.')) {
      const dimension = name.split('.')[1];
      setItem((prev) => ({
        ...prev,
        dimensions: { ...prev.dimensions, [dimension]: value },
      }));
    } else {
      setItem((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      const itemToSubmit = {
        ...item,
        remainingUses: parseInt(item.usageLimit)
      };
      
      const response = await axios.post('http://localhost:8000/api/items', itemToSubmit);
      alert(`Item added: ${response.data.name}`);
      setItem({
        itemId: '',
        name: '',
        dimensions: { width: '', depth: '', height: '' },
        mass: '',
        priority: '',
        expiryDate: '',
        usageLimit: '',
        preferredZone: '',
        remainingUses: '',
        isWaste: false,
        wasteReason: null,
      });
    } catch (error) {
      console.error('Error adding item:', error);
      setError('Failed to add item. Please check your input and try again.');
    }
  };

  return (
    <Container maxWidth="sm" sx={{ mt: 10, p: 4, backgroundColor: 'background.paper', borderRadius: 2, boxShadow: 3 }}>
      <Typography variant="h4" component="h2" gutterBottom sx={{ fontWeight: 'bold', color: 'primary.main', mb: 3 }}>
        Add New Item
      </Typography>
      {error && <Alert severity="error" sx={{ mb: 3, borderRadius: 1 }}>{error}</Alert>}
      <form onSubmit={handleSubmit}>
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 3 }}>
          <TextField
            name="itemId"
            label="Item ID"
            value={item.itemId}
            onChange={handleChange}
            required
            variant="outlined"
          />
          <TextField
            name="name"
            label="Item Name"
            value={item.name}
            onChange={handleChange}
            required
            variant="outlined"
          />
          <TextField
            name="dimensions.width"
            label="Width"
            type="number"
            value={item.dimensions.width}
            onChange={handleChange}
            required
            variant="outlined"
          />
          <TextField
            name="dimensions.depth"
            label="Depth"
            type="number"
            value={item.dimensions.depth}
            onChange={handleChange}
            required
            variant="outlined"
          />
          <TextField
            name="dimensions.height"
            label="Height"
            type="number"
            value={item.dimensions.height}
            onChange={handleChange}
            required
            variant="outlined"
          />
          <TextField
            name="mass"
            label="Mass"
            type="number"
            value={item.mass}
            onChange={handleChange}
            required
            variant="outlined"
          />
          <TextField
            name="priority"
            label="Priority"
            type="number"
            value={item.priority}
            onChange={handleChange}
            required
            variant="outlined"
          />
          <TextField
            name="expiryDate"
            label="Expiry Date"
            type="date"
            value={item.expiryDate}
            onChange={handleChange}
            required
            variant="outlined"
            InputLabelProps={{
              shrink: true,
            }}
          />
          <TextField
            name="usageLimit"
            label="Usage Limit"
            type="number"
            value={item.usageLimit}
            onChange={handleChange}
            required
            variant="outlined"
          />
          <TextField
            name="preferredZone"
            label="Preferred Zone"
            value={item.preferredZone}
            onChange={handleChange}
            required
            variant="outlined"
          />
          <TextField
            name="remainingUses"
            label="Remaining Uses"
            value={item.usageLimit}
            disabled
            variant="outlined"
          />
          <Button
            type="submit"
            variant="contained"
            size="large"
            sx={{ 
              gridColumn: '1 / -1', 
              py: 1.5, 
              fontSize: '1.1rem',
              background: 'linear-gradient(45deg, #1976d2 30%, #21CBF3 90%)',
              color: 'white',
              '&:hover': {
                background: 'linear-gradient(45deg, #1565c0 30%, #1e88e5 90%)'
              }
            }}
          >
            Add Item
          </Button>
        </Box>
      </form>
    </Container>
  );
};

export default AddItem;