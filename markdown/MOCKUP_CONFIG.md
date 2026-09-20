# Mockup Positioning in Template JSON

## ✅ Feature Added: mockupConfig

You can now specify **exact positions** for mockup images and screenshot placement in your template JSON files!

## Why This Matters

Previously, screenshot positions inside mockup frames were calculated as percentages, which could lead to misalignment. Now you have **pixel-perfect control**!

## Template Structure

```json
{
  "devices": {
    "desktop": {
      "enabled": true,
      "x": 150,
      "y": 100,
      "width": 1000,
      "height": 680,
      "borderRadius": 12,
      "shadow": true,
      "mockup": true,
      "mockupImage": "/Desktop.png",
      "mockupConfig": {
        "x": 150,
        "y": 100,
        "width": 1000,
        "height": 680,
        "screenX": 165,
        "screenY": 140,
        "screenWidth": 970,
        "screenHeight": 625
      }
    }
  }
}
```

## mockupConfig Properties

| Property | Description | Example |
|----------|-------------|---------|
| `x` | Mockup frame X position on canvas | `150` |
| `y` | Mockup frame Y position on canvas | `100` |
| `width` | Mockup frame width | `1000` |
| `height` | Mockup frame height | `680` |
| `screenX` | Screenshot X position (absolute) | `165` |
| `screenY` | Screenshot Y position (absolute) | `140` |
| `screenWidth` | Screenshot width | `970` |
| `screenHeight` | Screenshot height | `625` |

## How to Calculate Values

### Method 1: Measure Your Mockup Image

1. Open `Desktop.png` or `Android.png` in Photoshop/Figma/etc.
2. Measure the screen area (where screenshot should appear)
3. Note down X, Y, Width, Height of screen area
4. Add to template

### Method 2: Visual Adjustment

1. Start with device dimensions
2. Add mockupConfig with same values as device
3. Adjust `screenX`, `screenY`, `screenWidth`, `screenHeight` by small amounts
4. Test and refine until perfect

## Example: Desktop with 15px Bezel

If your Desktop.png has:
- 15px bezel on left and right
- 40px title bar on top
- 15px bezel on bottom

```json
"mockupConfig": {
  "x": 150,                    // Same as device.x
  "y": 100,                    // Same as device.y
  "width": 1000,               // Same as device.width
  "height": 680,               // Same as device.height
  "screenX": 165,              // 150 + 15 (left bezel)
  "screenY": 140,              // 100 + 40 (title bar)
  "screenWidth": 970,          // 1000 - 15 - 15 (both bezels)
  "screenHeight": 625          // 680 - 40 - 15 (title + bottom)
}
```

## Example: Mobile with Rounded Corners

If your Android.png has:
- 20px margin on left and right
- 54px status bar area on top
- 48px navigation area on bottom

```json
"mockupConfig": {
  "x": 1250,                   // Same as device.x
  "y": 200,                    // Same as device.y
  "width": 330,                // Same as device.width
  "height": 680,               // Same as device.height
  "screenX": 1270,             // 1250 + 20 (left margin)
  "screenY": 254,              // 200 + 54 (status bar)
  "screenWidth": 290,          // 330 - 20 - 20 (both margins)
  "screenHeight": 578          // 680 - 54 - 48 (status + nav)
}
```

## Fallback Behavior

If you **don't include mockupConfig**, the app will:
- Calculate positions automatically based on percentages
- Mobile: 6% margins, 8% top, 15% total spacing
- Desktop: 1.5% margins, 6% top, 8% total spacing

This works for most mockups but may not be perfectly aligned.

## Current Template

The current `desktop-mobile.json` template includes mockupConfig for both devices:

**Desktop (Desktop.png)**:
- Frame: 150, 100, 1000x680
- Screen: 165, 140, 970x625

**Mobile (Android.png)**:
- Frame: 1250, 200, 330x680
- Screen: 1270, 254, 290x578

## Testing Your Values

1. Edit the template JSON
2. Reload the app (dev server auto-reloads)
3. Upload or capture screenshots
4. Select your template
5. Check if screenshot aligns perfectly with mockup frame
6. Adjust values if needed

## Tips

✅ **Do**:
- Measure your mockup images accurately
- Test with real screenshots
- Start with conservative values
- Document your calculations

❌ **Don't**:
- Guess the values randomly
- Use negative values
- Make screen area larger than mockup frame
- Forget to update both x/y and width/height

## Tool Recommendations

**For Measuring Mockup Images**:
- Photoshop (Rulers + Info panel)
- Figma (Inspector panel)
- GIMP (Measure tool)
- Any image editor with rulers

**Quick Check**:
```
screenX >= mockupConfig.x
screenY >= mockupConfig.y
screenX + screenWidth <= mockupConfig.x + mockupConfig.width
screenY + screenHeight <= mockupConfig.y + mockupConfig.height
```

## Code Implementation

The app checks for `mockupConfig` in the template:

```javascript
// In App.jsx
if (mockupConfig.screenX !== undefined) {
  // Use exact positions from template
  screenX = mockupConfig.screenX;
  screenY = mockupConfig.screenY;
  screenWidth = mockupConfig.screenWidth;
  screenHeight = mockupConfig.screenHeight;
} else {
  // Fallback to calculated positions
  // ... percentage-based calculations
}
```

## Status

✅ mockupConfig is optional  
✅ Falls back to auto-calculation if not provided  
✅ Works for desktop and mobile devices  
✅ Pixel-perfect positioning possible  
✅ Current template uses mockupConfig  

---

For more details, see **TEMPLATE_GUIDE.md**
