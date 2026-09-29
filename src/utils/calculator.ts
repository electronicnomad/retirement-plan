import type { RetirementInput, YearlyData, Deductions, SimulationResult } from '../types'

// 2026년 기준 사회보험 요율 (매년 개정되므로 연초에 확인 필요)
const NATIONAL_PENSION_RATE = 0.095 // 국민연금 (직장인은 절반 부담)
const NATIONAL_PENSION_BASE_CAP = 6_590_000 // 국민연금 기준소득월액 상한 (2026.7~)
const HEALTH_INSURANCE_RATE = 0.0719 // 건강보험 (직장인은 절반 부담)
const LONG_TERM_CARE_RATIO = 0.1314 // 장기요양보험료 (건강보험료 대비)
const EMPLOYMENT_INSURANCE_RATE = 0.009 // 고용보험 근로자 부담분
const BASIC_DEDUCTION = 1_500_000 // 기본공제 (본인)
const LOCAL_INCOME_TAX_RATE = 0.1 // 지방소득세 (소득세 대비)

// 근로소득공제 계산 (원 단위)
export function calcWageIncomeDeduction(annualIncome: number): number {
  if (annualIncome <= 5_000_000) return annualIncome * 0.7
  if (annualIncome <= 15_000_000) return 3_500_000 + (annualIncome - 5_000_000) * 0.4
  if (annualIncome <= 45_000_000) return 7_500_000 + (annualIncome - 15_000_000) * 0.15
  if (annualIncome <= 100_000_000) return 12_000_000 + (annualIncome - 45_000_000) * 0.05
  return 14_750_000 + (annualIncome - 100_000_000) * 0.02
}

// 종합소득세 산출 (원 단위, 과세표준 기준)
export function calcIncomeTaxOnTaxBase(taxBase: number): number {
  if (taxBase <= 0) return 0
  if (taxBase <= 14_000_000) return taxBase * 0.06
  if (taxBase <= 50_000_000) return 840_000 + (taxBase - 14_000_000) * 0.15
  if (taxBase <= 88_000_000) return 6_240_000 + (taxBase - 50_000_000) * 0.24
  if (taxBase <= 150_000_000) return 15_360_000 + (taxBase - 88_000_000) * 0.35
  if (taxBase <= 300_000_000) return 37_060_000 + (taxBase - 150_000_000) * 0.38
  if (taxBase <= 500_000_000) return 94_060_000 + (taxBase - 300_000_000) * 0.40
  if (taxBase <= 1_000_000_000) return 174_060_000 + (taxBase - 500_000_000) * 0.42
  return 384_060_000 + (taxBase - 1_000_000_000) * 0.45
}

// 근로소득세액공제 (소득세법 제59조, 원 단위)
export function calcWageTaxCredit(calculatedTax: number, grossAnnual: number): number {
  const credit = calculatedTax <= 1_300_000
    ? calculatedTax * 0.55
    : 715_000 + (calculatedTax - 1_300_000) * 0.3

  let limit: number
  if (grossAnnual <= 33_000_000) limit = 740_000
  else if (grossAnnual <= 70_000_000) limit = Math.max(740_000 - (grossAnnual - 33_000_000) * 0.008, 660_000)
  else if (grossAnnual <= 120_000_000) limit = Math.max(660_000 - (grossAnnual - 70_000_000) * 0.5, 500_000)
  else limit = Math.max(500_000 - (grossAnnual - 120_000_000) * 0.5, 200_000)

  return Math.min(credit, limit)
}

// 직장인 공제 계산
function calcEmployedDeductions(grossMonthlyIncome: number): Deductions {
  const grossAnnual = grossMonthlyIncome * 12 * 10000 // 원 단위

  const npsBase = Math.min(grossMonthlyIncome * 10000, NATIONAL_PENSION_BASE_CAP)
  const nationalPension = npsBase * (NATIONAL_PENSION_RATE / 2) * 12

  const healthInsurance = grossAnnual * (HEALTH_INSURANCE_RATE / 2)
  const longTermCare = healthInsurance * LONG_TERM_CARE_RATIO
  const employmentInsurance = grossAnnual * EMPLOYMENT_INSURANCE_RATE

  // 소득세 계산
  const wageDeduction = calcWageIncomeDeduction(grossAnnual)
  const pensionDeduction = nationalPension // 연금보험료 공제
  // 보험료 특별소득공제 - 이를 적용하면 표준세액공제는 받을 수 없다
  const healthDeduction = healthInsurance + longTermCare

  const taxBase = Math.max(0, grossAnnual - wageDeduction - BASIC_DEDUCTION - pensionDeduction - healthDeduction)
  const calculatedTax = calcIncomeTaxOnTaxBase(taxBase)
  const incomeTax = calculatedTax - calcWageTaxCredit(calculatedTax, grossAnnual)
  const localIncomeTax = incomeTax * LOCAL_INCOME_TAX_RATE

  const total = incomeTax + localIncomeTax + nationalPension + healthInsurance + longTermCare + employmentInsurance

  return {
    incomeTax,
    localIncomeTax,
    nationalPension,
    healthInsurance,
    longTermCare,
    employmentInsurance,
    total,
  }
}

// 자영업자 공제 계산
function calcSelfEmployedDeductions(grossMonthlyIncome: number): Deductions {
  // 필요경비율 30% 가정 (업종마다 다름, 단순화)
  const expenseRate = 0.3
  const businessMonthly = grossMonthlyIncome * 10000 * (1 - expenseRate)
  const businessIncome = businessMonthly * 12

  // 지역가입자는 사업소득 기준으로 전액 본인 부담
  const npsBase = Math.min(businessMonthly, NATIONAL_PENSION_BASE_CAP)
  const nationalPension = npsBase * NATIONAL_PENSION_RATE * 12

  // 지역 건강보험 (재산분은 입력이 없어 생략)
  const healthInsurance = businessIncome * HEALTH_INSURANCE_RATE
  const longTermCare = healthInsurance * LONG_TERM_CARE_RATIO
  const employmentInsurance = 0 // 자영업자 고용보험 없음 (임의가입 제외)

  const taxBase = Math.max(0, businessIncome - nationalPension - BASIC_DEDUCTION)
  const incomeTax = calcIncomeTaxOnTaxBase(taxBase)
  const localIncomeTax = incomeTax * LOCAL_INCOME_TAX_RATE

  const total = incomeTax + localIncomeTax + nationalPension + healthInsurance + longTermCare

  return {
    incomeTax,
    localIncomeTax,
    nationalPension,
    healthInsurance,
    longTermCare,
    employmentInsurance,
    total,
  }
}

// 급여 외 소득(부업·프리랜서)에 붙는 건강보험료 + 장기요양보험료 (원/연)
// 입력이 세후 금액이라 소득금액의 근사치로 쓰고, 사업·기타소득으로 보아 소득평가율 100%를 적용한다.
export function calcOtherIncomeHealthInsurance(monthlyOtherIncome: number, employmentType: string): number {
  const EMPLOYEE_OTHER_INCOME_DEDUCTION = 20_000_000 // 직장가입자 보수 외 소득 공제액 (연)
  const annualOtherIncome = monthlyOtherIncome * 12 * 10000

  // 직장가입자는 2,000만원 초과분에만 소득월액보험료를, 지역가입자는 전액에 소득보험료를 본인이 전액 부담
  const assessedIncome = employmentType === 'self-employed'
    ? annualOtherIncome
    : Math.max(0, annualOtherIncome - EMPLOYEE_OTHER_INCOME_DEDUCTION)
  const healthInsurance = assessedIncome * HEALTH_INSURANCE_RATE
  return healthInsurance * (1 + LONG_TERM_CARE_RATIO)
}

export function calcDeductions(grossMonthlyIncome: number, employmentType: string): Deductions {
  if (employmentType === 'self-employed') {
    return calcSelfEmployedDeductions(grossMonthlyIncome)
  }
  return calcEmployedDeductions(grossMonthlyIncome)
}

// 세후 월 실수령액으로부터 세전 월 소득 역산 (이진 탐색)
export function estimateGrossFromNet(netMonthly: number, employmentType: string): number {
  if (netMonthly <= 0) return 0

  const netFromGross = (gross: number) =>
    gross - calcDeductions(gross, employmentType).total / 12 / 10000

  let low = netMonthly
  let high = netMonthly * 2

  // 실효 공제율이 높아 해가 상한 밖에 있으면 상한을 확장
  const upperLimit = netMonthly * 100
  while (netFromGross(high) < netMonthly && high < upperLimit) {
    high *= 2
  }

  for (let i = 0; i < 50; i++) {
    const mid = (low + high) / 2
    if (netFromGross(mid) < netMonthly) {
      low = mid
    } else {
      high = mid
    }
    if (high - low < 0.1) break
  }

  return Math.round(high)
}

// 은퇴 후 건강보험료 + 장기요양보험료 추정 (지역가입자 기준, 원/연)
// 부동산 재산분은 입력이 없어 생략하고 소득 기준으로만 근사한다.
function calcRetireeHealthInsurance(annualNationalPension: number, annualRentalIncome: number): number {
  const PUBLIC_PENSION_INCOME_RATE = 0.5 // 공적연금 소득 반영률
  const MIN_MONTHLY_PREMIUM = 20_160     // 지역가입자 최소 건강보험료 (월, 2026년)

  // 사적연금과 자산 인출(원금)은 지역가입자 소득 산정에서 제외
  const recognizedIncome = annualNationalPension * PUBLIC_PENSION_INCOME_RATE + annualRentalIncome
  const healthInsurance = Math.max(recognizedIncome * HEALTH_INSURANCE_RATE, MIN_MONTHLY_PREMIUM * 12)
  const longTermCare = healthInsurance * LONG_TERM_CARE_RATIO
  return healthInsurance + longTermCare
}

// 나이 순서 검증 - 순서가 뒤집히면 적립/인출 기간이 음수가 되어 결과가 무의미해진다
export const MAX_RETIREMENT_AGE = 80

export function validateAges(input: RetirementInput): string | null {
  if (input.retirementAge <= input.currentAge) return '은퇴 목표 나이는 현재 나이보다 커야 합니다.'
  if (input.lifeExpectancy <= input.retirementAge) return '기대 수명은 은퇴 목표 나이보다 커야 합니다.'
  return null
}

export function simulate(input: RetirementInput): SimulationResult {
  const result = runSimulation(input)
  const retirementInflationBase = Math.pow(1 + input.inflationRate / 100, input.retirementAge - input.currentAge)
  // 은퇴 첫 해 명목 금액으로 환산해 다른 월 지표와 기준을 맞춘다
  const monthlyShortfall = (findMaxSustainableExpense(input) - input.retirementMonthlyExpenses) * retirementInflationBase
  const additionalMonthlySavingsNeeded = result.isStable ? 0 : findAdditionalSavingsNeeded(input)
  const retirementDelayNeeded = result.isStable ? 0 : findRetirementDelayNeeded(input)
  return { ...result, monthlyShortfall, additionalMonthlySavingsNeeded, retirementDelayNeeded }
}

// 핵심 시뮬레이션 (충족도·조언 계산 제외 - 이진 탐색 함수들과의 상호 재귀 방지)
function runSimulation(input: RetirementInput): SimulationResult {
  const yearsToRetirement = input.retirementAge - input.currentAge
  const yearlyData: YearlyData[] = []

  // 초기 자산 (원 단위로 계산)
  let portfolio = input.currentFinancialAssets * 10000

  // === 적립 단계 (은퇴 전) ===
  for (let i = 0; i < yearsToRetirement; i++) {
    const age = input.currentAge + i
    const inflationFactor = Math.pow(1 + input.inflationRate / 100, i)

    // 소득 (물가 반영 대신 연봉 인상률 반영)
    const grossMonthly = input.monthlyGrossIncome * Math.pow(1 + input.annualIncomeGrowthRate / 100, i)
    const grossAnnual = grossMonthly * 12 * 10000

    // 공제 계산
    const deductions = calcDeductions(grossMonthly, input.employmentType)
    const netAnnual = grossAnnual - deductions.total

    // 생활비 (물가 반영)
    const annualExpenses = input.monthlyExpenses * 12 * 10000 * inflationFactor

    // 기타 소득 (부업 등 세후)
    const otherIncome = input.monthlyOtherIncome * 12 * 10000
    const otherIncomeHealthInsurance = calcOtherIncomeHealthInsurance(input.monthlyOtherIncome, input.employmentType)

    // 연간 저축 = 세후소득 + 기타소득 - 생활비 + 별도 저축
    const annualSavings =
      netAnnual + otherIncome - otherIncomeHealthInsurance - annualExpenses + input.monthlySavings * 12 * 10000

    // 투자 수익
    const investmentReturn = portfolio * (input.preRetirementReturnRate / 100)

    portfolio += investmentReturn + annualSavings

    yearlyData.push({
      age,
      portfolio: portfolio / 10000,
      annualIncome: grossAnnual / 10000,
      annualExpenses: annualExpenses / 10000,
      annualSavings: annualSavings / 10000,
      investmentReturn: investmentReturn / 10000,
      netTax: (deductions.total + otherIncomeHealthInsurance) / 10000,
      phase: 'accumulation',
    })
  }

  // 은퇴 시점에 퇴직연금 일시금 추가
  portfolio += input.retirementPensionLump * 10000

  const retirementPortfolio = portfolio / 10000

  // 은퇴 시점 인플레이션 기준점
  const retirementInflationBase = Math.pow(1 + input.inflationRate / 100, yearsToRetirement)

  // === 인출 단계 (은퇴 후) ===
  const yearsInRetirement = input.lifeExpectancy - input.retirementAge
  let assetDepletionAge: number | null = null

  // 은퇴 첫 해 지표 계산용
  let firstYearMetrics = {
    pension: 0,
    rental: 0,
    expenses: 0,
    healthInsurance: 0,
    withdrawal: 0,
  }

  for (let i = 0; i <= yearsInRetirement; i++) {
    const age = input.retirementAge + i
    const yearsFromRetirement = i
    const inflationFactor = retirementInflationBase * Math.pow(1 + input.inflationRate / 100, yearsFromRetirement)

    // 생활비 (물가 반영)
    const annualExpenses = input.retirementMonthlyExpenses * 12 * 10000 * inflationFactor

    // 국민연금 (현재 가치 입력) - 수령 전 재평가와 수령 후 CPI 연동을 물가 상승률로 근사
    let nationalPensionIncome = 0
    if (age >= input.nationalPensionStartAge && input.nationalPensionMonthly > 0) {
      nationalPensionIncome = input.nationalPensionMonthly * 12 * 10000 * inflationFactor
    }

    // 개인연금 (수령 시점 명목 금액, 고정)
    let privatePensionIncome = 0
    if (age >= input.privatePensionStartAge && input.privatePensionMonthly > 0) {
      privatePensionIncome = input.privatePensionMonthly * 12 * 10000
    }

    const pensionIncome = nationalPensionIncome + privatePensionIncome

    // 임대 수익 (현재 가치 입력, 물가 반영)
    const rentalIncome = input.monthlyRentalIncome * 12 * 10000 * inflationFactor

    const totalPassiveIncome = pensionIncome + rentalIncome

    // 은퇴 후 건강보험료 (지역가입자 근사) - 추가 현금 지출
    const healthInsurance = calcRetireeHealthInsurance(nationalPensionIncome, rentalIncome)

    // 포트폴리오에서 인출 필요액 (생활비 + 건강보험료 - 패시브 소득)
    const portfolioWithdrawal = Math.max(0, annualExpenses + healthInsurance - totalPassiveIncome)

    // 포트폴리오 투자 수익
    const safePortfolio = Math.max(0, portfolio)
    const investmentReturn = safePortfolio * (input.postRetirementReturnRate / 100)

    portfolio += investmentReturn - portfolioWithdrawal

    const isAssetsDepleted = portfolio <= 0
    if (isAssetsDepleted) {
      portfolio = 0
      if (assetDepletionAge === null) assetDepletionAge = age
    }

    if (i === 0) {
      firstYearMetrics = {
        pension: pensionIncome / 10000,
        rental: rentalIncome / 10000,
        expenses: annualExpenses / 10000,
        healthInsurance: healthInsurance / 10000,
        withdrawal: portfolioWithdrawal / 10000,
      }
    }

    yearlyData.push({
      age,
      portfolio: portfolio / 10000,
      annualIncome: (totalPassiveIncome + portfolioWithdrawal) / 10000,
      annualExpenses: annualExpenses / 10000,
      annualSavings: -portfolioWithdrawal / 10000,
      investmentReturn: investmentReturn / 10000,
      phase: 'retirement',
      pensionIncome: pensionIncome / 10000,
      rentalIncome: rentalIncome / 10000,
      portfolioWithdrawal: portfolioWithdrawal / 10000,
      healthInsurance: healthInsurance / 10000,
      isAssetsDepleted,
    })
  }

  const finalPortfolio = portfolio / 10000
  const isStable = assetDepletionAge === null

  let assessment: 'stable' | 'caution' | 'danger'
  if (isStable) {
    assessment = 'stable'
  } else if (assetDepletionAge !== null && assetDepletionAge >= input.lifeExpectancy - 5) {
    assessment = 'caution'
  } else {
    assessment = 'danger'
  }

  // 은퇴 첫 해 월 지표
  const monthlyPension = firstYearMetrics.pension / 12
  const monthlyRental = firstYearMetrics.rental / 12
  const monthlyPortfolioIncome = firstYearMetrics.withdrawal / 12
  const monthlyTotalIncome = monthlyPension + monthlyRental + monthlyPortfolioIncome
  const monthlyExpenseAtRetirement = firstYearMetrics.expenses / 12
  const monthlyHealthInsurance = firstYearMetrics.healthInsurance / 12

  return {
    yearlyData,
    retirementPortfolio,
    assetDepletionAge,
    finalPortfolio,
    isStable,
    assessment,
    monthlyPension,
    monthlyRental,
    monthlyPortfolioIncome,
    monthlyTotalIncome,
    monthlyExpenseAtRetirement,
    monthlyHealthInsurance,
    monthlyShortfall: 0,
    additionalMonthlySavingsNeeded: 0,
    retirementDelayNeeded: 0,
  }
}

// 이진 탐색: 기대 수명까지 자산이 유지되는 최대 은퇴 후 월 생활비 (현재 가치, 만원)
function findMaxSustainableExpense(input: RetirementInput): number {
  const MAX_SEARCH_EXPENSE = 1_000_000 // 탐색 상한 (만원/월)
  const PRECISION = 0.01 // 만원 (100원)
  const isStableAt = (expense: number) =>
    runSimulation({ ...input, retirementMonthlyExpenses: expense }).isStable

  if (!isStableAt(0)) return 0

  let low = 0
  let high = Math.max(input.retirementMonthlyExpenses * 2, 100)
  while (isStableAt(high) && high < MAX_SEARCH_EXPENSE) {
    low = high
    high *= 2
  }

  while (high - low > PRECISION) {
    const mid = (low + high) / 2
    if (isStableAt(mid)) {
      low = mid
    } else {
      high = mid
    }
  }

  return low
}

// 이진 탐색: 안정적 은퇴를 위한 추가 월 저축액 계산
function findAdditionalSavingsNeeded(input: RetirementInput): number {
  let low = 0
  let high = 5000 // 최대 5000만원/월 추가 저축 (사실상 상한)

  for (let iter = 0; iter < 30; iter++) {
    const mid = (low + high) / 2
    const testInput: RetirementInput = {
      ...input,
      monthlySavings: input.monthlySavings + mid,
    }
    const result = runSimulation(testInput)
    if (result.isStable) {
      high = mid
    } else {
      low = mid
    }
    if (high - low < 1) break
  }

  return Math.ceil(high)
}

// 미래 명목 금액을 물가 상승률로 할인해 오늘 기준 금액으로 환산
export function toPresentValue(amount: number, yearsFromNow: number, inflationRate: number): number {
  return amount / Math.pow(1 + inflationRate / 100, yearsFromNow)
}

// 안정적 은퇴에 필요한 최소 은퇴 연기 연수 (은퇴 가능 나이 안에서 불가능하면 null)
function findRetirementDelayNeeded(input: RetirementInput): number | null {
  const latestRetirementAge = Math.min(MAX_RETIREMENT_AGE, input.lifeExpectancy - 1)
  for (let age = input.retirementAge + 1; age <= latestRetirementAge; age++) {
    if (runSimulation({ ...input, retirementAge: age }).isStable) return age - input.retirementAge
  }
  return null
}

// 숫자 포맷 (만원 단위) - 천 단위 콤마 포함
export function formatWon(manwon: number): string {
  const absAmount = Math.abs(manwon)
  const sign = manwon < 0 ? '-' : ''

  if (absAmount >= 10000) {
    const uk = Math.floor(absAmount / 10000)
    const remainder = Math.round(absAmount % 10000)
    if (remainder === 0) {
      return `${sign}${uk.toLocaleString()}억원`
    }
    return `${sign}${uk.toLocaleString()}억 ${remainder.toLocaleString()}만원`
  }
  return `${sign}${Math.round(absAmount).toLocaleString()}만원`
}

export function formatWonMonth(manwon: number): string {
  return `${formatWon(manwon)}/월`
}
