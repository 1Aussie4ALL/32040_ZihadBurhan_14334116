import type { InsuranceType } from "@/types";

// Secondary feature (section 17) — purely informational and simulated. No real
// insurance database is contacted; figures are illustrative demo data only.

export const INSURANCE_OPTIONS: { value: InsuranceType; label: string; description: string }[] = [
  { value: "medicare", label: "Medicare", description: "I have a current Medicare card." },
  { value: "private", label: "Private health insurance", description: "I have private hospital or extras cover." },
  { value: "self_funded", label: "Self-funded", description: "I'll pay for this appointment myself." },
  { value: "unsure", label: "Not sure", description: "I'm not sure, or I'd like to check at the clinic." },
];

const STANDARD_CONSULT_FEE = 85;
const MEDICARE_REBATE = 41.4;

export interface MockPricing {
  consultFee: number;
  rebate: number | null;
  outOfPocket: number;
  note: string;
}

export function getMockPricing(insuranceType: InsuranceType | null): MockPricing {
  switch (insuranceType) {
    case "medicare":
      return {
        consultFee: STANDARD_CONSULT_FEE,
        rebate: MEDICARE_REBATE,
        outOfPocket: Number((STANDARD_CONSULT_FEE - MEDICARE_REBATE).toFixed(2)),
        note: "Estimated Medicare rebate shown for a standard consultation. Longer or after-hours consultations may cost more.",
      };
    case "private":
      return {
        consultFee: STANDARD_CONSULT_FEE,
        rebate: null,
        outOfPocket: STANDARD_CONSULT_FEE,
        note: "GP consultations are not typically covered by private hospital or extras cover. A Medicare rebate may still apply — ask at the clinic.",
      };
    case "self_funded":
      return {
        consultFee: STANDARD_CONSULT_FEE,
        rebate: null,
        outOfPocket: STANDARD_CONSULT_FEE,
        note: "Full fee payable at the time of consultation.",
      };
    default:
      return {
        consultFee: STANDARD_CONSULT_FEE,
        rebate: null,
        outOfPocket: STANDARD_CONSULT_FEE,
        note: "Estimated standard consultation fee. Your eligibility for a rebate can be confirmed at the clinic.",
      };
  }
}

export const PRICING_DISCLAIMER =
  "These figures are simulated for demonstration only. Final fees and rebate eligibility should be confirmed directly with the healthcare provider.";
