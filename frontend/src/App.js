import React, { useState } from 'react';
import { Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import {
  Box,
  CssBaseline,
  Drawer,
  AppBar,
  Toolbar,
  List,
  Typography,
  Divider,
  IconButton,
  ListItem,
  ListItemIcon,
  ListItemText,
  Container,
  useMediaQuery,
  Tooltip
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  Add as AddIcon,
  List as ListIcon,
  Upload as UploadIcon,
  Search as SearchIcon,
  Storage as StorageIcon,
  Delete as DeleteIcon,
  Timer as TimerIcon,
  ImportExport as ImportExportIcon,
  Rocket as RocketIcon,
  ThreeDRotation as ThreeDRotationIcon
} from '@mui/icons-material';
import { styled } from '@mui/material/styles';
import theme from './theme';

// Import components
import Dashboard from './components/Dashboard';
import AddItem from './components/AddItem';
import ItemList from './components/ItemList';
import CsvUpload from './components/CsvUpload';
import PlacementManager from './components/PlacementManager';
import ItemSearch from './components/ItemSearch';
import WasteManager from './components/WasteManager';
import TimeSimulator from './components/TimeSimulator';
import ImportExport from './components/ImportExport';

const drawerWidth = 280;

// Styled components
const StyledAppBar = styled(AppBar)(({ theme }) => ({
  backdropFilter: 'blur(10px)',
  borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
  boxShadow: 'none',
  zIndex: theme.zIndex.drawer + 1,
}));

const StyledDrawer = styled(Drawer)(({ theme }) => ({
  width: drawerWidth,
  flexShrink: 0,
  '& .MuiDrawer-paper': {
    width: drawerWidth,
    boxSizing: 'border-box',
    backdropFilter: 'blur(10px)',
    borderRight: '1px solid rgba(255, 255, 255, 0.1)',
  },
}));

const LogoBox = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  padding: theme.spacing(3),
  '& img': {
    height: 40,
    marginRight: theme.spacing(1),
  },
}));

const StyledListItem = styled(ListItem)(({ theme, selected }) => ({
  margin: theme.spacing(0.8, 1.5),
  borderRadius: theme.shape.borderRadius,
  padding: theme.spacing(1, 2),
  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  position: 'relative',
  overflow: 'hidden',
  '&:hover': {
    backgroundColor: alpha(theme.palette.primary.main, 0.12),
    transform: 'translateX(5px)',
    '& .MuiListItemIcon-root': {
      transform: 'scale(1.1)',
      color: theme.palette.primary.light,
    },
    '& .MuiTypography-root': {
      color: theme.palette.primary.light,
    }
  },
  ...(selected && {
    backgroundColor: alpha(theme.palette.primary.main, 0.15),
    '&::before': {
      content: '""',
      position: 'absolute',
      left: 0,
      top: '50%',
      transform: 'translateY(-50%)',
      height: '70%',
      width: 4,
      backgroundColor: theme.palette.primary.main,
      borderRadius: '0 4px 4px 0',
    },
    '&::after': {
      content: '""',
      position: 'absolute',
      right: 0,
      bottom: 0,
      height: '100%',
      width: '100%',
      background: `radial-gradient(circle at bottom right, ${alpha(theme.palette.primary.main, 0.2)}, transparent 70%)`,
      pointerEvents: 'none',
    },
    '& .MuiListItemIcon-root': {
      color: theme.palette.primary.light,
    },
    '& .MuiTypography-root': {
      fontWeight: 600,
      color: theme.palette.primary.light,
    }
  }),
}));

const StyledListItemIcon = styled(ListItemIcon)(({ theme, selected }) => ({
  minWidth: 40,
  transition: 'transform 0.2s ease',
  color: selected ? theme.palette.primary.light : alpha(theme.palette.common.white, 0.7),
}));

const StyledListItemText = styled(ListItemText)(({ theme, selected }) => ({
  '& .MuiTypography-root': {
    color: selected ? theme.palette.primary.light : alpha(theme.palette.common.white, 0.9),
    fontWeight: selected ? 600 : 400,
    fontSize: '0.95rem',
    transition: 'color 0.2s ease',
  }
}));

const MainContent = styled(Box)(({ theme }) => ({
  flexGrow: 1,
  width: { sm: `calc(100% - ${drawerWidth}px)` },
  overflow: 'auto',
}));

const App = () => {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const menuItems = [
    { text: 'Dashboard', icon: <DashboardIcon />, path: '/', description: 'Overview of warehouse status' },
    { text: 'Add Item', icon: <AddIcon />, path: '/add-item', description: 'Add new items to inventory' },
    { text: 'Item List', icon: <ListIcon />, path: '/item-list', description: 'View and manage all items' },
    { text: 'Search', icon: <SearchIcon />, path: '/search', description: 'Find and retrieve items' },
    { text: 'Placement Manager', icon: <StorageIcon />, path: '/placement', description: 'Optimize item placement' },
    { text: 'Waste Manager', icon: <DeleteIcon />, path: '/waste', description: 'Handle expired items' },
    { text: 'Time Simulator', icon: <TimerIcon />, path: '/simulator', description: 'Simulate time passage' },
    { text: 'Import/Export', icon: <ImportExportIcon />, path: '/import-export', description: 'Data import and export' },
  ];

  const drawer = (
    <>
      
      
      <Divider sx={{ 
        my: 2, 
        mx: 2, 
        borderColor: 'rgba(255, 255, 255, 0.1)',
        '&::before, &::after': {
          borderColor: 'rgba(255, 255, 255, 0.1)',
        }
      }} />
      
      <Typography variant="overline" sx={{ 
        px: 3, 
        color: alpha('#fff', 0.6), 
        fontWeight: 500,
        letterSpacing: 1.2
      }}>
        MAIN NAVIGATION
      </Typography>
      
      <List sx={{ py: 1 }}>
        {menuItems.map((item) => {
          const isSelected = location.pathname === item.path;
          return (
            <Tooltip 
              title={item.description} 
              placement="right" 
              arrow
              key={item.text}
            >
              <StyledListItem
                button
                component={Link}
                to={item.path}
                selected={isSelected}
                onClick={() => setMobileOpen(false)}
              >
                <StyledListItemIcon selected={isSelected}>
                  {item.icon}
                </StyledListItemIcon>
                <StyledListItemText 
                  primary={item.text} 
                  selected={isSelected}
                />
                {isSelected && (
                  <Box 
                    sx={{ 
                      width: 6, 
                      height: 6, 
                      borderRadius: '50%', 
                      bgcolor: 'primary.light',
                      position: 'absolute',
                      right: 16,
                      boxShadow: '0 0 8px rgba(79, 195, 247, 0.8)'
                    }} 
                  />
                )}
              </StyledListItem>
            </Tooltip>
          );
        })}
      </List>
      
      <Box sx={{ position: 'absolute', bottom: 0, width: '100%', p: 2 }}>
        <Box sx={{ 
          p: 2, 
          borderRadius: 2, 
          background: 'linear-gradient(135deg, rgba(79, 195, 247, 0.2) 0%, rgba(0, 230, 118, 0.2) 100%)',
          backdropFilter: 'blur(5px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
        }}>
          <Typography variant="body2" sx={{ fontWeight: 500, mb: 0.5, color: alpha('#fff', 0.9) }}>
            ISS Cargo System
          </Typography>
          <Typography variant="caption" sx={{ color: alpha('#fff', 0.7) }}>
            v1.0.0 • Space Edition
          </Typography>
        </Box>
      </Box>
    </>
  );

  return (
    <ThemeProvider theme={theme}>
      <Box sx={{ display: 'flex' }}>
        <CssBaseline />
        <StyledAppBar position="fixed">
          <Toolbar>
            <IconButton
              color="inherit"
              aria-label="open drawer"
              edge="start"
              onClick={handleDrawerToggle}
              sx={{ mr: 2, display: { sm: 'none' } }}
            >
              <MenuIcon />
            </IconButton>
            <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1, fontWeight: 500, color: '#fff' }}>
              {menuItems.find(item => item.path === location.pathname)?.text || 'ISS Cargo Management'}
            </Typography>
          </Toolbar>
        </StyledAppBar>

        <Box
          component="nav"
          sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
        >
          <Drawer
            variant="temporary"
            open={mobileOpen}
            onClose={handleDrawerToggle}
            ModalProps={{
              keepMounted: true, // Better open performance on mobile.
            }}
            sx={{
              display: { xs: 'block', sm: 'none' },
            }}
          >
            {drawer}
          </Drawer>
          <StyledDrawer
            variant="permanent"
            sx={{
              display: { xs: 'none', sm: 'block' },
            }}
            open
          >
            {drawer}
          </StyledDrawer>
        </Box>

        <MainContent>
          <Toolbar />
          <Container maxWidth="xl" sx={{ py: 3 }}>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/add-item" element={<AddItem />} />
              <Route path="/item-list" element={<ItemList />} />
              <Route path="/import-export" element={<ImportExport />} />
              <Route path="/search" element={<ItemSearch />} />
              <Route path="/placement" element={<PlacementManager />} />
              <Route path="/waste" element={<WasteManager />} />
              <Route path="/simulator" element={<TimeSimulator />} />
              <Route path="/csv-upload" element={<Navigate to="/import-export" />} />
            </Routes>
          </Container>
        </MainContent>
      </Box>
    </ThemeProvider>
  );
};

export default App;