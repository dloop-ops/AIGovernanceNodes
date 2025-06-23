# Netlify Deployment Fixes

## Issues Resolved

### 1. **NODE_ENV Production Issue**
**Problem**: Netlify was setting `NODE_ENV=production` which prevented `devDependencies` from being installed, including TypeScript compiler.

**Solution**: 
- Moved essential build tools (`typescript`, `@netlify/functions`) from `devDependencies` to `dependencies`
- Removed `[context.production.environment]` section from `netlify.toml`
- Set default `NODE_ENV=development` in build environment

### 2. **npm Package.json Not Found**
**Problem**: npm installation was failing with "Could not read package.json" error.

**Solution**:
- Added `.nvmrc` file to specify Node.js version 18
- Simplified build configuration in `netlify.toml`
- Regenerated `package-lock.json` with correct dependencies

### 3. **Build Process Optimization**
**Problem**: Build was copying unnecessary files and had complex build chains.

**Solution**:
- Created clean build process: `clean -> tsc -> build:netlify-functions`
- Only copy essential files (`index.html`, compiled functions)
- Use `dist` as publish directory instead of `public`

## Current Configuration

### netlify.toml
```toml
[build]
  publish = "dist"
  command = "npm run build"

[build.environment]
  NODE_VERSION = "18"
  NODE_ENV = "development"

[functions]
  directory = "dist/netlify/functions"
  node_bundler = "esbuild"
  external_node_modules = ["ethers", "@elizaos/core"]
```

### package.json (Build Scripts)
```json
{
  "scripts": {
    "build": "npm run clean && tsc && npm run build:netlify-functions",
    "build:netlify-functions": "mkdir -p dist/netlify/functions && tsc netlify/functions/governance-agent.ts --outDir dist/netlify/functions --target ES2022 --module ESNext --moduleResolution node && cp public/index.html dist/",
    "clean": "rm -rf dist && mkdir -p dist"
  }
}
```

### Dependencies Structure
```json
{
  "dependencies": {
    "ethers": "^6.14.3",
    "axios": "^1.9.0",
    "dotenv": "^16.5.0",
    "node-cron": "^4.0.7",
    "winston": "^3.17.0",
    "cron-parser": "^5.2.0",
    "typescript": "^5.8.3",
    "@netlify/functions": "^2.8.1"
  }
}
```

## Deployment Steps

1. **Push to GitHub**: Code changes are automatically deployed
2. **Environment Variables**: Set in Netlify dashboard (not in code)
3. **Build Process**: Runs automatically on each push
4. **Functions**: Deployed to `/.netlify/functions/governance-agent`

## Testing Deployment

### Local Testing
```bash
npm run build
npm run preview  # Deploy to Netlify preview
```

### Production Deployment
```bash
npm run deploy   # Deploy to production
```

## Environment Variables Required

Set these in Netlify Dashboard → Site Settings → Environment Variables:

```bash
OPENAI_API_KEY=sk-your-openai-api-key
ETHEREUM_RPC_URL=https://sepolia.infura.io/v3/YOUR_PROJECT_ID
AI_NODE_1_PRIVATE_KEY=0x...
AI_NODE_2_PRIVATE_KEY=0x...
AI_NODE_3_PRIVATE_KEY=0x...
AI_NODE_4_PRIVATE_KEY=0x...
AI_NODE_5_PRIVATE_KEY=0x...
ASSET_DAO_CONTRACT_ADDRESS=0xa87e662061237a121Ca2E83E77dA8251bc4B3529
DLOOP_TOKEN_ADDRESS=0xC37f5136084A0Ecf88Bc1a2E3F20c4BB4EDAfCe3
LOG_LEVEL=info
```

## Troubleshooting

### Build Fails
1. Check Node.js version is 18
2. Verify dependencies are in `dependencies` not `devDependencies`
3. Check environment variables are set

### Functions Don't Work
1. Verify function is in `dist/netlify/functions/`
2. Check external modules are listed in `netlify.toml`
3. Test function locally with `netlify dev`

### Static Files Missing
1. Ensure `public/index.html` exists
2. Check build copies files to `dist/`
3. Verify publish directory is `dist`

## Success Indicators

✅ Build completes without errors  
✅ Function deploys to `/.netlify/functions/governance-agent`  
✅ Static site serves at root URL  
✅ API endpoints respond correctly  
✅ Environment variables accessible in functions  

## Performance Optimizations

- **esbuild**: Fast function bundling
- **External modules**: Reduce bundle size
- **Clean builds**: Remove old artifacts
- **Minimal file copying**: Only essential files 