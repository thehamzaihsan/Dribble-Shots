# Device Mockups

## Overview
The application now includes **built-in device mockup frames** that are drawn directly on the canvas using the Canvas API. No external images are needed!

## Features

### Desktop Mockups
- **Light gray frame** with rounded corners
- **macOS-style traffic lights** (red, yellow, green buttons)
- **Title bar** with proper spacing
- **Subtle bezel** around the screen

### Mobile Mockups
- **Dark frame** (charcoal gray)
- **iPhone-style notch** at the top
- **Camera** (blue dot) and **speaker** (dark line) in the notch
- **Rounded corners** (30-36px radius)
- **Slim bezels** around the screen

## Customization Options

Users can toggle mockups on/off in the customization panel:
- ✅ **Show Device Frames** - Displays realistic device mockups
- ❌ **Hide Device Frames** - Shows only screenshots with borders

## Technical Implementation

The mockups are drawn in `drawDevice()` function:

1. **Frame Detection**: Automatically detects mobile vs desktop based on width (<500px = mobile)
2. **Dynamic Spacing**: Adjusts screen position to account for notch/title bar
3. **Layered Rendering**: 
   - Frame background
   - UI elements (notch, buttons, title bar)
   - Screenshot (clipped to screen area)
   - Screen border

## Template Configuration

Each template JSON includes mockup settings:

```json
{
  "devices": {
    "desktop": {
      "mockup": true,  // Enable mockup frame
      "borderRadius": 12,
      "shadow": true
    },
    "mobile": {
      "mockup": true,
      "borderRadius": 30
    }
  }
}
```

## Dimensions

### Desktop Frame
- Frame thickness: 16px
- Title bar height: 30px
- Traffic light size: 6px radius
- Button spacing: 20px

### Mobile Frame  
- Frame thickness: 12px
- Notch: 120px × 28px
- Camera: 6px radius
- Speaker: 60px × 4px

## Screenshots

The mockups make screenshots look like they're running on real devices, adding professional polish to your presentations!
