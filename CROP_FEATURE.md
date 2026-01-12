# Screenshot Crop Feature

## Overview
Added a `crop` property to device configuration that controls how screenshots are scaled to fit device dimensions.

## Configuration

### In Template JSON

```json
{
  "devices": {
    "desktop": {
      "enabled": true,
      "x": 337,
      "y": 240,
      "width": 1154,
      "height": 770,
      "crop": true,        // Enable cropping (default: true)
      "mockup": true,
      "mockupImage": "/Desktop.png"
    }
  }
}
```

## Behavior

### When `crop: true` (default)
- Screenshot maintains its aspect ratio
- Image is scaled to **cover** the device dimensions
- **Crops from top** when image is taller than target
- **Crops from center** when image is wider than target
- Similar to CSS `object-fit: cover` with `object-position: top center`

### When `crop: false`
- Screenshot is stretched to fit device dimensions
- Aspect ratio is not maintained
- No cropping occurs
- Useful if you want exact fit regardless of distortion

## Cropping Strategy

### Horizontal Cropping (Image is wider)
```
Original: 1920x1080 → Target: 800x600
├─ Calculate new width: 1080 * (800/600) = 1440
├─ Crop amount: 1920 - 1440 = 480px
└─ Crop from center: 240px left, 240px right
```

### Vertical Cropping (Image is taller)
```
Original: 1200x2400 → Target: 400x600
├─ Calculate new height: 1200 / (400/600) = 1800
├─ Crop amount: 2400 - 1800 = 600px
└─ Crop from top: 0px top, 600px bottom ✓
```

## Examples

### Example 1: Desktop Screenshot (Crop Enabled)
```json
{
  "desktop": {
    "x": 337,
    "y": 240,
    "width": 1154,
    "height": 770,
    "crop": true
  }
}
```
- Screenshot aspect ratio: preserved
- Excess height: cropped from top
- Excess width: cropped from center

### Example 2: Mobile Screenshot (Crop Disabled)
```json
{
  "mobile": {
    "x": 0,
    "y": 200,
    "width": 330,
    "height": 335,
    "crop": false
  }
}
```
- Screenshot: stretched to fit
- Aspect ratio: not maintained
- No cropping

### Example 3: Mixed Configuration
```json
{
  "devices": {
    "desktop": {
      "crop": true    // Crop desktop screenshot
    },
    "mobile": {
      "crop": false   // Stretch mobile screenshot
    }
  }
}
```

## Implementation Details

### Code Location
- **File**: `src/App.jsx`
- **Functions**: `drawDeviceWithMockupImage()` and `drawSimpleDevice()`

### Logic Flow
```javascript
const cropEnabled = device.crop !== false; // Default true

if (cropEnabled) {
  // Calculate aspect ratios
  const imgAspect = img.width / img.height;
  const targetAspect = device.width / device.height;
  
  if (imgAspect > targetAspect) {
    // Wider: crop sides (center)
    sw = img.height * targetAspect;
    sx = (img.width - sw) / 2;
  } else {
    // Taller: crop from top
    sh = img.width / targetAspect;
    sy = 0; // Top alignment
  }
}

ctx.drawImage(img, sx, sy, sw, sh, x, y, width, height);
```

## Use Cases

### When to use `crop: true`
✅ Want to maintain aspect ratio
✅ Screenshot should look professional
✅ Okay with cropping excess content
✅ Above-the-fold content is most important

### When to use `crop: false`
✅ Need to show entire screenshot
✅ Don't mind distortion
✅ Screenshot dimensions match device exactly
✅ Custom pre-cropped screenshots

## Migration

### Default Behavior
If `crop` is not specified in template JSON:
- Defaults to `true` (crop enabled)
- Maintains aspect ratio
- Crops from top

### Existing Templates
All existing templates now have `crop: true` explicitly set:
```json
"desktop": { "crop": true },
"mobile": { "crop": true }
```

## Benefits

✅ **No distortion** - Screenshots look natural
✅ **Top-aligned** - Important header/hero sections always visible
✅ **Flexible** - Can disable per device
✅ **Backward compatible** - Defaults to smart cropping

## Troubleshooting

### Screenshot is cut off at bottom
- Expected behavior with `crop: true`
- Screenshot is taller than device height
- Only top portion is shown
- Solution: Increase device height or set `crop: false`

### Screenshot looks squished
- Check if `crop: false` is set
- Solution: Set `crop: true` to maintain aspect ratio

### Horizontal content is cut off
- Screenshot is wider than device
- Sides are cropped from center
- Solution: Adjust device width or use landscape screenshot
