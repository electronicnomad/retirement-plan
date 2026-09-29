import { describe, it, expect } from 'vitest'
import type { RetirementInput } from '../types'
import {
  calcDeductions,
  calcWageIncomeDeduction,
  calcIncomeTaxOnTaxBase,
  calcWageTaxCredit,
  calcOtherIncomeHealthInsurance,
  estimateGrossFromNet,
  simulate,
  validateAges,
  formatWon,
  toPresentValue,
} from './calculator'

const baseInput: RetirementInput = {
  currentAge: 35,
  retirementAge: 60,
  lifeExpectancy: 85,
  monthlyGrossIncome: 500,
  annualIncomeGrowthRate: 3,
  monthlyOtherIncome: 0,
  employmentType: 'employed',
  monthlyExpenses: 300,
  retirementMonthlyExpenses: 250,
  inflationRate: 2.5,
  currentFinancialAssets: 5000,
  monthlySavings: 0,
  monthlyRentalIncome: 0,
  preRetirementReturnRate: 6,
  postRetirementReturnRate: 4,
  nationalPensionMonthly: 80,
  nationalPensionStartAge: 65,
  retirementPensionLump: 2000,
  privatePensionMonthly: 0,
  privatePensionStartAge: 65,
}

describe('calcIncomeTaxOnTaxBase', () => {
  it('과세표준이 0 이하면 세금이 없다', () => {
    expect(calcIncomeTaxOnTaxBase(0)).toBe(0)
  })

  it('최저 구간은 6% 세율을 적용한다', () => {
    expect(calcIncomeTaxOnTaxBase(10_000_000)).toBe(600_000)
  })

  it('첫 구간 상한(1,400만원)에서 84만원이다', () => {
    expect(calcIncomeTaxOnTaxBase(14_000_000)).toBe(840_000)
  })
})

describe('calcWageIncomeDeduction', () => {
  it('500만원 이하는 70%를 공제한다', () => {
    expect(calcWageIncomeDeduction(5_000_000)).toBe(3_500_000)
  })

  it('1억원에서 1,475만원을 공제한다', () => {
    expect(calcWageIncomeDeduction(100_000_000)).toBe(14_750_000)
  })

  it('1억원 초과분에는 2%를 추가 공제한다', () => {
    expect(calcWageIncomeDeduction(200_000_000)).toBe(16_750_000)
  })
})

describe('calcWageTaxCredit', () => {
  it('산출세액 130만원 이하는 55%를 공제한다', () => {
    expect(calcWageTaxCredit(1_000_000, 30_000_000)).toBe(550_000)
  })

  it('총급여 3,300만원 이하는 74만원 한도가 적용된다', () => {
    expect(calcWageTaxCredit(3_000_000, 30_000_000)).toBe(740_000)
  })

  it('총급여 5,000만원은 한도가 66만원 아래로 내려가지 않는다', () => {
    expect(calcWageTaxCredit(3_000_000, 50_000_000)).toBe(660_000)
  })

  it('총급여 1억원은 한도가 50만원이다', () => {
    expect(calcWageTaxCredit(10_000_000, 100_000_000)).toBe(500_000)
  })

  it('총급여 2억원은 한도가 최저 20만원이다', () => {
    expect(calcWageTaxCredit(30_000_000, 200_000_000)).toBe(200_000)
  })
})

describe('calcDeductions', () => {
  it('직장인은 고용보험을 부담한다', () => {
    expect(calcDeductions(500, 'employed').employmentInsurance).toBeGreaterThan(0)
  })

  it('자영업자는 고용보험이 없다', () => {
    expect(calcDeductions(500, 'self-employed').employmentInsurance).toBe(0)
  })

  it('국민연금은 월 659만원 기준소득 상한과 본인 부담 4.75%가 적용된다', () => {
    const highIncome = calcDeductions(1000, 'employed')
    expect(highIncome.nationalPension).toBeCloseTo(6_590_000 * 0.0475 * 12, 5)
  })

  it('직장인 건강보험은 본인 부담 3.595%, 장기요양은 건보료의 13.14%다', () => {
    const d = calcDeductions(500, 'employed')
    expect(d.healthInsurance).toBeCloseTo(60_000_000 * 0.03595, 5)
    expect(d.longTermCare).toBeCloseTo(d.healthInsurance * 0.1314, 5)
  })

  it('자영업자는 경비 차감 후 사업소득에 건강보험 7.19%, 국민연금 9.5%를 부담한다', () => {
    const d = calcDeductions(300, 'self-employed')
    const businessMonthly = 3_000_000 * 0.7
    expect(d.healthInsurance).toBeCloseTo(businessMonthly * 12 * 0.0719, 5)
    expect(d.nationalPension).toBeCloseTo(businessMonthly * 12 * 0.095, 5)
  })
})

describe('calcOtherIncomeHealthInsurance', () => {
  it('직장인은 급여 외 소득이 연 2,000만원 이하면 추가 보험료가 없다', () => {
    expect(calcOtherIncomeHealthInsurance(150, 'employed')).toBe(0)
  })

  it('직장인은 연 2,000만원 초과분에 건강보험 7.19%와 장기요양을 본인 전액 부담한다', () => {
    const expected = 10_000_000 * 0.0719 * (1 + 0.1314)
    expect(calcOtherIncomeHealthInsurance(250, 'employed')).toBeCloseTo(expected, 5)
  })

  it('자영업자는 공제 없이 기타 소득 전액에 지역 건강보험료가 붙는다', () => {
    const expected = 12_000_000 * 0.0719 * (1 + 0.1314)
    expect(calcOtherIncomeHealthInsurance(100, 'self-employed')).toBeCloseTo(expected, 5)
  })
})

describe('estimateGrossFromNet', () => {
  it('calcDeductions를 역으로 복원한다', () => {
    const gross = 500
    const net = gross - calcDeductions(gross, 'employed').total / 12 / 10000
    expect(estimateGrossFromNet(net, 'employed')).toBeCloseTo(gross, 0)
  })

  it('고소득 구간에서도 세전이 세후보다 크다', () => {
    const net = 2000
    expect(estimateGrossFromNet(net, 'employed')).toBeGreaterThan(net)
  })

  it('실수령액이 0이면 세전도 0이다', () => {
    expect(estimateGrossFromNet(0, 'employed')).toBe(0)
  })
})

describe('simulate', () => {
  it('자산이 충분하면 안정으로 평가한다', () => {
    const input = { ...baseInput, currentFinancialAssets: 1_000_000, retirementMonthlyExpenses: 100 }
    const result = simulate(input)
    expect(result.isStable).toBe(true)
  })

  it('자산이 부족하면 위험으로 평가하고 소진 나이를 반환한다', () => {
    const input = {
      ...baseInput,
      currentAge: 60,
      retirementAge: 61,
      currentFinancialAssets: 1000,
      retirementMonthlyExpenses: 500,
      nationalPensionMonthly: 0,
      postRetirementReturnRate: 0,
    }
    const result = simulate(input)
    expect(result.assetDepletionAge).not.toBeNull()
  })

  it('수입이 생활비에 못 미치면 충족도가 음수다', () => {
    const input = {
      ...baseInput,
      currentAge: 60,
      retirementAge: 61,
      currentFinancialAssets: 1000,
      retirementMonthlyExpenses: 500,
      nationalPensionMonthly: 0,
    }
    const result = simulate(input)
    expect(result.monthlyShortfall).toBeLessThan(0)
  })

  it('자산 인출 지표는 은퇴 첫 해 실제 인출액을 월 환산한 값이다', () => {
    const result = simulate(baseInput)
    const firstRetirementYear = result.yearlyData.find((d) => d.phase === 'retirement')!
    expect(result.monthlyPortfolioIncome).toBeCloseTo(firstRetirementYear.portfolioWithdrawal! / 12, 5)
  })

  it('충족도의 부호는 안정성 평가와 일치한다', () => {
    const stable = simulate(baseInput)
    expect(stable.isStable).toBe(true)
    expect(stable.monthlyShortfall).toBeGreaterThanOrEqual(0)

    const unstable = simulate({ ...baseInput, retirementMonthlyExpenses: 600 })
    expect(unstable.isStable).toBe(false)
    expect(unstable.monthlyShortfall).toBeLessThan(0)
  })

  it('충족도만큼 생활비를 조정하면 안정과 불안정의 경계가 된다', () => {
    const input = { ...baseInput, retirementMonthlyExpenses: 600 }
    const inflationBase = Math.pow(1 + input.inflationRate / 100, input.retirementAge - input.currentAge)
    const maxExpense = input.retirementMonthlyExpenses + simulate(input).monthlyShortfall / inflationBase
    expect(simulate({ ...input, retirementMonthlyExpenses: maxExpense - 1 }).isStable).toBe(true)
    expect(simulate({ ...input, retirementMonthlyExpenses: maxExpense + 1 }).isStable).toBe(false)
  })

  it('은퇴 후 건강보험료가 최소보험료 이상 부과된다', () => {
    const floorMonthly = (20_160 * 1.1314) / 10000
    expect(simulate(baseInput).monthlyHealthInsurance).toBeCloseTo(floorMonthly, 2)
  })

  it('국민연금 수령이 시작되면 건강보험료가 늘어난다', () => {
    const withPension = {
      ...baseInput,
      nationalPensionStartAge: baseInput.retirementAge,
      nationalPensionMonthly: 200,
    }
    const floorMonthly = (20_160 * 1.1314) / 10000
    expect(simulate(withPension).monthlyHealthInsurance).toBeGreaterThan(floorMonthly)
  })

  it('국민연금은 현재 가치 입력을 오늘부터 물가만큼 올려 지급한다', () => {
    const input = { ...baseInput, nationalPensionStartAge: 65 }
    const age70 = simulate(input).yearlyData.find((d) => d.age === 70)!
    const inflation = Math.pow(1 + input.inflationRate / 100, 70 - input.currentAge)
    expect(age70.pensionIncome).toBeCloseTo(input.nationalPensionMonthly * 12 * inflation, 5)
  })

  it('임대 수익은 현재 가치 입력을 오늘부터 물가만큼 올린다', () => {
    const input = { ...baseInput, monthlyRentalIncome: 100 }
    const firstRetirementYear = simulate(input).yearlyData.find((d) => d.age === input.retirementAge)!
    const inflation = Math.pow(1 + input.inflationRate / 100, input.retirementAge - input.currentAge)
    expect(firstRetirementYear.rentalIncome).toBeCloseTo(100 * 12 * inflation, 5)
  })

  it('개인연금은 입력한 명목 금액으로 고정 지급한다', () => {
    const input = { ...baseInput, nationalPensionMonthly: 0, privatePensionMonthly: 50 }
    const age80 = simulate(input).yearlyData.find((d) => d.age === 80)!
    expect(age80.pensionIncome).toBe(50 * 12)
  })

  it('은퇴 후 연도별 데이터에 건강보험료를 기록한다', () => {
    const floorAnnual = (20_160 * 12 * 1.1314) / 10000
    const firstRetirementYear = simulate(baseInput).yearlyData.find((d) => d.phase === 'retirement')!
    expect(firstRetirementYear.healthInsurance).toBeCloseTo(floorAnnual, 5)
  })

  it('은퇴 전 저축액에서 급여 외 소득 건강보험료를 차감한다', () => {
    const firstYear = (monthlyOtherIncome: number) =>
      simulate({ ...baseInput, monthlyOtherIncome }).yearlyData[0].annualSavings
    const premium = calcOtherIncomeHealthInsurance(250, 'employed') / 10000
    expect(firstYear(250) - firstYear(0)).toBeCloseTo(250 * 12 - premium, 5)
  })

  it('제안된 추가 저축을 반영하면 안정 상태가 된다', () => {
    const unstable = {
      ...baseInput,
      currentFinancialAssets: 1000,
      monthlyGrossIncome: 400,
      monthlyExpenses: 350,
      preRetirementReturnRate: 5,
      nationalPensionMonthly: 0,
    }
    const result = simulate(unstable)
    expect(result.isStable).toBe(false)

    const fixed = { ...unstable, monthlySavings: result.additionalMonthlySavingsNeeded }
    expect(simulate(fixed).isStable).toBe(true)
  })

  it('안정 상태면 은퇴를 늦출 필요가 없다', () => {
    expect(simulate(baseInput).retirementDelayNeeded).toBe(0)
  })

  it('제안된 연수만큼 은퇴를 늦추면 안정 상태가 된다', () => {
    const unstable = { ...baseInput, retirementMonthlyExpenses: 600 }
    const delay = simulate(unstable).retirementDelayNeeded!
    const delayed = { ...unstable, retirementAge: unstable.retirementAge + delay }
    expect(simulate(delayed).isStable).toBe(true)
  })

  it('제안된 연수는 안정에 필요한 최소 연수다', () => {
    const unstable = { ...baseInput, retirementMonthlyExpenses: 600 }
    const delay = simulate(unstable).retirementDelayNeeded!
    const lessDelayed = { ...unstable, retirementAge: unstable.retirementAge + delay - 1 }
    expect(simulate(lessDelayed).isStable).toBe(false)
  })

  it('은퇴 가능 나이 안에서 안정에 이를 수 없으면 null이다', () => {
    const hopeless = {
      ...baseInput,
      currentAge: 75,
      retirementAge: 78,
      lifeExpectancy: 100,
      currentFinancialAssets: 0,
      monthlyGrossIncome: 300,
      monthlyExpenses: 300,
      retirementMonthlyExpenses: 500,
      nationalPensionMonthly: 0,
      retirementPensionLump: 0,
    }
    expect(simulate(hopeless).retirementDelayNeeded).toBeNull()
  })
})

describe('validateAges', () => {
  it('현재 나이 < 은퇴 나이 < 기대 수명이면 오류가 없다', () => {
    expect(validateAges(baseInput)).toBeNull()
  })

  it('은퇴 나이가 현재 나이 이하이면 오류를 반환한다', () => {
    expect(validateAges({ ...baseInput, currentAge: 60, retirementAge: 60 })).not.toBeNull()
  })

  it('기대 수명이 은퇴 나이 이하이면 오류를 반환한다', () => {
    expect(validateAges({ ...baseInput, retirementAge: 85, lifeExpectancy: 85 })).not.toBeNull()
  })
})

describe('formatWon', () => {
  it('1만 단위를 억으로 변환한다', () => {
    expect(formatWon(10000)).toBe('1억원')
  })

  it('억과 만원을 함께 표기한다', () => {
    expect(formatWon(15000)).toBe('1억 5,000만원')
  })

  it('음수는 부호를 유지한다', () => {
    expect(formatWon(-500)).toBe('-500만원')
  })
})

describe('toPresentValue', () => {
  it('물가 상승률만큼 할인해 현재 가치로 환산한다', () => {
    expect(toPresentValue(121, 2, 10)).toBeCloseTo(100)
  })

  it('0년 후 금액은 그대로다', () => {
    expect(toPresentValue(500, 0, 2.5)).toBe(500)
  })
})
