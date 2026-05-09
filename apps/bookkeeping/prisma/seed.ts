import { prisma } from "../src/server/prisma";
import { authPrisma } from "@hlf/auth-db";

async function main() {
  const user = await authPrisma.user.findUnique({ where: { username: "admin" } });

  if (!user) {
    console.log("⚠️  Admin user not found in auth DB.");
    process.exit(1);
  }

  console.log(`👤 Found user: ${user.username}`);

  await prisma.bookkeepingEntry.deleteMany({ where: { userId: user.id } });
  await prisma.bookkeepingMonthNote.deleteMany({ where: { userId: user.id } });
  await prisma.bookkeepingSettings.deleteMany({ where: { userId: user.id } });
  console.log("🧹 Cleared existing bookkeeping data");

  // Settings — pull trading P&L from all portfolios
  await prisma.bookkeepingSettings.create({
    data: { userId: user.id, tradingPortfolios: "all" },
  });

  // ── Recurring entries (monthly amounts) ──────────────────────────────────────

  await prisma.bookkeepingEntry.createMany({
    data: [
      {
        userId: user.id,
        type: "income",
        name: "Day Job Salary",
        category: "Salary",
        amount: 9200,
        description: "Monthly W-2 salary after pre-tax deductions",
        date: new Date("2025-01-01"),
        source: "manual",
        recurring: true,
      },
      {
        userId: user.id,
        type: "income",
        name: "HLF Blog — Subscribers",
        category: "Blog Subscribers",
        amount: 320,
        description: "Monthly recurring blog + newsletter revenue",
        date: new Date("2025-01-01"),
        source: "manual",
        recurring: true,
      },
      {
        userId: user.id,
        type: "expense",
        name: "Software & Tools",
        category: "Software & Subscriptions",
        amount: 485,
        description: "Adobe CC, GitHub, Notion, Linear, Vercel, Railway, misc SaaS",
        date: new Date("2025-01-01"),
        source: "manual",
        recurring: true,
      },
      {
        userId: user.id,
        type: "expense",
        name: "Home Office & Internet",
        category: "Home Office & Utilities",
        amount: 295,
        description: "Internet, electricity allocation, office supplies budget",
        date: new Date("2025-01-01"),
        source: "manual",
        recurring: true,
      },
    ],
  });
  console.log("🔁 Created 4 recurring entries");

  // ── One-time income entries ───────────────────────────────────────────────────

  await prisma.bookkeepingEntry.createMany({
    data: [
      // 2025 — consulting & freelance income
      {
        userId: user.id,
        type: "income",
        name: "RetailCo — Architecture Review",
        category: "Consulting",
        amount: 5200,
        description: "3-day on-site architecture review and recommendations",
        date: new Date("2025-01-22"),
        source: "manual",
        recurring: false,
      },
      {
        userId: user.id,
        type: "income",
        name: "Frontend Redesign — HealthApp",
        category: "Freelance",
        amount: 3400,
        description: "Next.js migration and UI refresh, 3-week contract",
        date: new Date("2025-03-14"),
        source: "manual",
        recurring: false,
      },
      {
        userId: user.id,
        type: "income",
        name: "Wheel Strategy — Q1 P&L",
        category: "Trading Profits",
        amount: 2150,
        description: "CSP/CC premiums collected Q1 2025",
        date: new Date("2025-03-31"),
        source: "manual",
        recurring: false,
      },
      {
        userId: user.id,
        type: "income",
        name: "LogisticsCo — API Integration",
        category: "Consulting",
        amount: 4800,
        description: "Stripe + Shippo payment/shipping API integration",
        date: new Date("2025-06-05"),
        source: "manual",
        recurring: false,
      },
      {
        userId: user.id,
        type: "income",
        name: "Wheel Strategy — Q2 P&L",
        category: "Trading Profits",
        amount: 2340,
        description: "CSP/CC premiums collected Q2 2025",
        date: new Date("2025-06-30"),
        source: "manual",
        recurring: false,
      },
      {
        userId: user.id,
        type: "income",
        name: "Dashboard Rebuild — SaaS Co",
        category: "Freelance",
        amount: 2900,
        description: "React dashboard + data visualization, 2-week sprint",
        date: new Date("2025-08-18"),
        source: "manual",
        recurring: false,
      },
      {
        userId: user.id,
        type: "income",
        name: "FinTech Startup — Tech Lead",
        category: "Consulting",
        amount: 6100,
        description: "Interim tech lead engagement, 4-week contract",
        date: new Date("2025-09-08"),
        source: "manual",
        recurring: false,
      },
      {
        userId: user.id,
        type: "income",
        name: "Wheel Strategy — Q3 P&L",
        category: "Trading Profits",
        amount: 1920,
        description: "CSP/CC premiums collected Q3 2025",
        date: new Date("2025-09-30"),
        source: "manual",
        recurring: false,
      },
      {
        userId: user.id,
        type: "income",
        name: "E-commerce Platform — Performance Audit",
        category: "Freelance",
        amount: 3750,
        description: "Core Web Vitals audit + remediation, Next.js + Vercel",
        date: new Date("2025-10-21"),
        source: "manual",
        recurring: false,
      },
      {
        userId: user.id,
        type: "income",
        name: "Wheel Strategy — Oct P&L",
        category: "Trading Profits",
        amount: 1200,
        description: "CSP premiums — light month, conservative positioning",
        date: new Date("2025-11-01"),
        source: "manual",
        recurring: false,
      },
      {
        userId: user.id,
        type: "income",
        name: "Wheel Strategy — Nov & Dec P&L",
        category: "Trading Profits",
        amount: 2960,
        description: "AAPL/MSFT/NVDA/META CSPs expired worthless",
        date: new Date("2025-12-31"),
        source: "manual",
        recurring: false,
      },
      // 2026 — trading P&L
      {
        userId: user.id,
        type: "income",
        name: "Wheel Strategy — Jan 2026",
        category: "Trading Profits",
        amount: 1390,
        description: "Jan CSP premiums (AAPL/MSFT assigned, other CSPs captured)",
        date: new Date("2026-01-31"),
        source: "manual",
        recurring: false,
      },
      {
        userId: user.id,
        type: "income",
        name: "Wheel Strategy — Feb 2026",
        category: "Trading Profits",
        amount: 2040,
        description: "AMZN/TSLA assigned + MSFT/AAPL CC premiums",
        date: new Date("2026-02-28"),
        source: "manual",
        recurring: false,
      },
      {
        userId: user.id,
        type: "income",
        name: "Wheel Strategy — Mar 2026",
        category: "Trading Profits",
        amount: 2830,
        description: "All four CC positions expired worthless + GOOGL CSP",
        date: new Date("2026-03-31"),
        source: "manual",
        recurring: false,
      },
      {
        userId: user.id,
        type: "income",
        name: "Wheel Strategy — Apr 2026",
        category: "Trading Profits",
        amount: 4520,
        description: "MSFT called away ($3,380 lot P&L), AMZN called away ($4,580), META/GOOGL CSPs expired",
        date: new Date("2026-04-30"),
        source: "manual",
        recurring: false,
      },
      {
        userId: user.id,
        type: "income",
        name: "Infrastructure Modernization — MedTech",
        category: "Consulting",
        amount: 7200,
        description: "AWS → Railway migration + CI/CD pipeline redesign",
        date: new Date("2026-03-20"),
        source: "manual",
        recurring: false,
      },
    ],
  });
  console.log("💰 Created one-time income entries");

  // ── One-time expense entries ──────────────────────────────────────────────────

  await prisma.bookkeepingEntry.createMany({
    data: [
      // 2025
      {
        userId: user.id,
        type: "expense",
        name: "M3 MacBook Pro 14\" — Primary Dev Machine",
        category: "Technology & Hardware",
        amount: 2149,
        description: "Replacing 5-year-old MBP — business critical",
        date: new Date("2025-01-12"),
        source: "manual",
        recurring: false,
      },
      {
        userId: user.id,
        type: "expense",
        name: "Keyboard + Trackpad + Hub",
        category: "Technology & Hardware",
        amount: 580,
        description: "Keychron Q5, Magic Trackpad, Anker USB-C hub",
        date: new Date("2025-02-08"),
        source: "manual",
        recurring: false,
      },
      {
        userId: user.id,
        type: "expense",
        name: "Annual Developer Tools Bundle",
        category: "Software & Subscriptions",
        amount: 299,
        description: "Sketch + Cleanshot annual licenses",
        date: new Date("2025-04-02"),
        source: "manual",
        recurring: false,
      },
      {
        userId: user.id,
        type: "expense",
        name: "27\" 4K Monitor",
        category: "Technology & Hardware",
        amount: 940,
        description: "LG 27UL850 — second monitor for home office",
        date: new Date("2025-06-17"),
        source: "manual",
        recurring: false,
      },
      {
        userId: user.id,
        type: "expense",
        name: "Office Furniture",
        category: "Office Supplies",
        amount: 385,
        description: "Standing desk mat, monitor arm, cable management",
        date: new Date("2025-08-09"),
        source: "manual",
        recurring: false,
      },
      {
        userId: user.id,
        type: "expense",
        name: "iPad Pro + Pencil",
        category: "Technology & Hardware",
        amount: 1180,
        description: "For client presentations and wireframing",
        date: new Date("2025-09-24"),
        source: "manual",
        recurring: false,
      },
      {
        userId: user.id,
        type: "expense",
        name: "Professional Development",
        category: "Other Expense",
        amount: 320,
        description: "React Summit conference ticket",
        date: new Date("2025-10-14"),
        source: "manual",
        recurring: false,
      },
      {
        userId: user.id,
        type: "expense",
        name: "Stationery & Desk Supplies",
        category: "Office Supplies",
        amount: 95,
        description: "Notebooks, pens, label maker supplies",
        date: new Date("2025-11-05"),
        source: "manual",
        recurring: false,
      },
      {
        userId: user.id,
        type: "expense",
        name: "Year-End Equipment Refresh",
        category: "Technology & Hardware",
        amount: 1480,
        description: "NAS storage + external SSDs for project backups",
        date: new Date("2025-12-12"),
        source: "manual",
        recurring: false,
      },
      // 2026
      {
        userId: user.id,
        type: "expense",
        name: "Annual SaaS Renewals",
        category: "Software & Subscriptions",
        amount: 349,
        description: "Linear annual plan + 1Password Teams",
        date: new Date("2026-01-08"),
        source: "manual",
        recurring: false,
      },
      {
        userId: user.id,
        type: "expense",
        name: "Ergonomic Chair",
        category: "Office Supplies",
        amount: 645,
        description: "Herman Miller Aeron — long overdue upgrade",
        date: new Date("2026-02-14"),
        source: "manual",
        recurring: false,
      },
      {
        userId: user.id,
        type: "expense",
        name: "AirPods Pro 2 — Work Calls",
        category: "Technology & Hardware",
        amount: 249,
        description: "Replacing 3-year-old AirPods",
        date: new Date("2026-03-03"),
        source: "manual",
        recurring: false,
      },
      {
        userId: user.id,
        type: "expense",
        name: "Cloud Hosting — Overage Charge",
        category: "Software & Subscriptions",
        amount: 187,
        description: "Vercel bandwidth overage from client demo traffic spike",
        date: new Date("2026-04-08"),
        source: "manual",
        recurring: false,
      },
      {
        userId: user.id,
        type: "expense",
        name: "CPA — Tax Prep Fee",
        category: "Other Expense",
        amount: 480,
        description: "Annual tax preparation including Schedule C and SE",
        date: new Date("2026-04-15"),
        source: "manual",
        recurring: false,
      },
    ],
  });
  console.log("💸 Created one-time expense entries");

  // ── Month notes ───────────────────────────────────────────────────────────────

  await prisma.bookkeepingMonthNote.createMany({
    data: [
      {
        userId: user.id,
        yearMonth: "2025-09",
        notes: "Strong month. The FinTech interim contract closed at $6,100 — best single consulting engagement of the year. Wheel strategy Q3 was lighter than expected ($1,920) due to the August IV compression. Recurring income steady as always.\n\nStarting to track the blog subscriber revenue separately. It's growing slowly but consistently.",
      },
      {
        userId: user.id,
        yearMonth: "2025-12",
        notes: "Closed out 2025 strong. Full-year trading P&L was solid — wheel strategy continues to deliver. The NVDA and META CSPs expired nicely in Dec.\n\nYear-end equipment refresh for the NAS — good deduction. Planning to formalize the consulting side as an LLC in 2026.",
      },
      {
        userId: user.id,
        yearMonth: "2026-04",
        notes: "Best trading month yet. MSFT full cycle complete: assigned → 2 CC cycles → called away at $415. AMZN same story. Total wheel P&L for April: ~$4,520.\n\nPaid CPA for tax prep. SE income was meaningful this year — the Freelance/Consulting categories add up. Need to track estimated quarterly payments more carefully in 2026.",
      },
    ],
    skipDuplicates: true,
  });
  console.log("📝 Created 3 month notes");
}

main()
  .then(() => {
    console.log("🌱 Seed completed.");
    process.exit(0);
  })
  .catch((err) => {
    console.error("❌ Seed failed:", err);
    process.exit(1);
  });
