# Simplified Mockup Configuration

## Overview
The mockup configuration has been simplified to separate concerns:
- **mockupConfig**: Controls the mockup frame image position/size
- **device properties**: Controls the screenshot position/size

## Template Structure

### Device Configuration
```json
{
  "desktop": {
    "enabled": true,
    "x": 193,              // Screenshot X position
    "y": 325,              // Screenshot Y position
    "width": 1178,         // Screenshot width
    "height": 766,         // Screenshot height
    "borderRadius": 12,
    "shadow": true,
    "mockup": true,
    "mockupImage": "/Desktop.png",
    "mockupConfig": {
      "x": 191,            // Mockup frame X position
      "y": 211,            // Mockup frame Y position
      "width": 1445,       // Mockup frame width
      "height": 876        // Mockup frame height
    }
  }
}
```

## How It Works

### Rendering Order
1. **Mockup frame** is drawn at `mockupConfig.x/y` with `mockupConfig.width/height`
2. **Screenshot** is drawn at `device.x/y` with `device.width/height`
3. Screenshot is clipped with rounded corners matching device borderRadius

### Positioning Strategy
- The mockup frame image (Desktop.png, Android.png) contains the device bezel/border
- The screenshot should fit inside the visible screen area of the mockup
- You control screenshot position by adjusting `device.x/y/width/height`
- You control mockup frame position by adjusting `mockupConfig.x/y/width/height`

### Example: Aligning Screenshot with Mockup

If your Desktop.png mockup has a bezel that's:
- 20px on left/right
- 40px on top
- 30px on bottom

And your mockup frame is at `x: 100, y: 100, width: 1200, height: 800`

Your screenshot should be at:
```json
"x": 120,                    // 100 + 20 (left bezel)
"y": 140,                    // 100 + 40 (top bezel)
"width": 1160,               // 1200 - 40 (left + right bezels)
"height": 730                // 800 - 70 (top + bottom bezels)
```

## Benefits of Simplified Structure

1. **Clearer separation of concerns**: Mockup frame vs screenshot positioning
2. **Easier to adjust**: Edit device x/y to move screenshot without recalculating frame
3. **More intuitive**: Device properties control the actual content (screenshot)
4. **Less duplication**: No need to specify screen dimensions separately

## Migration from Old Structure

Old structure had `screenX/screenY/screenWidth/screenHeight` in mockupConfig:
```json
"mockupConfig": {
  "x": 191,
  "y": 211,
  "width": 1445,
  "height": 876,
  "screenX": 193,          // ❌ REMOVED
  "screenY": 325,          // ❌ REMOVED
  "screenWidth": 1178,     // ❌ REMOVED
  "screenHeight": 766      // ❌ REMOVED
}
```

New structure uses device properties directly:
```json
"x": 193,                  // ✅ Used for screenshot
"y": 325,                  // ✅ Used for screenshot
"width": 1178,             // ✅ Used for screenshot
"height": 766,             // ✅ Used for screenshot
"mockupConfig": {
  "x": 191,                // ✅ Used for mockup frame only
  "y": 211,
  "width": 1445,
  "height": 876
}
```

## Troubleshooting

### Screenshot doesn't align with mockup frame
- Adjust `device.x/y` to move screenshot position
- Ensure device width/height accounts for mockup bezels
- Use debug info (Refresh Template button) to see actual positions

### Mockup frame is in wrong position
- Adjust `mockupConfig.x/y` to move the entire mockup frame
- This doesn't affect screenshot position (controlled by device.x/y)

### Screenshot is too large/small
- Adjust `device.width/height` to resize screenshot
- Keep aspect ratio consistent with actual screenshot dimensions
