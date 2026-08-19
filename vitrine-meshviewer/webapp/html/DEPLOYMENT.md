# Deployment Guide - FracSYS Webapp

This guide explains how to deploy the unified multi-page app to your Apache server at fracsys-vitrine.ch. Run build and file-transfer commands from the repository root.

## Quick Deployment

### Step 1: Build the Project

```bash
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
├── index.html                    # Mesh Viewer
├── flow/index.html               # Flow Viewer
└── assets/                       # Separate hashed mesh and flow bundles
    ├── index-[hash].js.map       # Source map
    ├── three-[hash].js           # Three.js library
    └── three-[hash].js.map       # Source map
```

**Verify**: Visit https://fracsys-vitrine.ch/assets/ - you should see the files listed (or get a 403 if directory listing is disabled, which is fine).

## File Permissions

Apache needs to read the files you deploy. The Apache user/group varies by distribution:

| Distribution | User | Group |
|--------------|------|-------|
| Ubuntu/Debian | `www-data` | `www-data` |
| CentOS/RHEL | `apache` | `apache` |
| Fedora | `apache` | `apache` |

### Check Apache User on Your Server

```bash
# Method 1: Check running process
ps aux | grep apache2
# or
ps aux | grep httpd

# Method 2: Check Apache config
grep -r "^User\|^Group" /etc/apache2/ /etc/httpd/
```

### Fix Permissions After Deployment

After copying files to `/var/www/html/`, set correct ownership and permissions:

```bash
# Find Apache user (Ubuntu/Debian example - www-data)
APACHE_USER="www-data"

# Set ownership
sudo chown -R $APACHE_USER:$APACHE_USER /var/www/html/

# Set permissions
sudo find /var/www/html/ -type d -exec chmod 755 {} \;  # Directories
sudo find /var/www/html/ -type f -exec chmod 644 {} \;  # Files
```

**For Ubuntu/Debian** (most common):
```bash
sudo chown -R www-data:www-data /var/www/html/
sudo find /var/www/html/ -type d -exec chmod 755 {} \;
sudo find /var/www/html/ -type f -exec chmod 644 {} \;
```

**For CentOS/RHEL/Fedora**:
```bash
sudo chown -R apache:apache /var/www/html/
sudo find /var/www/html/ -type d -exec chmod 755 {} \;
sudo find /var/www/html/ -type f -exec chmod 644 {} \;
```

### Deployment with Correct Permissions (Using rsync)

The best approach is to use rsync with the `--chown` option:

```bash
# Ubuntu/Debian
rsync -avz --delete --chown=www-data:www-data dist/ user@server:/var/www/html/

# CentOS/RHEL/Fedora
rsync -avz --delete --chown=apache:apache dist/ user@server:/var/www/html/
```

Note: This requires rsync 3.1.0+ and may need sudo on the remote side.

## Common Issues

### Issue 1: MIME Type Error for CSS

**Error**: `Refused to apply style from '...' because its MIME type ('text/html') is not a supported stylesheet MIME type`

**Cause**: The `assets/` folder is missing, in the wrong location, or Apache can't read the files due to permissions.

**Fix**:
1. Check that `/var/www/html/assets/` exists on the server
2. Ensure you copied the **contents** of `dist/`, not the folder itself
3. Fix permissions:
```bash
# Check current permissions
ls -la /var/www/html/
ls -la /var/www/html/assets/

# Fix ownership (Ubuntu/Debian)
sudo chown -R www-data:www-data /var/www/html/

# Fix file permissions
sudo find /var/www/html/ -type f -exec chmod 644 {} \;
sudo find /var/www/html/ -type d -exec chmod 755 {} \;
```

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
- [ ] Fix ownership: `sudo chown -R www-data:www-data /var/www/html/`
- [ ] Fix permissions: 644 for files, 755 for directories
- [ ] Verify Apache can read files: `sudo -u www-data cat /var/www/html/index.html`
- [ ] Clear browser cache and test site
- [ ] Verify all assets load (no 404 errors)
- [ ] Test 3D model loading functionality

## Automated Deployment Scripts

### Manual Instructions Script

The `deploy.sh` script builds and shows deployment instructions:

```bash
./deploy.sh
```

### Fully Automated Deployment

The `deploy-to-server.sh` script automates everything including permissions:

```bash
./deploy-to-server.sh user@fracsys-vitrine.ch
```

This script:
1. Builds the project with Vite
2. Deploys files via rsync
3. Fixes ownership (sets to www-data/apache)
4. Fixes permissions (644 for files, 755 for directories)
5. Verifies deployment

**Note**: You may need to configure the Apache user in the script:
- Ubuntu/Debian: `APACHE_USER="www-data"` (default)
- CentOS/RHEL/Fedora: `APACHE_USER="apache"`

Edit line 14 of `deploy-to-server.sh` to match your server's Apache user.

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
