# Troubleshooting: Customize Page Not Loading

## Quick Checklist

### 1. Complete the Workflow Steps

The customize page only shows after completing these steps:

✅ **Step 1: Input**
- Enter a URL OR upload screenshots
- Click "Continue"

✅ **Step 2: Template Selection**  
- Select "Desktop + Mobile" template
- Click on the template card

✅ **Step 3: Customize**
- Page should now load

**The customize page won't show unless you complete Steps 1 & 2!**

---

## Common Issues

### Issue: Blank page on Step 3

**Possible Causes**:

1. **No screenshots loaded**
   - Check: Did you enter a URL and click Continue?
   - Check: Did you upload at least one screenshot?
   - Solution: Go back and upload/capture screenshots

2. **Template not selected**
   - Check: Did you click on a template in Step 2?
   - Check: Does browser console show `templateData` is null?
   - Solution: Click on "Desktop + Mobile" template

3. **Template JSON error**
   - Check: Browser console (F12) for errors
   - Check: Template file exists at `/public/templates/desktop-mobile.json`
   - Solution: Validate JSON syntax

4. **Build issue**
   - Check: Run `npm run build` - does it succeed?
   - Solution: Fix any build errors shown

---

## Debug Steps

### Step 1: Open Browser Console

Press **F12** to open DevTools, go to **Console** tab

### Step 2: Check for Errors

Look for any red error messages:
- Template loading errors
- JSON parsing errors  
- React rendering errors

### Step 3: Check State

In console, type:
```javascript
// This won't work, but errors will show you what's wrong
```

### Step 4: Check Network Tab

1. Go to **Network** tab in DevTools
2. Reload page
3. Look for failed requests (red items)
4. Check if template JSON loaded successfully

---

## Expected Console Output

When customize page loads successfully, you should see:

```
Template refreshed: {
  id: "desktop-mobile",
  name: "Desktop + Mobile",
  canvas: { width: 1920, height: 1080 },
  ...
}
```

---

## Manual Test

### Test 1: Upload Method

1. Select "Upload Files"
2. Upload a desktop screenshot
3. Click "Continue"
4. Click "Desktop + Mobile" template
5. Customize page should load

### Test 2: URL Method (requires backend)

1. Make sure backend is running: `http://localhost:8000`
2. Enter URL: `https://example.com`
3. Click "Continue"
4. Wait for screenshots to load
5. Select template
6. Customize page should load

---

## Files to Check

### 1. Template File
```bash
ls -la public/templates/desktop-mobile.json
# Should exist and be readable
```

### 2. Template Index
```bash
cat public/templates/index.json
# Should contain: ["desktop-mobile.json"]
```

### 3. Mockup Images
```bash
ls -la public/Desktop.png public/Android.png
# Both should exist
```

---

## Quick Fixes

### Fix 1: Clear Browser Cache

1. Press **Ctrl+Shift+Delete** (or Cmd+Shift+Delete on Mac)
2. Clear "Cached images and files"
3. Reload page

### Fix 2: Hard Reload

1. Press **Ctrl+Shift+R** (or Cmd+Shift+R on Mac)
2. This forces fresh load of all files

### Fix 3: Restart Dev Server

```bash
# Kill existing server
pkill -f vite

# Start fresh
cd "frontend/dribble shots fronend"
pnpm run dev
```

### Fix 4: Check Template JSON

```bash
# Validate JSON syntax
cd "frontend/dribble shots fronend/public/templates"
python3 -m json.tool desktop-mobile.json
# Should output formatted JSON without errors
```

---

## Build Success Confirmation

When you run `npm run build`, you should see:

```
✓ 1689 modules transformed.
dist/index.html                   1.17 kB
dist/assets/index-XXX.css        74.86 kB
dist/assets/index-XXX.js        225.55 kB
✓ built in 1.01s
```

If you see errors instead, that's the problem to fix first.

---

## Dev Server Confirmation

When dev server is running, you should see:

```
ROLLDOWN-VITE v7.2.5  ready in XXXms

➜  Local:   http://localhost:5174/
```

Visit that URL in your browser.

---

## React DevTools Check

If you have React DevTools installed:

1. Open DevTools
2. Go to "Components" tab
3. Find `App` component
4. Check state:
   - `currentStep` should be 3
   - `templateData` should be an object
   - `desktopSrc` or `mobileSrc` should have data

---

## Last Resort: Complete Reset

```bash
cd "frontend/dribble shots fronend"

# Remove node_modules and reinstall
rm -rf node_modules
pnpm install

# Clear cache and rebuild
rm -rf dist
npm run build

# Restart dev server
pnpm run dev
```

---

## Getting Help

If customize page still won't load, provide:

1. Browser console errors (screenshot or copy-paste)
2. Network tab showing failed requests
3. Steps you took before issue occurred
4. Browser and OS version
5. Output of `npm run build`

---

## Most Likely Cause

**90% of the time**: You haven't completed Step 1 and Step 2 yet!

The customize page **only shows** after:
1. Adding screenshots (Step 1)
2. Selecting a template (Step 2)

Try the workflow from the beginning! 🚀
