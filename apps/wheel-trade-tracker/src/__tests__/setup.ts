import { vi } from "vitest";

// Silence console.error in tests unless explicitly needed
vi.spyOn(console, "error").mockImplementation(() => {});

// Prisma enums aren't available from the pnpm-shared @prisma/client in the
// monorepo (the shared client isn't generated against this app's schema).
// Provide them globally so routes that call Object.values(SomeEnum) work in tests.
vi.mock("@prisma/client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@prisma/client")>();
  return {
    ...actual,
    CloseReason: {
      manual:           "manual",
      expiredWorthless: "expiredWorthless",
      assigned:         "assigned",
    },
    TradeType: {
      Put:           "Put",
      Call:          "Call",
      CoveredCall:   "CoveredCall",
      CashSecuredPut: "CashSecuredPut",
    },
    TradeStatus: { open: "open", closed: "closed" },
    LotStatus:   { OPEN: "OPEN", CLOSED: "CLOSED" },
    TransactionType: {
      deposit:    "deposit",
      withdrawal: "withdrawal",
    },
  };
});
