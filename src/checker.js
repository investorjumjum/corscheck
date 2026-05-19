#!/usr/bin/env node
// 🌐 corscheck — CORS Configuration Validator

const https  = require('https');
const http   = require('http');
const { URL } = require('url');

const GREEN  = '\x1b[32m'; const RED    = '\x1b[31m';
const YELLOW = '\x1b[33m'; const CYAN   = '\x1b[36m';
const BOLD   = '\x1b[1m';  const DIM    = '\x1b[2m';
const NC     = '\x1b[0m';

function fetchHeaders(targetUrl, origin, method = 'OPTIONS') {
  return new Promise((resolve) => {
    let parsed;
    try { parsed = new URL(targetUrl); } catch { resolve({ error: 'Invalid URL' }); return; }

    const opts = {
      hostname: parsed.hostname,
      port:     parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
      path:     parsed.pathname + parsed.search,
      method,
      headers: {
        'Origin':                        origin,
        'Access-Control-Request-Method': 'GET,POST,PUT,DELETE',
        'Access-Control-Request-Headers':'Content-Type,Authorization',
        'User-Agent': 'corscheck/1.0',
      },
    };

    const lib = parsed.protocol === 'https:' ? https : http;
    const req = lib.request(opts, (res) => {
      const headers = res.headers;
      resolve({
        status:         res.statusCode,
        allowOrigin:    headers['access-control-allow-origin'],
        allowMethods:   headers['access-control-allow-methods'],
        allowHeaders:   headers['access-control-allow-headers'],
        allowCreds:     headers['access-control-allow-credentials'],
        maxAge:         headers['access-control-max-age'],
        vary:           headers['vary'],
        exposeHeaders:  headers['access-control-expose-headers'],
      });
    });
    req.on('error', (e) => resolve({ error: e.message }));
    req.setTimeout(5000, () => { req.destroy(); resolve({ error: 'Timeout' }); });
    req.end();
  });
}

function analyzeHeaders(result, endpoint, origin) {
  const issues  = [];
  const { allowOrigin, allowCreds, vary, allowMethods } = result;

  if (result.error) {
    issues.push({ level: 'ERROR', msg: `Request failed: ${result.error}` });
    return { issues, score: 0 };
  }

  // Critical: wildcard + credentials
  if (allowOrigin === '*' && allowCreds === 'true') {
    issues.push({ level: 'CRITICAL', msg: 'Allow-Origin: * with credentials: true — CORS misconfiguration!' });
  }

  // Origin reflection without Vary
  if (allowOrigin && allowOrigin !== '*' && !vary?.toLowerCase().includes('origin')) {
    issues.push({ level: 'WARNING', msg: 'Origin reflected but missing Vary: Origin header — caching issues possible' });
  }

  // No CORS headers at all
  if (!allowOrigin) {
    issues.push({ level: 'INFO', msg: 'No CORS headers returned — endpoint may be same-origin only' });
  }

  // Missing methods
  if (!allowMethods) {
    issues.push({ level: 'INFO', msg: 'No Access-Control-Allow-Methods specified' });
  }

  const score = 100 - (issues.filter(i => i.level === 'CRITICAL').length * 40)
                    - (issues.filter(i => i.level === 'WARNING').length * 15)
                    - (issues.filter(i => i.level === 'INFO').length * 5);

  return { issues, score: Math.max(0, score) };
}

function printResult(endpoint, result, analysis) {
  const { issues, score } = analysis;
  const scoreColor = score >= 90 ? GREEN : score >= 70 ? YELLOW : RED;
  const icon = !issues.length ? `${GREEN}✅` : issues.some(i => i.level === 'CRITICAL') ? `${RED}❌` : `${YELLOW}⚠️ `;

  console.log(`\n${icon}${NC} ${BOLD}${endpoint}${NC}  ${scoreColor}[${score}/100]${NC}`);
  if (result.allowOrigin)  console.log(`   ${DIM}Allow-Origin:  ${result.allowOrigin}${NC}`);
  if (result.allowMethods) console.log(`   ${DIM}Allow-Methods: ${result.allowMethods}${NC}`);
  if (result.allowCreds)   console.log(`   ${DIM}Credentials:   ${result.allowCreds}${NC}`);

  issues.forEach(({ level, msg }) => {
    const c = level === 'CRITICAL' ? RED : level === 'WARNING' ? YELLOW : DIM;
    const i = level === 'CRITICAL' ? '  ❌' : level === 'WARNING' ? '  ⚠️ ' : '  ℹ️ ';
    console.log(`${c}${i} ${msg}${NC}`);
  });
}

function runDemo() {
  console.log(`\n${CYAN}${BOLD}🌐 corscheck — Demo Results${NC}`);
  console.log(`${DIM}Origin: https://myapp.example.com${NC}\n`);
  console.log('─'.repeat(65));

  const mockResults = [
    { endpoint: 'GET  /api/users',  allowOrigin: 'https://myapp.example.com', allowMethods: 'GET,POST', allowCreds: 'true',  vary: 'Origin' },
    { endpoint: 'POST /api/auth',   allowOrigin: '*',                          allowMethods: 'POST',     allowCreds: 'true',  vary: null },
    { endpoint: 'GET  /api/public', allowOrigin: '*',                          allowMethods: 'GET',      allowCreds: null,    vary: null },
    { endpoint: 'PUT  /api/admin',  allowOrigin: 'https://myapp.example.com', allowMethods: 'PUT',      allowCreds: 'true',  vary: null },
  ];

  let totalScore = 0;
  mockResults.forEach(r => {
    const analysis = analyzeHeaders(r, r.endpoint, 'https://myapp.example.com');
    printResult(r.endpoint, r, analysis);
    totalScore += analysis.score;
  });

  const avg = Math.round(totalScore / mockResults.length);
  const avgColor = avg >= 90 ? GREEN : avg >= 70 ? YELLOW : RED;
  console.log(`\n${'─'.repeat(65)}`);
  console.log(`${BOLD}Overall Score:${NC} ${avgColor}${avg}/100${NC}\n`);
}

async function scanEndpoint(baseUrl, origin, endpoints) {
  console.log(`\n${CYAN}${BOLD}🌐 corscheck — ${baseUrl}${NC}`);
  console.log(`${DIM}Testing origin: ${origin}${NC}\n`);
  console.log('─'.repeat(65));

  let totalScore = 0;
  for (const ep of endpoints) {
    const url    = baseUrl.replace(/\/$/, '') + ep;
    const result = await fetchHeaders(url, origin);
    const analysis = analyzeHeaders(result, ep, origin);
    printResult(ep, result, analysis);
    totalScore += analysis.score;
  }

  const avg = Math.round(totalScore / endpoints.length);
  const avgColor = avg >= 90 ? GREEN : avg >= 70 ? YELLOW : RED;
  console.log(`\n${'─'.repeat(65)}`);
  console.log(`${BOLD}Overall Score:${NC} ${avgColor}${avg}/100${NC}\n`);
}

const args      = process.argv.slice(2);
const cmd       = args[0] || 'demo';
const targetUrl = args[1];
const origin    = args[args.indexOf('--origin') + 1] || 'https://example.com';
const epFile    = args[args.indexOf('--endpoints') + 1];

console.log(`\n${CYAN}${BOLD}🌐 corscheck${NC}\n`);

if (cmd === 'demo') {
  runDemo();
} else if (cmd === 'scan' && targetUrl) {
  const endpoints = epFile && require('fs').existsSync(epFile)
    ? require('fs').readFileSync(epFile, 'utf8').split('\n').filter(Boolean)
    : ['/api/users', '/api/auth', '/api/public', '/api/health'];
  scanEndpoint(targetUrl, origin, endpoints).catch(console.error);
} else {
  console.log(`Usage:`);
  console.log(`  node src/checker.js demo`);
  console.log(`  node src/checker.js scan https://api.example.com`);
  console.log(`  node src/checker.js scan https://api.example.com --origin https://myapp.com`);
  console.log(`  node src/checker.js scan https://api.example.com --endpoints endpoints.txt\n`);
}
