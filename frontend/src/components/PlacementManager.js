import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
    Container,
    Typography,
    Box,
    TextField,
    Button,
    Alert,
    Paper,
    List,
    ListItem,
    ListItemText,
    MenuItem,
    Select,
    FormControl,
    InputLabel,
    CircularProgress,
    useTheme,
    alpha,
    Grid,
    Card,
    CardContent,
    Divider,
    IconButton,
    Tooltip,
    LinearProgress,
    CardActions,
    Snackbar
} from '@mui/material';
import { Rocket as RocketIcon, Storage as StorageIcon, LocationOn as LocationIcon, ThreeDRotation as ThreeDIcon, Close as CloseIcon, Delete as DeleteIcon } from '@mui/icons-material';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';

const ItemCard = ({ item, onView, onEdit, onDelete }) => (
  <Card sx={{ mb: 2, bgcolor: 'background.paper' }}>
    <CardContent>
      <Typography variant="h6" component="div" gutterBottom>
        {item.name || item.itemId || 'Unnamed Item'}
      </Typography>
      <Typography color="text.secondary" gutterBottom>
        ID: {item.itemId || 'No ID'}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        Dimensions: {item.dimensions?.width || 0} × {item.dimensions?.depth || 0} × {item.dimensions?.height || 0}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        Mass: {item.mass || 0}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        Priority: {item.priority || 1}
      </Typography>
      {item.preferredZone && (
        <Typography variant="body2" color="text.secondary">
          Preferred Zone: {item.preferredZone}
        </Typography>
      )}
    </CardContent>
    <CardActions>
      <Button size="small" onClick={() => onView(item)}>
        View 3D
      </Button>
      <Button size="small" onClick={() => onEdit(item)}>
        Edit
      </Button>
      <Button size="small" color="error" onClick={() => onDelete(item)}>
        Delete
      </Button>
    </CardActions>
  </Card>
);

const PlacementManager = () => {
    const theme = useTheme();
  const [availableItems, setAvailableItems] = useState([]);
  const [availableContainers, setAvailableContainers] = useState([]);
  const [selectedItems, setSelectedItems] = useState([]);
  const [selectedContainers, setSelectedContainers] = useState([]);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [open3DDialog, setOpen3DDialog] = useState(false);
  const [visualizationUrl, setVisualizationUrl] = useState(null);
  const [openContainerDialog, setOpenContainerDialog] = useState(false);
  const [containerVisualizationUrl, setContainerVisualizationUrl] = useState(null);
  const [visualizingContainer, setVisualizingContainer] = useState(null);
  const [items, setItems] = useState([]);
  const [containers, setContainers] = useState([]);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [currentItem, setCurrentItem] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Fetch available items and containers on component mount
  useEffect(() => {
    fetchAvailableItems();
    fetchAvailableContainers();
  }, []);

  const fetchAvailableItems = async () => {
    try {
      setLoading(true);
      const response = await axios.get('http://localhost:8000/api/items');
      if (response.data) {
        // Filter out items that are already placed
        const unplacedItems = response.data.filter(item => !item.currentContainer);
        setAvailableItems(unplacedItems);
      } else {
        setAvailableItems([]);
      }
    } catch (err) {
      console.error('Error fetching items:', err);
      setError('Failed to fetch available items');
      setAvailableItems([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableContainers = async () => {
    try {
      setLoading(true);
      const response = await axios.get('http://localhost:8000/api/containers');
      if (response.data) {
        setAvailableContainers(response.data);
      } else {
        setAvailableContainers([]);
      }
    } catch (err) {
      console.error('Error fetching containers:', err);
      setError('Failed to fetch available containers');
      setAvailableContainers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleItemSelect = (event) => {
    const itemId = event.target.value;
    const item = availableItems.find(i => i._id === itemId);
    if (item && !selectedItems.find(i => i._id === itemId)) {
      setSelectedItems([...selectedItems, item]);
    }
  };

  const handleContainerSelect = (event) => {
    const containerId = event.target.value;
    const container = availableContainers.find(c => c._id === containerId);
    if (container && !selectedContainers.find(c => c._id === containerId)) {
      setSelectedContainers([...selectedContainers, container]);
    }
  };

  const handleRemoveItem = (itemId) => {
    setSelectedItems(selectedItems.filter(item => item._id !== itemId));
  };

  const handleRemoveContainer = (containerId) => {
    setSelectedContainers(selectedContainers.filter(container => container._id !== containerId));
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Validate we have at least one item and one container selected
      if (selectedItems.length === 0 || selectedContainers.length === 0) {
        setError('Please select at least one item and one container');
        setLoading(false);
        return;
      }
      
      // Format the request data
      const requestData = {
        items: selectedItems.map(item => ({
          itemId: item.itemId,
          name: item.name || `Item ${item.itemId}`,
          dimensions: {
            width: Number(item.dimensions?.width) || 100,
            height: Number(item.dimensions?.height) || 100,
            depth: Number(item.dimensions?.depth) || 100
          },
          mass: Number(item.mass) || 1,
          priority: Number(item.priority) || 1,
          preferredZone: item.preferredZone || 'A',
          expiryDate: item.expiryDate || new Date().toISOString(),
          usageLimit: item.usageLimit || 999
        })),
        containers: selectedContainers.map(container => ({
          containerId: container.containerId,
          dimensions: {
            width: Number(container.dimensions?.width) || 200,
            height: Number(container.dimensions?.height) || 200,
            depth: Number(container.dimensions?.depth) || 200
          },
          zone: container.zone || 'A'
        }))
      };
      
      console.log('Sending placement request with data:', JSON.stringify(requestData, null, 2));
      
      const response = await axios.post('http://localhost:8000/api/placement', requestData);
      
      console.log('Placement response:', response.data);
      
      if (response.data) {
        setResult(response.data);
        // Refresh available items after successful placement
        fetchAvailableItems();
      }
    } catch (err) {
      console.error('Placement error:', err);
      console.error('Error response:', err.response?.data);
      setError('Failed to calculate placement: ' + (err.response?.data?.error || err.message));
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  const handleView3D = async (item) => {
    console.log('Visualizing item in 3D:', item);
    
    try {
      setVisualizationUrl(null);
      setOpen3DDialog(true);
      setLoading(true);
      
      // Create shallow copy with defaults to avoid modifying the original item
      const itemToVisualize = {
        itemId: item.itemId || `item-${Date.now()}`,
        name: item.name || 'Item',
        dimensions: {
          width: item.dimensions?.width || 100,
          height: item.dimensions?.height || 100,
          depth: item.dimensions?.depth || 100
        },
        mass: item.mass || 1,
        priority: item.priority || 1,
        expiryDate: item.expiryDate || new Date().toISOString(),
        preferredZone: item.preferredZone || 'A'
      };
      
      console.log('Sending visualization request for:', itemToVisualize);
      
      const response = await fetch('http://localhost:8000/api/placement/visualize-item', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          item: itemToVisualize
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Server responded with status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Visualization response:', data);
      
      if (data.success) {
        setVisualizationUrl(data.imageUrl);
        if (data.warning) {
          console.warn('Visualization warning:', data.warning);
        }
      } else {
        console.error('Error generating visualization:', data.error);
        setErrorMessage(data.error || 'Error generating visualization');
        setVisualizationUrl(null);
      }
    } catch (error) {
      console.error('Error in 3D visualization:', error);
      setErrorMessage(`3D visualization error: ${error.message}`);
      setVisualizationUrl(null);
    } finally {
      setLoading(false);
    }
  };

  const handleClose3DDialog = () => {
    setOpen3DDialog(false);
    setVisualizationUrl(null);
  };

  const handleViewContainer = async (containerId) => {
    console.log('Visualizing container in 3D:', containerId);
    
    try {
      setContainerVisualizationUrl(null);
      setVisualizingContainer(containerId);
      setOpenContainerDialog(true);
      setLoading(true);
      
      // Get all containers and find the specific one we need
      const [containersResponse, itemsResponse] = await Promise.all([
        axios.get(`http://localhost:8000/api/containers`),
        axios.get(`http://localhost:8000/api/items`)
      ]);
      
      // Find the specific container by ID
      const containerDetails = containersResponse.data.find(c => c.containerId === containerId);
      if (!containerDetails) {
        throw new Error(`Container with ID ${containerId} not found`);
      }
      
      // Filter items to find those in this container
      const containerItems = itemsResponse.data.filter(item => item.currentContainer === containerId) || [];
      
      console.log('Container details for visualization:', containerDetails);
      console.log(`Found ${containerItems.length} items in container ${containerId}:`, containerItems);
      
      // Send request for visualization with forced refresh to ensure we get latest data
      const response = await fetch('http://localhost:8000/api/placement/visualize-container', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          containerId: containerId,
          includeDetails: true,
          forceRefresh: true,
          timestamp: new Date().getTime()
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Server responded with status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Container visualization response:', data);
      
      if (data.success) {
        // Ensure we don't duplicate http://localhost:8000 in the URL
        let imageUrl = data.imageUrl;
        // Add a timestamp to prevent caching
        if (imageUrl.startsWith('http://')) {
          imageUrl = `${imageUrl}?t=${new Date().getTime()}`;
        } else {
          // Add host only if it's a relative URL
          imageUrl = `http://localhost:8000${imageUrl}?t=${new Date().getTime()}`;
        }
        console.log('Setting container visualization URL:', imageUrl);
        setContainerVisualizationUrl(imageUrl);
        
        if (data.warning) {
          console.warn('Container visualization warning:', data.warning);
        }
      } else {
        console.error('Error generating container visualization:', data.error);
        setErrorMessage(data.error || 'Error generating container visualization');
        setContainerVisualizationUrl(null);
      }
    } catch (error) {
      console.error('Error in container visualization:', error);
      setErrorMessage(`Container visualization error: ${error.message}`);
      setContainerVisualizationUrl(null);
    } finally {
      setLoading(false);
    }
  };

  const handleCloseContainerDialog = () => {
    setOpenContainerDialog(false);
    setContainerVisualizationUrl(null);
    setVisualizingContainer(null);
  };

  const handleApplyPlacement = async (placements) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('http://localhost:8000/api/placement/apply', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          placements
        }),
      });
      
      const data = await response.json();
      console.log('Placement application response:', data);
      
      if (data.success) {
        // Update the available items list
        await fetchAvailableItems();
        
        // Show a success message
        alert(`Successfully placed ${data.updatedItems.length} items.`);
        
        // Clear the result and selected items
        setResult(null);
        setSelectedItems([]);
      } else {
        console.error('Error applying placements:', data.error);
        setError(`Failed to apply placements: ${data.message}`);
      }
    } catch (error) {
      console.error('Error in placement application:', error);
      setError('Failed to apply placements. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleEditItem = (item) => {
    setCurrentItem(item);
    setEditDialogOpen(true);
  };

  const handleDeleteItem = (item) => {
    setItemToDelete(item);
    setDeleteDialogOpen(true);
  };

  const handleCloseEditDialog = () => {
    setEditDialogOpen(false);
    setCurrentItem(null);
  };

  const handleCloseDeleteDialog = () => {
    setDeleteDialogOpen(false);
    setItemToDelete(null);
  };

  const handleSaveItem = async () => {
    try {
      setLoading(true);
      
      if (!currentItem || !currentItem._id) {
        setErrorMessage('No item selected for editing');
        return;
      }
      
      // Here you would normally update the item data based on form values
      // For now, let's just use the current item data
      const response = await axios.put(`http://localhost:8000/api/items/${currentItem._id}`, currentItem);
      
      if (response.data) {
        setSuccessMessage('Item updated successfully');
        fetchAvailableItems(); // Refresh the items list
        handleCloseEditDialog();
      }
    } catch (error) {
      console.error('Error updating item:', error);
      setErrorMessage(`Failed to update item: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmDelete = async () => {
    try {
      setLoading(true);
      
      if (!itemToDelete || !itemToDelete._id) {
        setErrorMessage('No item selected for deletion');
        return;
      }
      
      const response = await axios.delete(`http://localhost:8000/api/items/${itemToDelete._id}`);
      
      if (response.data) {
        setSuccessMessage('Item deleted successfully');
        fetchAvailableItems(); // Refresh the items list
        handleCloseDeleteDialog();
      }
    } catch (error) {
      console.error('Error deleting item:', error);
      setErrorMessage(`Failed to delete item: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Container sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      {/* Header Section */}
      <Paper 
        elevation={0}
        sx={{ 
          p: 3, 
          mb: 3, 
          borderRadius: 2,
          background: 'linear-gradient(90deg, rgba(13, 31, 45, 0.7) 0%, rgba(0, 0, 0, 0.4) 100%)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <RocketIcon sx={{ fontSize: 36, mr: 2, color: theme.palette.primary.main }} />
          <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#fff' }}>
            Placement Manager
          </Typography>
        </Box>
        <Typography variant="body1" sx={{ color: alpha('#fff', 0.8) }}>
          Manage the placement of items within the ISS cargo system
        </Typography>
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Item Selection */}
        <Grid item xs={12} md={6}>
          <Card sx={{ 
            borderRadius: 2,
            background: 'rgba(13, 31, 45, 0.7)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
          }}>
            <CardContent sx={{ p: 3,width: 400 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <StorageIcon sx={{ fontSize: 28, mr: 1, color: theme.palette.secondary.main }} />
                <Typography variant="h6" sx={{ color: '#fff', fontWeight: 500 }}>
                  Select Items
                </Typography>
              </Box>
              <Divider sx={{ mb: 3, borderColor: 'rgba(255, 255, 255, 0.1)' }} />

              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Add Item</InputLabel>
                <Select
                  value=""
                  label="Add Item"
                  onChange={handleItemSelect}
                >
                  {availableItems.map((item) => (
                    <MenuItem key={item._id} value={item._id}>
                      {item.name} ({item.itemId})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <List>
                {selectedItems.map((item) => (
                  <ListItem key={item._id} sx={{ px: 0 }}>
                    <ListItemText
                      primary={`${item.name} (${item.itemId})`}
                      secondary={`Priority: ${item.priority}, Zone: ${item.preferredZone}`}
                      primaryTypographyProps={{ fontWeight: 500, color: '#fff' }}
                      secondaryTypographyProps={{ color: alpha('#fff', 0.7) }}
                    />
                    <Button
                      color="error"
                      onClick={() => handleRemoveItem(item._id)}
                    >
                      Remove
                    </Button>
                    <IconButton
                      aria-label="View 3D"
                      color="primary"
                      onClick={() => handleView3D(item)}
                      size="small"
                      sx={{ ml: 1 }}
                    >
                      <ThreeDIcon />
                    </IconButton>
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Container Selection */}
        <Grid item xs={12} md={6}>
          <Card sx={{ 
            borderRadius: 2,
            background: 'rgba(13, 31, 45, 0.7)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            width: 400
          }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <LocationIcon sx={{ fontSize: 28, mr: 1, color: theme.palette.secondary.main }} />
                <Typography variant="h6" sx={{ color: '#fff', fontWeight: 500 }}>
                  Select Containers
                </Typography>
              </Box>
              <Divider sx={{ mb: 3, borderColor: 'rgba(255, 255, 255, 0.1)' }} />

              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Add Container</InputLabel>
                <Select
                  value=""
                  label="Add Container"
                  onChange={handleContainerSelect}
                >
                  {availableContainers.map((container) => (
                    <MenuItem key={container._id} value={container._id}>
                      {container.containerId} (Zone {container.zone})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <Typography variant="h6" sx={{ mb: 2 }}>Selected Containers:</Typography>
              {selectedContainers.length > 0 ? (
                <List>
                  {selectedContainers.map(container => (
                    <ListItem key={container._id} sx={{ bgcolor: 'background.paper', mb: 1, borderRadius: 1 }}>
                      <ListItemText
                        primary={container.containerId}
                        secondary={
                          <>
                            <Typography variant="body2" component="span">
                              Zone: {container.zone} | Dimensions: {container.dimensions?.width || 0}x{container.dimensions?.depth || 0}x{container.dimensions?.height || 0}
                            </Typography>
                          </>
                        }
                      />
                      <Tooltip title="View Container in 3D">
                        <IconButton 
                          color="primary" 
                          onClick={() => handleViewContainer(container.containerId)}
                          size="small"
                        >
                          <ThreeDIcon />
                        </IconButton>
                      </Tooltip>
                      <IconButton 
                        color="error" 
                        onClick={() => handleRemoveContainer(container._id)}
                        size="small"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Typography variant="body2" color="textSecondary">
                  No containers selected
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Submit Button */}
      <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center' }}>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={selectedItems.length === 0 || selectedContainers.length === 0 || loading}
          sx={{ px: 4, py: 1.5 }}
        >
          {loading ? <CircularProgress size={24} /> : 'Calculate Placement'}
        </Button>
      </Box>

      {/* Results Display */}
      {result && (
        <Card sx={{ mt: 4, bgcolor: alpha('#0d1f2d', 0.95), color: '#fff', borderRadius: 2 }}>
          <CardContent>
            <Typography variant="h5" gutterBottom>
              Placement Results
            </Typography>
            
            <Box sx={{ mt: 2 }}>
              <Typography variant="h6" gutterBottom>
                Container Utilization:
              </Typography>
              <Grid container spacing={2}>
                {result.container_stats.map(container => (
                  <Grid item xs={12} sm={6} md={4} key={container.container_id}>
                    <Card sx={{ bgcolor: alpha('#fff', 0.1), p: 2, borderRadius: 1 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>
                          {container.container_id}
                        </Typography>
                        <Tooltip title="View Container in 3D">
                          <IconButton 
                            color="primary" 
                            onClick={() => handleViewContainer(container.container_id)}
                            size="small"
                          >
                            <ThreeDIcon />
                          </IconButton>
                        </Tooltip>
                      </Box>
                      <Typography variant="body2" sx={{ mb: 1 }}>
                        Zone: {container.zone}
                      </Typography>
                      <Typography variant="body2" sx={{ mb: 1 }}>
                        Items: {container.items_count}
                      </Typography>
                      <Box>
                        <Typography variant="body2" sx={{ mb: 0.5 }}>
                          Utilization: {container.utilization.toFixed(1)}%
                        </Typography>
                        <LinearProgress 
                          variant="determinate" 
                          value={container.utilization} 
                          sx={{ 
                            height: 8, 
                            borderRadius: 1,
                            backgroundColor: alpha('#fff', 0.1),
                            '& .MuiLinearProgress-bar': {
                              backgroundColor: container.utilization > 80 
                                ? '#ff4d4d' 
                                : container.utilization > 50 
                                  ? '#ffa64d' 
                                  : '#4caf50'
                            }
                          }} 
                        />
                      </Box>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </Box>

            <Box sx={{ mt: 3 }}>
              <Typography variant="h6" gutterBottom>
                Successful Placements:
              </Typography>
              {result.placements.length > 0 ? (
                <List>
                  {result.placements.map(placement => (
                    <ListItem 
                      key={placement.item_id} 
                      sx={{ 
                        bgcolor: alpha('#fff', 0.05), 
                        mb: 1, 
                        borderRadius: 1,
                        '&:hover': { bgcolor: alpha('#fff', 0.1) }
                      }}
                    >
                      <ListItemText
                        primary={`Item: ${placement.item_id}`}
                        secondary={
                          <>
                            <Typography variant="body2" component="span" color="inherit" sx={{ opacity: 0.7 }}>
                              Container: {placement.container_id} | 
                              Position: ({placement.position.x.toFixed(1)}, {placement.position.y.toFixed(1)}, {placement.position.z.toFixed(1)})
                            </Typography>
                          </>
                        }
                      />
                      <Tooltip title="View Item in 3D">
                        <IconButton 
                          color="primary" 
                          onClick={() => {
                            const item = availableItems.find(i => i.itemId === placement.item_id);
                            if (item) handleView3D(item);
                          }}
                          size="small"
                        >
                          <ThreeDIcon />
                        </IconButton>
                      </Tooltip>
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Typography variant="body1">No successful placements</Typography>
              )}
            </Box>

            {result.unplaced_items.length > 0 && (
              <Box sx={{ mt: 3 }}>
                <Typography variant="h6" gutterBottom color="error">
                  Unplaced Items:
                </Typography>
                <List>
                  {result.unplaced_items.map(item => (
                    <ListItem 
                      key={typeof item === 'object' ? item.item_id : item} 
                      sx={{ 
                        bgcolor: alpha('#ff4d4d', 0.2), 
                        mb: 1, 
                        borderRadius: 1 
                      }}
                    >
                      <ListItemText 
                        primary={typeof item === 'object' ? item.item_id : item} 
                        secondary={typeof item === 'object' && item.reason ? `Reason: ${item.reason}` : null}
                      />
                      <Tooltip title="View Item in 3D">
                        <IconButton 
                          color="primary" 
                          onClick={() => {
                            const itemId = typeof item === 'object' ? item.item_id : item;
                            const foundItem = availableItems.find(i => i.itemId === itemId);
                            if (foundItem) handleView3D(foundItem);
                          }}
                          size="small"
                        >
                          <ThreeDIcon />
                        </IconButton>
                      </Tooltip>
                    </ListItem>
                  ))}
                </List>
              </Box>
            )}

            <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
              <Button 
                variant="contained" 
                color="primary" 
                onClick={() => setResult(null)}
                sx={{ mr: 2 }}
              >
                Start New Placement
              </Button>
              <Button 
                variant="contained" 
                color="success" 
                onClick={() => handleApplyPlacement(result.placements)}
              >
                Apply Placements
              </Button>
            </Box>
          </CardContent>
        </Card>
      )}

      {/* 3D Visualization Dialog */}
      <Dialog
        open={open3DDialog}
        onClose={handleClose3DDialog}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">3D Visualization</Typography>
            <IconButton onClick={handleClose3DDialog}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box 
            sx={{ 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              justifyContent: 'center',
              width: '100%'
            }}
          >
            {loading ? (
              <Box textAlign="center" p={4}>
                <CircularProgress />
                <Typography variant="body1" sx={{ mt: 2 }}>
                  Generating 3D visualization...
                </Typography>
              </Box>
            ) : visualizationUrl ? (
              <Box sx={{ width: '100%', textAlign: 'center' }}>
                {visualizationUrl.includes('.html') ? (
                  <>
                    <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                      Interactive 3D Visualization
                    </Typography>
                    <iframe 
                      src={visualizationUrl} 
                      title="3D Visualization" 
                      style={{ 
                        width: '100%', 
                        height: '500px', 
                        border: '1px solid rgba(0,0,0,0.1)',
                        borderRadius: '8px',
                        backgroundColor: '#f5f5f5'
                      }}
                    />
                  </>
                ) : (
                  <>
                    <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                      Python-generated Visualization
                    </Typography>
                    <img 
                      src={visualizationUrl} 
                      alt="3D Visualization" 
                      style={{ 
                        maxWidth: '100%', 
                        maxHeight: '500px',
                        border: '1px solid rgba(0,0,0,0.1)',
                        borderRadius: '8px'
                      }} 
                    />
                  </>
                )}
              </Box>
            ) : (
              <Box textAlign="center" p={4}>
                <Typography variant="body1" color="error">
                  Unable to generate visualization.
                </Typography>
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose3DDialog} color="primary">
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Container Visualization Dialog */}
      <ContainerVisualizationDialog
        open={openContainerDialog}
        onClose={handleCloseContainerDialog}
        containerId={visualizingContainer}
        visualizationUrl={containerVisualizationUrl}
      />

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onClose={handleCloseEditDialog}>
        <DialogTitle>Edit Item</DialogTitle>
        <DialogContent>
          {currentItem && (
            <Box sx={{ pt: 2 }}>
              <TextField
                label="Item Name"
                fullWidth
                margin="normal"
                value={currentItem.name || ''}
                onChange={(e) => setCurrentItem({...currentItem, name: e.target.value})}
              />
              <Grid container spacing={2} sx={{ mt: 1 }}>
                <Grid item xs={4}>
                  <TextField
                    label="Width"
                    type="number"
                    fullWidth
                    value={currentItem.dimensions?.width || ''}
                    onChange={(e) => setCurrentItem({
                      ...currentItem, 
                      dimensions: {
                        ...currentItem.dimensions,
                        width: Number(e.target.value)
                      }
                    })}
                  />
                </Grid>
                <Grid item xs={4}>
                  <TextField
                    label="Depth"
                    type="number"
                    fullWidth
                    value={currentItem.dimensions?.depth || ''}
                    onChange={(e) => setCurrentItem({
                      ...currentItem, 
                      dimensions: {
                        ...currentItem.dimensions,
                        depth: Number(e.target.value)
                      }
                    })}
                  />
                </Grid>
                <Grid item xs={4}>
                  <TextField
                    label="Height"
                    type="number"
                    fullWidth
                    value={currentItem.dimensions?.height || ''}
                    onChange={(e) => setCurrentItem({
                      ...currentItem, 
                      dimensions: {
                        ...currentItem.dimensions,
                        height: Number(e.target.value)
                      }
                    })}
                  />
                </Grid>
              </Grid>
              <TextField
                label="Mass"
                type="number"
                fullWidth
                margin="normal"
                value={currentItem.mass || ''}
                onChange={(e) => setCurrentItem({...currentItem, mass: Number(e.target.value)})}
              />
              <TextField
                label="Priority"
                type="number"
                fullWidth
                margin="normal"
                value={currentItem.priority || ''}
                onChange={(e) => setCurrentItem({...currentItem, priority: Number(e.target.value)})}
              />
              <FormControl fullWidth margin="normal">
                <InputLabel>Preferred Zone</InputLabel>
                <Select
                  value={currentItem.preferredZone || 'A'}
                  label="Preferred Zone"
                  onChange={(e) => setCurrentItem({...currentItem, preferredZone: e.target.value})}
                >
                  <MenuItem value="A">Zone A</MenuItem>
                  <MenuItem value="B">Zone B</MenuItem>
                  <MenuItem value="C">Zone C</MenuItem>
                </Select>
              </FormControl>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseEditDialog}>Cancel</Button>
          <Button onClick={handleSaveItem} variant="contained" color="primary">
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={handleCloseDeleteDialog}>
        <DialogTitle>Delete Item</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this item?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDeleteDialog}>Cancel</Button>
          <Button onClick={handleConfirmDelete} color="error">
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Success Snackbar */}
      <Snackbar
        open={!!successMessage}
        autoHideDuration={6000}
        onClose={() => setSuccessMessage('')}
        message={successMessage}
      />

      {/* Error Snackbar */}
      <Snackbar
        open={!!errorMessage}
        autoHideDuration={6000}
        onClose={() => setErrorMessage('')}
        message={errorMessage}
        ContentProps={{
          sx: { bgcolor: 'error.main' }
        }}
      />
    </Container>
  );
};

const ContainerVisualizationDialog = ({ open, onClose, containerId, visualizationUrl }) => {
  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="lg" 
      fullWidth
      PaperProps={{
        sx: {
          backgroundColor: '#0d1f2d',
          backgroundImage: 'linear-gradient(rgba(0, 0, 0, 0.7), rgba(0, 0, 0, 0.7))',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          height: '90vh'
        }
      }}
    >
      <DialogTitle 
        sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          backgroundColor: '#05101f',
          color: 'white',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          p: 2
        }}
      >
        <Box component="span" sx={{ typography: 'h6' }}>
          Container Visualization: {containerId}
        </Box>
        <IconButton onClick={onClose} sx={{ color: 'white' }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      
      <DialogContent sx={{ 
        p: 0, 
        backgroundColor: '#05101f',
        border: 'none',
        height: '100%',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <Typography variant="body1" sx={{ 
          textAlign: 'center', 
          py: 1, 
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          color: 'white'
        }}>
          Interactive Container Visualization
        </Typography>
        
        {visualizationUrl ? (
          <iframe 
            src={visualizationUrl}
            title="Container Visualization"
            style={{
              width: '100%',
              height: 'calc(100% - 40px)',
              minHeight: '600px',
              border: 'none',
              backgroundColor: '#030a14',
              flexGrow: 1
            }}
            frameBorder="0"
            allowFullScreen
          />
        ) : (
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center',
            height: '100%',
            color: 'white'
          }}>
            <CircularProgress size={40} color="primary" sx={{ mr: 2 }} />
            <Typography>Loading visualization...</Typography>
          </Box>
        )}
      </DialogContent>
      
      <DialogActions sx={{ 
        backgroundColor: '#05101f',
        borderTop: '1px solid rgba(255, 255, 255, 0.1)',
        padding: 2
      }}>
        <Button 
          onClick={onClose} 
          color="primary" 
          variant="contained"
          size="large"
          sx={{
            ml: 'auto',
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            color: 'white',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            '&:hover': {
              backgroundColor: 'rgba(30, 60, 90, 0.8)',
            }
          }}
        >
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default PlacementManager; 