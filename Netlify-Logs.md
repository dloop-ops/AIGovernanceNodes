3:24:34 PM: build-image version: 068c1c7d7725d329cc382184c7bbf62ac27e2c09 (noble)
3:24:34 PM: buildbot version: 1ad41682c3cb8ba50e6cec4a3cd94c50f999b538
3:24:34 PM: Fetching cached dependencies
3:24:34 PM: Starting to download cache of 360.1MB (Last modified: 2025-07-14 13:40:25 +0000 UTC)
3:24:36 PM: Finished downloading cache in 1.984s
3:24:36 PM: Starting to extract cache
3:24:47 PM: Finished extracting cache in 10.477s
3:24:47 PM: Finished fetching cache in 12.532s
3:24:47 PM: Starting to prepare the repo for build
3:24:47 PM: Preparing Git Reference refs/heads/main
3:24:49 PM: Custom publish path detected. Proceeding with the specified path: 'dist'
3:24:49 PM: Custom functions path detected. Proceeding with the specified path: 'dist/netlify/functions'
3:24:49 PM: Custom build command detected. Proceeding with the specified command: 'npm run build'
3:24:49 PM: Starting to install dependencies
3:24:49 PM: Started restoring cached python cache
3:24:50 PM: Finished restoring cached python cache
3:24:50 PM: Started restoring cached ruby cache
3:24:50 PM: Finished restoring cached ruby cache
3:24:51 PM: Started restoring cached go cache
3:24:52 PM: Finished restoring cached go cache
3:24:52 PM: Using PHP version
3:24:52 PM: Started restoring cached Node.js version
3:24:54 PM: Finished restoring cached Node.js version
3:24:54 PM: v18.20.8 is already installed.
3:24:54 PM: Now using node v18.20.8 (npm v10.8.2)
3:24:54 PM: Enabling Node.js Corepack
3:24:55 PM: Started restoring cached bun cache
3:24:55 PM: Finished restoring cached bun cache
3:24:55 PM: Started restoring cached build plugins
3:24:55 PM: Finished restoring cached build plugins
3:24:55 PM: Started restoring cached corepack dependencies
3:24:55 PM: Finished restoring cached corepack dependencies
3:24:55 PM: No npm workspaces detected
3:24:55 PM: Started restoring cached node modules
3:24:55 PM: Finished restoring cached node modules
3:24:55 PM: Installing npm packages using npm version 10.8.2
3:24:56 PM: up to date in 2s
3:24:56 PM: npm packages installed
3:24:57 PM: Successfully installed dependencies
3:24:57 PM: Starting build script
3:24:58 PM: Detected 0 framework(s)
3:24:58 PM: Section completed: initializing
3:24:59 PM: ​
3:24:59 PM: Netlify Build                                                 
3:24:59 PM: ────────────────────────────────────────────────────────────────
3:24:59 PM: ​
3:24:59 PM: ❯ Version
3:24:59 PM:   @netlify/build 34.2.3
3:24:59 PM: ​
3:24:59 PM: ❯ Flags
3:24:59 PM:   accountId: 6856e0621865156bd249a4f6
3:24:59 PM:   baseRelDir: true
3:24:59 PM:   buildId: 687513218fc81e00088ab1df
3:24:59 PM:   deployId: 687513218fc81e00088ab1e1
3:24:59 PM: ​
3:24:59 PM: ❯ Current directory
3:24:59 PM:   /opt/build/repo
3:24:59 PM: ​
3:24:59 PM: ❯ Config file
3:24:59 PM:   /opt/build/repo/netlify.toml
3:24:59 PM: ​
3:24:59 PM: ❯ Context
3:24:59 PM:   production
3:24:59 PM: ​
3:24:59 PM: build.command from netlify.toml                               
3:24:59 PM: ────────────────────────────────────────────────────────────────
3:24:59 PM: ​
3:24:59 PM: $ npm run build
3:24:59 PM: > dloop-ai-governance-nodes@2.0.0 build
3:24:59 PM: > npm run clean && tsc && npm run build:netlify-functions
3:25:00 PM: > dloop-ai-governance-nodes@2.0.0 clean
3:25:00 PM: > rm -rf dist && mkdir -p dist
3:25:03 PM: src/services/ContractService.ts(313,5): error TS1434: Unexpected keyword or identifier.
3:25:03 PM: src/services/ContractService.ts(313,11): error TS1068: Unexpected token. A constructor, method, accessor, or property was expected.
3:25:03 PM: src/services/ContractService.ts(313,18): error TS1003: Identifier expected.
3:25:03 PM: src/services/ContractService.ts(313,53): error TS1005: ',' expected.
3:25:03 PM: src/services/ContractService.ts(313,54): error TS1128: Declaration or statement expected.
3:25:03 PM: src/services/ContractService.ts(326,10): error TS1005: ';' expected.
3:25:03 PM: src/services/ContractService.ts(326,17): error TS1434: Unexpected keyword or identifier.
3:25:03 PM: src/services/ContractService.ts(326,20): error TS1434: Unexpected keyword or identifier.
3:25:03 PM: src/services/ContractService.ts(326,24): error TS1434: Unexpected keyword or identifier.
3:25:03 PM: src/services/ContractService.ts(326,33): error TS1434: Unexpected keyword or identifier.
3:25:03 PM: src/services/ContractService.ts(326,46): error TS1128: Declaration or statement expected.
3:25:03 PM: src/services/ContractService.ts(326,48): error TS1434: Unexpected keyword or identifier.
3:25:03 PM: src/services/ContractService.ts(350,20): error TS1005: ';' expected.
3:25:03 PM: src/services/ContractService.ts(350,26): error TS1434: Unexpected keyword or identifier.
3:25:03 PM: src/services/ContractService.ts(350,35): error TS1434: Unexpected keyword or identifier.
3:25:03 PM: src/services/ContractService.ts(350,61): error TS1005: ';' expected.
3:25:03 PM: src/services/ContractService.ts(350,68): error TS1434: Unexpected keyword or identifier.
3:25:03 PM: src/services/ContractService.ts(350,85): error TS1443: Module declaration names may only use ' or " quoted strings.
src/services/ContractService.ts(372,26): error TS1434: Unexpected keyword or identifier.
3:25:03 PM: src/services/ContractService.ts(372,36): error TS1434: Unexpected keyword or identifier.
3:25:03 PM: src/services/ContractService.ts(372,59): error TS1005: ';' expected.
3:25:03 PM: src/services/ContractService.ts(372,82): error TS1434: Unexpected keyword or identifier.
3:25:03 PM: src/services/ContractService.ts(372,94): error TS1005: ';' expected.
3:25:03 PM: src/services/ContractService.ts(372,102): error TS1434: Unexpected keyword or identifier.
3:25:03 PM: src/services/ContractService.ts(372,113): error TS1443: Module declaration names may only use ' or " quoted strings.
src/services/ContractService.ts(382,14): error TS1435: Unknown keyword or identifier. Did you mean 'get'?
3:25:03 PM: src/services/ContractService.ts(382,18): error TS1434: Unexpected keyword or identifier.
3:25:03 PM: src/services/ContractService.ts(382,27): error TS1434: Unexpected keyword or identifier.
3:25:03 PM: src/services/ContractService.ts(386,27): error TS1005: ';' expected.
3:25:03 PM: src/services/ContractService.ts(386,36): error TS1434: Unexpected keyword or identifier.
3:25:03 PM: src/services/ContractService.ts(386,41): error TS1435: Unknown keyword or identifier. Did you mean 'return'?
3:25:03 PM: src/services/ContractService.ts(386,50): error TS1434: Unexpected keyword or identifier.
3:25:03 PM: src/services/ContractService.ts(386,57): error TS1443: Module declaration names may only use ' or " quoted strings.
src/services/ContractService.ts(394,74): error TS1434: Unexpected keyword or identifier.
3:25:03 PM: src/services/ContractService.ts(394,83): error TS1434: Unexpected keyword or identifier.
3:25:03 PM: src/services/ContractService.ts(406,21): error TS1005: ';' expected.
3:25:03 PM: src/services/ContractService.ts(406,30): error TS1434: Unexpected keyword or identifier.
3:25:03 PM: src/services/ContractService.ts(416,26): error TS1005: ';' expected.
3:25:03 PM: src/services/ContractService.ts(416,32): error TS1434: Unexpected keyword or identifier.
3:25:03 PM: src/services/ContractService.ts(416,39): error TS1434: Unexpected keyword or identifier.
3:25:03 PM: src/services/ContractService.ts(416,48): error TS1434: Unexpected keyword or identifier.
3:25:03 PM: src/services/ContractService.ts(416,52): error TS1128: Declaration or statement expected.
3:25:03 PM: src/services/ContractService.ts(428,24): error TS1005: ';' expected.
3:25:03 PM: src/services/ContractService.ts(428,31): error TS1434: Unexpected keyword or identifier.
3:25:03 PM: src/services/ContractService.ts(428,34): error TS1434: Unexpected keyword or identifier.
3:25:03 PM: src/services/ContractService.ts(428,42): error TS1434: Unexpected keyword or identifier.
3:25:03 PM: src/services/ContractService.ts(428,51): error TS1434: Unexpected keyword or identifier.
3:25:03 PM: src/services/ContractService.ts(428,55): error TS1128: Declaration or statement expected.
3:25:03 PM: src/services/ContractService.ts(435,20): error TS1005: ';' expected.
3:25:03 PM: src/services/ContractService.ts(435,26): error TS1434: Unexpected keyword or identifier.
3:25:03 PM: src/services/ContractService.ts(435,46): error TS1434: Unexpected keyword or identifier.
3:25:03 PM: src/services/ContractService.ts(435,53): error TS1434: Unexpected keyword or identifier.
3:25:03 PM: src/services/ContractService.ts(435,63): error TS1434: Unexpected keyword or identifier.
3:25:03 PM: src/services/ContractService.ts(435,67): error TS1434: Unexpected keyword or identifier.
3:25:03 PM: src/services/ContractService.ts(435,70): error TS1434: Unexpected keyword or identifier.
3:25:03 PM: src/services/ContractService.ts(435,84): error TS1443: Module declaration names may only use ' or " quoted strings.
src/services/ContractService.ts(438,29): error TS1434: Unexpected keyword or identifier.
3:25:03 PM: src/services/ContractService.ts(438,36): error TS1434: Unexpected keyword or identifier.
3:25:03 PM: src/services/ContractService.ts(438,39): error TS1434: Unexpected keyword or identifier.
3:25:03 PM: src/services/ContractService.ts(438,43): error TS1434: Unexpected keyword or identifier.
3:25:03 PM: src/services/ContractService.ts(438,61): error TS1434: Unexpected keyword or identifier.
3:25:03 PM: src/services/ContractService.ts(459,22): error TS1005: ';' expected.
3:25:03 PM: src/services/ContractService.ts(459,30): error TS1434: Unexpected keyword or identifier.
3:25:03 PM: src/services/ContractService.ts(459,46): error TS1434: Unexpected keyword or identifier.
3:25:03 PM: src/services/ContractService.ts(459,54): error TS1128: Declaration or statement expected.
3:25:03 PM: src/services/ContractService.ts(459,56): error TS1435: Unknown keyword or identifier. Did you mean 'default'?
3:25:03 PM: src/services/ContractService.ts(459,67): error TS1434: Unexpected keyword or identifier.
3:25:03 PM: src/services/ContractService.ts(459,77): error TS1443: Module declaration names may only use ' or " quoted strings.
src/services/ContractService.ts(474,22): error TS1435: Unknown keyword or identifier. Did you mean 'unknown'?
3:25:03 PM: src/services/ContractService.ts(474,30): error TS1434: Unexpected keyword or identifier.
3:25:03 PM: src/services/ContractService.ts(474,45): error TS1434: Unexpected keyword or identifier.
3:25:03 PM: src/services/ContractService.ts(474,52): error TS1128: Declaration or statement expected.
3:25:03 PM: src/services/ContractService.ts(474,54): error TS1435: Unknown keyword or identifier. Did you mean 'default'?
3:25:03 PM: src/services/ContractService.ts(474,65): error TS1434: Unexpected keyword or identifier.
3:25:03 PM: src/services/ContractService.ts(474,74): error TS1443: Module declaration names may only use ' or " quoted strings.
src/services/ContractService.ts(531,10): error TS1434: Unexpected keyword or identifier.
3:25:03 PM: src/services/ContractService.ts(531,17): error TS1434: Unexpected keyword or identifier.
3:25:03 PM: src/services/ContractService.ts(531,20): error TS1434: Unexpected keyword or identifier.
3:25:03 PM: src/services/ContractService.ts(531,24): error TS1434: Unexpected keyword or identifier.
3:25:03 PM: src/services/ContractService.ts(531,29): error TS1434: Unexpected keyword or identifier.
3:25:03 PM: src/services/ContractService.ts(531,38): error TS1005: '(' expected.
3:25:03 PM: src/services/ContractService.ts(531,39): error TS1005: ';' expected.
3:25:03 PM: src/services/ContractService.ts(531,52): error TS1005: ';' expected.
3:25:03 PM: src/services/ContractService.ts(531,54): error TS1434: Unexpected keyword or identifier.
3:25:03 PM: src/services/ContractService.ts(546,21): error TS1005: ';' expected.
3:25:03 PM: src/services/ContractService.ts(546,28): error TS1434: Unexpected keyword or identifier.
3:25:03 PM: src/services/ContractService.ts(546,31): error TS1434: Unexpected keyword or identifier.
3:25:03 PM: src/services/ContractService.ts(546,37): error TS1434: Unexpected keyword or identifier.
3:25:03 PM: src/services/ContractService.ts(546,42): error TS1434: Unexpected keyword or identifier.
3:25:03 PM: src/services/ContractService.ts(546,49): error TS1434: Unexpected keyword or identifier.
3:25:03 PM: src/services/ContractService.ts(546,60): error TS1005: '(' expected.
3:25:03 PM: src/services/ContractService.ts(546,61): error TS1005: ';' expected.
3:25:03 PM: src/services/ContractService.ts(572,10): error TS1005: ';' expected.
3:25:03 PM: src/services/ContractService.ts(572,14): error TS1005: ')' expected.
3:25:03 PM: src/services/ContractService.ts(572,20): error TS1434: Unexpected keyword or identifier.
3:25:03 PM: src/services/ContractService.ts(572,26): error TS1434: Unexpected keyword or identifier.
3:25:03 PM: src/services/ContractService.ts(572,38): error TS1005: '(' expected.
3:25:03 PM: src/services/ContractService.ts(572,39): error TS1005: ';' expected.
3:25:03 PM: src/services/ContractService.ts(572,46): error TS1005: ',' expected.
3:25:03 PM: src/services/ContractService.ts(578,20): error TS1005: ';' expected.
3:25:03 PM: src/services/ContractService.ts(578,27): error TS1005: ')' expected.
3:25:03 PM: src/services/ContractService.ts(578,30): error TS1434: Unexpected keyword or identifier.
3:25:03 PM: src/services/ContractService.ts(578,34): error TS1434: Unexpected keyword or identifier.
3:25:03 PM: src/services/ContractService.ts(578,40): error TS1434: Unexpected keyword or identifier.
3:25:03 PM: src/services/ContractService.ts(578,52): error TS1005: '(' expected.
3:25:03 PM: src/services/ContractService.ts(578,57): error TS1005: ';' expected.
3:25:03 PM: src/services/ContractService.ts(578,58): error TS1005: ';' expected.
3:25:03 PM: src/services/ContractService.ts(578,77): error TS1005: ')' expected.
3:25:03 PM: src/services/ContractService.ts(578,85): error TS1443: Module declaration names may only use ' or " quoted strings.
src/services/ContractService.ts(613,10): error TS1434: Unexpected keyword or identifier.
3:25:03 PM: src/services/ContractService.ts(613,17): error TS1434: Unexpected keyword or identifier.
3:25:03 PM: src/services/ContractService.ts(613,20): error TS1434: Unexpected keyword or identifier.
3:25:03 PM: src/services/ContractService.ts(613,24): error TS1434: Unexpected keyword or identifier.
3:25:03 PM: src/services/ContractService.ts(613,38): error TS1434: Unexpected keyword or identifier.
3:25:03 PM: src/services/ContractService.ts(633,10): error TS1005: ';' expected.
3:25:03 PM: src/services/ContractService.ts(633,16): error TS1434: Unexpected keyword or identifier.
3:25:03 PM: src/services/ContractService.ts(633,21): error TS1434: Unexpected keyword or identifier.
3:25:03 PM: src/services/ContractService.ts(633,32): error TS1005: '(' expected.
3:25:03 PM: src/services/ContractService.ts(633,41): error TS1005: ';' expected.
3:25:03 PM: src/services/ContractService.ts(633,42): error TS1005: ';' expected.
3:25:03 PM: src/services/ContractService.ts(633,55): error TS1005: ')' expected.
3:25:03 PM: src/services/ContractService.ts(633,60): error TS1434: Unexpected keyword or identifier.
3:25:03 PM: src/services/ContractService.ts(640,21): error TS1005: ';' expected.
3:25:03 PM: src/services/ContractService.ts(640,28): error TS1434: Unexpected keyword or identifier.
3:25:03 PM: src/services/ContractService.ts(640,31): error TS1434: Unexpected keyword or identifier.
3:25:03 PM: src/services/ContractService.ts(640,37): error TS1434: Unexpected keyword or identifier.
3:25:03 PM: src/services/ContractService.ts(640,42): error TS1434: Unexpected keyword or identifier.
3:25:03 PM: src/services/ContractService.ts(640,53): error TS1005: '(' expected.
3:25:03 PM: src/services/ContractService.ts(640,62): error TS1005: ';' expected.
3:25:03 PM: src/services/ContractService.ts(640,63): error TS1005: ';' expected.
3:25:03 PM: src/services/ContractService.ts(648,22): error TS1005: ')' expected.
3:25:03 PM: src/services/ContractService.ts(648,27): error TS1434: Unexpected keyword or identifier.
3:25:03 PM: src/services/ContractService.ts(648,41): error TS1005: '(' expected.
3:25:03 PM: src/services/ContractService.ts(648,50): error TS1005: ')' expected.
3:25:03 PM: src/services/ContractService.ts(648,55): error TS1434: Unexpected keyword or identifier.
3:25:03 PM: src/services/ContractService.ts(648,66): error TS1005: '(' expected.
3:25:03 PM: src/services/ContractService.ts(648,75): error TS1005: ';' expected.
3:25:03 PM: src/services/ContractService.ts(648,76): error TS1005: ';' expected.
3:25:03 PM: src/services/ContractService.ts(648,99): error TS1005: ')' expected.
3:25:03 PM: src/services/ContractService.ts(648,112): error TS1443: Module declaration names may only use ' or " quoted strings.
src/services/ContractService.ts(752,10): error TS1434: Unexpected keyword or identifier.
3:25:03 PM: src/services/ContractService.ts(752,17): error TS1434: Unexpected keyword or identifier.
3:25:03 PM: src/services/ContractService.ts(752,20): error TS1434: Unexpected keyword or identifier.
3:25:03 PM: src/services/ContractService.ts(752,25): error TS1434: Unexpected keyword or identifier.
3:25:03 PM: src/services/ContractService.ts(752,35): error TS1434: Unexpected keyword or identifier.
3:25:03 PM: src/services/ContractService.ts(752,43): error TS1005: '(' expected.
3:25:03 PM: src/services/ContractService.ts(752,48): error TS1005: ';' expected.
3:25:03 PM: src/services/ContractService.ts(752,49): error TS1005: ';' expected.
3:25:03 PM: src/services/ContractService.ts(752,60): error TS1005: ')' expected.
3:25:03 PM: src/services/ContractService.ts(752,62): error TS1434: Unexpected keyword or identifier.
3:25:03 PM: src/services/ContractService.ts(918,20): error TS1127: Invalid character.
3:25:03 PM: src/services/ContractService.ts(918,23): error TS1434: Unexpected keyword or identifier.
3:25:03 PM: src/services/ContractService.ts(918,29): error TS1434: Unexpected keyword or identifier.
3:25:03 PM: src/services/ContractService.ts(918,46): error TS1434: Unexpected keyword or identifier.
3:25:03 PM: src/services/ContractService.ts(918,84): error TS1005: ';' expected.
3:25:03 PM: src/services/ContractService.ts(918,87): error TS1434: Unexpected keyword or identifier.
3:25:03 PM: src/services/ContractService.ts(918,99): error TS1128: Declaration or statement expected.
3:25:03 PM: src/services/ContractService.ts(923,22): error TS1127: Invalid character.
3:25:03 PM: src/services/ContractService.ts(923,25): error TS1434: Unexpected keyword or identifier.
3:25:03 PM: src/services/ContractService.ts(923,36): error TS1434: Unexpected keyword or identifier.
3:25:03 PM: src/services/ContractService.ts(923,46): error TS1434: Unexpected keyword or identifier.
3:25:03 PM: src/services/ContractService.ts(923,52): error TS1005: ';' expected.
3:25:03 PM: src/services/ContractService.ts(923,62): error TS1128: Declaration or statement expected.
3:25:03 PM: src/services/ContractService.ts(936,28): error TS1127: Invalid character.
3:25:03 PM: src/services/ContractService.ts(936,30): error TS1434: Unexpected keyword or identifier.
3:25:03 PM: src/services/ContractService.ts(936,36): error TS1434: Unexpected keyword or identifier.
3:25:03 PM: src/services/ContractService.ts(936,43): error TS1434: Unexpected keyword or identifier.
3:25:03 PM: src/services/ContractService.ts(936,52): error TS1434: Unexpected keyword or identifier.
3:25:03 PM: src/services/ContractService.ts(936,68): error TS1005: ')' expected.
3:25:03 PM: src/services/ContractService.ts(936,87): error TS1434: Unexpected keyword or identifier.
3:25:03 PM: src/services/ContractService.ts(936,93): error TS1434: Unexpected keyword or identifier.
3:25:03 PM: src/services/ContractService.ts(936,99): error TS1128: Declaration or statement expected.
3:25:03 PM: src/services/ContractService.ts(941,28): error TS1127: Invalid character.
3:25:03 PM: src/services/ContractService.ts(941,29): error TS1127: Invalid character.
3:25:03 PM: src/services/ContractService.ts(941,32): error TS1434: Unexpected keyword or identifier.
3:25:03 PM: src/services/ContractService.ts(941,41): error TS1434: Unexpected keyword or identifier.
3:25:03 PM: src/services/ContractService.ts(941,47): error TS1005: ';' expected.
3:25:03 PM: src/services/ContractService.ts(941,54): error TS1434: Unexpected keyword or identifier.
3:25:03 PM: src/services/ContractService.ts(941,64): error TS1434: Unexpected keyword or identifier.
3:25:03 PM: src/services/ContractService.ts(941,67): error TS1434: Unexpected keyword or identifier.
3:25:03 PM: src/services/ContractService.ts(941,82): error TS1443: Module declaration names may only use ' or " quoted strings.
src/services/ContractService.ts(946,28): error TS1127: Invalid character.
3:25:03 PM: src/services/ContractService.ts(946,28): error TS1128: Declaration or statement expected.
3:25:03 PM: src/services/ContractService.ts(946,30): error TS1434: Unexpected keyword or identifier.
3:25:03 PM: src/services/ContractService.ts(946,37): error TS1434: Unexpected keyword or identifier.
3:25:03 PM: src/services/ContractService.ts(946,40): error TS1434: Unexpected keyword or identifier.
3:25:03 PM: src/services/ContractService.ts(946,44): error TS1434: Unexpected keyword or identifier.
3:25:03 PM: src/services/ContractService.ts(946,53): error TS1434: Unexpected keyword or identifier.
3:25:03 PM: src/services/ContractService.ts(946,66): error TS1128: Declaration or statement expected.
3:25:03 PM: src/services/ContractService.ts(957,22): error TS1127: Invalid character.
3:25:03 PM: src/services/ContractService.ts(957,24): error TS1434: Unexpected keyword or identifier.
3:25:03 PM: src/services/ContractService.ts(957,32): error TS1434: Unexpected keyword or identifier.
3:25:03 PM: src/services/ContractService.ts(957,53): error TS1434: Unexpected keyword or identifier.
3:25:03 PM: src/services/ContractService.ts(957,56): error TS1434: Unexpected keyword or identifier.
3:25:03 PM: src/services/ContractService.ts(957,63): error TS1434: Unexpected keyword or identifier.
3:25:03 PM: src/services/ContractService.ts(957,68): error TS1434: Unexpected keyword or identifier.
3:25:03 PM: src/services/ContractService.ts(957,73): error TS1128: Declaration or statement expected.
3:25:03 PM: src/services/ContractService.ts(961,20): error TS1127: Invalid character.
3:25:03 PM: src/services/ContractService.ts(961,22): error TS1434: Unexpected keyword or identifier.
3:25:03 PM: src/services/ContractService.ts(961,35): error TS1434: Unexpected keyword or identifier.
3:25:03 PM: src/services/ContractService.ts(961,45): error TS1434: Unexpected keyword or identifier.
3:25:03 PM: src/services/ContractService.ts(961,65): error TS1434: Unexpected keyword or identifier.
3:25:03 PM: src/services/ContractService.ts(961,81): error TS1443: Module declaration names may only use ' or " quoted strings.
src/services/ContractService.ts(992,46): error TS1434: Unexpected keyword or identifier.
3:25:03 PM: src/services/ContractService.ts(992,55): error TS1434: Unexpected keyword or identifier.
3:25:03 PM: src/services/ContractService.ts(992,69): error TS1434: Unexpected keyword or identifier.
3:25:03 PM: src/services/ContractService.ts(992,82): error TS1443: Module declaration names may only use ' or " quoted strings.
src/services/ContractService.ts(999,24): error TS1127: Invalid character.
3:25:03 PM: src/services/ContractService.ts(999,24): error TS1128: Declaration or statement expected.
3:25:03 PM: src/services/ContractService.ts(999,25): error TS1127: Invalid character.
3:25:03 PM: src/services/ContractService.ts(999,28): error TS1434: Unexpected keyword or identifier.
3:25:03 PM: src/services/ContractService.ts(999,37): error TS1434: Unexpected keyword or identifier.
3:25:03 PM: src/services/ContractService.ts(999,51): error TS1435: Unknown keyword or identifier. Did you mean 'return'?
3:25:03 PM: src/services/ContractService.ts(999,64): error TS1443: Module declaration names may only use ' or " quoted strings.
src/services/ContractService.ts(1004,22): error TS1127: Invalid character.
3:25:03 PM: src/services/ContractService.ts(1004,22): error TS1128: Declaration or statement expected.
3:25:03 PM: src/services/ContractService.ts(1004,25): error TS1434: Unexpected keyword or identifier.
3:25:03 PM: src/services/ContractService.ts(1004,29): error TS1434: Unexpected keyword or identifier.
3:25:03 PM: src/services/ContractService.ts(1004,38): error TS1434: Unexpected keyword or identifier.
3:25:03 PM: src/services/ContractService.ts(1004,47): error TS1005: '(' expected.
3:25:03 PM: src/services/ContractService.ts(1004,48): error TS1005: ';' expected.
3:25:03 PM: src/services/ContractService.ts(1004,60): error TS1005: ';' expected.
3:25:03 PM: src/services/ContractService.ts(1024,29): error TS1127: Invalid character.
3:25:03 PM: src/services/ContractService.ts(1024,30): error TS1127: Invalid character.
3:25:03 PM: src/services/ContractService.ts(1024,33): error TS1434: Unexpected keyword or identifier.
3:25:03 PM: src/services/ContractService.ts(1024,41): error TS1434: Unexpected keyword or identifier.
3:25:03 PM: src/services/ContractService.ts(1024,47): error TS1434: Unexpected keyword or identifier.
3:25:03 PM: src/services/ContractService.ts(1024,53): error TS1434: Unexpected keyword or identifier.
3:25:03 PM: src/services/ContractService.ts(1024,71): error TS1005: '(' expected.
3:25:03 PM: src/services/ContractService.ts(1024,80): error TS1005: ';' expected.
3:25:03 PM: src/services/ContractService.ts(1024,81): error TS1005: ';' expected.
3:25:03 PM: src/services/ContractService.ts(1024,106): error TS1005: ')' expected.
3:25:03 PM: src/services/ContractService.ts(1024,116): error TS1443: Module declaration names may only use ' or " quoted strings.
src/services/ContractService.ts(1049,61): error TS1434: Unexpected keyword or identifier.
3:25:03 PM: src/services/ContractService.ts(1049,70): error TS1434: Unexpected keyword or identifier.
3:25:03 PM: src/services/ContractService.ts(1060,21): error TS1005: ';' expected.
3:25:03 PM: src/services/ContractService.ts(1060,30): error TS1434: Unexpected keyword or identifier.
3:25:03 PM: src/services/ContractService.ts(1067,24): error TS1127: Invalid character.
3:25:03 PM: src/services/ContractService.ts(1067,26): error TS1434: Unexpected keyword or identifier.
3:25:03 PM: src/services/ContractService.ts(1067,39): error TS1434: Unexpected keyword or identifier.
3:25:03 PM: src/services/ContractService.ts(1067,46): error TS1434: Unexpected keyword or identifier.
3:25:03 PM: src/services/ContractService.ts(1067,55): error TS1434: Unexpected keyword or identifier.
3:25:03 PM: src/services/ContractService.ts(1067,74): error TS1005: '(' expected.
3:25:03 PM: src/services/ContractService.ts(1067,80): error TS1005: ')' expected.
3:25:03 PM: src/services/ContractService.ts(1067,99): error TS1005: ')' expected.
3:25:03 PM: src/services/ContractService.ts(1067,129): error TS1128: Declaration or statement expected.
3:25:03 PM: src/services/ContractService.ts(1070,26): error TS1127: Invalid character.
3:25:03 PM: src/services/ContractService.ts(1070,28): error TS1434: Unexpected keyword or identifier.
3:25:03 PM: src/services/ContractService.ts(1070,34): error TS1434: Unexpected keyword or identifier.
3:25:03 PM: src/services/ContractService.ts(1070,42): error TS1434: Unexpected keyword or identifier.
3:25:03 PM: src/services/ContractService.ts(1070,51): error TS1434: Unexpected keyword or identifier.
3:25:03 PM: src/services/ContractService.ts(1070,64): error TS1128: Declaration or statement expected.
3:25:03 PM: src/services/ContractService.ts(1075,27): error TS1005: ';' expected.
3:25:03 PM: src/services/ContractService.ts(1075,36): error TS1434: Unexpected keyword or identifier.
3:25:03 PM: src/services/ContractService.ts(1075,65): error TS1005: ',' expected.
3:25:03 PM: src/services/ContractService.ts(1075,68): error TS1005: ',' expected.
3:25:03 PM: src/services/ContractService.ts(1075,74): error TS1005: '=>' expected.
3:25:03 PM: src/services/ContractService.ts(1086,21): error TS1005: ';' expected.
3:25:03 PM: src/services/ContractService.ts(1086,30): error TS1434: Unexpected keyword or identifier.
3:25:03 PM: src/services/ContractService.ts(1095,24): error TS1127: Invalid character.
3:25:03 PM: src/services/ContractService.ts(1095,26): error TS1434: Unexpected keyword or identifier.
3:25:03 PM: src/services/ContractService.ts(1095,34): error TS1434: Unexpected keyword or identifier.
3:25:03 PM: src/services/ContractService.ts(1095,44): error TS1161: Unterminated regular expression literal.
3:25:03 PM: src/services/ContractService.ts(1095,108): error TS1005: ';' expected.
3:25:03 PM: src/services/ContractService.ts(1113,7): error TS1128: Declaration or statement expected.
3:25:03 PM: src/services/ContractService.ts(1114,5): error TS1128: Declaration or statement expected.
3:25:03 PM: src/services/ContractService.ts(1138,3): error TS1128: Declaration or statement expected.
3:25:03 PM: src/services/ContractService.ts(1140,1): error TS1128: Declaration or statement expected.
3:25:03 PM: ​
3:25:03 PM: "build.command" failed                                        
3:25:03 PM: ────────────────────────────────────────────────────────────────
3:25:03 PM: ​
3:25:03 PM:   Error message
3:25:03 PM:   Command failed with exit code 2: npm run build (https://ntl.fyi/exit-code-2)
3:25:03 PM: ​
3:25:03 PM:   Error location
3:25:03 PM:   In build.command from netlify.toml:
3:25:03 PM:   npm run build
3:25:03 PM: ​
3:25:03 PM:   Resolved config
3:25:03 PM:   build:
3:25:03 PM:     command: npm run build
3:25:03 PM:     commandOrigin: config
3:25:03 PM:     environment:
3:25:03 PM:       - AI_NODE_1_PRIVATE_KEY
3:25:03 PM:       - AI_NODE_2_PRIVATE_KEY
3:25:03 PM:       - AI_NODE_3_PRIVATE_KEY
3:25:03 PM:       - AI_NODE_4_PRIVATE_KEY
3:25:03 PM:       - AI_NODE_5_PRIVATE_KEY
3:25:03 PM:       - ETHEREUM_RPC_URL
3:25:03 PM:       - ETHERSCAN_API_KEY
3:25:03 PM:       - NODE_VERSION
3:25:03 PM:       - NODE_ENV
3:25:03 PM:     publish: /opt/build/repo/dist
3:25:03 PM:     publishOrigin: config
3:25:03 PM:   functions:
3:25:03 PM:     "*":
3:25:03 PM:       external_node_modules:
3:25:03 PM:         - ethers
3:25:03 PM:         - "@elizaos/core"
3:25:03 PM:         - node-cron
3:25:03 PM:         - winston
3:25:03 PM:       node_bundler: esbuild
3:25:03 PM:     governance-agent:
3:25:03 PM:       timeout: 25
3:25:03 PM:     scheduled-voting:
3:25:03 PM:       schedule: "*/10 * * * *"
3:25:03 PM:       timeout: 25
3:25:03 PM:   functionsDirectory: /opt/build/repo/dist/netlify/functions
3:25:03 PM:   headers:
3:25:04 PM: Failed during stage 'building site': Build script returned non-zero exit code: 2 (https://ntl.fyi/exit-code-2)
3:25:04 PM:     - for: /*
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
3:25:04 PM: Build failed due to a user error: Build script returned non-zero exit code: 2
3:25:04 PM: Failing build: Failed to build site
3:25:04 PM: Finished processing build request in 29.926s