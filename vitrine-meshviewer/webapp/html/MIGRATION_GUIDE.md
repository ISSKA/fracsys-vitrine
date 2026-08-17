# TypeScript Migration Guide

## Overview

The webapp has been successfully converted from JavaScript to TypeScript with strict type checking enabled.

## What Changed

### File Structure

**Before (JavaScript):**
```
webapp/
├── app.js
├── fracture_zone_loader.js  # (was fileLoader.js)
├── viewer_vtk.html
└── styles.css
```

**After (TypeScript):**
```
webapp/
├── src/
│   ├── app.ts                    # Converted from app.js
│   ├── fracture_zone_loader.ts  # Converted from fracture_zone_loader.js
│   └── damage_zone_loader.ts    # New - Damage zone functionality
├── types/
│   └── vtk.d.ts                 # Type definitions for VTK.js
├── dist/                         # Build output (auto-generated)
├── index.html                   # New entry point (was viewer_vtk.html)
├── viewer_vtk.html              # Old file (can be removed)
├── app.js                       # Old file (can be removed)
├── fracture_zone_loader.js      # Old file (can be removed)
├── styles.css                   # Unchanged
├── package.json                 # New - npm configuration
├── tsconfig.json                # New - TypeScript config
├── vite.config.ts               # New - Vite build config
└── README.md                    # New - Documentation
```

### Build System

- **Before**: Direct ES6 modules loaded via CDN import map
- **After**: Vite bundler with TypeScript compilation
- **Dependencies**: Now managed via npm instead of CDN

### Type Safety

All code now has proper TypeScript types:

1. **Custom Types** ([src/fracture_zone_loader.ts](src/fracture_zone_loader.ts)):
   - `LayerConfig` - Layer configuration interface
   - `Layer` - Layer state interface
   - `Layers` - Layer collection type
   - `FileLoaderDependencies` - Dependencies injection interface
   - `FileLoaderAPI` - Public API interface

2. **VTK.js Types** ([types/vtk.d.ts](types/vtk.d.ts)):
   - Minimal type definitions for VTK.js modules
   - Covers all modules used in the project

3. **Strict Mode**:
   - All strict TypeScript checks enabled
   - No implicit `any` types
   - Null safety enforced
   - Unused variables/parameters detected

## Next Steps

### 1. Install Dependencies

```bash
cd webapp
npm install
```

This will install:
- `typescript` (^5.3.3) - TypeScript compiler
- `vite` (^5.0.0) - Build tool
- `@kitware/vtk.js` (^30.0.0) - VTK.js library

### 2. Development

Run the development server:

```bash
npm run dev
```

Visit `http://localhost:3000` to test the application.

### 3. Type Check

Verify all types are correct:

```bash
npm run type-check
```

This should complete without errors if the migration was successful.

### 4. Build for Production

```bash
npm run build
```

This creates optimized files in `webapp/dist/`.

### 5. Deploy with Docker

From the project root:

```bash
docker-compose up -d
```

Visit `http://localhost:8080`

### 6. Clean Up Old Files (Optional)

Once you've verified everything works, you can remove:

```bash
cd webapp
rm app.js fracture_zone_loader.js viewer_vtk.html
```

## Configuration Files

### tsconfig.json

TypeScript configuration with strict mode:
- Target: ES2020
- Module: ESNext
- All strict checks enabled
- Source: `src/**/*`

### vite.config.ts

Vite build configuration:
- Entry: `index.html`
- Output: `dist/`
- Dev server: port 3000

### package.json

Dependencies and scripts:
- `dev` - Development server
- `build` - Production build
- `preview` - Preview production build
- `type-check` - Type checking only

## Docker Changes

**docker-compose.yml** updated:

```yaml
volumes:
  - ./webapp/dist:/usr/local/apache2/htdocs/  # Changed from ./webapp
```

Now serves the built files from `dist/` instead of raw source files.

## Key Improvements

1. **Type Safety**: Compile-time error detection
2. **Better IDE Support**: IntelliSense, auto-completion
3. **Maintainability**: Self-documenting code with types
4. **Modern Build**: Tree-shaking, code splitting, minification
5. **Developer Experience**: Hot module replacement, fast rebuilds

## Troubleshooting

### Types Not Found

If you see "Cannot find module" errors:
1. Ensure `npm install` was run
2. Check that [types/vtk.d.ts](types/vtk.d.ts) exists
3. Verify `tsconfig.json` includes the types directory

### Build Errors

If build fails:
1. Run `npm run type-check` to see TypeScript errors
2. Check console for specific error messages
3. Ensure all imports use `.js` extension (TypeScript convention for ESM)

### Runtime Errors

If the app doesn't work in browser:
1. Check browser console for errors
2. Verify `npm run build` completed successfully
3. Ensure Docker is serving from `dist/` directory
4. Check that all assets (CSS, HTML) are in `dist/`

## Migration Details

### Import Changes

**Before:**
```javascript
import { setupFileLoader } from './fracture_zone_loader.js';
```

**After:**
```typescript
import { setupFileLoader, type FileLoaderAPI } from './fracture_zone_loader.js';
```

Type-only imports use the `type` keyword.

### Function Signatures

**Before:**
```javascript
function positionTooltip(element, mousePos) {
  // ...
}
```

**After:**
```typescript
function positionTooltip(element: HTMLElement, mousePos: { x: number; y: number }): void {
  // ...
}
```

All parameters and return types are explicitly typed.

### Error Handling

**Before:**
```javascript
catch (error) {
  alert(`Failed: ${error.message}`);
}
```

**After:**
```typescript
catch (error) {
  const errorMessage = error instanceof Error ? error.message : 'Unknown error';
  alert(`Failed: ${errorMessage}`);
}
```

Strict null checks require proper error type handling.

## Compatibility

- **Node.js**: v18+ recommended
- **Browsers**: Modern browsers with ES2020 support
- **VTK.js**: Compatible with v30.0.0+

## Resources

- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
- [Vite Documentation](https://vitejs.dev/)
- [VTK.js Documentation](https://kitware.github.io/vtk-js/)
