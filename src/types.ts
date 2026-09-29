export type EmploymentType = 'employed' | 'self-employed'

export interface RetirementInput {
  // 기본 정보
  currentAge: number
  retirementAge: number
  lifeExpectancy: number

  // 소득 (만원/월)
  monthlyGrossIncome: number      // 세전 월 소득
  annualIncomeGrowthRate: number  // 연 소득 인상률 (%)
  monthlyOtherIncome: number      // 기타 소득 (세후, 부업 등)
  employmentType: EmploymentType

  // 지출 (만원/월)
  monthlyExpenses: number           // 현재 월 생활비
  retirementMonthlyExpenses: number // 은퇴 후 월 생활비
  inflationRate: number             // 물가 상승률 (%)

  // 자산 (만원)
  currentFinancialAssets: number  // 현재 금융 자산 (저축+투자)
  monthlySavings: number          // 소득 외 월 추가 납입액 (만원) - 세후소득 - 생활비는 자동 저축됨
  monthlyRentalIncome: number     // 부동산 임대 수익 (만원/월)

  // 투자 수익률 (%)
  preRetirementReturnRate: number  // 은퇴 전 투자 수익률
  postRetirementReturnRate: number // 은퇴 후 투자 수익률 (보수적)

  // 연금 (만원/월)
  nationalPensionMonthly: number   // 국민연금 예상 월 수령액
  nationalPensionStartAge: number  // 국민연금 수령 시작 나이
  retirementPensionLump: number    // 퇴직연금 일시금 (만원)
  privatePensionMonthly: number    // 개인연금 월 수령액
  privatePensionStartAge: number   // 개인연금 수령 시작 나이
}

export interface YearlyData {
  age: number
  portfolio: number           // 만원
  annualIncome: number        // 만원
  annualExpenses: number      // 만원
  annualSavings: number       // 만원 (음수면 적자)
  investmentReturn: number    // 만원
  phase: 'accumulation' | 'retirement'
  // 은퇴 후 추가 정보
  pensionIncome?: number
  rentalIncome?: number
  portfolioWithdrawal?: number
  healthInsurance?: number    // 만원 (지역가입자 건강보험 + 장기요양)
  netTax?: number
  isAssetsDepleted?: boolean
}

export interface Deductions {
  incomeTax: number           // 소득세 (원)
  localIncomeTax: number      // 지방소득세 (원)
  nationalPension: number     // 국민연금 (원)
  healthInsurance: number     // 건강보험 (원)
  longTermCare: number        // 장기요양보험 (원)
  employmentInsurance: number // 고용보험 (원)
  total: number               // 총 공제액 (원)
}

export type AssessmentLevel = 'stable' | 'caution' | 'danger'

export interface SimulationResult {
  yearlyData: YearlyData[]
  retirementPortfolio: number    // 은퇴 시점 자산 (만원)
  assetDepletionAge: number | null
  finalPortfolio: number         // 기대 수명 시점 자산 (만원)
  isStable: boolean
  assessment: AssessmentLevel
  // 은퇴 후 월 수령액 분석 (은퇴 첫 해 기준)
  monthlyPension: number
  monthlyRental: number
  monthlyPortfolioIncome: number
  monthlyTotalIncome: number
  monthlyExpenseAtRetirement: number
  monthlyHealthInsurance: number // 은퇴 후 건강보험료 (지역가입자 추정)
  monthlyShortfall: number // 부족분 (양수면 초과, 음수면 부족)
  // 추가 저축 필요액
  additionalMonthlySavingsNeeded: number
  retirementDelayNeeded: number | null // 안정에 필요한 최소 은퇴 연기 연수 (불가능하면 null)
}
