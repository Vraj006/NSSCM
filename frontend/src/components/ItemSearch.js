import React, { useState } from 'react';
import axios from 'axios';
import {
  Typography,
  TextField,
  Button,
  Box,
  Alert,
  Card,
  CardContent,
  Divider,
  CircularProgress,
  Fade,
  Grid,
  Paper,
  Chip,
  alpha,
  useTheme,
  InputAdornment
} from '@mui/material';
import {
  Search as SearchIcon,
  LocalShipping as LocalShippingIcon,
  Inventory as InventoryIcon,
  LocationOn as LocationIcon,
  Category as CategoryIcon,
  QrCode as QrCodeIcon,
  ArrowForward as ArrowForwardIcon
} from '@mui/icons-material';
import { styled } from '@mui/material/styles';

const AnimatedCard = styled(Card)(({ theme }) => ({
  background: 'rgba(13, 31, 45, 0.7)',
  backdropFilter: 'blur(10px)',
  borderRadius: theme.shape.borderRadius * 2,
  boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
  border: '1px solid rgba(255, 255, 255, 0.1)',
  transition: 'transform 0.3s ease-in-out, box-shadow 0.3s ease-in-out',
  '&:hover': {
    transform: 'translateY(-5px)',
    boxShadow: '0 12px 40px 0 rgba(0, 0, 0, 0.5)',
  },
}));

const GlowingButton = styled(Button)(({ theme }) => ({
  background: `linear-gradient(45deg, ${theme.palette.primary.main} 30%, ${theme.palette.primary.light} 90%)`,
  boxShadow: `0 4px 20px 0 ${alpha(theme.palette.primary.main, 0.5)}`,
  '&:hover': {
    boxShadow: `0 6px 25px 0 ${alpha(theme.palette.primary.main, 0.7)}`,
  },
}));

const RetrieveButton = styled(Button)(({ theme }) => ({
  background: `linear-gradient(45deg, ${theme.palette.secondary.main} 30%, ${theme.palette.secondary.light} 90%)`,
  boxShadow: `0 4px 20px 0 ${alpha(theme.palette.secondary.main, 0.5)}`,
  '&:hover': {
    boxShadow: `0 6px 25px 0 ${alpha(theme.palette.secondary.main, 0.7)}`,
  },
}));

const ItemSearch = () => {
  const theme = useTheme();
  const [searchParams, setSearchParams] = useState({
    itemId: '',
    itemName: ''
  });
  const [searchResult, setSearchResult] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [retrieving, setRetrieving] = useState(false);
  const [retrieveSuccess, setRetrieveSuccess] = useState(false);

  const handleSearch = async () => {
    if (!searchParams.itemId && !searchParams.itemName) {
      setError('Please provide either Item ID or Item Name');
      return;
    }

    setError(null);
    setLoading(true);
    setSearchResult(null);
    setRetrieveSuccess(false);

    try {
      const response = await axios.get('http://localhost:8000/api/search', {
        params: {
          itemId: searchParams.itemId || undefined,
          itemName: searchParams.itemName || undefined
        }
      });

      if (response.data.success) {
        setSearchResult(response.data);
      } else {
        setError('Search failed');
      }
    } catch (err) {
      console.error('Search error:', err);
      setError('Failed to search for item');
    } finally {
      setLoading(false);
    }
  };

  const handleRetrieve = async () => {
    try {
      setRetrieving(true);
      const response = await axios.post('http://localhost:8000/api/retrieve', {
        itemId: searchResult.item.itemId
      });

      if (response.data.success) {
        setRetrieveSuccess(true);
      } else {
        setError('Failed to retrieve item');
      }
    } catch (err) {
      console.error('Retrieval error:', err);
      setError('Failed to retrieve item');
    } finally {
      setRetrieving(false);
    }
  };

  return (
    <Box sx={{ py: 3 }}>
      <Typography 
        variant="h4" 
        gutterBottom 
        sx={{ 
          textAlign: 'center',
          mb: 4,
          fontWeight: 'bold',
          background: 'linear-gradient(45deg, #4FC3F7 30%, #00E676 90%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent'
        }}
      >
        Item Search & Retrieval
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <AnimatedCard>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                <SearchIcon sx={{ mr: 1, color: theme.palette.primary.main }} />
                Search Parameters
              </Typography>
              <Divider sx={{ mb: 3, opacity: 0.2 }} />
              
              <Box sx={{ display: 'grid', gap: 3 }}>
                <TextField
                  label="Item ID"
                  variant="outlined"
                  fullWidth
                  value={searchParams.itemId}
                  onChange={(e) => setSearchParams({ ...searchParams, itemId: e.target.value, itemName: '' })}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <QrCodeIcon sx={{ color: theme.palette.primary.main }} />
                      </InputAdornment>
                    ),
                  }}
                  sx={{ 
                    '& .MuiOutlinedInput-root': { 
                      bgcolor: alpha(theme.palette.background.paper, 0.4),
                      '&:hover': {
                        bgcolor: alpha(theme.palette.background.paper, 0.6),
                      },
                      '&.Mui-focused': {
                        bgcolor: alpha(theme.palette.background.paper, 0.6),
                      }
                    } 
                  }}
                />
                
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Divider sx={{ width: '40%', opacity: 0.2 }} />
                  <Typography 
                    variant="body2" 
                    sx={{ 
                      mx: 2,
                      color: theme.palette.text.secondary,
                      fontWeight: 500 
                    }}
                  >
                    OR
                  </Typography>
                  <Divider sx={{ width: '40%', opacity: 0.2 }} />
                </Box>
                
                <TextField
                  label="Item Name"
                  variant="outlined"
                  fullWidth
                  value={searchParams.itemName}
                  onChange={(e) => setSearchParams({ ...searchParams, itemName: e.target.value, itemId: '' })}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <InventoryIcon sx={{ color: theme.palette.primary.main }} />
                      </InputAdornment>
                    ),
                  }}
                  sx={{ 
                    '& .MuiOutlinedInput-root': { 
                      bgcolor: alpha(theme.palette.background.paper, 0.4),
                      '&:hover': {
                        bgcolor: alpha(theme.palette.background.paper, 0.6),
                      },
                      '&.Mui-focused': {
                        bgcolor: alpha(theme.palette.background.paper, 0.6),
                      }
                    } 
                  }}
                />

                <GlowingButton
                  variant="contained"
                  size="large"
                  onClick={handleSearch}
                  disabled={loading}
                  startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <SearchIcon />}
                  sx={{ height: 48 }}
                >
                  {loading ? 'Searching...' : 'Search Item'}
                </GlowingButton>
              </Box>
            </CardContent>
          </AnimatedCard>

          {error && (
            <Fade in>
              <Alert 
                severity="error" 
                sx={{ mt: 2, borderRadius: theme.shape.borderRadius }}
                onClose={() => setError(null)}
              >
                {error}
              </Alert>
            </Fade>
          )}
        </Grid>

        <Grid item xs={12} md={6}>
          {searchResult ? (
            <Fade in>
              <AnimatedCard>
                <CardContent>
                  <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                    <InventoryIcon sx={{ mr: 1, color: searchResult.found ? theme.palette.success.main : theme.palette.error.main }} />
                    Search Results
                  </Typography>
                  <Divider sx={{ mb: 3, opacity: 0.2 }} />
                  
                  {searchResult.found ? (
                    <Box>
                      <Box sx={{ 
                        display: 'grid', 
                        gap: 2, 
                        mb: 3,
                        p: 2,
                        borderRadius: theme.shape.borderRadius,
                        bgcolor: alpha(theme.palette.success.main, 0.1),
                        border: `1px solid ${alpha(theme.palette.success.main, 0.2)}`
                      }}>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <QrCodeIcon sx={{ mr: 1, color: theme.palette.text.secondary }} />
                          <Typography variant="body1">
                            <strong>Item ID:</strong> {searchResult.item.itemId}
                          </Typography>
                        </Box>
                        
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <InventoryIcon sx={{ mr: 1, color: theme.palette.text.secondary }} />
                          <Typography variant="body1">
                            <strong>Name:</strong> {searchResult.item.name}
                          </Typography>
                        </Box>
                        
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <CategoryIcon sx={{ mr: 1, color: theme.palette.text.secondary }} />
                          <Typography variant="body1">
                            <strong>Container:</strong> {searchResult.item.containerId}
                          </Typography>
                        </Box>
                        
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <LocationIcon sx={{ mr: 1, color: theme.palette.text.secondary }} />
                          <Typography variant="body1">
                            <strong>Zone:</strong> {searchResult.item.zone}
                          </Typography>
                          <Chip 
                            label={`Zone ${searchResult.item.zone}`} 
                            size="small" 
                            color="primary"
                            sx={{ ml: 1 }}
                          />
                        </Box>
                      </Box>

                      {retrieveSuccess ? (
                        <Alert 
                          severity="success" 
                          sx={{ mb: 2, borderRadius: theme.shape.borderRadius }}
                        >
                          Item retrieved successfully! The retrieval process has been initiated.
                        </Alert>
                      ) : (
                        <RetrieveButton 
                          variant="contained"
                          color="secondary"
                          onClick={handleRetrieve}
                          disabled={retrieving}
                          startIcon={retrieving ? <CircularProgress size={20} color="inherit" /> : <LocalShippingIcon />}
                          endIcon={<ArrowForwardIcon />}
                          fullWidth
                          size="large"
                          sx={{ height: 48 }}
                        >
                          {retrieving ? 'Retrieving...' : 'Start Retrieval Process'}
                        </RetrieveButton>
                      )}
                    </Box>
                  ) : (
                    <Box sx={{ 
                      p: 3, 
                      borderRadius: theme.shape.borderRadius,
                      bgcolor: alpha(theme.palette.error.main, 0.1),
                      border: `1px solid ${alpha(theme.palette.error.main, 0.2)}`,
                      textAlign: 'center'
                    }}>
                      <Typography variant="h6" color="error" gutterBottom>
                        Item Not Found
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        No items match your search criteria. Please try different search parameters.
                      </Typography>
                    </Box>
                  )}
                </CardContent>
              </AnimatedCard>
            </Fade>
          ) : (
            <Paper sx={{ 
              height: '100%', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              p: 3,
              background: 'rgba(13, 31, 45, 0.4)',
              backdropFilter: 'blur(5px)',
              border: '1px solid rgba(255, 255, 255, 0.05)',
            }}>
              <Box sx={{ textAlign: 'center' }}>
                <SearchIcon sx={{ fontSize: 60, color: alpha(theme.palette.text.secondary, 0.3), mb: 2 }} />
                <Typography variant="body1" color="text.secondary">
                  Enter search parameters to find items
                </Typography>
              </Box>
            </Paper>
          )}
        </Grid>
      </Grid>
    </Box>
  );
};

export default ItemSearch; 