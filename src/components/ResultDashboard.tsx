import type { SimulationResult, RetirementInput } from '../types'
import { formatWon, formatWonMonth, toPresentValue, MAX_RETIREMENT_AGE } from '../utils/calculator'
import AssetChart from './AssetChart'

interface Props {
  result: SimulationResult
  input: RetirementInput
}

const assessmentConfig = {
  stable: {
    bg: 'bg-success-container/30',
    border: 'border-success',
    badge: 'bg-success-container/50 text-success',
    icon: '✓',
    iconBg: 'bg-success',
    title: '안정적인 은퇴가 가능합니다',
    subtitle: '현재 계획대로라면 기대 수명까지 자산이 유지됩니다.',
  },
  caution: {
    bg: 'bg-warning-container',
    border: 'border-warning',
    badge: 'bg-warning-container text-warning',
    icon: '!',
    iconBg: 'bg-warning',
    title: '은퇴 계획 점검이 필요합니다',
    subtitle: '자산이 기대 수명 직전에 소진될 위험이 있습니다.',
  },
  danger: {
    bg: 'bg-error-container',
    border: 'border-error',
    badge: 'bg-error-container text-error',
    icon: '✕',
    iconBg: 'bg-error',
    title: '은퇴 자금이 부족합니다',
    subtitle: '현재 계획으로는 은퇴 후 자산이 조기에 소진됩니다.',
  },
}

function MetricCard({
  label,
  value,
  presentValue,
  sub,
  highlight,
  color,
}: {
  label: string
  value: string
  presentValue?: string
  sub?: string
  highlight?: boolean
  color?: 'primary' | 'success' | 'error' | 'warning' | 'secondary'
}) {
  const colorMap = {
    primary: 'text-primary',
    success: 'text-success',
    error: 'text-error',
    warning: 'text-warning',
    secondary: 'text-secondary',
  }
  return (
    <div className={`metric-card ${highlight ? 'metric-card-highlight' : ''}`}>
      <p className="text-[0.8125rem] text-on-surface-variant">{label}</p>
      <p className={`text-[1.0625rem] font-bold tabular-nums ${color ? colorMap[color] : 'text-on-surface'}`}>{value}</p>
      {presentValue && <p className="text-xs text-on-surface-variant tabular-nums">현재 가치 약 {presentValue}</p>}
      {sub && <p className="text-xs text-on-surface-variant">{sub}</p>}
    </div>
  )
}

export default function ResultDashboard({ result, input }: Props) {
  const cfg = assessmentConfig[result.assessment]
  const yearsInRetirement = input.lifeExpectancy - input.retirementAge
  const yearsToRetirement = input.retirementAge - input.currentAge
  const yearsToLifeExpectancy = input.lifeExpectancy - input.currentAge
  const todayValue = (amount: number, yearsFromNow: number) =>
    toPresentValue(amount, yearsFromNow, input.inflationRate)
  const signedWon = (amount: number) => (amount >= 0 ? `+${formatWon(amount)}` : formatWon(amount))

  return (
    <div className="space-y-4">
      {/* 종합 평가 */}
      <div className={`rounded-lg border p-6 ${cfg.bg} ${cfg.border}`}>
        <div className="flex items-start gap-4">
          <div className={`w-12 h-12 rounded-full ${cfg.iconBg} flex items-center justify-center flex-shrink-0`}>
            <span className="text-white text-xl font-bold">{cfg.icon}</span>
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold text-on-surface">{cfg.title}</h2>
            <p className="text-sm text-on-surface-variant mt-0.5">{cfg.subtitle}</p>
            <p className="text-xs text-on-surface-variant mt-1">
              은퇴까지 {yearsToRetirement}년 · 은퇴 후 {yearsInRetirement}년 ({input.lifeExpectancy}세까지)
            </p>

            {result.assetDepletionAge !== null && (
              <div className="mt-2 flex flex-wrap gap-2">
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${cfg.badge}`}>
                  자산 소진 예상: {result.assetDepletionAge}세
                </span>
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-surface-container text-on-surface-variant">
                  {result.assetDepletionAge - input.retirementAge}년 후
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 핵심 지표 */}
      <div className="card grid grid-cols-2 gap-3">
        <MetricCard
          label="은퇴 시점 총 자산"
          value={formatWon(result.retirementPortfolio)}
          presentValue={formatWon(todayValue(result.retirementPortfolio, yearsToRetirement))}
          sub={`${input.retirementAge}세 기준`}
          color="primary"
          highlight
        />
        <MetricCard
          label="기대 수명 잔여 자산"
          value={result.isStable ? formatWon(result.finalPortfolio) : '0원 (소진)'}
          presentValue={result.isStable ? formatWon(todayValue(result.finalPortfolio, yearsToLifeExpectancy)) : undefined}
          sub={`${input.lifeExpectancy}세 기준`}
          color={result.isStable ? 'success' : 'error'}
        />
        <MetricCard
          label="은퇴 후 월 수령액"
          value={formatWonMonth(result.monthlyTotalIncome)}
          presentValue={formatWonMonth(todayValue(result.monthlyTotalIncome, yearsToRetirement))}
          sub="은퇴 첫 해 기준"
          color="primary"
        />
        <MetricCard
          label="월 생활비 충족도"
          value={signedWon(result.monthlyShortfall)}
          presentValue={signedWon(todayValue(result.monthlyShortfall, yearsToRetirement))}
          sub={result.monthlyShortfall >= 0 ? '기대 수명까지 더 쓸 수 있는 생활비' : '기대 수명까지 줄여야 할 생활비'}
          color={result.monthlyShortfall >= 0 ? 'success' : 'error'}
        />
      </div>

      {/* 차트 */}
      <div className="card">
        <AssetChart
          data={result.yearlyData}
          retirementAge={input.retirementAge}
          lifeExpectancy={input.lifeExpectancy}
        />
      </div>

      {/* 은퇴 후 월 수입 구성 */}
      <div className="card">
        <h3 className="text-sm font-semibold text-on-surface mb-3">은퇴 후 월 수입 구성 (첫 해 기준)</h3>
        <div className="space-y-2 tabular-nums">
          <IncomeBar
            label="국민연금 / 개인연금"
            value={result.monthlyPension}
            total={result.monthlyExpenseAtRetirement}
            color="bg-data"
          />
          <IncomeBar
            label="임대 수익"
            value={result.monthlyRental}
            total={result.monthlyExpenseAtRetirement}
            color="bg-secondary"
          />
          <IncomeBar
            label="자산 인출"
            value={result.monthlyPortfolioIncome}
            total={result.monthlyExpenseAtRetirement}
            color="bg-tertiary"
          />
          <div className="border-t border-outline-variant pt-2 mt-2 space-y-1.5">
            <div className="flex justify-between text-sm">
              <span className="text-on-surface-variant">월 생활비 (은퇴 첫 해)</span>
              <span className="font-bold text-secondary">{formatWonMonth(result.monthlyExpenseAtRetirement)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-on-surface-variant">건강보험료 (지역가입자 추정)</span>
              <span className="font-bold text-secondary">{formatWonMonth(result.monthlyHealthInsurance)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 추가 조언 */}
      {!result.isStable && result.additionalMonthlySavingsNeeded > 0 && (
        <div className="card bg-primary-container border-primary-container">
          <h3 className="text-sm font-semibold text-on-surface mb-2">안정적 은퇴를 위한 제안</h3>
          <div className="space-y-2 text-sm text-on-surface-variant">
            <SuggestionItem>
              현재 생활비를 월{' '}
              <strong>{formatWon(result.additionalMonthlySavingsNeeded)}</strong> 줄여 저축하면 자산 부족 해소
              (현재 자산 기준 추정)
            </SuggestionItem>
            <SuggestionItem>
              {result.retirementDelayNeeded === null ? (
                <>은퇴를 {MAX_RETIREMENT_AGE}세까지 늦춰도 자산 부족이 해소되지 않음</>
              ) : (
                <>
                  은퇴를 <strong>{result.retirementDelayNeeded}년</strong> 늦추면(
                  {input.retirementAge + result.retirementDelayNeeded}세) 자산 부족 해소
                </>
              )}
            </SuggestionItem>
            <SuggestionItem>
              은퇴 후 생활비를 월{' '}
              <strong>{formatWon(todayValue(-result.monthlyShortfall, yearsToRetirement))}</strong> 줄이면 자산 부족
              해소 (현재 가치 기준)
            </SuggestionItem>
          </div>
          <p className="text-xs text-on-surface-variant mt-3">각 제안은 다른 입력을 그대로 두고 하나만 적용했을 때 기준입니다.</p>
        </div>
      )}

      {/* 계산 기준 */}
      <div className="card">
        <h3 className="text-sm font-semibold text-on-surface mb-4">계산 기준 및 가정사항</h3>
        <div className="space-y-3 text-xs text-on-surface-variant leading-relaxed">
          <div>
            <p className="font-semibold text-on-surface mb-1.5">■ 금액 표시 기준</p>
            <ul className="ml-4 space-y-1">
              <li>• 결과 금액은 해당 시점의 명목 금액 (미래 화폐 기준)</li>
              <li>• 현재 가치: 명목 금액을 물가 상승률로 할인한 오늘 기준 금액</li>
            </ul>
          </div>

          <div>
            <p className="font-semibold text-on-surface mb-1.5">■ 세금 및 공제 계산</p>
            <ul className="ml-4 space-y-1">
              <li>• 소득세: 8단계 누진세율 (6%~45%) 적용</li>
              <li>• 국민연금: 직장인 4.75%, 자영업자 9.5% (2026년, 상한 월 659만원)</li>
              <li>• 건강보험: 직장인 3.595%, 자영업자 7.19% (경비 30% 차감 후 사업소득 기준)</li>
              <li>• 장기요양보험: 건강보험료의 13.14%</li>
              <li>• 고용보험: 직장인 0.9% (자영업자 제외)</li>
              <li>• 기타 소득 건강보험: 직장인은 연 2,000만원 초과분, 자영업자는 전액에 7.19% + 장기요양 (본인 전액 부담)</li>
              <li>• 직장인 근로소득공제, 근로소득세액공제, 기본공제 1,500,000원 반영</li>
            </ul>
          </div>

          <div>
            <p className="font-semibold text-on-surface mb-1.5">■ 은퇴 전 자산 운용</p>
            <ul className="ml-4 space-y-1">
              <li>• 입력한 투자 수익률을 매년 복리로 적용</li>
              <li>• 세후 소득 + 기타 소득 - 생활비를 매년 자동으로 자산에 추가 (소득 외 추가 납입액 별도 반영)</li>
              <li>• 소득은 입력한 인상률만큼 매년 증가</li>
            </ul>
          </div>

          <div>
            <p className="font-semibold text-on-surface mb-1.5">■ 은퇴 후 자산 인출</p>
            <ul className="ml-4 space-y-1">
              <li>• 연금·임대 수익으로 모자란 생활비를 자산에서 인출</li>
              <li>• 월 생활비 충족도: 기대 수명까지 자산을 유지하면서 더 쓸 수 있는(+) 또는 줄여야 하는(-) 월 생활비 (은퇴 첫 해 금액)</li>
              <li>• 자산 인출 시점의 잔여 자산에 투자 수익률 적용</li>
              <li>• 생활비는 물가 상승률만큼 매년 증가</li>
              <li>• 국민연금·임대 수익은 현재 가치 입력을 오늘부터 물가 상승률만큼 증액</li>
              <li>• 개인연금은 입력한 명목 금액으로 고정 (물가 미반영)</li>
              <li>• 건강보험료(지역가입자) + 장기요양보험료를 매년 차감</li>
              <li className="ml-3">- 국민연금 소득 50% + 임대소득 기준, 사적연금·자산 인출은 제외</li>
              <li className="ml-3">- 부동산 재산분은 미반영 (실제보다 낮게 추정될 수 있음)</li>
            </ul>
          </div>

          <div>
            <p className="font-semibold text-on-surface mb-1.5">■ 안정성 평가 기준</p>
            <ul className="ml-4 space-y-1">
              <li>• <span className="text-success font-medium">안정</span>: 기대 수명까지 자산 유지</li>
              <li>• <span className="text-warning font-medium">주의</span>: 기대 수명 5년 이내 자산 소진</li>
              <li>• <span className="text-error font-medium">위험</span>: 기대 수명 5년 이상 전에 자산 소진</li>
            </ul>
          </div>

          <div className="pt-2 border-t border-outline-variant/50">
            <p className="text-on-surface-variant italic">
              본 시뮬레이터는 참고용이며, 실제 세금·연금·투자 결과와 다를 수 있습니다.
              세법 변경, 경제 상황 변화, 개인별 세액공제 등은 반영되지 않았습니다.
              중요한 재무 결정은 전문가와 상담하시기 바랍니다.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

function SuggestionItem({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2">
      <span className="mt-0.5 flex-shrink-0">→</span>
      <span>{children}</span>
    </div>
  )
}

function IncomeBar({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const pct = total > 0 ? Math.min(100, (value / total) * 100) : 0
  return (
    <div>
      <div className="flex justify-between text-xs text-on-surface-variant mb-1">
        <span>{label}</span>
        <span className="font-medium">{value > 0 ? formatWonMonth(value) : '—'}</span>
      </div>
      <div className="h-2.5 bg-surface-container rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all duration-500`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}
