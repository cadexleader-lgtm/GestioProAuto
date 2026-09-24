import { describe, it, expect, beforeEach } from "vitest";
import {
  db, isRentalOverdue, rentalContractedAmount,
  signedRevenueInRange, cashFlowInRange, creditOutstandingTotal, creditPaymentsInRange,
} from "./demo-store";

// Source-unique functions (roadmap item 17) — régression sur les 2 vrais bugs
// déjà trouvés une fois (virements internes gonflant la trésorerie, crédit
// compté en double dans le CA). Ces fonctions dérivent du store local
// (db.upsertLocal), pas d'appel réseau : sûr à tester sans Supabase live.

describe("isRentalOverdue", () => {
  it("is false for a non-active rental even with a past end date", () => {
    expect(isRentalOverdue({ status: "returned", endDate: "2020-01-01" } as any)).toBe(false);
  });
  it("is true for an active rental whose end date has passed", () => {
    expect(isRentalOverdue({ status: "active", endDate: "2020-01-01" } as any)).toBe(true);
  });
  it("is false for an active rental whose end date is in the future", () => {
    const future = new Date(Date.now() + 7 * 86400000).toISOString();
    expect(isRentalOverdue({ status: "active", endDate: future } as any)).toBe(false);
  });
});

describe("rentalContractedAmount", () => {
  it("multiplies day count by the daily rate", () => {
    expect(rentalContractedAmount({ startDate: "2026-01-01", endDate: "2026-01-04", dailyRate: 10000 })).toBe(30000);
  });
  it("floors at 1 day minimum (same-day rental)", () => {
    expect(rentalContractedAmount({ startDate: "2026-01-01", endDate: "2026-01-01", dailyRate: 10000 })).toBe(10000);
  });
});

describe("signedRevenueInRange / cashFlowInRange (item 17 regressions)", () => {
  beforeEach(() => {
    db.upsertLocal("vehicleSales", { id: "s1", vehicleId: "v1", customer: "A", amount: 5_000_000, date: "2026-06-10", payment: "cash", status: "done" } as any);
    db.upsertLocal("rentals", { id: "r1", vehicleId: "v1", customer: "B", startDate: "2026-06-01", endDate: "2026-06-05", dailyRate: 20_000, status: "active" } as any);
    db.upsertLocal("cash", { id: "m1", type: "in", label: "Vente A", amount: 5_000_000, date: "2026-06-10", source: "Cash" } as any);
    db.upsertLocal("cash", { id: "m2", type: "out", label: "Virement interne", amount: 1_000_000, date: "2026-06-11", source: "Banque", sourceType: "manual_cash_transfer" } as any);
    db.upsertLocal("cash", { id: "m3", type: "in", label: "Virement interne", amount: 1_000_000, date: "2026-06-11", source: "Wave", sourceType: "manual_cash_transfer" } as any);
  });

  const inJune = (d: string) => d.startsWith("2026-06");

  it("signedRevenueInRange sums sale amount + rental contracted amount, once each", () => {
    const { saleRevenue, rentalRevenue, total } = signedRevenueInRange(inJune);
    expect(saleRevenue).toBe(5_000_000);
    expect(rentalRevenue).toBe(80_000); // 4 days * 20 000
    expect(total).toBe(5_080_000);
  });

  it("cashFlowInRange excludes internal transfers from cashIn/cashOut", () => {
    const { cashIn, cashOut, net } = cashFlowInRange(inJune);
    expect(cashIn).toBe(5_000_000); // m3 (transfer) excluded
    expect(cashOut).toBe(0);        // m2 (transfer) excluded
    expect(net).toBe(5_000_000);
  });
});

describe("creditOutstandingTotal / creditPaymentsInRange", () => {
  beforeEach(() => {
    db.upsertLocal("vehicleCredits", { id: "c1", vehicleId: "v1", customer: "C", total: 3_000_000, downPayment: 500_000, nextDueDate: "2026-07-01", status: "ok" } as any);
    db.upsertLocal("vehiclePayments", { id: "p1", creditId: "c1", amount: 500_000, date: "2026-06-15", method: "Cash" } as any);
  });

  it("outstanding = total - downPayment - payments, never negative", () => {
    expect(creditOutstandingTotal()).toBe(3_000_000 - 500_000 - 500_000);
  });

  it("creditPaymentsInRange sums payments in range only (informative, not added to signed revenue)", () => {
    expect(creditPaymentsInRange((d) => d.startsWith("2026-06"))).toBe(500_000);
    expect(creditPaymentsInRange((d) => d.startsWith("2026-07"))).toBe(0);
  });
});
