# FracSYS Webapp - TypeScript Version

This webapp has been converted from JavaScript to TypeScript for improved type safety and developer experience.

## Project Structure

```
webapp/html/
├── src/              # TypeScript source files (.ts)
├── dist/             # Compiled JavaScript output (generated)
├── lib/              # Third-party libraries (Three.js)
├── index.html        # Main HTML file
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

### Building the Project

Compile TypeScript to JavaScript:

```bash
npm run build
```

This will compile all `.ts` files from the `src/` directory to the `dist/` directory.

### Watch Mode

For development, use watch mode to automatically recompile on file changes:

```bash
npm run watch
```

### Cleaning Build Output

Remove the compiled `dist/` directory:

```bash
npm run clean
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

- **tsconfig.json** - TypeScript compiler options
- **package.json** - NPM package configuration and scripts
- **.gitignore** - Git ignore patterns (node_modules, dist, logs)

## TypeScript Benefits

The conversion to TypeScript provides:

- **Type Safety**: Catch errors at compile-time instead of runtime
- **Better IDE Support**: Improved autocomplete, refactoring, and navigation
- **Documentation**: Types serve as inline documentation
- **Maintainability**: Easier to understand and modify code
- **Source Maps**: Debug TypeScript directly in the browser

## Browser Compatibility

The compiled JavaScript targets ES2020 and uses ES modules. Modern browsers (Chrome, Firefox, Safari, Edge) are required.

## Notes

- The `index.html` file references the compiled JavaScript in `dist/main.js`
- Source maps are generated for debugging TypeScript in the browser
- The original JavaScript files have been removed from the repository
- Three.js is still loaded from the local `lib/` directory using import maps
