# ISS Cargo Management System - UI/UX Guidelines

This document provides guidelines for maintaining a consistent UI/UX across the ISS Cargo Management application.

## Common Styles

The application uses a set of common styles defined in `frontend/src/components/commonStyles.js`. These styles ensure visual consistency throughout the application and should be used in all components.

### How to Use Common Styles

1. Import the necessary styles in your component:

```javascript
import { 
  cardStyles, 
  headerStyles, 
  contentBoxStyles, 
  dividerStyles 
  // Import other styles as needed
} from './commonStyles';
```

2. Apply the styles to your components:

```javascript
// For a card component
<Card sx={cardStyles(theme)}>
  <CardContent sx={contentBoxStyles(theme)}>
    <Typography variant="h6" sx={typographyStyles.sectionTitle}>
      Section Title
    </Typography>
    <Divider sx={dividerStyles(theme)} />
    {/* Your content here */}
  </CardContent>
</Card>
```

## Style Guidelines

### Color Scheme

The application uses a space-themed color scheme:
- Primary: Blue (#4FC3F7)
- Secondary: Pink (#FF4081)
- Success: Green (#4CAF50)
- Warning: Amber (#FFC107)
- Error: Red (#F44336)

For data visualization, use the predefined `visualizationColors` array for consistency.

### Typography

- Use the typographyStyles object for consistent text styling:
  - `headerTitle`: Main page headers
  - `sectionTitle`: Section headers within a page
  - `bodyText`: Regular text content
  - `captionText`: Small, secondary text

### Layout

- Use Grid components with consistent spacing
- Cards should use the cardStyles
- Maintain consistent padding and margins
- Follow a sectioned approach with clear visual hierarchy

### Components

#### Cards

All content sections should be wrapped in Card components with the common cardStyles applied:

```javascript
<Card sx={cardStyles(theme)}>
  <CardContent sx={contentBoxStyles(theme)}>
    {/* Content */}
  </CardContent>
</Card>
```

#### Headers

Page headers should use the headerStyles:

```javascript
<Paper elevation={0} sx={headerStyles(theme)}>
  {/* Header content */}
</Paper>
```

#### Forms

Form fields should use the formFieldStyles for consistent appearance:

```javascript
<TextField 
  label="Field Label" 
  sx={formFieldStyles(theme)}
  // Other props
/>
```

#### Lists

List items should use the listItemStyles:

```javascript
<ListItem sx={listItemStyles(theme)}>
  {/* List item content */}
</ListItem>
```

#### Buttons

Primary action buttons should use the primaryButtonStyles:

```javascript
<Button 
  variant="contained"
  sx={primaryButtonStyles(theme)}
>
  Button Text
</Button>
```

#### Charts & Data Visualization

- Use the visualizationColors array for consistent coloring
- Apply chartStyles for consistent chart appearance
- Ensure tooltips follow the same styling pattern

## Responsive Design

- Use responsive sizing and Grid layouts
- Consider mobile-first design principles
- Test UI on different screen sizes

## Loading States

Use the loadingStyles for consistent loading indicators:

```javascript
<Box sx={loadingStyles(theme)}>
  <CircularProgress />
</Box>
```

## Error States

Use the alertStyles for consistent error messaging:

```javascript
<Alert severity="error" sx={alertStyles('error')}>
  Error message
</Alert>
```

## Accessibility

- Ensure sufficient color contrast
- Provide meaningful alt text for images
- Use semantic HTML elements
- Test with keyboard navigation

## Best Practices

1. Always use the common styles rather than defining inline styles
2. Maintain consistent spacing and alignment
3. Follow the visual hierarchy established in the design
4. Use the theme object for accessing theme values
5. Test changes on different screen sizes

By following these guidelines, we can maintain a cohesive and professional UI/UX throughout the ISS Cargo Management application. 