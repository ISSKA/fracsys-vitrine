# Deployment Guide - FracSYS Webapp

This guide explains how to deploy the webapp to your Apache server at fracsys-vitrine.ch.

## Quick Deployment

### Step 1: Build the Project

```bash
cd webapp/html
npm run build
```

This creates optimized production files in the `dist/` directory.

### Step 2: Deploy to Server

**Important**: Copy the **contents** of `dist/`, not the `dist` folder itself!

#### Option A: Using rsync (Recommended)

```bash
rsync -avz --delete dist/ user@fracsys-vitrine.ch:/var/www/html/
```

Benefits:
- Only transfers changed files
- `--delete` removes old files with different hashes
- Faster for updates

#### Option B: Using scp

```bash
scp -r dist/* user@fracsys-vitrine.ch:/var/www/html/
```

Note: You may need to manually delete old asset files first.

#### Option C: Manual Upload via SFTP

1. Connect to server with SFTP client (FileZilla, WinSCP, etc.)
2. Navigate to `/var/www/html/`
3. Delete old `assets/` folder
4. Upload entire contents of `dist/` folder

## Expected Server Structure

After deployment, your server should have:

```
/var/www/html/
├── index.html                    # Main HTML (with asset references)
└── assets/
    ├── index-[hash].css          # Bundled styles
    ├── index-[hash].js           # Application code
    ├── index-[hash].js.map       # Source map
    ├── three-[hash].js           # Three.js library
    └── three-[hash].js.map       # Source map
```

**Verify**: Visit https://fracsys-vitrine.ch/assets/ - you should see the files listed (or get a 403 if directory listing is disabled, which is fine).

## Common Issues

### Issue 1: MIME Type Error for CSS

**Error**: `Refused to apply style from '...' because its MIME type ('text/html') is not a supported stylesheet MIME type`

**Cause**: The `assets/` folder is missing or in the wrong location.

**Fix**:
1. Check that `/var/www/html/assets/` exists on the server
2. Ensure you copied the **contents** of `dist/`, not the folder itself
3. Verify file permissions: `chmod 644 /var/www/html/assets/*`

### Issue 2: 404 for Assets

**Error**: Assets return 404 Not Found

**Cause**: Files weren't deployed or are in wrong location.

**Fix**:
```bash
# SSH into server and check:
ls -la /var/www/html/
ls -la /var/www/html/assets/

# Should see index.html and assets/ folder
```

### Issue 3: Old Assets Still Cached

**Symptoms**: Site doesn't update after deployment

**Cause**: Old files with old hashes still exist and are being served.

**Fix**:
```bash
# On server, remove old asset files
rm -rf /var/www/html/assets/*
# Then redeploy
```

## Apache Configuration

Your Apache config (DocumentRoot) must point to `/var/www/html`:

```apache
DocumentRoot /var/www/html

<Directory /var/www/html>
    Options -Indexes +FollowSymLinks
    AllowOverride None
    Require all granted
</Directory>
```

This is already configured in your `webapp/apache-config/sites-available/000-default-le-ssl.conf`.

## Content Security Policy (CSP)

The current CSP in your Apache config allows the necessary resources:

```apache
Content-Security-Policy "default-src 'self';
  script-src 'self' 'unsafe-inline' 'unsafe-eval';
  style-src 'self' 'unsafe-inline';
  ..."
```

If you see CSP errors after deployment, check the browser console for blocked resources.

## Testing After Deployment

1. **Clear browser cache**: Ctrl+Shift+R (hard refresh)
2. **Check browser console**: F12 → Console tab
3. **Verify assets load**: F12 → Network tab → check all assets return 200 OK
4. **Test functionality**: Try loading a 3D model

## Deployment Checklist

- [ ] Build project: `npm run build`
- [ ] Verify dist/ contains index.html and assets/ folder
- [ ] Deploy contents of dist/ to /var/www/html/
- [ ] SSH to server and verify files exist
- [ ] Check file permissions (644 for files, 755 for directories)
- [ ] Clear browser cache and test site
- [ ] Verify all assets load (no 404 errors)
- [ ] Test 3D model loading functionality

## Automated Deployment Script

You can use the provided `deploy.sh` script:

```bash
./deploy.sh
```

This builds the project and shows deployment instructions.

For fully automated deployment, modify the script with your server details:

```bash
#!/bin/bash
npm run build
rsync -avz --delete dist/ user@fracsys-vitrine.ch:/var/www/html/
echo "✅ Deployed to fracsys-vitrine.ch"
```

## Rolling Back

If something goes wrong, you can rebuild and redeploy the previous version:

```bash
git checkout <previous-commit>
npm run build
# Deploy as usual
```

## Additional Notes

- Content hashes in filenames (`index-DsqeAt2g.js`) ensure browser cache invalidation
- Source maps (`.map` files) are optional in production but helpful for debugging
- The Three.js library is in a separate chunk for better caching
- All files are minified and optimized for production
