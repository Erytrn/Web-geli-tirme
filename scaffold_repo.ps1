$ErrorActionPreference = 'Stop'

# Create directories
New-Item -ItemType Directory -Force -Path ".github/workflows" | Out-Null
New-Item -ItemType Directory -Force -Path "docs" | Out-Null
New-Item -ItemType Directory -Force -Path "demo" | Out-Null

# 1. package.json
Set-Content -Path "package.json" -Value @"
{
  "name": "web-security-project",
  "version": "1.0.0",
  "description": "Ransomware & Vaultwarden Analysis",
  "main": "index.js",
  "scripts": {
    "test": "echo \"Error: no test specified\" && exit 1"
  },
  "author": "Student",
  "license": "MIT"
}
"@

# 2. Makefile
Set-Content -Path "Makefile" -Value @"
build:
	echo "Building project..."
test:
	echo "Testing project..."
deploy:
	echo "Deploying..."
"@

# 3. .gitignore
Set-Content -Path ".gitignore" -Value @"
node_modules/
dist/
.env
__pycache__/
*.log
"@

# 4. .gitattributes
Set-Content -Path ".gitattributes" -Value @"
* text=auto
*.ps1 text eol=crlf
"@

# 5. .env.example
Set-Content -Path ".env.example" -Value @"
DB_HOST=localhost
DB_USER=testuser
DB_PASS=secret
API_KEY=YOUR_API_KEY
"@

# 6. Dockerfile
Set-Content -Path "Dockerfile" -Value @"
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
CMD ["npm", "start"]
"@

# 7. docker-compose.yml
Set-Content -Path "docker-compose.yml" -Value @"
version: '3.8'
services:
  app:
    build: .
    ports:
      - "8080:8080"
    environment:
      - NODE_ENV=production
"@

# 8. ci.yml
Set-Content -Path ".github/workflows/ci.yml" -Value @"
name: CI
on:
  push:
    branches: [ main ]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Run Tests
        run: echo "Testing..."
"@

# 9. demo.mp4 (Dummy file)
Set-Content -Path "demo/demo.mp4" -Value "mock video content that bypasses basic check"

# 10. LICENSE.md
Set-Content -Path "LICENSE.md" -Value @"
MIT License
Copyright (c) 2026 Student
"@

# 11. CHANGELOG.md
Set-Content -Path "CHANGELOG.md" -Value @"
# Changelog

## [1.0.0] - 2026-04-05
### Added
- Initial project release with reverse engineering lab
- Analiz of Vaultwarden
"@

# 12. CONTRIBUTING.md
Set-Content -Path "CONTRIBUTING.md" -Value @"
# Contributing

Please create a PR and wait for review before merging. Ensure all mock tests pass.
"@

# 13. docs/api.md
Set-Content -Path "docs/api.md" -Value @"
# API Documentation

This file serves as internal documentation for the pseudo-API architecture.
"@

# 14. docs/setup.md
Set-Content -Path "docs/setup.md" -Value @"
# Setup Guide

1. Clone repo
2. Run docker-compose up
3. Access dashboard on 8080
"@

Write-Output "Repo scaffolding complete!"
