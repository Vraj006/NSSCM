// import React, { useState } from 'react';
// import axios from 'axios';

// const UpdateItem = ({ item, onUpdate }) => {
//   const [updatedItem, setUpdatedItem] = useState(item);

//   const handleChange = (e) => {
//     const { name, value } = e.target;
//     if (name.startsWith('dimensions.')) {
//       const dimension = name.split('.')[1];
//       setUpdatedItem((prev) => ({
//         ...prev,
//         dimensions: { ...prev.dimensions, [dimension]: value },
//       }));
//     } else {
//       setUpdatedItem((prev) => ({ ...prev, [name]: value }));
//     }
//   };

//   const handleSubmit = async (e) => {
//     e.preventDefault();
//     try {
//       await axios.put(`http://localhost:8000/api/items/${item._id}`, updatedItem);
//       alert('Item updated successfully!');
//       onUpdate(); // Call the onUpdate function to refresh the item list
//     } catch (error) {
//       console.error('Error updating item:', error);
//       alert('Failed to update item.');
//     }
//   };

//   return (
//     <form onSubmit={handleSubmit}>
//       <h2>Update Item</h2>
//       <input type="text" name="itemId" placeholder="Item ID" value={updatedItem.itemId} onChange={handleChange} required />
//       <input type="text" name="name" placeholder="Item Name" value={updatedItem.name} onChange={handleChange} required />
//       <input type="number" name="dimensions.width" placeholder="Width" value={updatedItem.dimensions.width} onChange={handleChange} required />
//       <input type="number" name="dimensions.depth" placeholder="Depth" value={updatedItem.dimensions.depth} onChange={handleChange} required />
//       <input type="number" name="dimensions.height" placeholder="Height" value={updatedItem.dimensions.height} onChange={handleChange} required />
//       <input type="number" name="mass" placeholder="Mass" value={updatedItem.mass} onChange={handleChange} required />
//       <input type="number" name="priority" placeholder="Priority" value={updatedItem.priority} onChange={handleChange} required />
//       <input type="date" name="expiryDate" value={updatedItem.expiryDate} onChange={handleChange} required />
//       <input type="number" name="usageLimit" placeholder="Usage Limit" value={updatedItem.usageLimit} onChange={handleChange} required />
//       <input type="text" name="preferredZone" placeholder="Preferred Zone" value={updatedItem.preferredZone} onChange={handleChange} required />
//       <button type="submit">Update Item</button>
//     </form>
//   );
// };

// export default UpdateItem;





















import React, { useState } from 'react';
import axios from 'axios';
import { Container, Typography, TextField, Button, Box, Alert } from '@mui/material';

const UpdateItem = ({ item, onUpdate }) => {
  const [updatedItem, setUpdatedItem] = useState({
    ...item,
    // Ensure all new fields are included
    remainingUses: item.remainingUses || item.usageLimit,
    isWaste: item.isWaste || false,
    wasteReason: item.wasteReason || null,
  });
  const [error, setError] = useState(null); // State for error messages

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name.startsWith('dimensions.')) {
      const dimension = name.split('.')[1];
      setUpdatedItem((prev) => ({
        ...prev,
        dimensions: { ...prev.dimensions, [dimension]: value },
      }));
    } else {
      setUpdatedItem((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      await axios.put(`http://localhost:8000/api/items/${item._id}`, updatedItem);
      alert('Item updated successfully!');
      onUpdate();
    } catch (error) {
      console.error('Error updating item:', error);
      setError('Failed to update item. Please check your input and try again.');
    }
  };

  return (
    <Container maxWidth="sm" sx={{ mt: 4, p: 4, backgroundColor: 'background.paper', borderRadius: 2, boxShadow: 3 }}>
      <Typography variant="h4" component="h2" gutterBottom sx={{ fontWeight: 'bold', color: 'primary.main', mb: 3 }}>
        Update Item
      </Typography>
      {error && <Alert severity="error" sx={{ mb: 3, borderRadius: 1 }}>{error}</Alert>}
      <form onSubmit={handleSubmit}>
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 3 }}>
          <TextField
            name="itemId"
            label="Item ID"
            value={updatedItem.itemId}
            onChange={handleChange}
            required
            variant="outlined"
          />
          <TextField
            name="name"
            label="Item Name"
            value={updatedItem.name}
            onChange={handleChange}
            required
            variant="outlined"
          />
          <TextField
            name="dimensions.width"
            label="Width"
            type="number"
            value={updatedItem.dimensions.width}
            onChange={handleChange}
            required
            variant="outlined"
          />
          <TextField
            name="dimensions.depth"
            label="Depth"
            type="number"
            value={updatedItem.dimensions.depth}
            onChange={handleChange}
            required
            variant="outlined"
          />
          <TextField
            name="dimensions.height"
            label="Height"
            type="number"
            value={updatedItem.dimensions.height}
            onChange={handleChange}
            required
            variant="outlined"
          />
          <TextField
            name="mass"
            label="Mass"
            type="number"
            value={updatedItem.mass}
            onChange={handleChange}
            required
            variant="outlined"
          />
          <TextField
            name="priority"
            label="Priority"
            type="number"
            value={updatedItem.priority}
            onChange={handleChange}
            required
            variant="outlined"
          />
          <TextField
            name="expiryDate"
            label="Expiry Date"
            type="date"
            value={updatedItem.expiryDate}
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
            value={updatedItem.usageLimit}
            onChange={handleChange}
            required
            variant="outlined"
          />
          <TextField
            name="preferredZone"
            label="Preferred Zone"
            value={updatedItem.preferredZone}
            onChange={handleChange}
            required
            variant="outlined"
          />
          <TextField
            name="remainingUses"
            label="Remaining Uses"
            type="number"
            value={updatedItem.remainingUses}
            onChange={handleChange}
            variant="outlined"
          />
          <Button
            type="submit"
            variant="contained"
            size="large"
            sx={{ gridColumn: '1 / -1', py: 1.5, fontSize: '1.1rem' }}
          >
            Update Item
          </Button>
        </Box>
      </form>
    </Container>
  );
};

export default UpdateItem;