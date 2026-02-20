# Quick Start Guide

## First Time Setup

```bash
# Navigate to webapp directory
cd webapp

# Install dependencies
npm install

# Run development server
npm run dev
```

Visit `http://localhost:3000` in your browser.

## Building for Production

```bash
# Build the application
npm run build

# The built files will be in the dist/ directory
```

## Running with Docker

```bash
# From the project root directory (not webapp/)
cd ..

# Make sure the app is built first
cd webapp && npm run build && cd ..

# Start Docker container
docker-compose up -d
```

Visit `http://localhost:8080` in your browser.

## Common Commands

| Command | What it does |
|---------|--------------|
| `npm install` | Install all dependencies (run once) |
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run type-check` | Check TypeScript types |
| `npm run preview` | Preview production build |

## Verification Checklist

After migration, verify:

- [ ] `npm install` completes without errors
- [ ] `npm run type-check` shows no TypeScript errors
- [ ] `npm run build` creates files in `dist/`
- [ ] `npm run dev` starts development server
- [ ] App loads in browser at `http://localhost:3000`
- [ ] Can download from cloud or upload .vtp files
- [ ] 3D mesh renders correctly
- [ ] Layer checkboxes work
- [ ] Clicking on mesh shows metadata
- [ ] Camera controls work (rotate, pan, zoom)
- [ ] Wireframe toggle works
- [ ] Docker deployment works on port 8080

## Troubleshooting

**Problem**: `npm: command not found`
- **Solution**: Install Node.js from https://nodejs.org/

**Problem**: TypeScript errors during type-check
- **Solution**: Check the error messages and fix type issues in [src/app.ts](src/app.ts) or [src/fracture_zone_loader.ts](src/fracture_zone_loader.ts)

**Problem**: Build fails
- **Solution**: Run `npm run type-check` first to see TypeScript errors

**Problem**: Browser shows blank page
- **Solution**: Check browser console for errors. Ensure VTK.js loaded correctly.

**Problem**: Docker shows 404
- **Solution**: Make sure you ran `npm run build` before starting Docker

## File Organization

```
webapp/
├── src/           # TypeScript source files (edit these)
├── types/         # Type definitions (don't edit unless needed)
├── dist/          # Build output (auto-generated, don't edit)
├── index.html     # HTML entry point
└── styles.css     # CSS styles
```

**Important**: Always edit files in `src/`, never in `dist/`!
