# FracSYS Webapp - TypeScript + Vite

This webapp has been converted from JavaScript to TypeScript and uses Vite for fast development and optimized production builds.

## Project Structure

```
webapp/html/
├── src/              # TypeScript source files (.ts)
├── dist/             # Production build output (generated)
├── lib/              # Third-party libraries (Three.js)
├── index.html        # Main HTML file
├── vite.config.ts    # Vite configuration
├── tsconfig.json     # TypeScript configuration
└── package.json      # NPM dependencies and scripts
```

## Prerequisites

- Node.js (v16 or higher)
- npm

## Setup

Install dependencies:

```bash
npm install
```

## Development

### Development Server

Start the Vite dev server with Hot Module Replacement (HMR):

```bash
npm run dev
```

This will:
- Start a development server at http://localhost:3000
- Automatically open your browser
- Enable hot module replacement (instant updates without page reload)
- Compile TypeScript on-the-fly

### Production Build

Build for production with optimizations:

```bash
npm run build
```

This will:
- Compile TypeScript to optimized JavaScript
- Bundle and minify all code
- Split Three.js into a separate chunk for better caching
- Generate source maps for debugging
- Output to the `dist/` directory

### Preview Production Build

Preview the production build locally:

```bash
npm run preview
```

### Type Checking

Run TypeScript type checking without building:

```bash
npm run typecheck
```

## File Descriptions

### TypeScript Source Files

- **main.ts** - Main application entry point, handles initialization and model loading
- **renderManager.ts** - Manages the Three.js render loop and responsive resizing
- **mouseControls.ts** - Mouse interaction controls (rotation, panning, zooming)
- **sceneSetupShared.ts** - Shared scene setup functions (camera, scene, model loading)
- **sceneSetupDamageZone.ts** - Configuration for damage zone models
- **sceneSetupFracture.ts** - Configuration for fracture models

### Configuration Files

- **vite.config.ts** - Vite build tool configuration
- **tsconfig.json** - TypeScript compiler options
- **package.json** - NPM package configuration and scripts
- **.gitignore** - Git ignore patterns (node_modules, dist, logs)

## Technology Stack

### Vite

Vite provides:

- **Lightning Fast HMR**: Instant updates during development
- **Optimized Builds**: Automatic code splitting, tree-shaking, and minification
- **Built-in TypeScript**: No separate compilation step needed
- **ES Modules**: Native browser module support
- **Dev Server**: No need for separate HTTP server

### TypeScript

The conversion to TypeScript provides:

- **Type Safety**: Catch errors at compile-time instead of runtime
- **Better IDE Support**: Improved autocomplete, refactoring, and navigation
- **Documentation**: Types serve as inline documentation
- **Maintainability**: Easier to understand and modify code
- **Source Maps**: Debug TypeScript directly in the browser

## Browser Compatibility

The production build targets ES2020 and uses ES modules. Modern browsers (Chrome, Firefox, Safari, Edge) are required.

## Build Output

Production builds generate:
- **index.html** - Entry HTML file with asset references
- **assets/index-[hash].js** - Application code bundle
- **assets/three-[hash].js** - Three.js library bundle (separate chunk for caching)
- **assets/index-[hash].css** - Bundled and minified CSS
- **assets/*.map** - Source maps for debugging

## Deployment

To deploy the webapp to Apache server:

```bash
npm run build
# Then copy the contents of dist/ to /var/www/html/
```

See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed deployment instructions, troubleshooting, and common issues.

## Notes

- Three.js is loaded from the local `lib/` directory (configured in vite.config.ts)
- Source maps are generated for both development and production
- The original JavaScript files have been removed from the repository
- Vite handles all module resolution and bundling automatically
