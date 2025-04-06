// Common styles for consistent UI/UX across components
import { alpha } from '@mui/material/styles';

// Card styles for consistent look and feel
export const cardStyles = (theme) => ({
  background: 'rgba(13, 31, 45, 0.7)',
  backdropFilter: 'blur(10px)',
  border: '1px solid rgba(255, 255, 255, 0.1)',
  borderRadius: 2,
  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
  overflow: 'hidden',
});

// Header styles for section headers
export const headerStyles = (theme) => ({
  p: 3, 
  mb: 3, 
  borderRadius: 2,
  background: 'linear-gradient(90deg, rgba(13, 31, 45, 0.7) 0%, rgba(0, 0, 0, 0.4) 100%)',
  backdropFilter: 'blur(10px)',
  border: '1px solid rgba(255, 255, 255, 0.1)',
  display: 'flex',
  flexDirection: { xs: 'column', sm: 'row' },
  alignItems: 'center',
  justifyContent: 'space-between'
});

// Content box styles
export const contentBoxStyles = (theme) => ({
  p: 3,
});

// Divider styles
export const dividerStyles = (theme) => ({
  my: 2, 
  borderColor: 'rgba(255, 255, 255, 0.1)',
});

// Form field styles
export const formFieldStyles = (theme) => ({
  '& .MuiOutlinedInput-root': {
    '& fieldset': {
      borderColor: alpha(theme.palette.primary.main, 0.3),
    },
    '&:hover fieldset': {
      borderColor: alpha(theme.palette.primary.main, 0.5),
    },
    '&.Mui-focused fieldset': {
      borderColor: theme.palette.primary.main,
    }
  },
  '& .MuiInputLabel-root': {
    color: alpha('#fff', 0.7),
  },
  '& .MuiInputBase-input': {
    color: '#fff',
  }
});

// Button styles for primary actions
export const primaryButtonStyles = (theme) => ({
  background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
  '&:hover': {
    background: `linear-gradient(135deg, ${theme.palette.primary.dark} 0%, ${theme.palette.primary.main} 100%)`,
    boxShadow: `0 0 20px ${alpha(theme.palette.primary.main, 0.5)}`,
  }
});

// Chip styles for tags
export const chipStyles = (color, theme) => ({
  bgcolor: alpha(color, 0.2),
  color: '#fff',
  border: `1px solid ${color}`,
  '& .MuiChip-label': {
    fontWeight: 500,
  }
});

// List item styles
export const listItemStyles = (theme) => ({
  px: 2, 
  py: 1.5,
  borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
  '&:last-child': {
    borderBottom: 'none',
  },
  borderRadius: 1,
  transition: 'background-color 0.2s',
  '&:hover': {
    backgroundColor: alpha(theme.palette.primary.main, 0.1),
  }
});

// Loading indicator styles
export const loadingStyles = (theme) => ({
  display: 'flex', 
  justifyContent: 'center', 
  alignItems: 'center', 
  height: '200px'
});

// Icon styles
export const iconStyles = (color, theme) => ({
  color: color || theme.palette.primary.main,
  fontSize: '1.5rem',
  mr: 1
});

// Typography styles for consistent text formatting
export const typographyStyles = {
  headerTitle: {
    fontWeight: 'bold', 
    color: '#fff',
    mb: 1
  },
  sectionTitle: {
    fontWeight: 600,
    color: '#fff',
    mb: 2
  },
  bodyText: {
    color: alpha('#fff', 0.8)
  },
  captionText: {
    color: alpha('#fff', 0.6),
    fontSize: '0.85rem'
  }
};

// Alert styles
export const alertStyles = (severity) => {
  const getColor = () => {
    switch (severity) {
      case 'error': return '#f44336';
      case 'warning': return '#ff9800';
      case 'info': return '#2196f3';
      case 'success': return '#4caf50';
      default: return '#2196f3';
    }
  };

  return {
    backgroundColor: alpha(getColor(), 0.1),
    color: alpha(getColor(), 0.9),
    border: `1px solid ${alpha(getColor(), 0.3)}`,
    borderRadius: 1
  };
};

// Tooltip styles
export const tooltipStyles = {
  tooltip: {
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    color: '#fff',
    fontSize: '0.8rem',
    borderRadius: 1,
    padding: '8px 12px',
    boxShadow: '0 2px 10px rgba(0, 0, 0, 0.2)'
  }
};

// Common grid container styles
export const gridContainerStyles = {
  spacing: 3,
  mb: 3
};

// Chart styles
export const chartStyles = {
  container: {
    height: 300,
    mt: 2,
    mb: 2
  },
  tooltip: {
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderColor: '#4FC3F7',
    borderRadius: 1,
    padding: 10,
    color: '#fff'
  }
};

// Data visualization colors
export const visualizationColors = [
  '#4FC3F7', // Primary
  '#FF4081', // Secondary
  '#4CAF50', // Success 
  '#FFC107', // Warning
  '#9C27B0', // Purple
  '#FF5722', // Orange
  '#607D8B', // Blue Grey
  '#00BCD4'  // Cyan
]; 