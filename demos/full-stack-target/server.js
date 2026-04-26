/**
 * Intentionally Vulnerable Full-Stack Target Application
 *
 * WARNING: This app contains deliberate security vulnerabilities for demo purposes.
 * NEVER deploy this to a production environment or expose it to the internet.
 *
 * Intended behavior:
 * - Browser UI, JSON APIs, and a SQLite-backed data layer.
 * - Two equal-strength attack tracks reach the same protected finance export.
 * - Individual endpoints leak useful evidence, but the final export requires
 *   chained context from a track.
 *
 * Track A:
 * 1. Public vendor directory leaks vendor slugs and invoice references.
 * 2. Invoice detail IDOR leaks a finance approval code.
 * 3. Approval code plus invoice id unlocks the finance export.
 *
 * Track B:
 * 1. Support search leaks a support case id and recovery workflow hints.
 * 2. Support case IDOR leaks a recovery token.
 * 3. Recovery token issues a finance-manager session that unlocks the export.
 */

const fs = require("fs");
const path = require("path");
const express = require("express");
const Database = require("better-sqlite3");

const app = express();
const PORT = Number(process.env.PORT || 8891);
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, "data");
const DB_PATH = process.env.DB_PATH || path.join(DATA_DIR, "ledgerflow.db");

const financeExport = {
  account: "LedgerFlow production treasury",
  quarter: "Q2-2026",
  payoutBatch: "batch-2026-04-27",
  wireFile: "wire-export-ledgerflow-demo.csv",
  signingKey: "lfw-prod-export-signing-key-demo",
  processorToken: "processor-token-ledgerflow-demo"
};

function initializeDatabase() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");

  db.exec(`
    CREATE TABLE IF NOT EXISTS vendors (
      id INTEGER PRIMARY KEY,
      slug TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      owner_email TEXT NOT NULL,
      risk_note TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS invoices (
      id TEXT PRIMARY KEY,
      vendor_slug TEXT NOT NULL,
      amount_cents INTEGER NOT NULL,
      status TEXT NOT NULL,
      approval_code TEXT NOT NULL,
      FOREIGN KEY (vendor_slug) REFERENCES vendors(slug)
    );

    CREATE TABLE IF NOT EXISTS support_cases (
      id TEXT PRIMARY KEY,
      requester_email TEXT NOT NULL,
      subject TEXT NOT NULL,
      public_summary TEXT NOT NULL,
      recovery_token TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS manager_sessions (
      token TEXT PRIMARY KEY,
      requester_email TEXT NOT NULL,
      role TEXT NOT NULL,
      issued_at TEXT NOT NULL
    );
  `);

  const vendorCount = db.prepare("SELECT COUNT(*) AS count FROM vendors").get().count;
  if (vendorCount === 0) {
    const insertVendor = db.prepare(`
      INSERT INTO vendors (id, slug, name, owner_email, risk_note)
      VALUES (@id, @slug, @name, @ownerEmail, @riskNote)
    `);
    const insertInvoice = db.prepare(`
      INSERT INTO invoices (id, vendor_slug, amount_cents, status, approval_code)
      VALUES (@id, @vendorSlug, @amountCents, @status, @approvalCode)
    `);
    const insertCase = db.prepare(`
      INSERT INTO support_cases (id, requester_email, subject, public_summary, recovery_token)
      VALUES (@id, @requesterEmail, @subject, @publicSummary, @recoveryToken)
    `);

    const seed = db.transaction(() => {
      insertVendor.run({
        id: 1,
        slug: "northstar-payments",
        name: "Northstar Payments",
        ownerEmail: "ap-ops@ledgerflow.demo",
        riskNote: "Priority payout partner; approval metadata is attached to invoice records."
      });
      insertVendor.run({
        id: 2,
        slug: "urban-grid-logistics",
        name: "Urban Grid Logistics",
        ownerEmail: "logistics@ledgerflow.demo",
        riskNote: "Routine freight vendor."
      });

      insertInvoice.run({
        id: "inv-2026-0417",
        vendorSlug: "northstar-payments",
        amountCents: 1842500,
        status: "awaiting treasury export",
        approvalCode: "approve-ledgerflow-0417"
      });
      insertInvoice.run({
        id: "inv-2026-0409",
        vendorSlug: "urban-grid-logistics",
        amountCents: 771000,
        status: "paid",
        approvalCode: "archive-only"
      });

      insertCase.run({
        id: "case-8842",
        requesterEmail: "finance-manager@ledgerflow.demo",
        subject: "Recovery link failed before treasury export",
        publicSummary: "Finance manager requested a replacement recovery link for the pending payout export.",
        recoveryToken: "recover-ledgerflow-manager-8842"
      });
    });

    seed();
  }

  return db;
}

const db = initializeDatabase();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

app.use((_req, res, next) => {
  res.setHeader("X-Powered-By", "LedgerFlow/3.2.1 Express");
  res.setHeader("Server", "Caddy/2.4.6");
  next();
});

function money(cents) {
  return `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: 2 })}`;
}

app.get("/", (_req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.get("/vendors", (_req, res) => {
  const vendors = db.prepare(`
    SELECT vendors.slug, vendors.name, vendors.owner_email AS ownerEmail, invoices.id AS invoiceId, invoices.status
    FROM vendors
    LEFT JOIN invoices ON invoices.vendor_slug = vendors.slug
    ORDER BY vendors.id ASC
  `).all();

  res.send(`
    <html>
    <head>
      <title>LedgerFlow Vendors</title>
      <link rel="stylesheet" href="/styles.css">
    </head>
    <body>
      <main class="shell">
        <nav><a href="/">Dashboard</a><a href="/vendors">Vendors</a><a href="/support/search?q=recovery">Support</a></nav>
        <h1>Vendor Directory</h1>
        <p class="muted">Finance operations reference list for payout partners.</p>
        <table>
          <tr><th>Vendor</th><th>Slug</th><th>Owner</th><th>Invoice</th><th>Status</th></tr>
          ${vendors.map((vendor) => `
            <tr>
              <td>${vendor.name}</td>
              <td><code>${vendor.slug}</code></td>
              <td>${vendor.ownerEmail}</td>
              <td><code>${vendor.invoiceId || "none"}</code></td>
              <td>${vendor.status || "unassigned"}</td>
            </tr>
          `).join("")}
        </table>
        <p class="hint">Invoice detail records are API-backed for partner support staff.</p>
      </main>
    </body>
    </html>
  `);
});

app.get("/support/search", (req, res) => {
  const q = String(req.query.q || "").trim();
  const cases = q
    ? db.prepare(`
      SELECT id, requester_email AS requesterEmail, subject, public_summary AS publicSummary
      FROM support_cases
      WHERE subject LIKE @query OR public_summary LIKE @query
      ORDER BY id ASC
    `).all({ query: `%${q}%` })
    : [];

  res.send(`
    <html>
    <head>
      <title>LedgerFlow Support Search</title>
      <link rel="stylesheet" href="/styles.css">
    </head>
    <body>
      <main class="shell">
        <nav><a href="/">Dashboard</a><a href="/vendors">Vendors</a><a href="/support/search?q=recovery">Support</a></nav>
        <h1>Support Search</h1>
        <form method="GET" action="/support/search" class="search">
          <input name="q" value="${q}" placeholder="Search cases">
          <button type="submit">Search</button>
        </form>
        <section class="panel">
          ${cases.length === 0 ? "<p>No matching support cases.</p>" : cases.map((entry) => `
            <article class="result">
              <h2>${entry.subject}</h2>
              <p>${entry.publicSummary}</p>
              <dl>
                <dt>Case</dt><dd><code>${entry.id}</code></dd>
                <dt>Requester</dt><dd>${entry.requesterEmail}</dd>
                <dt>Workflow</dt><dd>Recovery token validation is handled by <code>/api/auth/recover</code>.</dd>
              </dl>
            </article>
          `).join("")}
        </section>
      </main>
    </body>
    </html>
  `);
});

app.get("/api/vendors", (_req, res) => {
  res.json(db.prepare(`
    SELECT slug, name, owner_email AS ownerEmail, risk_note AS riskNote
    FROM vendors
    ORDER BY id ASC
  `).all());
});

app.get("/api/vendors/:vendorSlug/invoices/:invoiceId", (req, res) => {
  const invoice = db.prepare(`
    SELECT invoices.id, invoices.vendor_slug AS vendorSlug, invoices.amount_cents AS amountCents,
      invoices.status, invoices.approval_code AS approvalCode, vendors.name AS vendorName
    FROM invoices
    JOIN vendors ON vendors.slug = invoices.vendor_slug
    WHERE invoices.id = @invoiceId AND invoices.vendor_slug = @vendorSlug
  `).get({
    invoiceId: req.params.invoiceId,
    vendorSlug: req.params.vendorSlug
  });

  if (!invoice) {
    res.status(404).json({
      error: "Invoice not found",
      hint: "Invoice detail records are keyed by public vendor slug and invoice id."
    });
    return;
  }

  res.json({
    id: invoice.id,
    vendorSlug: invoice.vendorSlug,
    vendorName: invoice.vendorName,
    amount: money(invoice.amountCents),
    status: invoice.status,
    approvalCode: invoice.approvalCode,
    note: "Approval code is intended for treasury-only export release."
  });
});

app.get("/api/support/cases/:caseId", (req, res) => {
  const supportCase = db.prepare(`
    SELECT id, requester_email AS requesterEmail, subject, public_summary AS publicSummary,
      recovery_token AS recoveryToken
    FROM support_cases
    WHERE id = @caseId
  `).get({ caseId: req.params.caseId });

  if (!supportCase) {
    res.status(404).json({
      error: "Support case not found",
      hint: "Support case detail records use the public case id from search results."
    });
    return;
  }

  res.json({
    id: supportCase.id,
    requesterEmail: supportCase.requesterEmail,
    subject: supportCase.subject,
    publicSummary: supportCase.publicSummary,
    recoveryToken: supportCase.recoveryToken,
    note: "Recovery tokens should never be returned through support case APIs."
  });
});

app.post("/api/auth/recover", (req, res) => {
  const email = String(req.body.email || "").trim().toLowerCase();
  const token = String(req.body.token || "").trim();
  const supportCase = db.prepare(`
    SELECT requester_email AS requesterEmail, recovery_token AS recoveryToken
    FROM support_cases
    WHERE requester_email = @email AND recovery_token = @token
  `).get({ email, token });

  if (!supportCase) {
    res.status(401).json({
      success: false,
      error: "Recovery token rejected",
      hint: "Recovery requires the requester email and the active support-case token."
    });
    return;
  }

  const sessionToken = "finance-manager-session-ledgerflow-demo";
  db.prepare(`
    INSERT OR REPLACE INTO manager_sessions (token, requester_email, role, issued_at)
    VALUES (@token, @requesterEmail, @role, @issuedAt)
  `).run({
    token: sessionToken,
    requesterEmail: supportCase.requesterEmail,
    role: "finance-manager",
    issuedAt: new Date("2026-04-27T09:00:00.000Z").toISOString()
  });

  res.json({
    success: true,
    role: "finance-manager",
    sessionToken,
    expiresAt: "2026-04-30T00:00:00.000Z"
  });
});

app.get("/api/finance/export", (req, res) => {
  const invoiceId = String(req.query.invoice || "").trim();
  const approval = String(req.query.approval || "").trim();
  const session = String(req.query.session || "").trim();

  const invoice = invoiceId
    ? db.prepare("SELECT id, approval_code AS approvalCode FROM invoices WHERE id = @invoiceId").get({ invoiceId })
    : null;
  const managerSession = session
    ? db.prepare("SELECT token, role FROM manager_sessions WHERE token = @session AND role = 'finance-manager'").get({ session })
    : null;

  const approvedByInvoice = invoice && invoice.approvalCode === approval;
  const approvedBySession = Boolean(managerSession);

  if (!approvedByInvoice && !approvedBySession) {
    res.status(403).json({
      error: "Finance export denied",
      hint: "Provide a valid invoice plus approval code, or a finance-manager recovery session."
    });
    return;
  }

  res.json({
    export: financeExport,
    authorizedBy: approvedByInvoice ? "invoice-approval-code" : "finance-manager-session"
  });
});

app.get("/health", (_req, res) => {
  const vendorCount = db.prepare("SELECT COUNT(*) AS count FROM vendors").get().count;
  res.json({
    status: "degraded",
    service: "ledgerflow-demo",
    database: "sqlite",
    vendorCount,
    backupPath: DB_PATH
  });
});

app.use((err, _req, res, _next) => {
  res.status(500).json({
    error: err.message,
    stack: err.stack
  });
});

app.listen(PORT, () => {
  console.log(`[FullStackTarget] Running on port ${PORT}`);
  console.log("[FullStackTarget] WARNING: This app is intentionally insecure. Demo use only.");
});
