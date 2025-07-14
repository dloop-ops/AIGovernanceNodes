4:33:42 PM: build-image version: 068c1c7d7725d329cc382184c7bbf62ac27e2c09 (noble)
4:33:42 PM: buildbot version: 1ad41682c3cb8ba50e6cec4a3cd94c50f999b538
4:33:43 PM: Fetching cached dependencies
4:33:43 PM: Starting to download cache of 360.1MB (Last modified: 2025-07-14 13:40:25 +0000 UTC)
4:33:44 PM: Finished downloading cache in 1.746s
4:33:44 PM: Starting to extract cache
4:33:48 PM: Finished extracting cache in 3.324s
4:33:48 PM: Finished fetching cache in 5.141s
4:33:48 PM: Starting to prepare the repo for build
4:33:48 PM: Preparing Git Reference refs/heads/main
4:33:49 PM: Custom publish path detected. Proceeding with the specified path: 'dist'
4:33:49 PM: Custom functions path detected. Proceeding with the specified path: 'dist/netlify/functions'
4:33:49 PM: Custom build command detected. Proceeding with the specified command: 'npm run build'
4:33:50 PM: Starting to install dependencies
4:33:50 PM: Started restoring cached python cache
4:33:50 PM: Finished restoring cached python cache
4:33:50 PM: Started restoring cached ruby cache
4:33:50 PM: Finished restoring cached ruby cache
4:33:50 PM: Started restoring cached go cache
4:33:51 PM: Finished restoring cached go cache
4:33:51 PM: Using PHP version
4:33:51 PM: Started restoring cached Node.js version
4:33:51 PM: Finished restoring cached Node.js version
4:33:52 PM: v18.20.8 is already installed.
4:33:52 PM: Now using node v18.20.8 (npm v10.8.2)
4:33:52 PM: Enabling Node.js Corepack
4:33:52 PM: Started restoring cached bun cache
4:33:52 PM: Finished restoring cached bun cache
4:33:52 PM: Started restoring cached build plugins
4:33:52 PM: Finished restoring cached build plugins
4:33:52 PM: Started restoring cached corepack dependencies
4:33:52 PM: Finished restoring cached corepack dependencies
4:33:52 PM: No npm workspaces detected
4:33:52 PM: Started restoring cached node modules
4:33:52 PM: Finished restoring cached node modules
4:33:52 PM: Installing npm packages using npm version 10.8.2
4:33:53 PM: added 2 packages, removed 2 packages, and changed 2 packages in 1s
4:33:54 PM: npm packages installed
4:33:54 PM: Successfully installed dependencies
4:33:54 PM: Starting build script
4:33:54 PM: Detected 0 framework(s)
4:33:55 PM: Section completed: initializing
4:33:56 PM: ​
4:33:56 PM: Netlify Build                                                 
4:33:56 PM: ────────────────────────────────────────────────────────────────
4:33:56 PM: ​
4:33:56 PM: ❯ Version
4:33:56 PM:   @netlify/build 34.2.3
4:33:56 PM: ​
4:33:56 PM: ❯ Flags
4:33:56 PM:   accountId: 6856e0621865156bd249a4f6
4:33:56 PM:   baseRelDir: true
4:33:56 PM:   buildId: 687523552badfe00089c1974
4:33:56 PM:   deployId: 687523552badfe00089c1976
4:33:56 PM: ​
4:33:56 PM: ❯ Current directory
4:33:56 PM:   /opt/build/repo
4:33:56 PM: ​
4:33:56 PM: ❯ Config file
4:33:56 PM:   /opt/build/repo/netlify.toml
4:33:56 PM: ​
4:33:56 PM: ❯ Context
4:33:56 PM:   production
4:33:56 PM: ​
4:33:56 PM: build.command from netlify.toml                               
4:33:56 PM: ────────────────────────────────────────────────────────────────
4:33:56 PM: ​
4:33:56 PM: $ npm run build
4:33:56 PM: > dloop-ai-governance-nodes@2.0.0 build
4:33:56 PM: > npm run clean && tsc && npm run build:netlify-functions
4:33:56 PM: > dloop-ai-governance-nodes@2.0.0 clean
4:33:56 PM: > rm -rf dist && mkdir -p dist
4:33:58 PM: Failed during stage 'building site': Build script returned non-zero exit code: 2 (https://ntl.fyi/exit-code-2)
4:33:58 PM: attached_assets/ContractService.ts(4,62): error TS2307: Cannot find module '../config/contracts' or its corresponding type declarations.
4:33:58 PM: attached_assets/ContractService.ts(5,31): error TS2307: Cannot find module './WalletService' or its corresponding type declarations.
4:33:58 PM: attached_assets/ContractService.ts(6,28): error TS2307: Cannot find module './RpcManager' or its corresponding type declarations.
4:33:58 PM: attached_assets/ContractService.ts(7,98): error TS2307: Cannot find module '../types/index' or its corresponding type declarations.
4:33:58 PM: attached_assets/ContractService.ts(8,20): error TS2307: Cannot find module '../utils/logger.js' or its corresponding type declarations.
4:33:58 PM: netlify/functions/governance-agent.ts(261,34): error TS2345: Argument of type '{ id: number; state: string; type: any; description: any; proposer: any; assetAddress: any; amount: any; startTime: any; endTime: string; forVotes: any; againstVotes: any; timeLeft: number; }' is not assignable to parameter of type 'never'.
4:33:58 PM: netlify/functions/health.ts(47,16): error TS18046: 'error' is of type 'unknown'.
4:33:58 PM: netlify/functions/scheduled-voting.ts(142,46): error TS2345: Argument of type 'string | undefined' is not assignable to parameter of type 'string | SigningKey'.
4:33:58 PM:   Type 'undefined' is not assignable to type 'string | SigningKey'.
4:33:58 PM: netlify/functions/scheduled-voting.ts(160,49): error TS2339: Property 'vote' does not exist on type 'BaseContract'.
4:33:58 PM: netlify/functions/scheduled-voting.ts(168,32): error TS2345: Argument of type '{ proposalId: number; nodeIndex: number; nodeAddress: string; vote: string; txHash: any; }' is not assignable to parameter of type 'never'.
4:33:58 PM: netlify/functions/scheduled-voting.ts(179,32): error TS2345: Argument of type '{ proposalId: number; nodeIndex: number; error: any; }' is not assignable to parameter of type 'never'.
4:33:58 PM: ​
4:33:58 PM: "build.command" failed                                        
4:33:58 PM: ────────────────────────────────────────────────────────────────
4:33:58 PM: ​
4:33:58 PM:   Error message
4:33:58 PM:   Command failed with exit code 2: npm run build (https://ntl.fyi/exit-code-2)
4:33:58 PM: ​
4:33:58 PM:   Error location
4:33:58 PM:   In build.command from netlify.toml:
4:33:58 PM:   npm run build
4:33:58 PM: ​
4:33:58 PM:   Resolved config
4:33:58 PM:   build:
4:33:58 PM:     command: npm run build
4:33:58 PM:     commandOrigin: config
4:33:58 PM:     environment:
4:33:58 PM:       - AI_NODE_1_PRIVATE_KEY
4:33:58 PM:       - AI_NODE_2_PRIVATE_KEY
4:33:58 PM:       - AI_NODE_3_PRIVATE_KEY
4:33:58 PM:       - AI_NODE_4_PRIVATE_KEY
4:33:58 PM:       - AI_NODE_5_PRIVATE_KEY
4:33:58 PM:       - ETHEREUM_RPC_URL
4:33:58 PM:       - ETHERSCAN_API_KEY
4:33:58 PM:       - NODE_VERSION
4:33:58 PM:       - NODE_ENV
4:33:58 PM:     publish: /opt/build/repo/dist
4:33:58 PM:     publishOrigin: config
4:33:58 PM:   functions:
4:33:58 PM:     "*":
4:33:58 PM:       external_node_modules:
4:33:58 PM:         - ethers
4:33:58 PM:         - "@elizaos/core"
4:33:58 PM:         - node-cron
4:33:58 PM:         - winston
4:33:58 PM:       node_bundler: esbuild
4:33:58 PM:     governance-agent:
4:33:58 PM:       timeout: 25
4:33:58 PM:     scheduled-voting:
4:33:58 PM:       schedule: "*/10 * * * *"
4:33:58 PM:       timeout: 25
4:33:58 PM:   functionsDirectory: /opt/build/repo/dist/netlify/functions
4:33:58 PM:   headers:
4:33:58 PM:     - for: /*
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
4:33:58 PM: Build failed due to a user error: Build script returned non-zero exit code: 2
4:33:58 PM: Failing build: Failed to build site
4:33:58 PM: Finished processing build request in 15.931s