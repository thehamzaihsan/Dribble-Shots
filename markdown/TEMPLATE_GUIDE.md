# Template Configuration Guide

## Current Template

### File: `desktop-mobile.json`

```json
{
  "id": "desktop-mobile",
  "name": "Desktop + Mobile",
  "description": "Desktop and mobile side by side with mockup frames",
  "canvas": {
    "width": 1920,
    "height": 1080
  },
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
    },
    "mobile": {
      "enabled": true,
      "x": 1250,
      "y": 200,
      "width": 330,
      "height": 680,
      "borderRadius": 30,
      "shadow": true,
      "mockup": true,
      "mockupImage": "/Android.png",
      "mockupConfig": {
        "x": 1250,
        "y": 200,
        "width": 330,
        "height": 680,
        "screenX": 1270,
        "screenY": 254,
        "screenWidth": 290,
        "screenHeight": 578
      }
    }
  },
  "elements": [
    {
      "id": "title",
      "type": "text",
      "content": "Your Project Title",
      "x": 960,
      "y": 900,
      "fontSize": 48,
      "fontFamily": "Aeonik",
      "fontWeight": "bold",
      "color": "#000000",
      "textAlign": "center",
      "maxWidth": 1200
    },
    {
      "id": "subtitle",
      "type": "text",
      "content": "Beautiful responsive design",
      "x": 960,
      "y": 980,
      "fontSize": 24,
      "fontFamily": "Aeonik",
      "fontWeight": "normal",
      "color": "#666666",
      "textAlign": "center",
      "maxWidth": 1000
    }
  ]
}
```

---

## How to Add a New Template

### Step 1: Prepare Mockup Images (Optional)

If you want device mockups, add your mockup images to `/public/` folder:
- Desktop mockup: `Desktop.png` (already exists)
- Mobile mockup: `Android.png` (already exists)
- Or add your own: `iPhone.png`, `Macbook.png`, etc.

### Step 2: Create Template JSON File

Create a new file in `/public/templates/` directory, for example: `my-template.json`

```json
{
  "id": "my-template",
  "name": "My Template Name",
  "description": "Short description of the layout",
  "canvas": {
    "width": 1920,
    "height": 1080
  },
  "devices": {
    "desktop": {
      "enabled": true,
      "x": 200,
      "y": 150,
      "width": 1200,
      "height": 750,
      "borderRadius": 12,
      "shadow": true,
      "mockup": true,
      "mockupImage": "/Desktop.png"
    },
    "mobile": {
      "enabled": true,
      "x": 1450,
      "y": 250,
      "width": 300,
      "height": 600,
      "borderRadius": 30,
      "shadow": true,
      "mockup": true,
      "mockupImage": "/Android.png"
    }
  },
  "elements": [
    {
      "id": "title",
      "type": "text",
      "content": "Your Title Here",
      "x": 960,
      "y": 950,
      "fontSize": 52,
      "fontFamily": "Aeonik",
      "fontWeight": "bold",
      "color": "#000000",
      "textAlign": "center",
      "maxWidth": 1400
    }
  ]
}
```

### Step 3: Register Template in Index

Edit `/public/templates/index.json` and add your template:

```json
[
  "desktop-mobile.json",
  "my-template.json"
]
```

### Step 4: Restart Dev Server

The template will now appear in the template selection screen!

---

## Configuration Reference

### Canvas Configuration

```json
"canvas": {
  "width": 1920,     // Canvas width in pixels
  "height": 1080     // Canvas height in pixels
}
```

**Common Sizes:**
- `1920x1080` - Full HD (16:9)
- `1800x1200` - 3:2 ratio
- `1080x1080` - Square (1:1)
- `2560x1440` - 2K
- `3840x2160` - 4K

---

### Device Configuration

#### Desktop Device

```json
"desktop": {
  "enabled": true,              // Show desktop device
  "x": 150,                     // X position on canvas
  "y": 100,                     // Y position on canvas
  "width": 1000,                // Device width
  "height": 680,                // Device height
  "borderRadius": 12,           // Corner radius
  "shadow": true,               // Enable drop shadow
  "mockup": true,               // Use mockup frame
  "mockupImage": "/Desktop.png", // Path to mockup image
  "mockupConfig": {             // OPTIONAL: Precise mockup positioning
    "x": 150,                   // Mockup frame X position
    "y": 100,                   // Mockup frame Y position
    "width": 1000,              // Mockup frame width
    "height": 680,              // Mockup frame height
    "screenX": 165,             // Screenshot X position (inside mockup)
    "screenY": 140,             // Screenshot Y position (inside mockup)
    "screenWidth": 970,         // Screenshot width
    "screenHeight": 625         // Screenshot height
  }
}
```

#### Mobile Device

```json
"mobile": {
  "enabled": true,               // Show mobile device
  "x": 1250,                     // X position on canvas
  "y": 200,                      // Y position on canvas
  "width": 330,                  // Device width
  "height": 680,                 // Device height
  "borderRadius": 30,            // Corner radius (higher for phones)
  "shadow": true,                // Enable drop shadow
  "mockup": true,                // Use mockup frame
  "mockupImage": "/Android.png", // Path to mockup image
  "mockupConfig": {              // OPTIONAL: Precise mockup positioning
    "x": 1250,                   // Mockup frame X position
    "y": 200,                    // Mockup frame Y position
    "width": 330,                // Mockup frame width
    "height": 680,               // Mockup frame height
    "screenX": 1270,             // Screenshot X position (inside mockup)
    "screenY": 254,              // Screenshot Y position (inside mockup)
    "screenWidth": 290,          // Screenshot width
    "screenHeight": 578          // Screenshot height
  }
}
```

**Device Dimensions:**
- Desktop: 1000-1500px wide
- Mobile: 300-400px wide
- Tablet: 600-800px wide

---

### Mockup Configuration Explained

The `mockupConfig` object gives you **precise control** over mockup and screenshot positioning:

#### Without mockupConfig (Auto-calculated):
- Screenshot position is calculated as percentage of device size
- May not align perfectly with your mockup image

#### With mockupConfig (Precise positioning):
- You specify exact pixel positions for both mockup frame AND screenshot
- Perfect alignment with your mockup image

**How to find the right values:**

1. **Open your mockup image** (Desktop.png or Android.png) in an image editor
2. **Measure the screen area** - where the screenshot should appear
3. **Note down**:
   - Screen area starting X position (from left edge)
   - Screen area starting Y position (from top edge)
   - Screen area width
   - Screen area height

4. **Add to template**:
```json
"mockupConfig": {
  "x": 150,           // Where mockup frame starts
  "y": 100,           // Where mockup frame starts
  "width": 1000,      // Mockup frame size
  "height": 680,      // Mockup frame size
  "screenX": 165,     // Screen area starts 15px from mockup left
  "screenY": 140,     // Screen area starts 40px from mockup top
  "screenWidth": 970, // Screen is 30px narrower than mockup
  "screenHeight": 625 // Screen is 55px shorter than mockup
}
```

**Example**: If your Desktop.png has a 15px bezel on sides and 40px title bar:
- `screenX = x + 15` (device x + left bezel)
- `screenY = y + 40` (device y + title bar height)
- `screenWidth = width - 30` (device width - both bezels)
- `screenHeight = height - 55` (device height - title bar - bottom bezel)

---

### Text Elements

```json
{
  "id": "title",                // Unique identifier
  "type": "text",               // Element type
  "content": "Default text",    // Default content
  "x": 960,                     // X position (center = canvas width / 2)
  "y": 900,                     // Y position
  "fontSize": 48,               // Font size in pixels
  "fontFamily": "Aeonik",       // Font family name
  "fontWeight": "bold",         // normal | bold
  "color": "#000000",           // Text color (hex)
  "textAlign": "center",        // left | center | right
  "maxWidth": 1200              // Maximum text width for wrapping
}
```

**Font Weights:**
- `"normal"` - Regular weight (400)
- `"bold"` - Bold weight (700)

**Text Alignment:**
- `"left"` - Left aligned
- `"center"` - Center aligned (x should be canvas width / 2)
- `"right"` - Right aligned

---

## Mockup Image Requirements

### For Best Results:

1. **Image Format**: PNG with transparency
2. **Resolution**: High resolution (2000px+ recommended)
3. **Aspect Ratio**: Match your device dimensions in template
4. **Screen Area**: Leave empty/transparent space where screenshot should appear

### Adjusting Screen Position:

If mockup image doesn't align perfectly, adjust these values in `App.jsx`:

```javascript
// Mobile mockup
const frameMargin = device.width * 0.06;  // Adjust horizontal margin
screenY = device.y + device.height * 0.08; // Adjust top position

// Desktop mockup  
const frameMargin = device.width * 0.015; // Adjust horizontal margin
screenY = device.y + device.height * 0.06; // Adjust top position
```

---

## Template Examples

### Desktop Only Template

```json
{
  "id": "desktop-only",
  "name": "Desktop Only",
  "description": "Single large desktop screenshot",
  "canvas": {
    "width": 1920,
    "height": 1080
  },
  "devices": {
    "desktop": {
      "enabled": true,
      "x": 210,
      "y": 60,
      "width": 1500,
      "height": 900,
      "borderRadius": 16,
      "shadow": true,
      "mockup": true,
      "mockupImage": "/Desktop.png"
    },
    "mobile": {
      "enabled": false
    }
  },
  "elements": [
    {
      "id": "title",
      "type": "text",
      "content": "Desktop Application",
      "x": 960,
      "y": 1000,
      "fontSize": 56,
      "fontFamily": "Aeonik",
      "fontWeight": "bold",
      "color": "#000000",
      "textAlign": "center",
      "maxWidth": 1400
    }
  ]
}
```

### Mobile Only Template

```json
{
  "id": "mobile-only",
  "name": "Mobile Only",
  "description": "Single mobile screenshot centered",
  "canvas": {
    "width": 1920,
    "height": 1080
  },
  "devices": {
    "desktop": {
      "enabled": false
    },
    "mobile": {
      "enabled": true,
      "x": 785,
      "y": 60,
      "width": 350,
      "height": 800,
      "borderRadius": 36,
      "shadow": true,
      "mockup": true,
      "mockupImage": "/Android.png"
    }
  },
  "elements": [
    {
      "id": "title",
      "type": "text",
      "content": "Mobile App",
      "x": 960,
      "y": 920,
      "fontSize": 60,
      "fontFamily": "Aeonik",
      "fontWeight": "bold",
      "color": "#000000",
      "textAlign": "center",
      "maxWidth": 1000
    },
    {
      "id": "subtitle",
      "type": "text",
      "content": "Available on iOS & Android",
      "x": 960,
      "y": 1020,
      "fontSize": 28,
      "fontFamily": "Aeonik",
      "fontWeight": "normal",
      "color": "#666666",
      "textAlign": "center",
      "maxWidth": 900
    }
  ]
}
```

---

## Tips for Creating Templates

1. **Start with positioning devices** - Place desktop and mobile first
2. **Leave space for text** - Don't place devices too low
3. **Test with real screenshots** - Use actual website screenshots to verify
4. **Use shadows sparingly** - Too many shadows can look cluttered
5. **Consistent spacing** - Use margins that look balanced
6. **Center important elements** - Use canvas width / 2 for centered items
7. **Multiple text elements** - Add title, subtitle, description as needed
8. **Test different fonts** - Ensure text is readable at all sizes

---

## Troubleshooting

### Mockup image not showing
- Check file path starts with `/` (e.g., `/Desktop.png`)
- Ensure file exists in `/public/` folder
- Check file name capitalization matches exactly

### Screenshot not aligned in mockup
- Adjust `frameMargin` percentages in `App.jsx`
- Modify `screenY` offset values
- Test with different device sizes

### Template not appearing
- Check `index.json` includes your template file name
- Verify JSON syntax is valid (use JSONLint.com)
- Restart dev server after adding template

---

## Current File Locations

- **Templates**: `/public/templates/`
- **Template Index**: `/public/templates/index.json`
- **Mockup Images**: `/public/` (Desktop.png, Android.png)
- **Template Logic**: `/src/App.jsx` (drawDevice function)

---

Need help? Check the existing `desktop-mobile.json` template as a reference!
