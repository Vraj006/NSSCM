import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
    Box,
    Typography,
    Card,
    CardContent,
    Button,
    CircularProgress,
    Alert,
    Paper,
    List,
    ListItem,
    ListItemText,
    TextField,
    Divider,
    useTheme,
    alpha,
    Grid,
    Stepper,
    Step,
    StepLabel,
    Chip
} from '@mui/material';
import { Delete as DeleteIcon, Rocket as RocketIcon, Warning as WarningIcon } from '@mui/icons-material';

const WasteManager = () => {
    const theme = useTheme();
    const [wasteItems, setWasteItems] = useState([]);
    const [returnPlan, setReturnPlan] = useState(null);
    const [undockingDetails, setUndockingDetails] = useState({
        undockingContainerId: '',
        timestamp: '',
        maxWeight: 1000 // Default weight limit
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const fetchWasteItems = async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await axios.get('http://localhost:8000/api/waste/identify');
            console.log('Waste items response:', response.data); // Debug log

            if (response.data.success) {
                setWasteItems(response.data.wasteItems || []);
            } else {
                setError('Failed to fetch waste items');
            }
        } catch (err) {
            console.error('Error fetching waste items:', err);
            setError('Failed to fetch waste items: ' + (err.response?.data?.message || err.message));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchWasteItems();
    }, []);

    const handleReturnPlan = async () => {
        try {
          setLoading(true);
          setError(null);
          
          // Validate input
          if (!undockingDetails.undockingContainerId) {
            setError('Undocking Container ID is required');
            setLoading(false);
            return;
          }
          
          if (!undockingDetails.maxWeight || undockingDetails.maxWeight <= 0) {
            setError('A valid maximum weight must be specified');
            setLoading(false);
            return;
          }
          
          // Format the undocking date if it exists
          const payload = {
            ...undockingDetails,
            undockingDate: undockingDetails.timestamp 
              ? new Date(undockingDetails.timestamp).toISOString() 
              : new Date().toISOString()
          };
          
          // Log the payload being sent
          console.log('Sending undocking details:', payload);
      
          const response = await axios.post('http://localhost:8000/api/waste/return-plan', payload);
          
          // Log the response from the server
          console.log('Return plan response:', response.data);
      
          if (response.data && response.data.success) {
            // Set the return plan with the correct structure
            setReturnPlan({
              returnManifest: response.data.returnManifest || {},
              returnPlan: response.data.returnPlan || [],
              retrievalSteps: response.data.retrievalSteps || [],
              rejectedItems: response.data.rejectedItems || []
            });
          } else {
            setError('Failed to generate return plan: ' + (response.data?.message || 'Unknown error'));
            setReturnPlan(null);
          }
        } catch (err) {
          console.error('Error creating return plan:', err);
          setError('Failed to create return plan: ' + (err.response?.data?.message || err.message));
          setReturnPlan(null);
        } finally {
          setLoading(false);
        }
      };

    const handleUndocking = async () => {
        try {
            await axios.post('http://localhost:8000/api/waste/complete-undocking', {
                undockingContainerId: undockingDetails.undockingContainerId,
                timestamp: new Date().toISOString()
            });
            alert('Undocking completed successfully!');
            fetchWasteItems(); // Refresh waste items list
            setReturnPlan(null); // Clear return plan
        } catch (err) {
            console.error('Error completing undocking:', err);
            setError('Failed to complete undocking');
        }
    };

    return (
        <Box sx={{ p: 3 }}>
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
                    <WarningIcon sx={{ fontSize: 36, mr: 2, color: theme.palette.error.main }} />
                    <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#fff' }}>
                        Waste Management
                    </Typography>
                </Box>
                <Typography variant="body1" sx={{ color: alpha('#fff', 0.8) }}>
                    Manage waste items and undocking operations for the ISS cargo system
                </Typography>
            </Paper>

            {error && (
                <Alert severity="error" sx={{ mb: 3 }}>
                    {error}
                </Alert>
            )}

            {/* Waste Items Section */}
            <Card sx={{
                borderRadius: 2,
                background: 'rgba(13, 31, 45, 0.7)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                mb: 3
            }}>
                <CardContent sx={{ p: 3 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                        <DeleteIcon sx={{ fontSize: 28, mr: 1, color: theme.palette.error.main }} />
                        <Typography variant="h6" sx={{ color: '#fff', fontWeight: 500 }}>
                            Waste Items
                        </Typography>
                    </Box>
                    <Divider sx={{ mb: 3, borderColor: 'rgba(255, 255, 255, 0.1)' }} />

                    {loading ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 100 }}>
                            <CircularProgress />
                        </Box>
                    ) : (
                        <List>
                            {wasteItems.map((item, index) => (
                                <ListItem key={index} sx={{ px: 0 }}>
                                    <ListItemText
                                        primary={`${item.name} (${item.itemId})`}
                                        secondary={`Reason: ${item.reason}, Location: ${item.containerId || 'Unknown'}`}
                                        primaryTypographyProps={{ fontWeight: 500, color: '#fff' }}
                                        secondaryTypographyProps={{ color: alpha('#fff', 0.7) }}
                                    />
                                </ListItem>
                            ))}
                            {wasteItems.length === 0 && (
                                <Typography sx={{ color: alpha('#fff', 0.7), textAlign: 'center', py: 2 }}>
                                    No waste items found
                                </Typography>
                            )}
                        </List>
                    )}
                </CardContent>
            </Card>

            {/* Undocking Section */}
            <Card sx={{
                borderRadius: 2,
                background: 'rgba(13, 31, 45, 0.7)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                mb: 3
            }}>
                <CardContent sx={{ p: 3 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                        <RocketIcon sx={{ fontSize: 28, mr: 1, color: theme.palette.primary.main }} />
                        <Typography variant="h6" sx={{ color: '#fff', fontWeight: 500 }}>
                            Undocking Operations
                        </Typography>
                    </Box>
                    <Divider sx={{ mb: 3, borderColor: 'rgba(255, 255, 255, 0.1)' }} />

                    <Grid container spacing={2}>
                        <Grid item xs={12} md={4}>
                            <TextField
                                fullWidth
                                label="Undocking Container ID"
                                value={undockingDetails.undockingContainerId}
                                onChange={(e) => setUndockingDetails({ ...undockingDetails, undockingContainerId: e.target.value })}
                                sx={{ mb: 2 }}
                            />
                        </Grid>
                        <Grid item xs={12} md={4}>
                            <TextField
                                fullWidth
                                label="Max Weight (kg)"
                                type="number"
                                value={undockingDetails.maxWeight}
                                onChange={(e) => setUndockingDetails({ ...undockingDetails, maxWeight: parseInt(e.target.value) || 0 })}
                                sx={{ mb: 2 }}
                            />
                        </Grid>
                        <Grid item xs={12} md={4}>
                            <TextField
                                fullWidth
                                label="Undocking Date"
                                type="datetime-local"
                                value={undockingDetails.timestamp}
                                onChange={(e) => setUndockingDetails({ ...undockingDetails, timestamp: e.target.value })}
                                InputLabelProps={{ shrink: true }}
                                sx={{ mb: 2 }}
                            />
                        </Grid>
                    </Grid>

                    <Box sx={{ display: 'flex', gap: 2 }}>
                        <Button
                            variant="contained"
                            onClick={handleReturnPlan}
                            disabled={!undockingDetails.undockingContainerId || loading}
                        >
                            {loading ? <CircularProgress size={24} /> : 'Generate Return Plan'}
                        </Button>
                        <Button
                            variant="contained"
                            color="error"
                            onClick={handleUndocking}
                            disabled={!returnPlan || loading}
                        >
                            {loading ? <CircularProgress size={24} /> : 'Complete Undocking'}
                        </Button>
                    </Box>


                    {returnPlan && (
  <Box sx={{ mt: 3 }}>
    <Typography variant="h6" sx={{ color: '#fff', fontWeight: 500, mb: 2 }}>
      Return Plan Details
    </Typography>
    <Card sx={{ 
      borderRadius: 2,
      background: 'rgba(13, 31, 45, 0.7)',
      backdropFilter: 'blur(10px)',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      p: 2,
      mb: 3
    }}>
      <Typography variant="subtitle1" sx={{ color: alpha('#fff', 0.9), mb: 1 }}>
        Return Manifest
      </Typography>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 2 }}>
        <Chip 
          label={`Container: ${returnPlan.returnManifest.undockingContainerId}`} 
          color="primary" 
        />
        <Chip 
          label={`Date: ${new Date(returnPlan.returnManifest.undockingDate).toLocaleDateString()}`} 
          color="primary" 
        />
        <Chip 
          label={`Weight: ${returnPlan.returnManifest.totalWeight || 0} kg`} 
          color="primary" 
        />
      </Box>

      <Typography variant="subtitle1" sx={{ color: alpha('#fff', 0.9), mt: 2, mb: 1 }}>
        Items for Return ({returnPlan.returnManifest.returnItems?.length || 0})
      </Typography>
      <List dense>
        {returnPlan.returnManifest.returnItems?.map((item, idx) => (
          <ListItem key={idx} sx={{ py: 0.5 }}>
            <ListItemText 
              primary={`${item.name} (${item.itemId})`}
              secondary={`Reason: ${item.reason}`}
              primaryTypographyProps={{ color: '#fff' }}
              secondaryTypographyProps={{ color: alpha('#fff', 0.7) }}
            />
          </ListItem>
        ))}
      </List>
    </Card>

    {/* Retrieval Steps Section */}
    <Typography variant="h6" sx={{ color: '#fff', fontWeight: 500, mb: 2 }}>
      Retrieval Steps
    </Typography>
    <Card sx={{ 
      borderRadius: 2,
      background: 'rgba(13, 31, 45, 0.7)',
      backdropFilter: 'blur(10px)',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      p: 2,
      mb: 3
    }}>
      <Stepper activeStep={-1} orientation="vertical">
        {returnPlan.retrievalSteps?.map((step, index) => (
          <Step key={index} completed={false}>
            <StepLabel>
              <Box sx={{ color: '#fff' }}>
                <Typography variant="body1" sx={{ fontWeight: 500 }}>
                  Step {step.step}: {step.action}
                </Typography>
                <Typography variant="body2" sx={{ color: alpha('#fff', 0.7) }}>
                  {step.itemId ? `Item: ${step.itemName || step.itemId}` : ''}
                  {step.containerId ? `Container: ${step.containerId}` : ''}
                </Typography>
              </Box>
            </StepLabel>
          </Step>
        ))}
      </Stepper>
      {(!returnPlan.retrievalSteps || returnPlan.retrievalSteps.length === 0) && (
        <Typography sx={{ color: alpha('#fff', 0.7), textAlign: 'center', py: 2 }}>
          No retrieval steps required
        </Typography>
      )}
    </Card>

    {/* Rejected Items Section */}
    {returnPlan.rejectedItems && returnPlan.rejectedItems.length > 0 && (
      <>
        <Typography variant="h6" sx={{ color: '#fff', fontWeight: 500, mb: 2 }}>
          Rejected Items (Exceeded Weight Limit)
        </Typography>
        <Card sx={{ 
          borderRadius: 2,
          background: 'rgba(13, 31, 45, 0.7)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          p: 2,
          mb: 3
        }}>
          <List dense>
            {returnPlan.rejectedItems.map((item, index) => (
              <ListItem key={index}>
                <ListItemText 
                  primary={`${item.name} (${item.itemId})`}
                  secondary={`Mass: ${item.mass} kg - ${item.reason}`}
                  primaryTypographyProps={{ color: '#fff' }}
                  secondaryTypographyProps={{ color: alpha('#fff', 0.7) }}
                />
                <Chip 
                  label="Excluded" 
                  color="error" 
                  size="small"
                />
              </ListItem>
            ))}
          </List>
        </Card>
      </>
    )}

    {/* Return Plan Steps Section */}
    <Typography variant="h6" sx={{ color: '#fff', fontWeight: 500, mb: 2 }}>
      Return Plan Steps
    </Typography>
    <Card sx={{ 
      borderRadius: 2,
      background: 'rgba(13, 31, 45, 0.7)',
      backdropFilter: 'blur(10px)',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      p: 2
    }}>
      <Stepper activeStep={-1} orientation="vertical">
        {returnPlan.returnPlan?.map((step, index) => (
          <Step key={index} completed={false}>
            <StepLabel>
              <Box sx={{ color: '#fff' }}>
                <Typography variant="body1" sx={{ fontWeight: 500 }}>
                  Step {step.step}: Move Item
                </Typography>
                <Typography variant="body2" sx={{ color: alpha('#fff', 0.7) }}>
                  {`Move ${step.itemName} from ${step.fromContainer} to ${step.toContainer}`}
                </Typography>
              </Box>
            </StepLabel>
          </Step>
        ))}
      </Stepper>
      {(!returnPlan.returnPlan || returnPlan.returnPlan.length === 0) && (
        <Typography sx={{ color: alpha('#fff', 0.7), textAlign: 'center', py: 2 }}>
          No return plan steps available
        </Typography>
      )}
    </Card>
    </Box>
)}
                </CardContent>
            </Card>
        </Box>
    );
};

export default WasteManager;