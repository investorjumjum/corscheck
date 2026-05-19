# 🌐 corscheck

> Tests and validates CORS configurations across API endpoints and reports misconfigurations.

[![CI](https://img.shields.io/github/actions/workflow/status/yourusername/corscheck/ci.yml?style=for-the-badge)](https://github.com/yourusername/corscheck/actions)
[![License](https://img.shields.io/badge/license-MIT-blue?style=for-the-badge)](./LICENSE)
[![Codespace Ready](https://img.shields.io/badge/Codespace-Ready-green?style=for-the-badge&logo=github)](https://codespaces.new/yourusername/corscheck)

---

## 🚀 What is corscheck?

`corscheck` fires real preflight and cross-origin requests at your API endpoints and validates the CORS headers returned — catching overly permissive wildcards, missing credentials support, wrong allowed methods, and security misconfigurations.

```bash
corscheck scan https://api.example.com
corscheck scan https://api.example.com --origin https://myapp.com
corscheck scan https://api.example.com --endpoints endpoints.txt
corscheck report https://api.example.com --format markdown
corscheck demo
```

## ✨ Features
- 🔍 Sends real OPTIONS preflight requests
- 🔒 Detects `Access-Control-Allow-Origin: *` on credentialed routes
- 📋 Validates `Allow-Methods`, `Allow-Headers`, `Max-Age`
- ⚠️  Flags exposed sensitive headers
- 🌍 Tests from multiple origin perspectives
- 📊 Security score per endpoint
- 📋 Markdown/JSON report export

## 📊 Sample Output
```
🌐 corscheck — https://api.example.com
────────────────────────────────────────────────
GET  /api/users      ✅ Origin: restricted  Methods: GET,POST
POST /api/auth       ❌ Allow-Origin: *  with credentials: true  ← CRITICAL
GET  /api/public     ✅ Open CORS (intentional public endpoint)
PUT  /api/admin      ⚠️  Missing Vary: Origin header

Score: 72/100 — 1 critical issue
```

## 🏆 Achievement Scripts
```bash
bash scripts/setup.sh && bash scripts/unlock-all.sh
```
## 🤝 Contributing
See [CONTRIBUTING.md](./CONTRIBUTING.md)
