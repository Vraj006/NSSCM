// // src/components/Dashboard.js
// import React from 'react';

// const Dashboard = () => {
//   return (
//     <div>
//       <h1>ISS Cargo Management Dashboard</h1>
//       <p>Welcome to the ISS Cargo Management System!</p>
//     </div>
//   );
// };

// export default Dashboard;







import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  CircularProgress,
  Divider,
  List,
  ListItem,
  ListItemText,
  Chip,
  useTheme,
  Button,
  Paper,
  IconButton
} from '@mui/material';
import {
  Inventory as InventoryIcon,
  Warning as WarningIcon,
  Storage as StorageIcon,
  Notifications as NotificationsIcon,
  Rocket as RocketIcon,
  CalendarToday as CalendarTodayIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { 
  cardStyles, 
  headerStyles, 
  contentBoxStyles, 
  dividerStyles, 
  listItemStyles,
  loadingStyles,
  visualizationColors,
  typographyStyles,
  chartStyles
} from './commonStyles';
import { styled } from '@mui/material/styles';
import { alpha } from '@mui/material/styles';

const PieChartWithFallback = ({ data, colors }) => {
  // Empty chart data for fallback
  const emptyZones = [
    { name: 'Zone A', value: 0 },
    { name: 'Zone B', value: 0 },
    { name: 'Zone C', value: 0 }
  ];

  // Determine if we have actual data or should use fallback
  const chartData = data && data.length > 0 ? data : emptyZones;
  const theme = useTheme();
  
  return (
    <Box sx={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={90}
            paddingAngle={5}
            dataKey="value"
            nameKey="name"
            label={(entry) => `${entry.name}: ${entry.value}%`}
            labelLine={false}
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
            ))}
          </Pie>
          <Tooltip 
            formatter={(value) => [`${value}%`, 'Utilization']}
            contentStyle={chartStyles.tooltip}
          />
        </PieChart>
      </ResponsiveContainer>
      
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, justifyContent: 'center', mt: 2 }}>
        {chartData.map((zone, index) => (
          <Chip
            key={index}
            label={`${zone.name}: ${zone.value}%`}
            sx={{
              bgcolor: alpha(colors[index % colors.length], 0.15),
              color: theme.palette.mode === 'dark' ? '#fff' : theme.palette.text.primary,
              border: `1px solid ${colors[index % colors.length]}`,
              '& .MuiChip-label': {
                fontWeight: 600,
                padding: '0 12px',
              }
            }}
          />
        ))}
      </Box>
    </Box>
  );
};

const Dashboard = () => {
  const theme = useTheme();
  const [loading, setLoading] = useState(false);
  const [sectionLoading, setSectionLoading] = useState({
    utilization: false,
    activities: false,
    expiringItems: false
  });
  const [stats, setStats] = useState({
    totalItems: 0,
    totalContainers: 0,
    itemsPlaced: 0,
    wasteItems: 0,
    recentActivities: [],
    containerUtilization: [],
    expiringItems: []
  });
  const [error, setError] = useState(null);

  const containerIdToZone = {
    'A': 'A',
    'B': 'B',
    'C': 'C',
  };

  // Function to refresh dashboard data
  const refreshData = async (section = null) => {
    // If a specific section is provided, only update that section's loading state
    if (section) {
      setSectionLoading(prev => ({ ...prev, [section]: true }));
    } else {
      setLoading(true);
    }
    
    try {
      const response = await axios.get('http://localhost:8000/api/dashboard');
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      if (section) {
        setSectionLoading(prev => ({ ...prev, [section]: false }));
      } else {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    refreshData();
  }, []);

  // Helper function to get activity label and color
  const getActivityInfo = (activity) => {
    const actionType = activity.actionType || 'UNKNOWN';
    
    // Format the action type for display
    const label = actionType.replace(/_/g, ' ');
    
    // Determine color based on action type
    let color = 'primary';
    if (actionType.includes('WASTE')) color = 'error';
    else if (actionType.includes('RETRIEVAL')) color = 'secondary';
    else if (actionType.includes('PLACEMENT')) color = 'success';
    
    return { label, color };
  };

  const COLORS = visualizationColors;

  if (loading) {
    return (
      <Box sx={loadingStyles(theme)}>
        <CircularProgress size={60} />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ 
        display: 'flex', 
        flexDirection: 'column',
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '80vh',
        gap: 2
      }}>
        <Typography variant="h6" color="error">{error}</Typography>
        <Button 
          variant="contained" 
          onClick={() => window.location.reload()}
        >
          Retry
        </Button>
      </Box>
    );
  }

  // Get current date for header
  const currentDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <Box sx={{ py: 3 }}>
      {/* Header with Logo and Date */}
      <Paper 
        elevation={0}
        sx={headerStyles(theme)}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', mb: { xs: 2, sm: 0 } }}>
          <Box sx={{ 
            background: 'linear-gradient(45deg, #4FC3F7 30%, #00E676 90%)',
            p: 1.5,
            borderRadius: '50%',
            mr: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 3px 10px rgba(0,0,0,0.2)'
          }}>
            <RocketIcon sx={{ fontSize: 36, color: '#000' }} />
          </Box>
          <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#fff', m: 0 }}>
            ISS Cargo Dashboard
          </Typography>
        </Box>
        
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <CalendarTodayIcon sx={{ mr: 1, color: alpha('#fff', 0.7) }} />
          <Typography variant="body1" sx={{ color: alpha('#fff', 0.9) }}>
            {currentDate}
          </Typography>
        </Box>
      </Paper>

      {/* Key Stats - Full Width Layout */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12}>
          <Box sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
            gap: 5
          }}>
            {/* Total Items */}
            <Card sx={{ 
              height: '100%',
              ...cardStyles(theme),
              background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.2)} 0%, ${alpha(theme.palette.primary.dark, 0.4)} 100%)`
            }}>
              <CardContent sx={{
                ...contentBoxStyles(theme),
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center', 
                justifyContent: 'center',
                textAlign: 'center'
              }}>
                <InventoryIcon sx={{ fontSize: 48, color: theme.palette.primary.main, mb: 2 }} />
                <Typography variant="h3" sx={{ fontWeight: 'bold', color: '#fff', mb: 1 }}>
                  {stats.totalItems}
                </Typography>
                <Typography variant="body1" sx={{ color: alpha('#fff', 0.7) }}>
                  Total Items
                </Typography>
              </CardContent>
            </Card>

            {/* Total Containers */}
            <Card sx={{ 
              height: '100%',
              ...cardStyles(theme),
              background: `linear-gradient(135deg, ${alpha(theme.palette.secondary.main, 0.2)} 0%, ${alpha(theme.palette.secondary.dark, 0.4)} 100%)`
            }}>
              <CardContent sx={{
                ...contentBoxStyles(theme),
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center', 
                justifyContent: 'center',
                textAlign: 'center'
              }}>
                <StorageIcon sx={{ fontSize: 48, color: theme.palette.secondary.main, mb: 2 }} />
                <Typography variant="h3" sx={{ fontWeight: 'bold', color: '#fff', mb: 1 }}>
                  {stats.totalContainers}
                </Typography>
                <Typography variant="body1" sx={{ color: alpha('#fff', 0.7) }}>
                  Total Containers
                </Typography>
              </CardContent>
            </Card>

            {/* Items Placed */}
            <Card sx={{ 
              height: '100%',
              ...cardStyles(theme),
              background: `linear-gradient(135deg, ${alpha(theme.palette.success.main, 0.2)} 0%, ${alpha(theme.palette.success.dark, 0.4)} 100%)`
            }}>
              <CardContent sx={{
                ...contentBoxStyles(theme),
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center', 
                justifyContent: 'center',
                textAlign: 'center'
              }}>
                <InventoryIcon sx={{ fontSize: 48, color: theme.palette.success.main, mb: 2 }} />
                <Typography variant="h3" sx={{ fontWeight: 'bold', color: '#fff', mb: 1 }}>
                  {stats.itemsPlaced}
                </Typography>
                <Typography variant="body1" sx={{ color: alpha('#fff', 0.7) }}>
                  Items Placed
                </Typography>
              </CardContent>
            </Card>

            {/* Waste Items */}
            <Card sx={{ 
              height: '100%',
              ...cardStyles(theme),
              background: `linear-gradient(135deg, ${alpha(theme.palette.error.main, 0.2)} 0%, ${alpha(theme.palette.error.dark, 0.4)} 100%)`
            }}>
              <CardContent sx={{
                ...contentBoxStyles(theme),
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center', 
                justifyContent: 'center',
                textAlign: 'center'
              }}>
                <WarningIcon sx={{ fontSize: 48, color: theme.palette.error.main, mb: 2 }} />
                <Typography variant="h3" sx={{ fontWeight: 'bold', color: '#fff', mb: 1 }}>
                  {stats.wasteItems}
                </Typography>
                <Typography variant="body1" sx={{ color: alpha('#fff', 0.7) }}>
                  Waste Items
                </Typography>
              </CardContent>
            </Card>
          </Box>
        </Grid>
      </Grid>

      {/* Charts and Lists */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card sx={{ 
            height: '100%',
            ...cardStyles(theme)
          }}>
            <CardContent sx={contentBoxStyles(theme)}>
              <Typography variant="h6" gutterBottom sx={typographyStyles.sectionTitle}>
                Container Utilization by Zone
                <IconButton 
                  size="small" 
                  onClick={() => refreshData('utilization')} 
                  sx={{ ml: 1 }}
                  disabled={sectionLoading.utilization}
                >
                  <RefreshIcon fontSize="small" />
                </IconButton>
              </Typography>
              <Divider sx={dividerStyles(theme)} />
              {sectionLoading.utilization ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 300 }}>
                  <CircularProgress size={40} />
                </Box>
              ) : (
                <PieChartWithFallback data={stats.containerUtilization} colors={COLORS} />
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card sx={{ 
            height: '100%',
            ...cardStyles(theme)
          }}>
            <CardContent sx={contentBoxStyles(theme)}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="h6" sx={typographyStyles.sectionTitle}>
                  Recent Activities
                  <IconButton 
                    size="small" 
                    onClick={() => refreshData('activities')} 
                    sx={{ ml: 1 }}
                    disabled={sectionLoading.activities}
                  >
                    <RefreshIcon fontSize="small" />
                  </IconButton>
                </Typography>
                <NotificationsIcon sx={{ color: theme.palette.primary.main }} />
              </Box>
              <Divider sx={dividerStyles(theme)} />
              {sectionLoading.activities ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 300 }}>
                  <CircularProgress size={40} />
                </Box>
              ) : stats.recentActivities && stats.recentActivities.length > 0 ? (
                <List sx={{ p: 0 }}>
                  {stats.recentActivities.map((activity, index) => {
                    const { label, color } = getActivityInfo(activity);
                    return (
                      <ListItem 
                        key={index} 
                        sx={listItemStyles(theme)}
                      >
                        <ListItemText
                          primary={activity.details}
                          secondary={new Date(activity.timestamp).toLocaleString()}
                          primaryTypographyProps={{ 
                            fontWeight: 500, 
                            color: '#fff',
                            fontSize: '0.95rem'
                          }}
                          secondaryTypographyProps={{
                            color: alpha('#fff', 0.6),
                            fontSize: '0.85rem'
                          }}
                        />
                        <Chip 
                          label={label} 
                          size="small" 
                          color={color}
                          sx={{ ml: 1 }}
                        />
                      </ListItem>
                    );
                  })}
                </List>
              ) : (
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 200 }}>
                  <Typography sx={{ color: alpha('#fff', 0.6) }}>No recent activities</Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12}>
          <Card sx={cardStyles(theme)}>
            <CardContent sx={contentBoxStyles(theme)}>
              <Typography variant="h6" gutterBottom sx={typographyStyles.sectionTitle}>
                Items Expiring Soon
                <IconButton 
                  size="small" 
                  onClick={() => refreshData('expiringItems')} 
                  sx={{ ml: 1 }}
                  disabled={sectionLoading.expiringItems}
                >
                  <RefreshIcon fontSize="small" />
                </IconButton>
              </Typography>
              <Divider sx={dividerStyles(theme)} />
              {sectionLoading.expiringItems ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 100 }}>
                  <CircularProgress size={40} />
                </Box>
              ) : stats.expiringItems && stats.expiringItems.length > 0 ? (
                <Grid container spacing={2}>
                  {stats.expiringItems.map((item, index) => (
                    <Grid item xs={12} sm={6} md={4} key={index}>
                      <Card sx={{ 
                        background: alpha(theme.palette.warning.main, 0.1),
                        border: `1px solid ${alpha(theme.palette.warning.main, 0.2)}`,
                        borderRadius: 1.5
                      }}>
                        <CardContent sx={{ p: 2 }}>
                          <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#fff' }}>
                            {item.name}
                          </Typography>
                          <Typography variant="body2" sx={{ color: alpha('#fff', 0.7), mb: 1 }}>
                            ID: {item.itemId}
                          </Typography>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Typography variant="body2" sx={{ color: alpha('#fff', 0.7) }}>
                              Expires: {new Date(item.expiryDate).toLocaleDateString()}
                            </Typography>
                            <Chip 
                              label={`Zone ${item.zone}`} 
                              size="small" 
                              color="warning"
                              sx={{ ml: 1 }}
                            />
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              ) : (
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 100 }}>
                  <Typography sx={{ color: alpha('#fff', 0.6) }}>No items expiring soon</Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard;