# PortalSections Component

A comprehensive React component for dynamic portal section management with drag-and-drop reordering, visibility controls, and customizable layouts.

## Features

### ✨ Core Functionality
- **Dynamic Section Rendering**: Supports 13+ different section types (header, experience, skills, etc.)
- **Drag & Drop Reordering**: Intuitive section reordering with visual feedback
- **Visibility Controls**: Toggle section visibility with protected required sections
- **Custom Layouts**: Support for vertical, horizontal, grid, and masonry layouts
- **Smooth Animations**: Configurable animations with duration and easing controls
- **Mobile Responsive**: Touch-friendly drag operations and responsive design

### 🎨 Customization
- **Section Templates**: Custom renderers for each section type
- **Theming Support**: Dark/light mode with customizable colors
- **Spacing Options**: Compact, normal, and relaxed spacing modes
- **Layout Flexibility**: Multiple layout options with responsive breakpoints
- **Error Boundaries**: Individual section error handling

### 🔧 Management Features
- **Add/Remove Sections**: Dynamic section addition and deletion
- **Settings Panel**: Comprehensive configuration interface
- **Real-time Saving**: Firebase integration with optimistic updates
- **Change Tracking**: Visual indicators for unsaved changes
- **Reset Functionality**: Restore default configuration

### ♿ Accessibility
- **ARIA Labels**: Comprehensive screen reader support
- **Keyboard Navigation**: Full keyboard accessibility
- **Focus Management**: Proper focus handling during interactions
- **Semantic HTML**: Proper heading hierarchy and structure

## Usage

### Basic Implementation

```tsx
import { PortalSections } from './components/features/Portal/PortalSections';
import { PortalSection, PortalConfig } from './types/portal-component-props';

const MyPortal = () => {
  const sections: PortalSection[] = [
    {
      id: 'header',
      name: 'Header Section',
      type: 'header',
      data: { name: 'John Doe', title: 'Software Engineer' },
      visible: true,
      order: 0,
      customization: {},
      isLoading: false
    },
    // ... more sections
  ];

  const portalConfig: PortalConfig = {
    id: 'my-portal',
    name: 'Professional Portfolio',
    // ... configuration
  };

  return (
    <PortalSections
      jobId="job-123"
      profileId="profile-123"
      portalConfig={portalConfig}
      sections={sections}
      allowReordering={true}
      allowToggle={true}
      onSectionsReorder={(newSections) => console.log('Reordered:', newSections)}
      onSectionToggle={(id, visible) => console.log('Toggled:', id, visible)}
    />
  );
};
```

### Advanced Configuration

```tsx
<PortalSections
  // ... basic props
  sectionConfig={{
    allowReordering: true,
    allowToggle: true,
    allowEditing: true,
    layout: 'grid',
    spacing: 'relaxed',
    animations: {
      enabled: true,
      duration: 300,
      easing: 'ease-in-out'
    }
  }}
  renderOptions={{
    lazyLoad: true,
    virtualization: false,
    errorBoundaries: true,
    loadingPlaceholders: true
  }}
  customRenderers={{
    header: ({ section }) => <CustomHeaderRenderer section={section} />,
    skills: ({ section }) => <CustomSkillsRenderer section={section} />
  }}
/>
```

### Custom Section Renderers

```tsx
const customRenderers = {
  header: ({ section, onUpdate }: {
    section: PortalSection;
    onUpdate?: (data: any) => void;
  }) => (
    <div className="custom-header">
      <h1>{section.data.name}</h1>
      <p>{section.data.title}</p>
      {/* Custom header implementation */}
    </div>
  ),
  
  skills: ({ section }: { section: PortalSection }) => (
    <div className="skills-chart">
      {section.data.skills?.map((skill: any) => (
        <div key={skill.name} className="skill-bar">
          <span>{skill.name}</span>
          <div className="progress">
            <div 
              className="fill" 
              style={{ width: `${skill.level}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  )
};
```

## Section Types

The component supports the following section types:

| Type | Description | Required | Default Visible |
|------|-------------|----------|-----------------|
| `header` | Profile photo, name, and title | ✅ | ✅ |
| `summary` | Professional summary | ❌ | ✅ |
| `experience` | Work experience timeline | ❌ | ✅ |
| `education` | Educational background | ❌ | ✅ |
| `skills` | Technical and soft skills | ❌ | ✅ |
| `projects` | Notable projects | ❌ | ✅ |
| `achievements` | Awards and recognition | ❌ | ❌ |
| `certifications` | Professional certifications | ❌ | ❌ |
| `languages` | Language proficiency | ❌ | ❌ |
| `testimonials` | Recommendations | ❌ | ❌ |
| `contact` | Contact information | ❌ | ✅ |
| `portfolio` | Visual portfolio gallery | ❌ | ❌ |
| `social` | Social media links | ❌ | ❌ |
| `custom` | Custom content section | ❌ | ❌ |

## Props Interface

### PortalSectionsProps

```tsx
interface PortalSectionsProps extends PortalComponentProps {
  // Section data
  sections: PortalSection[];
  
  // Configuration
  sectionConfig?: {
    allowReordering?: boolean;
    allowToggle?: boolean;
    allowEditing?: boolean;
    layout?: 'vertical' | 'horizontal' | 'grid' | 'masonry';
    spacing?: 'compact' | 'normal' | 'relaxed';
    animations?: {
      enabled?: boolean;
      duration?: number;
      easing?: string;
    };
  };
  
  // Behavior controls
  allowReordering?: boolean;
  allowToggle?: boolean;
  
  // Event handlers
  onSectionsReorder?: (sections: PortalSection[]) => void;
  onSectionToggle?: (sectionId: string, visible: boolean) => void;
  onSectionEdit?: (sectionId: string, newData: any) => void;
  onSectionLoad?: (sectionId: string) => void;
  onSectionError?: (sectionId: string, error: PortalError) => void;
  
  // Rendering options
  renderOptions?: {
    lazyLoad?: boolean;
    virtualization?: boolean;
    errorBoundaries?: boolean;
    loadingPlaceholders?: boolean;
  };
  
  // Custom renderers
  customRenderers?: {
    [sectionType: string]: React.ComponentType<{
      section: PortalSection;
      config: any;
      onUpdate?: (data: any) => void;
      onError?: (error: PortalError) => void;
    }>;
  };
}
```

## State Management

The component manages several internal states:

- **Sections Array**: Current section configuration with order and visibility
- **Layout Settings**: Current layout, spacing, and animation preferences
- **Change Tracking**: Tracks unsaved changes and shows save indicators
- **Loading States**: Individual section loading and global save states
- **Error Handling**: Section-level and component-level error states

## Firebase Integration

The component integrates with Firebase Functions for persistence:

```typescript
// Save sections configuration
const saveResult = await callFunction('updatePortalSections', {
  jobId,
  profileId,
  sections,
  config: {
    layout: 'grid',
    spacing: 'normal',
    animations: { enabled: true, duration: 300 }
  }
});
```

## Styling

The component uses Tailwind CSS with the following classes:

- **Layout**: `flex`, `grid`, `columns-*` for different layout modes
- **Spacing**: `gap-2`, `gap-4`, `gap-6` for spacing variants
- **Animations**: `transition-all`, `duration-*` for smooth transitions
- **States**: `opacity-50`, `scale-95` for drag states
- **Theme**: `dark:*` classes for dark mode support

## Performance Considerations

### Optimization Features
- **Lazy Loading**: Optional lazy loading for large section lists
- **Virtualization**: Virtual scrolling for performance with many sections
- **Memoization**: React.memo and useCallback for preventing unnecessary re-renders
- **Error Boundaries**: Isolated error handling prevents cascade failures

### Best Practices
- Use `customRenderers` for complex section content
- Enable `lazyLoad` for sections with heavy content
- Implement proper `onUpdate` handlers for real-time sync
- Use `errorBoundaries` for production deployments

## Testing

The component includes comprehensive tests covering:

- **Rendering**: Section visibility and content rendering
- **Interactions**: Drag & drop, visibility toggles, editing
- **Configuration**: Layout changes, settings management
- **Error Handling**: Section errors, network failures
- **Accessibility**: Keyboard navigation, screen reader support

Run tests with:
```bash
npm test PortalSections
```

## Browser Support

- **Modern Browsers**: Chrome 88+, Firefox 85+, Safari 14+, Edge 88+
- **Mobile**: iOS Safari 14+, Chrome Mobile 88+
- **Drag & Drop**: HTML5 backend for desktop, Touch backend for mobile
- **Features**: CSS Grid, Flexbox, Custom Properties required

## Dependencies

- `react-dnd`: Drag and drop functionality
- `react-dnd-html5-backend`: Desktop drag support
- `react-dnd-touch-backend`: Mobile touch support
- `react-device-detect`: Device detection for backend selection
- `lucide-react`: Icon components
- `react-hot-toast`: Toast notifications

## Migration Guide

### From v1.x to v2.x

1. **Props Changes**: `sectionConfig` now contains layout settings
2. **Event Handlers**: `onSectionReorder` renamed to `onSectionsReorder`
3. **Custom Renderers**: New prop signature with `onUpdate` callback
4. **Dependencies**: Added react-dnd peer dependencies

### Example Migration

```tsx
// v1.x
<PortalSections
  layout="grid"
  onSectionReorder={handleReorder}
  customComponents={{ header: HeaderComponent }}
/>

// v2.x
<PortalSections
  sectionConfig={{ layout: 'grid' }}
  onSectionsReorder={handleReorder}
  customRenderers={{ header: HeaderComponent }}
/>
```

## Contributing

When contributing to this component:

1. **Follow TypeScript**: Maintain strict typing
2. **Test Coverage**: Add tests for new features
3. **Accessibility**: Ensure ARIA compliance
4. **Performance**: Consider render optimization
5. **Documentation**: Update this README for API changes

## License

This component is part of the CVPlus project and follows the project's licensing terms.