import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const WHEEL_UNIVERSE = [
  { symbol: "AAPL", name: "Apple Inc.", sector: "Technology" },
  { symbol: "MSFT", name: "Microsoft Corporation", sector: "Technology" },
  { symbol: "GOOGL", name: "Alphabet Inc.", sector: "Technology" },
  { symbol: "AMZN", name: "Amazon.com Inc.", sector: "Consumer Discretionary" },
  { symbol: "NVDA", name: "NVIDIA Corporation", sector: "Technology" },
  { symbol: "META", name: "Meta Platforms Inc.", sector: "Technology" },
  { symbol: "TSLA", name: "Tesla Inc.", sector: "Consumer Discretionary" },
  { symbol: "JPM", name: "JPMorgan Chase & Co.", sector: "Financials" },
  { symbol: "V", name: "Visa Inc.", sector: "Financials" },
  { symbol: "MA", name: "Mastercard Inc.", sector: "Financials" },
  { symbol: "UNH", name: "UnitedHealth Group Inc.", sector: "Healthcare" },
  { symbol: "JNJ", name: "Johnson & Johnson", sector: "Healthcare" },
  { symbol: "PFE", name: "Pfizer Inc.", sector: "Healthcare" },
  { symbol: "ABBV", name: "AbbVie Inc.", sector: "Healthcare" },
  { symbol: "AMD", name: "Advanced Micro Devices Inc.", sector: "Technology" },
  { symbol: "INTC", name: "Intel Corporation", sector: "Technology" },
  { symbol: "CRM", name: "Salesforce Inc.", sector: "Technology" },
  { symbol: "ORCL", name: "Oracle Corporation", sector: "Technology" },
  { symbol: "NFLX", name: "Netflix Inc.", sector: "Communication Services" },
  { symbol: "DIS", name: "The Walt Disney Company", sector: "Communication Services" },
  { symbol: "COST", name: "Costco Wholesale Corporation", sector: "Consumer Staples" },
  { symbol: "WMT", name: "Walmart Inc.", sector: "Consumer Staples" },
  { symbol: "KO", name: "The Coca-Cola Company", sector: "Consumer Staples" },
  { symbol: "PEP", name: "PepsiCo Inc.", sector: "Consumer Staples" },
  { symbol: "XOM", name: "Exxon Mobil Corporation", sector: "Energy" },
  { symbol: "CVX", name: "Chevron Corporation", sector: "Energy" },
  { symbol: "BAC", name: "Bank of America Corporation", sector: "Financials" },
  { symbol: "GS", name: "The Goldman Sachs Group Inc.", sector: "Financials" },
  { symbol: "SPY", name: "SPDR S&P 500 ETF Trust", sector: "ETF" },
  { symbol: "QQQ", name: "Invesco QQQ Trust", sector: "ETF" },
];

async function main() {
  console.log("Seeding wheel universe...");

  for (const ticker of WHEEL_UNIVERSE) {
    await prisma.ticker.upsert({
      where: { symbol: ticker.symbol },
      update: { name: ticker.name, sector: ticker.sector, isApproved: true },
      create: { ...ticker, isApproved: true },
    });
  }

  console.log(`✓ Seeded ${WHEEL_UNIVERSE.length} tickers`);

  // Create admin user (change email/password before production)
  const adminEmail = "admin@hlfinancialstrategies.com";
  const existing = await prisma.user.findUnique({ where: { email: adminEmail } });

  if (!existing) {
    const hashed = await bcrypt.hash("changeme123", 12);
    await prisma.user.create({
      data: {
        email: adminEmail,
        password: hashed,
        name: "Admin",
        role: "ADMIN",
        emailEnabled: true,
      },
    });
    console.log("✓ Created admin user:", adminEmail, "(password: changeme123 — change this!)");
  } else {
    console.log("✓ Admin user already exists");
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
