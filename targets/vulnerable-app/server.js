/**
 * Intentionally Vulnerable Target Application
 *
 * WARNING: This app contains deliberate security vulnerabilities for demo purposes.
 * NEVER deploy this to a production environment or expose it to the internet.
 *
 * Vulnerabilities present (by design):
 * - SQL injection simulation in /login
 * - Unauthenticated admin panel at /admin
 * - Verbose error messages with stack traces
 * - Missing security headers (HSTS, CSP, X-Frame-Options)
 * - X-Powered-By and Server headers exposed
 * - Sensitive data exposure in /api/users
 * - Directory listing simulation at /files
 * - Telnet-style echo at /echo (command injection simulation)
 */

const express = require("express");

const app = express();
const PORT = process.env.PORT ?? 8888;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Deliberately expose version headers
app.use((_req, res, next) => {
  res.setHeader("X-Powered-By", "VulnerableApp/1.0 PHP/5.6.40");
  res.setHeader("Server", "Apache/2.2.34 (Ubuntu)");
  // Intentionally missing: Strict-Transport-Security, Content-Security-Policy, X-Frame-Options
  next();
});

// ── Landing page ──────────────────────────────────────────────────────────
app.get("/", (_req, res) => {
  res.send(`
    <html>
    <head><title>CorpNet Internal Portal v2.1.4</title></head>
    <body>
      <h1>CorpNet Internal Portal</h1>
      <p>Version: 2.1.4 | Build: 2019-03-12</p>
      <ul>
        <li><a href="/login">Login</a></li>
        <li><a href="/admin">Admin Panel</a></li>
        <li><a href="/api/users">User API</a></li>
        <li><a href="/files">File Manager</a></li>
      </ul>
    </body>
    </html>
  `);
});

// ── Vulnerable login (SQL injection simulation) ───────────────────────────
app.post("/login", (req, res) => {
  const { username, password } = req.body;

  // Deliberately echo the raw query — SQL injection simulation
  const simulatedQuery = `SELECT * FROM users WHERE username='${username}' AND password='${password}'`;

  if (username === "' OR '1'='1" || (username && username.includes("'"))) {
    // Simulate SQL injection success
    res.status(200).json({
      success: true,
      message: "Authentication bypassed via SQL injection",
      debug: {
        query: simulatedQuery,
        result: "1 row returned",
        user: { id: 1, username: "admin", role: "superadmin", email: "admin@corpnet.local" }
      }
    });
    return;
  }

  if (username === "admin" && password === "admin123") {
    res.status(200).json({ success: true, token: "eyJhbGciOiJub25lIn0.eyJ1c2VyIjoiYWRtaW4ifQ.", role: "admin" });
    return;
  }

  // Deliberately include internal debug info in error
  res.status(401).json({
    success: false,
    error: "Authentication failed",
    debug: {
      query: simulatedQuery,
      server: "db01.corpnet.local:3306",
      database: "corpnet_prod",
      error: "No matching rows in users table"
    }
  });
});

// ── Unauthenticated admin panel ───────────────────────────────────────────
app.get("/admin", (_req, res) => {
  // No authentication check — deliberate vulnerability
  res.send(`
    <html>
    <head><title>Admin Panel - CorpNet</title></head>
    <body>
      <h1>Administrator Control Panel</h1>
      <p style="color:red">⚠ No authentication required — accessible to all users</p>
      <h2>System Information</h2>
      <pre>
OS: Ubuntu 14.04.6 LTS
Kernel: 3.13.0-170-generic
Database: MySQL 5.5.62
Redis: 2.8.4
Internal network: 192.168.1.0/24
DB credentials: admin:CorpNet@2019!
Backup server: 192.168.1.50
      </pre>
      <h2>Users</h2>
      <table border="1">
        <tr><th>ID</th><th>Username</th><th>Password Hash</th><th>Role</th></tr>
        <tr><td>1</td><td>admin</td><td>5f4dcc3b5aa765d61d8327deb882cf99</td><td>superadmin</td></tr>
        <tr><td>2</td><td>jsmith</td><td>098f6bcd4621d373cade4e832627b4f6</td><td>user</td></tr>
        <tr><td>3</td><td>mwilson</td><td>d8578edf8458ce06fbc5bb76a58c5ca4</td><td>user</td></tr>
      </table>
    </body>
    </html>
  `);
});

// ── Sensitive data exposure in API ────────────────────────────────────────
app.get("/api/users", (_req, res) => {
  // No authentication — returns PII and password hashes
  res.json([
    { id: 1, username: "admin", email: "admin@corpnet.local", passwordHash: "5f4dcc3b5aa765d61d8327deb882cf99", ssn: "123-45-6789", creditCard: "4111111111111111", role: "superadmin" },
    { id: 2, username: "jsmith", email: "jsmith@corpnet.local", passwordHash: "098f6bcd4621d373cade4e832627b4f6", ssn: "987-65-4321", role: "user" },
    { id: 3, username: "mwilson", email: "mwilson@corpnet.local", passwordHash: "d8578edf8458ce06fbc5bb76a58c5ca4", role: "user" }
  ]);
});

// ── Directory listing simulation ──────────────────────────────────────────
app.get("/files", (_req, res) => {
  res.send(`
    <html>
    <head><title>Index of /files</title></head>
    <body>
      <h1>Index of /files</h1>
      <pre>
backup_2019.sql      2019-03-10  45MB
passwords.txt        2018-11-22   2KB
db_config.php        2019-01-05   1KB
id_rsa               2017-08-14   3KB
.env.production      2019-03-01   1KB
      </pre>
    </body>
    </html>
  `);
});

// ── XSS reflection simulation ─────────────────────────────────────────────
app.get("/search", (req, res) => {
  const q = req.query.q ?? "";
  // Deliberately reflects unsanitized input — XSS vulnerability
  res.send(`
    <html>
    <body>
      <h1>Search Results</h1>
      <p>You searched for: ${q}</p>
    </body>
    </html>
  `);
});

// ── Verbose error handler ─────────────────────────────────────────────────
app.use((err, _req, res, _next) => {
  // Deliberately exposes stack trace
  res.status(500).json({
    error: err.message,
    stack: err.stack,
    env: process.env.NODE_ENV
  });
});

app.listen(PORT, () => {
  console.log(`[VulnerableTarget] Running on port ${PORT}`);
  console.log(`[VulnerableTarget] WARNING: This app is intentionally insecure. Demo use only.`);
});
