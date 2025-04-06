import React, { useState } from 'react';
import axios from 'axios';
import {
  Container,
  Typography,
  Paper,
  Box,
  Button,
  Alert,
  TextField,
  List,
  ListItem,
  ListItemText,
  Chip,
  Divider,
  FormHelperText
} from '@mui/material';

const TimeSimulator = () => {
  const [simulationParams, setSimulationParams] = useState({
    numOfDays: '',
    toTimestamp: '',
    itemsToBeUsedPerDay: []
  });
  const [itemToAdd, setItemToAdd] = useState({ itemId: '', name: '' });
  const [simulationResult, setSimulationResult] = useState(null);
  const [error, setError] = useState(null);
  const [validationError, setValidationError] = useState(null);

  const handleAddItem = () => {
    if (itemToAdd.itemId || itemToAdd.name) {
      setSimulationParams(prev => ({
        ...prev,
        itemsToBeUsedPerDay: [...prev.itemsToBeUsedPerDay, { ...itemToAdd }]
      }));
      setItemToAdd({ itemId: '', name: '' });
    }
  };

  const handleRemoveItem = (index) => {
    setSimulationParams(prev => ({
      ...prev,
      itemsToBeUsedPerDay: prev.itemsToBeUsedPerDay.filter((_, i) => i !== index)
    }));
  };

  const validateInput = () => {
    setValidationError(null);
    
    if (simulationParams.itemsToBeUsedPerDay.length === 0) {
      setValidationError("Please add at least one item to use daily");
      return false;
    }
    
    if (simulationParams.numOfDays === '' && simulationParams.toTimestamp === '') {
      setValidationError("Please specify either number of days or a target date");
      return false;
    }
    
    if (simulationParams.numOfDays !== '' && parseInt(simulationParams.numOfDays) <= 0) {
      setValidationError("Number of days must be greater than zero");
      return false;
    }
    
    if (simulationParams.toTimestamp !== '') {
      const targetDate = new Date(simulationParams.toTimestamp);
      const currentDate = new Date();
      
      if (targetDate <= currentDate) {
        setValidationError("Target date must be in the future");
        return false;
      }
    }
    
    return true;
  };

  const handleSimulate = async () => {
    if (!validateInput()) {
      return;
    }
    
    try {
      setError(null);
      
      // Prepare the payload
      const payload = {
        ...simulationParams,
        numOfDays: simulationParams.numOfDays !== '' ? parseInt(simulationParams.numOfDays) : undefined,
        toTimestamp: simulationParams.toTimestamp !== '' ? new Date(simulationParams.toTimestamp).toISOString() : undefined
      };
      
      console.log("Sending simulation payload:", payload);
      
      const response = await axios.post('http://localhost:8000/api/simulate/day', payload);
      console.log("Simulation response:", response.data);
      
      if (response.data.success) {
        setSimulationResult(response.data);
      } else {
        setError(response.data.message || 'Failed to run simulation');
      }
    } catch (err) {
      console.error('Simulation error:', err);
      setError('Failed to run simulation: ' + (err.response?.data?.message || err.message));
    }
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom sx={{ color: 'primary.main' }}>
        Time Simulator
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {validationError && <Alert severity="warning" sx={{ mb: 2 }}>{validationError}</Alert>}

      <Box sx={{ display: 'flex', gap: 4, flexDirection: { xs: 'column', md: 'row' } }}>
        {/* Simulation Parameters */}
        <Paper sx={{ p: 3, flex: 1 }}>
          <Typography variant="h6" gutterBottom>Simulation Parameters</Typography>
          
          <Box sx={{ display: 'grid', gap: 2 }}>
            <TextField
              label="Number of Days"
              type="number"
              value={simulationParams.numOfDays}
              onChange={(e) => {
                setSimulationParams({
                  ...simulationParams,
                  numOfDays: e.target.value,
                  // Clear the toTimestamp if numOfDays is provided
                  toTimestamp: e.target.value ? '' : simulationParams.toTimestamp
                });
              }}
              InputProps={{ inputProps: { min: 1 } }}
            />
            <Typography variant="body2" sx={{ textAlign: 'center' }}>- OR -</Typography>
            <TextField
              label="To Date"
              type="date"
              value={simulationParams.toTimestamp}
              onChange={(e) => {
                setSimulationParams({
                  ...simulationParams,
                  toTimestamp: e.target.value,
                  // Clear the numOfDays if toTimestamp is provided
                  numOfDays: e.target.value ? '' : simulationParams.numOfDays
                });
              }}
              InputLabelProps={{ shrink: true }}
            />
            <FormHelperText>
              Either specify the number of days to simulate or a target date in the future
            </FormHelperText>
          </Box>

          <Box sx={{ mt: 3 }}>
            <Typography variant="subtitle1" gutterBottom>Items to Use Daily:</Typography>
            <Box sx={{ display: 'flex', gap: 1, mb: 2, flexDirection: { xs: 'column', sm: 'row' } }}>
              <TextField
                label="Item ID"
                value={itemToAdd.itemId}
                onChange={(e) => setItemToAdd({ ...itemToAdd, itemId: e.target.value })}
                size="small"
              />
              <Typography variant="body2" sx={{ alignSelf: 'center', display: { xs: 'none', sm: 'block' } }}>or</Typography>
              <TextField
                label="Item Name"
                value={itemToAdd.name}
                onChange={(e) => setItemToAdd({ ...itemToAdd, name: e.target.value })}
                size="small"
              />
              <Button 
                variant="contained" 
                onClick={handleAddItem}
                disabled={!itemToAdd.itemId && !itemToAdd.name}
              >
                Add
              </Button>
            </Box>
            
            {simulationParams.itemsToBeUsedPerDay.length === 0 && 
              <Alert severity="info" sx={{ mb: 2 }}>Add items that will be used each day of the simulation</Alert>
            }

            <List>
              {simulationParams.itemsToBeUsedPerDay.map((item, index) => (
                <ListItem key={index}>
                  <ListItemText primary={item.itemId ? `Item ID: ${item.itemId}` : `Item Name: ${item.name}`} />
                  <Button 
                    color="error" 
                    onClick={() => handleRemoveItem(index)}
                  >
                    Remove
                  </Button>
                </ListItem>
              ))}
            </List>
          </Box>

          <Button 
            variant="contained" 
            onClick={handleSimulate}
            fullWidth
            sx={{ mt: 2 }}
          >
            Run Simulation
          </Button>
        </Paper>

        {/* Simulation Results */}
        {simulationResult && (
          <Paper sx={{ p: 3, flex: 1 }}>
            <Typography variant="h6" gutterBottom>Simulation Results</Typography>
            
            <Alert severity="success" sx={{ mb: 2 }}>
              Simulation completed successfully! New date is {new Date(simulationResult.newDate).toLocaleDateString()}
            </Alert>
            
            <Divider sx={{ my: 2 }} />
            
            <Typography variant="subtitle1" gutterBottom>Items Used:</Typography>
            {simulationResult.changes.itemsUsed.length > 0 ? (
              <List>
                {simulationResult.changes.itemsUsed.map((item, index) => (
                  <ListItem key={index}>
                    <ListItemText 
                      primary={`${item.name} (${item.itemId})`}
                      secondary={`Remaining Uses: ${item.remainingUses}`}
                    />
                    {item.remainingUses === 0 && 
                      <Chip label="Depleted" color="warning" size="small" sx={{ ml: 1 }} />
                    }
                  </ListItem>
                ))}
              </List>
            ) : (
              <Typography variant="body2" color="text.secondary">No items were used in this simulation.</Typography>
            )}

            <Divider sx={{ my: 2 }} />

            <Typography variant="subtitle1" gutterBottom>Items Expired:</Typography>
            {simulationResult.changes.itemsExpired.length > 0 ? (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                {simulationResult.changes.itemsExpired.map((item, index) => (
                  <Chip 
                    key={index}
                    label={`${item.name} (${item.itemId})`}
                    color="error"
                  />
                ))}
              </Box>
            ) : (
              <Typography variant="body2" color="text.secondary">No items expired during this simulation.</Typography>
            )}

            <Divider sx={{ my: 2 }} />

            <Typography variant="subtitle1" gutterBottom>Items Depleted:</Typography>
            {simulationResult.changes.itemsDepletedToday.length > 0 ? (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {simulationResult.changes.itemsDepletedToday.map((item, index) => (
                  <Chip 
                    key={index}
                    label={`${item.name} (${item.itemId})`}
                    color="warning"
                  />
                ))}
              </Box>
            ) : (
              <Typography variant="body2" color="text.secondary">No items were depleted during this simulation.</Typography>
            )}
          </Paper>
        )}
      </Box>
    </Container>
  );
};

export default TimeSimulator; 