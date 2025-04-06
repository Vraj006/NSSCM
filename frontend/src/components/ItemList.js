import React, { useEffect, useState } from 'react';
import axios from 'axios';
import UpdateItem from './UpdateItem';
import {
  Container,
  Typography,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Button,
  Alert,
  CircularProgress,
} from '@mui/material';

const ItemList = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);

  useEffect(() => {
    const fetchItems = async () => {
      try {
        const response = await axios.get('http://localhost:8000/api/items');
        setItems(response.data);
      } catch (err) {
        setError('Error fetching items. Please try again later.'); // Set error message
      } finally {
        setLoading(false);
      }
    };

    fetchItems();
  }, []);

  const handleUpdate = () => {
    // Refresh the item list after an update
    const fetchItems = async () => {
      try {
        const response = await axios.get('http://localhost:8000/api/items');
        setItems(response.data);
      } catch (err) {
        setError('Error fetching items. Please try again later.'); // Set error message
      }
    };
    fetchItems();
    setSelectedItem(null); // Close the update form
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this item?')) {
      try {
        await axios.delete(`http://localhost:8000/api/items/${id}`);
        alert('Item deleted successfully!');
        handleUpdate(); // Refresh the item list after deletion
      } catch (error) {
        console.error('Error deleting item:', error);
        setError('Failed to delete item. Please try again.'); // Set error message
      }
    }
  };

  if (loading) return <CircularProgress />; // Show loading spinner
  if (error) return <Alert severity="error">{error}</Alert>; // Display error message

  return (
    <Container maxWidth="lg" sx={{ mt: 4 ,mb: 4}}>
      <Typography variant="h4" component="h2" gutterBottom sx={{ fontWeight: 'bold', color: 'primary.main', mb: 3 }}>
        Item List
      </Typography>
      {selectedItem ? (
        <UpdateItem item={selectedItem} onUpdate={handleUpdate} />
      ) : (
        <Table sx={{ 
          backgroundColor: 'background.paper',
          borderRadius: 2,
          boxShadow: 3,
          overflow: 'hidden'
        }}>
          <TableHead sx={{ background: 'linear-gradient(45deg, #1976d2 30%, #21CBF3 90%)'  }}>
            <TableRow>
              {['Item ID', 'Name', 'Dimensions', 'Mass', 'Priority', 'Expiry Date', 'Usage Limit', 'Preferred Zone', 'Actions'].map((header) => (
                <TableCell key={header} sx={{  color: 'white', fontWeight: 'bold',fontSize:'1rem' }}>
                  {header}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item._id} hover sx={{ '&:last-child td': { border: 0 } }}>
                <TableCell>{item.itemId}</TableCell>
                <TableCell>{item.name}</TableCell>
                <TableCell>{`${item.dimensions.width} x ${item.dimensions.depth} x ${item.dimensions.height}`}</TableCell>
                <TableCell>{item.mass}</TableCell>
                <TableCell>{item.priority}</TableCell>
                <TableCell>{new Date(item.expiryDate).toLocaleDateString()}</TableCell>
                <TableCell>{item.usageLimit}</TableCell>
                <TableCell>{item.preferredZone}</TableCell>
                <TableCell>
                  <Button 
                    variant="contained" 
                    size="small" 
                    onClick={() => setSelectedItem(item)}
                    sx={{ 
                      mr: 1,
                      background: 'linear-gradient(45deg, #1976d2 30%, #21CBF3 90%)',
                      color: 'white',
                      '&:hover': {
                        background: 'linear-gradient(45deg, #1565c0 30%, #1e88e5 90%)'
                      }
                    }}z
                  >
                    Update
                  </Button>
                  <Button 
                    variant="outlined" 
                    color="error" 
                    size="small" 
                    sx={{ 
                      background: 'linear-gradient(45deg, #d32f2f 30%, #f44336 90%)',
                      color: 'white',
                      '&:hover': {
                        background: 'linear-gradient(45deg, #c62828 30%, #e53935 90%)'
                      }
                    }}
                    onClick={() => handleDelete(item._id)}
                  >
                    Delete
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Container>
  );
};

export default ItemList;