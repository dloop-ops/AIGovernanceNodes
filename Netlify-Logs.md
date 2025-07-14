4:19:06 PM: build-image version: 068c1c7d7725d329cc382184c7bbf62ac27e2c09 (noble)
4:19:06 PM: buildbot version: 1ad41682c3cb8ba50e6cec4a3cd94c50f999b538
4:19:06 PM: Fetching cached dependencies
4:19:06 PM: Starting to download cache of 360.1MB (Last modified: 2025-07-14 13:40:25 +0000 UTC)
4:19:07 PM: Finished downloading cache in 1.616s
4:19:07 PM: Starting to extract cache
4:19:12 PM: Finished extracting cache in 4.253s
4:19:12 PM: Finished fetching cache in 5.932s
4:19:12 PM: Starting to prepare the repo for build
4:19:12 PM: Preparing Git Reference refs/heads/main
4:19:13 PM: Custom publish path detected. Proceeding with the specified path: 'dist'
4:19:13 PM: Custom functions path detected. Proceeding with the specified path: 'dist/netlify/functions'
4:19:13 PM: Custom build command detected. Proceeding with the specified command: 'npm run build'
4:19:14 PM: Starting to install dependencies
4:19:14 PM: Started restoring cached python cache
4:19:14 PM: Finished restoring cached python cache
4:19:14 PM: Started restoring cached ruby cache
4:19:14 PM: Finished restoring cached ruby cache
4:19:14 PM: Started restoring cached go cache
4:19:15 PM: Finished restoring cached go cache
4:19:15 PM: Using PHP version
4:19:15 PM: Started restoring cached Node.js version
4:19:15 PM: Finished restoring cached Node.js version
4:19:16 PM: v18.20.8 is already installed.
4:19:16 PM: Now using node v18.20.8 (npm v10.8.2)
4:19:16 PM: Enabling Node.js Corepack
4:19:16 PM: Started restoring cached bun cache
4:19:16 PM: Finished restoring cached bun cache
4:19:16 PM: Started restoring cached build plugins
4:19:16 PM: Finished restoring cached build plugins
4:19:16 PM: Started restoring cached corepack dependencies
4:19:16 PM: Finished restoring cached corepack dependencies
4:19:16 PM: No npm workspaces detected
4:19:16 PM: Started restoring cached node modules
4:19:16 PM: Finished restoring cached node modules
4:19:16 PM: Installing npm packages using npm version 10.8.2
4:19:18 PM: added 2 packages, removed 2 packages, and changed 2 packages in 1s
4:19:18 PM: npm packages installed
4:19:18 PM: Successfully installed dependencies
4:19:18 PM: Starting build script
4:19:19 PM: Detected 0 framework(s)
4:19:19 PM: Section completed: initializing
4:19:20 PM: ​
4:19:20 PM: Netlify Build                                                 
4:19:20 PM: ────────────────────────────────────────────────────────────────
4:19:20 PM: ​
4:19:20 PM: ❯ Version
4:19:20 PM:   @netlify/build 34.2.3
4:19:20 PM: ​
4:19:20 PM: ❯ Flags
4:19:20 PM:   accountId: 6856e0621865156bd249a4f6
4:19:20 PM:   baseRelDir: true
4:19:20 PM:   buildId: 68751fe9ebaa8d0008a766b4
4:19:20 PM:   deployId: 68751fe9ebaa8d0008a766b6
4:19:20 PM: ​
4:19:20 PM: ❯ Current directory
4:19:20 PM:   /opt/build/repo
4:19:20 PM: ​
4:19:20 PM: ❯ Config file
4:19:20 PM:   /opt/build/repo/netlify.toml
4:19:20 PM: ​
4:19:20 PM: ❯ Context
4:19:20 PM:   production
4:19:20 PM: ​
4:19:20 PM: build.command from netlify.toml                               
4:19:20 PM: ────────────────────────────────────────────────────────────────
4:19:20 PM: ​
4:19:20 PM: $ npm run build
4:19:21 PM: Failed during stage 'building site': Build script returned non-zero exit code: 2 (https://ntl.fyi/exit-code-2)
4:19:21 PM: > dloop-ai-governance-nodes@2.0.0 build
4:19:21 PM: > npm run clean && tsc && npm run build:netlify-functions
4:19:21 PM: > dloop-ai-governance-nodes@2.0.0 clean
4:19:21 PM: > rm -rf dist && mkdir -p dist
4:19:21 PM: error TS18003: No inputs were found in config file '/opt/build/repo/tsconfig.json'. Specified 'include' paths were '["src/**/*","scripts/**/*","plugins/**/*","tests/**/*","*.ts","*.js"]' and 'exclude' paths were '["node_modules","dist","build","coverage","logs"]'.
4:19:21 PM: ​
4:19:21 PM: "build.command" failed                                        
4:19:21 PM: ────────────────────────────────────────────────────────────────
4:19:21 PM: ​
4:19:21 PM:   Error message
4:19:21 PM:   Command failed with exit code 2: npm run build (https://ntl.fyi/exit-code-2)
4:19:21 PM: ​
4:19:21 PM:   Error location
4:19:21 PM:   In build.command from netlify.toml:
4:19:21 PM:   npm run build
4:19:21 PM: ​
4:19:21 PM:   Resolved config
4:19:21 PM:   build:
4:19:21 PM:     command: npm run build
4:19:21 PM:     commandOrigin: config
4:19:21 PM:     environment:
4:19:21 PM:       - AI_NODE_1_PRIVATE_KEY
4:19:21 PM:       - AI_NODE_2_PRIVATE_KEY
4:19:21 PM:       - AI_NODE_3_PRIVATE_KEY
4:19:21 PM:       - AI_NODE_4_PRIVATE_KEY
4:19:21 PM:       - AI_NODE_5_PRIVATE_KEY
4:19:21 PM:       - ETHEREUM_RPC_URL
4:19:21 PM:       - ETHERSCAN_API_KEY
4:19:21 PM:       - NODE_VERSION
4:19:21 PM:       - NODE_ENV
4:19:21 PM:     publish: /opt/build/repo/dist
4:19:21 PM:     publishOrigin: config
4:19:21 PM:   functions:
4:19:21 PM:     "*":
4:19:21 PM:       external_node_modules:
4:19:21 PM:         - ethers
4:19:21 PM:         - "@elizaos/core"
4:19:21 PM:         - node-cron
4:19:21 PM:         - winston
4:19:21 PM:       node_bundler: esbuild
4:19:21 PM:     governance-agent:
4:19:21 PM:       timeout: 25
4:19:21 PM:     scheduled-voting:
4:19:21 PM:       schedule: "*/10 * * * *"
4:19:21 PM:       timeout: 25
4:19:21 PM:   functionsDirectory: /opt/build/repo/dist/netlify/functions
4:19:21 PM:   headers:
4:19:21 PM:     - for: /*
      values:
        Content-Security-Policy: "default-src 'self'; script-src 'self' 'unsafe-inline'
          'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data:
          https:; connect-src 'self' https://sepolia.infura.io
          https://api.coingecko.com wss://sepolia.infura.io; font-src 'self'
          data:;"
        Referrer-Policy: strict-origin-when-cross-origin
        X-Content-Type-Options: nosniff
        X-Frame-Options: DENY
        X-XSS-Protection: 1; mode=block
    - for: /api/*
      values:
        Access-Control-Allow-Headers: Content-Type, Authorization
        Access-Control-Allow-Methods: GET, HEAD, POST, OPTIONS
        Access-Control-Allow-Origin: "*"
  headersOrigin: config
  redirects:
    - from: /api/status
      status: 200
      to: /.netlify/functions/governance-agent/status
    - from: /api/health
      status: 200
      to: /.netlify/functions/governance-agent/health
    - from: /api/proposals
      status: 200
      to: /.netlify/functions/governance-agent/proposals
    - from: /api/voting-history
      status: 200
      to: /.netlify/functions/governance-agent/voting-history
    - from: /api/*
      status: 200
      to: /.netlify/functions/governance-agent/:splat
    - from: /*
      status: 200
      to: /index.html
  redirectsOrigin: config
4:19:21 PM: Build failed due to a user error: Build script returned non-zero exit code: 2
4:19:21 PM: Failing build: Failed to build site
4:19:21 PM: Finished processing build request in 15.821s