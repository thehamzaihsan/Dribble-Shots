# Debug Features: Template Refresh

## 🔄 Refresh Template Button

A debug button has been added to the customization page to help developers iterate on template JSON files quickly.

## Features

### 1. Refresh Template Button

**Location**: Customize page, between Download and Start Over buttons

**Appearance**: 
- Blue background with blue text
- RefreshCw icon
- Full width button
- Tooltip: "Reload template from JSON file (for debugging)"

**What It Does**:
- Reloads the current template JSON from file
- Bypasses browser cache (adds timestamp query param)
- Updates template data in real-time
- Preserves user's text edits
- Logs template data to console
- Triggers canvas redraw immediately

### 2. Template Debug Info

**Location**: Preview area header (top-right)

**Displays**:
- Template name badge
- Canvas dimensions (width × height)
- Desktop mockup file path (if exists)
- Mobile mockup file path (if exists)

**Example Display**:
```
Desktop + Mobile | 1920 × 1080 | D: /Desktop.png | M: /Android.png
```

## How to Use

### Quick Template Iteration Workflow:

1. **Edit your template JSON** file in `/public/templates/desktop-mobile.json`
2. **Save the file**
3. **Click "Refresh Template"** button in the app
4. **See changes immediately** without reloading page

### Example: Adjusting Mockup Position

**Before** (`desktop-mobile.json`):
```json
"mockupConfig": {
  "screenX": 165,
  "screenY": 140,
  "screenWidth": 970,
  "screenHeight": 625
}
```

**Steps**:
1. Edit JSON: Change `screenX: 165` to `screenX: 170`
2. Save file
3. Click "Refresh Template" button
4. Canvas updates immediately with new position
5. Test alignment
6. Repeat until perfect

## Technical Details

### Cache Busting

The refresh function adds a timestamp to force fresh data:

```javascript
const res = await fetch(`/templates/${selectedTemplate}.json?t=${Date.now()}`);
```

This bypasses browser cache and always gets the latest file content.

### Text Preservation

User text edits are preserved during refresh:

```javascript
initialTexts[el.id] = textContents[el.id] || el.content;
```

If user has edited text, it keeps their edits. If not, uses template default.

### Console Logging

Template data is logged to console for debugging:

```javascript
console.log('Template refreshed:', freshTemplate);
```

Open DevTools Console (F12) to see full template structure.

## Use Cases

### 1. Adjusting Mockup Positions

Edit `mockupConfig` values and refresh to see alignment changes instantly.

### 2. Testing Text Layouts

Change text positions, sizes, or alignment and refresh to preview.

### 3. Experimenting with Device Sizes

Modify device dimensions and see how it affects layout.

### 4. Trying Different Canvas Sizes

Switch between 16:9, 1:1, etc. without restarting app.

### 5. Debugging Template Issues

If template doesn't look right, refresh to reload latest JSON.

## Debug Info Display

### Template Name
Shows which template is currently active.

### Canvas Dimensions
Displays canvas size for reference.

### Mockup File Paths
Shows which mockup images are being used:
- **D:** Desktop mockup path
- **M:** Mobile mockup path

Helps verify correct mockup files are loaded.

## Button Styling

```jsx
<button
  onClick={refreshTemplate}
  className="w-full bg-blue-100 text-blue-700 py-3 px-6 rounded-lg 
             font-semibold hover:bg-blue-200 transition-all 
             flex items-center justify-center gap-2 border border-blue-300"
>
  <RefreshCw size={20} />
  Refresh Template
</button>
```

**Colors**: Blue theme to indicate debug/development feature
**Icon**: RefreshCw from lucide-react
**Layout**: Full width, centered text and icon

## Workflow Example

### Scenario: Fine-tuning Mobile Mockup Position

**Current Issue**: Screenshot slightly misaligned in Android.png frame

**Solution**:

1. Open `/public/templates/desktop-mobile.json`
2. Find mobile mockupConfig:
   ```json
   "screenX": 1270,
   "screenY": 254
   ```
3. Adjust values (try different positions):
   ```json
   "screenX": 1268,  // Move 2px left
   "screenY": 256    // Move 2px down
   ```
4. Save file
5. Click "Refresh Template" in app
6. Check alignment
7. Repeat until perfect
8. Done! No page reload needed

## Console Output

When you click "Refresh Template", console shows:

```javascript
Template refreshed: {
  id: "desktop-mobile",
  name: "Desktop + Mobile",
  canvas: { width: 1920, height: 1080 },
  devices: {
    desktop: { x: 150, y: 100, ... },
    mobile: { x: 1250, y: 200, ... }
  },
  elements: [ ... ]
}
```

Use this to verify template structure and debug issues.

## Benefits

✅ **Faster Development**: No need to reload entire app  
✅ **Instant Feedback**: See changes immediately  
✅ **Preserve State**: Keep screenshots and text edits  
✅ **Visual Debugging**: See mockup paths in preview header  
✅ **Console Logging**: Full template data for inspection  
✅ **No Build Required**: Edit JSON, click refresh, done!  

## Future Enhancements

Possible additions:
- Show mockupConfig values in debug panel
- Visual grid overlay for positioning
- Coordinate picker tool
- Template validation warnings
- Hot reload when JSON file changes
- Mockup image preview in debug panel

## Files Modified

1. **App.jsx**
   - Added `refreshTemplate()` function
   - Added timestamp cache busting to `loadTemplates()`
   - Added Refresh Template button
   - Added debug info display in preview header

2. **Template JSON**
   - Added mockup file paths (already present)
   - No changes needed, just reference for display

## Status

✅ Refresh Template button added  
✅ Cache busting implemented  
✅ Text preservation working  
✅ Debug info display added  
✅ Console logging enabled  
✅ Build successful  

---

**Pro Tip**: Keep DevTools Console (F12) open while developing templates to see detailed refresh logs and catch any JSON syntax errors!
