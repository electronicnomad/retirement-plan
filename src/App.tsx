import { useState, useMemo, useEffect } from 'react'
import type { RetirementInput } from './types'
import {
  simulate,
  validateAges,
  calcDeductions,
  calcOtherIncomeHealthInsurance,
  estimateGrossFromNet,
  formatWon,
  MAX_RETIREMENT_AGE,
} from './utils/calculator'
import { loadInput, saveInput } from './utils/savedInput'
import ResultDashboard from './components/ResultDashboard'
import AdUnit from './components/AdUnit'

const AD_SLOT_BOTTOM = '4599969990'
const RESULT_PANEL_ID = 'result'

const DEFAULT_INPUT: RetirementInput = {
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

// 아코디언 섹션
function Section({
  title,
  open,
  onToggle,
  children,
}: {
  title: string
  open: boolean
  onToggle: () => void
  children: React.ReactNode
}) {
  return (
    <div className="card overflow-hidden">
      <button className="section-header w-full" onClick={onToggle}>
        <span className="section-title">{title}</span>
        <svg
          className={`w-4 h-4 text-on-surface-variant transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && <div className="mt-4 space-y-3 border-t border-outline-variant/30 pt-4">{children}</div>}
    </div>
  )
}

// 입력 필드
function Field({
  label,
  hint,
  unit,
  children,
}: {
  label: string
  hint?: string
  unit?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label>
        <span className="input-label">{label}</span>
        <span className="relative flex items-center">
          {children}
          {unit && (
            <span className="absolute right-3 text-sm text-on-surface-variant pointer-events-none">{unit}</span>
          )}
        </span>
      </label>
      {hint && <p className="input-hint">{hint}</p>}
    </div>
  )
}

// 숫자 입력 (천 단위 콤마 표시)
function NumInput({
  value,
  onChange,
  min,
  max,
  placeholder,
  hasUnit,
}: {
  value: number
  onChange: (v: number) => void
  min?: number
  max?: number
  step?: number
  placeholder?: string
  hasUnit?: boolean
}) {
  const [localStr, setLocalStr] = useState<string | null>(null)

  const displayValue =
    localStr !== null
      ? localStr
      : value === 0
      ? '0'
      : value.toLocaleString('ko-KR')

  return (
    <input
      type="text"
      inputMode="decimal"
      className={`input-field text-right text-lg leading-tight font-semibold ${hasUnit ? 'pr-14' : ''}`}
      value={displayValue}
      placeholder={placeholder}
      onFocus={(e) => {
        setLocalStr(value === 0 ? '0' : String(value))
        e.target.select()
      }}
      onBlur={() => {
        setLocalStr(null)
        // 입력 도중(예: 35를 치는 중의 3)에는 막지 않고 포커스를 벗어날 때 범위로 보정
        const clamped = Math.min(Math.max(value, min ?? -Infinity), max ?? Infinity)
        if (clamped !== value) onChange(clamped)
      }}
      onChange={(e) => {
        const raw = e.target.value.replace(/[^0-9.]/g, '')
        setLocalStr(raw)
        const num = parseFloat(raw)
        if (!isNaN(num)) onChange(num)
        else if (raw === '') onChange(0)
      }}
    />
  )
}

// 슬라이더
function SliderInput({
  value,
  onChange,
  min,
  max,
  step,
  label,
}: {
  value: number
  onChange: (v: number) => void
  min: number
  max: number
  step?: number
  label?: string
}) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-on-surface-variant">
        <span>{min}{label}</span>
        <span className="font-semibold text-primary">{value}{label}</span>
        <span>{max}{label}</span>
      </div>
      <input
        type="range"
        className="w-full accent-primary"
        min={min}
        max={max}
        step={step ?? 1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  )
}

// 두 개 중 하나를 고르는 붙은 버튼 그룹
function SegmentedControl<T extends string>({
  legend,
  options,
  value,
  onChange,
}: {
  legend: string
  options: { value: T; label: string }[]
  value: T
  onChange: (v: T) => void
}) {
  return (
    <fieldset>
      <legend className="input-label">{legend}</legend>
      <div className="grid grid-cols-2">
        {options.map((option) => (
          <button
            key={option.value}
            onClick={() => onChange(option.value)}
            aria-pressed={value === option.value}
            className={`segmented-option ${value === option.value ? 'segmented-option-active' : ''}`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </fieldset>
  )
}

export default function App() {
  const [input, setInput] = useState<RetirementInput>(() => loadInput(DEFAULT_INPUT))
  const [openSections, setOpenSections] = useState({
    basic: true,
    income: true,
    expense: true,
    asset: true,
    pension: true,
  })
  const [incomeType, setIncomeType] = useState<'gross' | 'net'>('gross')

  const toggleSection = (key: keyof typeof openSections) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const set = <K extends keyof RetirementInput>(key: K, value: RetirementInput[K]) => {
    setInput((prev) => ({ ...prev, [key]: value }))
  }

  useEffect(() => saveInput(input), [input])

  const resetInput = () => {
    if (window.confirm('모든 입력값을 기본값으로 되돌릴까요?')) setInput(DEFAULT_INPUT)
  }

  const ageError = validateAges(input)
  const result = useMemo(() => (ageError ? null : simulate(input)), [input, ageError])

  // 현재 월 실수령액 미리보기
  const deductions = useMemo(
    () => calcDeductions(input.monthlyGrossIncome, input.employmentType),
    [input.monthlyGrossIncome, input.employmentType]
  )
  const monthlyNet = input.monthlyGrossIncome - deductions.total / 10000 / 12
  // 시뮬레이션은 이 금액을 매년 자동으로 자산에 더한다
  const monthlyOtherIncomeHealthInsurance =
    calcOtherIncomeHealthInsurance(input.monthlyOtherIncome, input.employmentType) / 10000 / 12
  const monthlyAutoSavings =
    monthlyNet + input.monthlyOtherIncome - monthlyOtherIncomeHealthInsurance - input.monthlyExpenses

  const scrollToResult = () => {
    document.getElementById(RESULT_PANEL_ID)?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <div className="min-h-screen bg-surface">
      <main className="max-w-[1080px] mx-auto px-5 py-8">
        {/* 헤더: 모바일에서는 결과로 이동하는 평가 배지가 항상 보이도록 고정 */}
        <header className="sticky top-0 z-10 -mx-5 px-5 py-3 mb-3 bg-surface flex items-start justify-between gap-4 min-[820px]:static min-[820px]:m-0 min-[820px]:mb-6 min-[820px]:p-0">
          <div>
            <h1 className="text-[1.75rem] font-bold text-on-surface mb-1">은퇴 계획 계산기</h1>
            <p className="text-on-surface-variant">한국 세금·연금 기반 현실적 은퇴 예측</p>
          </div>
          {result && (
            <button
              onClick={scrollToResult}
              aria-label="결과로 이동"
              className={`mt-2 flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-bold ${
                result.assessment === 'stable'
                  ? 'bg-success-container/50 text-success'
                  : result.assessment === 'caution'
                  ? 'bg-warning-container text-warning'
                  : 'bg-error-container text-error'
              }`}
            >
              {result.assessment === 'stable' ? '안정' : result.assessment === 'caution' ? '주의' : '위험'}
              {result.assetDepletionAge !== null && ` · ${result.assetDepletionAge}세 소진`}
            </button>
          )}
        </header>

        <div className="grid grid-cols-1 min-[820px]:grid-cols-[minmax(280px,380px)_1fr] gap-6">
          {/* 입력 패널 */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-on-surface-variant">
              <span>입력값은 이 브라우저에 자동 저장됩니다</span>
              <button onClick={resetInput} className="font-medium underline underline-offset-2 hover:text-on-surface">
                초기화
              </button>
            </div>

            {/* 기본 정보 */}
            <Section title="기본 정보" open={openSections.basic} onToggle={() => toggleSection('basic')}>
              <Field label="현재 나이" unit="세">
                <NumInput value={input.currentAge} onChange={(v) => set('currentAge', v)} min={20} max={80} hasUnit />
              </Field>
              <Field label="은퇴 목표 나이" unit="세">
                <NumInput value={input.retirementAge} onChange={(v) => set('retirementAge', v)} min={input.currentAge + 1} max={MAX_RETIREMENT_AGE} hasUnit />
              </Field>
              <div>
                <Field label="기대 수명" unit="세">
                  <NumInput value={input.lifeExpectancy} onChange={(v) => set('lifeExpectancy', v)} min={input.retirementAge + 1} max={110} hasUnit />
                </Field>
                <SliderInput
                  value={input.lifeExpectancy}
                  onChange={(v) => set('lifeExpectancy', v)}
                  min={70}
                  max={100}
                  label="세"
                />
              </div>
            </Section>

            {/* 소득 */}
            <Section title="소득 정보" open={openSections.income} onToggle={() => toggleSection('income')}>
              <SegmentedControl
                legend="고용 형태"
                options={[
                  { value: 'employed', label: '직장인' },
                  { value: 'self-employed', label: '자영업자' },
                ]}
                value={input.employmentType}
                onChange={(type) => set('employmentType', type)}
              />

              <SegmentedControl
                legend="소득 입력 방식"
                options={[
                  { value: 'gross', label: '세전 소득' },
                  { value: 'net', label: '세후 소득 (실수령액)' },
                ]}
                value={incomeType}
                onChange={setIncomeType}
              />

              <Field
                label={incomeType === 'gross' ? '세전 월 소득' : '세후 월 소득 (실수령액)'}
                unit="만원"
                hint={incomeType === 'gross'
                  ? `실수령액 약 ${Math.round(monthlyNet)}만원/월 (세금·4대보험 차감)`
                  : '세후 실제 수령액을 입력하세요. 자동으로 세전 소득을 역산합니다.'
                }
              >
                <NumInput
                  value={incomeType === 'gross' ? input.monthlyGrossIncome : Math.round(monthlyNet)}
                  onChange={(v) => {
                    if (incomeType === 'gross') {
                      set('monthlyGrossIncome', v)
                    } else {
                      // 세후 입력시 세전으로 역산
                      set('monthlyGrossIncome', estimateGrossFromNet(v, input.employmentType))
                    }
                  }}
                  min={0}
                  step={10}
                  hasUnit
                />
              </Field>

              <Field label="연 소득 인상률" unit="%" hint="평균 임금 인상률 (3~4% 권장)">
                <NumInput value={input.annualIncomeGrowthRate} onChange={(v) => set('annualIncomeGrowthRate', v)} min={0} max={20} step={0.5} hasUnit />
              </Field>
              <SliderInput
                value={input.annualIncomeGrowthRate}
                onChange={(v) => set('annualIncomeGrowthRate', v)}
                min={0}
                max={10}
                step={0.5}
                label="%"
              />

              <Field
                label="기타 월 소득 (세후)"
                unit="만원"
                hint={input.employmentType === 'employed'
                  ? '부업, 프리랜서 등 세후 소득. 연 2,000만원(월 약 167만원) 초과분에 건강보험료가 추가로 부과됩니다.'
                  : '부업, 프리랜서 등 세후 소득. 전액에 지역 건강보험료가 추가로 부과됩니다.'
                }
              >
                <NumInput value={input.monthlyOtherIncome} onChange={(v) => set('monthlyOtherIncome', v)} min={0} step={10} hasUnit />
              </Field>
            </Section>

            {/* 지출 */}
            <Section title="지출 정보" open={openSections.expense} onToggle={() => toggleSection('expense')}>
              <Field label="현재 월 생활비" unit="만원" hint="식비, 주거비, 교통, 통신, 여가 등 모든 지출">
                <NumInput value={input.monthlyExpenses} onChange={(v) => set('monthlyExpenses', v)} min={0} step={10} hasUnit />
              </Field>

              <Field label="은퇴 후 월 생활비" unit="만원" hint="은퇴 후 예상 생활비 (현재 가치 기준). 재산세·자동차세 등 연간 고정 지출도 월 환산하여 포함하세요.">
                <NumInput value={input.retirementMonthlyExpenses} onChange={(v) => set('retirementMonthlyExpenses', v)} min={0} step={10} hasUnit />
              </Field>

              <Field label="물가 상승률" unit="%" hint="연 2~3% 가정 (한국 평균)">
                <NumInput value={input.inflationRate} onChange={(v) => set('inflationRate', v)} min={0} max={10} step={0.5} hasUnit />
              </Field>
              <SliderInput
                value={input.inflationRate}
                onChange={(v) => set('inflationRate', v)}
                min={0}
                max={6}
                step={0.5}
                label="%"
              />
            </Section>

            {/* 자산 & 투자 */}
            <Section title="자산 & 투자" open={openSections.asset} onToggle={() => toggleSection('asset')}>
              <Field label="현재 금융 자산" unit="만원" hint="예금, 적금, 주식, 펀드, IRP 등 합산">
                <NumInput value={input.currentFinancialAssets} onChange={(v) => set('currentFinancialAssets', v)} min={0} step={100} hasUnit />
              </Field>

              <Field
                label="소득 외 월 추가 납입액"
                unit="만원"
                hint={monthlyAutoSavings >= 0
                  ? `세후 소득 + 기타 소득 - 생활비 = 월 ${Math.round(monthlyAutoSavings)}만원은 자동으로 저축됩니다. 이미 소득에서 나가는 적금은 넣지 말고, 증여·지원금 등 소득 외 납입액만 입력하세요.`
                  : `현재 매월 ${Math.round(-monthlyAutoSavings)}만원 적자가 자산에서 빠집니다. 증여·지원금 등 소득 외 납입액만 입력하세요.`
                }
              >
                <NumInput value={input.monthlySavings} onChange={(v) => set('monthlySavings', v)} min={0} step={10} hasUnit />
              </Field>

              <Field label="부동산 임대 수익" unit="만원/월" hint="은퇴 후 월 임대 수입 (현재 가치, 0이면 없음)">
                <NumInput value={input.monthlyRentalIncome} onChange={(v) => set('monthlyRentalIncome', v)} min={0} step={10} hasUnit />
              </Field>

              <Field label="은퇴 전 투자 수익률" unit="%" hint="연평균 기대 수익률 (주식·펀드 혼합, 6~8% 권장)">
                <NumInput value={input.preRetirementReturnRate} onChange={(v) => set('preRetirementReturnRate', v)} min={0} max={20} step={0.5} hasUnit />
              </Field>
              <SliderInput
                value={input.preRetirementReturnRate}
                onChange={(v) => set('preRetirementReturnRate', v)}
                min={1}
                max={15}
                step={0.5}
                label="%"
              />

              <Field label="은퇴 후 투자 수익률" unit="%" hint="보수적 운용 (채권·혼합형, 3~5% 권장)">
                <NumInput value={input.postRetirementReturnRate} onChange={(v) => set('postRetirementReturnRate', v)} min={0} max={15} step={0.5} hasUnit />
              </Field>
              <SliderInput
                value={input.postRetirementReturnRate}
                onChange={(v) => set('postRetirementReturnRate', v)}
                min={0}
                max={10}
                step={0.5}
                label="%"
              />
            </Section>

            {/* 연금 */}
            <Section title="연금 정보" open={openSections.pension} onToggle={() => toggleSection('pension')}>
              <div className="p-3 bg-surface-container text-xs text-on-surface-variant rounded-lg">
                국민연금 예상 수령액은{' '}
                <strong>국민연금공단 홈페이지(nps.or.kr) → 내 연금 알아보기</strong>에서 확인하세요.
              </div>

              <Field label="국민연금 예상 월 수령액" unit="만원" hint="국민연금공단 조회 결과 입력 (현재 가치 기준)">
                <NumInput value={input.nationalPensionMonthly} onChange={(v) => set('nationalPensionMonthly', v)} min={0} step={5} hasUnit />
              </Field>

              <Field label="국민연금 수령 시작 나이" unit="세" hint="현재 기준: 1969년생 이후 65세">
                <NumInput value={input.nationalPensionStartAge} onChange={(v) => set('nationalPensionStartAge', v)} min={60} max={70} hasUnit />
              </Field>

              <Field label="퇴직연금 (IRP) 일시금" unit="만원" hint="은퇴 시점 예상 퇴직연금 총액">
                <NumInput value={input.retirementPensionLump} onChange={(v) => set('retirementPensionLump', v)} min={0} step={100} hasUnit />
              </Field>

              <Field label="개인연금 월 수령액" unit="만원" hint="연금저축, 보험 등 수령 시점 예상 금액 (상품 안내서 기준, 물가 미반영)">
                <NumInput value={input.privatePensionMonthly} onChange={(v) => set('privatePensionMonthly', v)} min={0} step={5} hasUnit />
              </Field>

              {input.privatePensionMonthly > 0 && (
                <Field label="개인연금 수령 시작 나이" unit="세">
                  <NumInput value={input.privatePensionStartAge} onChange={(v) => set('privatePensionStartAge', v)} min={55} max={80} hasUnit />
                </Field>
              )}
            </Section>

            {/* 세금 미리보기 */}
            {input.monthlyGrossIncome > 0 && (
              <div className="card">
                <h3 className="text-sm font-semibold text-on-surface mb-3">현재 월 세금·공제 내역</h3>
                <div className="space-y-1.5 text-sm tabular-nums">
                  <TaxRow label="소득세 + 지방소득세" value={(deductions.incomeTax + deductions.localIncomeTax) / 10000 / 12} />
                  <TaxRow label="국민연금 (직원 부담분)" value={deductions.nationalPension / 10000 / 12} />
                  <TaxRow label="건강보험 + 장기요양" value={(deductions.healthInsurance + deductions.longTermCare) / 10000 / 12} />
                  {deductions.employmentInsurance > 0 && (
                    <TaxRow label="고용보험" value={deductions.employmentInsurance / 10000 / 12} />
                  )}
                  <div className="border-t border-outline-variant pt-2 mt-2 flex justify-between font-semibold">
                    <span className="text-on-surface">총 공제 / 실수령액</span>
                    <span>
                      <span className="text-secondary">{formatWon(deductions.total / 10000 / 12)}</span>
                      <span className="text-on-surface-variant mx-1">/</span>
                      <span className="text-primary">{formatWon(monthlyNet)}</span>
                    </span>
                  </div>
                  {monthlyOtherIncomeHealthInsurance > 0 && (
                    <TaxRow label="급여 외 소득 건강보험 (본인 전액, 별도)" value={monthlyOtherIncomeHealthInsurance} />
                  )}
                </div>
              </div>
            )}
          </div>

          {/* 결과 패널 */}
          <div
            id={RESULT_PANEL_ID}
            className="scroll-mt-32 min-[820px]:scroll-mt-6 min-[820px]:sticky min-[820px]:top-6 min-[820px]:self-start min-[820px]:max-h-[calc(100vh-3rem)] min-[820px]:overflow-y-auto"
          >
            {result ? (
              <ResultDashboard result={result} input={input} />
            ) : (
              <div className="card bg-error-container border-error">
                <p className="text-sm font-semibold text-on-error-container">{ageError}</p>
                <p className="text-xs text-on-error-container mt-1">기본 정보의 나이를 확인하면 결과가 다시 표시됩니다.</p>
              </div>
            )}
          </div>
        </div>
        <div className="mt-6">
          <AdUnit slot={AD_SLOT_BOTTOM} />
        </div>
      </main>

      <footer className="text-center py-6 text-xs text-on-surface-variant">
        본 시뮬레이터는 참고용이며, 실제 세금·연금·투자 결과와 다를 수 있습니다. 중요한 재무 결정은 전문가와 상담하세요.
      </footer>
    </div>
  )
}

function TaxRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex justify-between text-on-surface-variant">
      <span>{label}</span>
      <span className="font-medium text-secondary">{formatWon(value)}/월</span>
    </div>
  )
}
