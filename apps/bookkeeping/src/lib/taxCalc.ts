// Tax estimation for: Married Filing Jointly, San Diego CA, 1 dependent
// Trading income = ordinary income (short-term capital gains), NOT subject to SE tax
// Business income = subject to SE tax (15.3% / 2.9%)
// 2025: IRS Rev. Proc. 2024-40 (federal), FTB 2025 Form 540 (CA)
// 2026: IRS Rev. Proc. 2025-32 + OBBBA permanent TCJA extensions (federal), FTB/EDD 2026 schedules (CA)

export type TaxYear = 2025 | 2026;

interface YearParams {
  // Federal
  federalStandardDeduction: number;
  federalBrackets: Array<{ rate: number; upTo: number }>;
  childTaxCreditPerChild: number;
  childTaxCreditPhaseOutStart: number; // AGI above which credit phases out ($50 per $1k)
  niitThreshold: number; // Net Investment Income Tax kicks in above this AGI (MFJ)
  niitRate: number;
  seSsWageBase: number; // Social Security wage base for SE tax
  // California
  caStandardDeduction: number;
  caBrackets: Array<{ rate: number; upTo: number }>;
  caPersonalExemptionCredit: number; // MFJ credit
  caDependentExemptionCredit: number; // per dependent
}

const TAX_PARAMS: Record<TaxYear, YearParams> = {
  2025: {
    federalStandardDeduction: 30000,
    federalBrackets: [
      { rate: 0.10, upTo: 23850 },
      { rate: 0.12, upTo: 96950 },
      { rate: 0.22, upTo: 206700 },
      { rate: 0.24, upTo: 394600 },
      { rate: 0.32, upTo: 501050 },
      { rate: 0.35, upTo: 751600 },
      { rate: 0.37, upTo: Infinity },
    ],
    childTaxCreditPerChild: 2000,
    childTaxCreditPhaseOutStart: 400000,
    niitThreshold: 250000,
    niitRate: 0.038,
    seSsWageBase: 176100,
    caStandardDeduction: 11412, // FTB 2025 Form 540 (MFJ)
    caBrackets: [
      { rate: 0.01, upTo: 20824 },
      { rate: 0.02, upTo: 49368 },
      { rate: 0.04, upTo: 77918 },
      { rate: 0.06, upTo: 108162 },
      { rate: 0.08, upTo: 136700 },
      { rate: 0.093, upTo: 698274 },
      { rate: 0.103, upTo: 837922 },
      { rate: 0.113, upTo: 1000000 },
      { rate: 0.123, upTo: Infinity },
    ],
    caPersonalExemptionCredit: 444,
    caDependentExemptionCredit: 433,
  },
  // 2026: IRS Rev. Proc. 2025-32 (federal); OBBBA raised CTC to $2,200 and made TCJA permanent
  2026: {
    federalStandardDeduction: 32200, // IRS RP 2025-32 (MFJ)
    federalBrackets: [
      { rate: 0.10, upTo: 24800 },
      { rate: 0.12, upTo: 100800 },
      { rate: 0.22, upTo: 211400 },
      { rate: 0.24, upTo: 403550 },
      { rate: 0.32, upTo: 512450 },
      { rate: 0.35, upTo: 768700 },
      { rate: 0.37, upTo: Infinity },
    ],
    childTaxCreditPerChild: 2200, // OBBBA increased from $2,000; inflation-indexed going forward
    childTaxCreditPhaseOutStart: 400000,
    niitThreshold: 250000,
    niitRate: 0.038,
    seSsWageBase: 184500, // SSA 2026 announcement
    caStandardDeduction: 11700, // FTB 2026 (~2.5% CCPI adjustment from 2025)
    caBrackets: [
      { rate: 0.01, upTo: 22158 },
      { rate: 0.02, upTo: 52528 },
      { rate: 0.04, upTo: 82904 },
      { rate: 0.06, upTo: 115084 },
      { rate: 0.08, upTo: 145448 },
      { rate: 0.093, upTo: 742958 },
      { rate: 0.103, upTo: 891542 },
      { rate: 0.113, upTo: 1485906 },
      { rate: 0.123, upTo: Infinity },
    ],
    caPersonalExemptionCredit: 457, // ~3% inflation from 2025
    caDependentExemptionCredit: 463, // FTB 2026
  },
};

function calcTax(income: number, brackets: Array<{ rate: number; upTo: number }>): number {
  let tax = 0;
  let prev = 0;
  for (const bracket of brackets) {
    if (income <= prev) break;
    const inBracket = Math.min(income, bracket.upTo) - prev;
    tax += inBracket * bracket.rate;
    prev = bracket.upTo;
  }
  return Math.max(0, tax);
}

export interface TaxInput {
  year: TaxYear;
  tradingIncome: number;    // wheel strategy premiums — ordinary income, NOT SE taxed
  businessIncome: number;   // from "Business Income" category — SE taxed
  otherIncome: number;      // other manual income entries — ordinary income, NOT SE taxed
  businessExpenses: number; // all expense entries — deductible
}

export interface TaxResult {
  // Income
  totalGrossIncome: number;
  businessExpenses: number;
  netIncome: number;

  // SE tax (on business income only)
  netSeIncome: number;
  selfEmploymentTax: number;
  selfEmploymentDeduction: number; // 50% of SE tax deducted from AGI

  // Federal
  agi: number;
  federalStandardDeduction: number;
  federalTaxableIncome: number;
  federalIncomeTax: number;
  childTaxCredit: number;
  niit: number; // Net Investment Income Tax (3.8%)
  netFederalTax: number;

  // California
  caStandardDeduction: number;
  caTaxableIncome: number;
  caGrossTax: number;
  caExemptionCredit: number;
  netCaTax: number;

  // Summary
  totalEstimatedTax: number;
  effectiveTaxRate: number; // vs net income
  recommendedReserveRate: number;
  quarterlyPayment: number;
}

export function estimateTax(input: TaxInput): TaxResult {
  const p = TAX_PARAMS[input.year];
  const numDependents = 1;

  // ── Income ────────────────────────────────────────────────────────────────
  const totalGrossIncome = input.tradingIncome + input.businessIncome + input.otherIncome;
  const netIncome = Math.max(0, totalGrossIncome - input.businessExpenses);

  // ── SE Tax (on business income, after allocating expenses proportionally) ─
  // Simplification: allocate expenses pro-rata to business income portion
  const businessFraction = totalGrossIncome > 0 ? input.businessIncome / totalGrossIncome : 0;
  const allocatedExpenses = input.businessExpenses * businessFraction;
  const netSeIncome = Math.max(0, input.businessIncome - allocatedExpenses);
  // SE tax: 15.3% on 92.35% of net SE income (up to SS wage base), then 2.9% above
  const seBase = netSeIncome * 0.9235;
  const seSsTax = Math.min(seBase, p.seSsWageBase) * 0.153;
  const seMedicareTax = Math.max(0, seBase - p.seSsWageBase) * 0.029;
  const selfEmploymentTax = seSsTax + seMedicareTax;
  const selfEmploymentDeduction = selfEmploymentTax * 0.5;

  // ── Federal ───────────────────────────────────────────────────────────────
  const agi = Math.max(0, netIncome - selfEmploymentDeduction);
  const federalTaxableIncome = Math.max(0, agi - p.federalStandardDeduction);
  const federalIncomeTax = calcTax(federalTaxableIncome, p.federalBrackets);

  // Child Tax Credit: $2,000 per child, phases out $50/$1k over threshold
  const phaseOutExcess = Math.max(0, agi - p.childTaxCreditPhaseOutStart);
  const creditReduction = Math.floor(phaseOutExcess / 1000) * 50;
  const grossChildCredit = numDependents * p.childTaxCreditPerChild;
  const childTaxCredit = Math.max(0, Math.min(grossChildCredit - creditReduction, federalIncomeTax));

  // Net Investment Income Tax: 3.8% on lesser of (investment income) or (AGI - threshold)
  // Trading income is investment income; business income is not
  const investmentIncome = input.tradingIncome;
  const niitBase = Math.max(0, Math.min(investmentIncome, agi - p.niitThreshold));
  const niit = niitBase > 0 ? niitBase * p.niitRate : 0;

  const netFederalTax = Math.max(0, federalIncomeTax - childTaxCredit) + selfEmploymentTax + niit;

  // ── California ────────────────────────────────────────────────────────────
  // CA does NOT have SE tax (that's federal only)
  // CA personal exemption credit (MFJ) + dependent exemption credits
  const caTaxableIncome = Math.max(0, netIncome - p.caStandardDeduction);
  const caGrossTax = calcTax(caTaxableIncome, p.caBrackets);
  const caExemptionCredit = p.caPersonalExemptionCredit + (numDependents * p.caDependentExemptionCredit);
  const netCaTax = Math.max(0, caGrossTax - caExemptionCredit);

  // ── Summary ───────────────────────────────────────────────────────────────
  const totalEstimatedTax = netFederalTax + netCaTax;
  const effectiveTaxRate = netIncome > 0 ? totalEstimatedTax / netIncome : 0;
  // Reserve rate = effective rate + 10% buffer (e.g. 9.7% → 10.7%)
  const recommendedReserveRate = effectiveTaxRate * 1.1;
  const quarterlyPayment = totalEstimatedTax / 4;

  return {
    totalGrossIncome,
    businessExpenses: input.businessExpenses,
    netIncome,
    netSeIncome,
    selfEmploymentTax,
    selfEmploymentDeduction,
    agi,
    federalStandardDeduction: p.federalStandardDeduction,
    federalTaxableIncome,
    federalIncomeTax,
    childTaxCredit,
    niit,
    netFederalTax,
    caStandardDeduction: p.caStandardDeduction,
    caTaxableIncome,
    caGrossTax,
    caExemptionCredit,
    netCaTax,
    totalEstimatedTax,
    effectiveTaxRate,
    recommendedReserveRate,
    quarterlyPayment,
  };
}

export function getQuarterlyDates(year: TaxYear): Array<{ label: string; date: string }> {
  return [
    { label: "Q1", date: `April 15, ${year}` },
    { label: "Q2", date: `June 16, ${year}` },
    { label: "Q3", date: `September 15, ${year}` },
    { label: "Q4", date: `January 15, ${year + 1}` },
  ];
}

export const SUPPORTED_YEARS: TaxYear[] = [2025, 2026];
