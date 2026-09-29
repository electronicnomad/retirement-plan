import { describe, it, expect } from 'vitest'
import type { RetirementInput } from '../types'
import { parseSavedInput } from './savedInput'

const defaults: RetirementInput = {
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

describe('parseSavedInput', () => {
  it('저장된 값이 없으면 기본값을 쓴다', () => {
    expect(parseSavedInput(null, defaults)).toEqual(defaults)
  })

  it('저장된 값을 복원한다', () => {
    const saved = { ...defaults, currentAge: 42, employmentType: 'self-employed' }
    expect(parseSavedInput(JSON.stringify(saved), defaults)).toEqual(saved)
  })

  it('저장본에 없는 필드는 기본값으로 채운다', () => {
    expect(parseSavedInput('{"currentAge":42}', defaults).retirementAge).toBe(60)
  })

  it('타입이 다른 필드는 기본값으로 되돌린다', () => {
    expect(parseSavedInput('{"currentAge":"42"}', defaults).currentAge).toBe(35)
  })

  it('알 수 없는 필드는 버린다', () => {
    expect(parseSavedInput('{"unknown":1}', defaults)).toEqual(defaults)
  })

  it('JSON이 깨져 있으면 기본값을 쓴다', () => {
    expect(parseSavedInput('{broken', defaults)).toEqual(defaults)
  })

  it('객체가 아니면 기본값을 쓴다', () => {
    expect(parseSavedInput('null', defaults)).toEqual(defaults)
  })
})
