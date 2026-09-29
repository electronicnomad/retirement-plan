import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Legend,
} from 'recharts'
import type { YearlyData } from '../types'
import { formatWon } from '../utils/calculator'
import { colors } from '../theme/colors'

// Recharts는 Tailwind 클래스가 아닌 색상 값을 받으므로 토큰 값을 직접 참조
const COLORS = {
  portfolio: colors.data,
  pension: colors.data,
  rental: colors.secondary.DEFAULT,
  withdrawal: colors.tertiary.DEFAULT,
  reference: colors['on-surface'].variant,
  grid: colors.outline.variant,
  axis: colors['on-surface'].variant,
}

interface Props {
  data: YearlyData[]
  retirementAge: number
  lifeExpectancy: number
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null

  return (
    <div className="bg-white border border-outline-variant rounded-lg shadow-sm p-3 text-sm tabular-nums">
      <p className="font-bold text-on-surface mb-2">{label}세</p>
      {payload.map((entry: any) => (
        <div key={entry.name} className="flex items-center gap-2 mb-1">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
          <span className="text-on-surface-variant">{entry.name}:</span>
          <span className="font-semibold">{formatWon(entry.value)}</span>
        </div>
      ))}
    </div>
  )
}

function formatYAxis(value: number): string {
  if (value >= 10000) {
    const uk = Math.floor(value / 10000)
    return `${uk.toLocaleString()}억`
  }
  if (value >= 1000) return `${(value / 1000).toFixed(0)}천만`
  return `${value.toLocaleString()}만`
}

export default function AssetChart({ data, retirementAge, lifeExpectancy }: Props) {
  // 5년 단위로 데이터 레이블 표시
  const tickFormatter = (age: number) => {
    if (age % 5 === 0 || age === data[0]?.age || age === lifeExpectancy) return `${age}세`
    return ''
  }

  return (
    <div className="space-y-6">
      {/* 자산 추이 차트 */}
      <div>
        <h3 className="text-sm font-semibold text-on-surface mb-3">자산 추이 (명목 금액)</h3>
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={data} margin={{ top: 20, right: 10, left: 10, bottom: 0 }}>
            <defs>
              <linearGradient id="portfolioGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={COLORS.portfolio} stopOpacity={0.3} />
                <stop offset="95%" stopColor={COLORS.portfolio} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} />
            <XAxis
              dataKey="age"
              tickFormatter={tickFormatter}
              tick={{ fontSize: 11, fill: COLORS.axis }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tickFormatter={formatYAxis}
              tick={{ fontSize: 11, fill: COLORS.axis }}
              tickLine={false}
              axisLine={false}
              width={55}
            />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine
              x={retirementAge}
              stroke={COLORS.reference}
              strokeDasharray="4 4"
              strokeWidth={2}
              label={{ value: '은퇴', position: 'top', fontSize: 11, fill: COLORS.reference }}
            />
            <Area
              type="monotone"
              dataKey="portfolio"
              name="총 자산"
              stroke={COLORS.portfolio}
              strokeWidth={2}
              fill="url(#portfolioGrad)"
              dot={false}
              activeDot={{ r: 4, fill: COLORS.portfolio }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* 은퇴 후 연간 수입/지출 차트 */}
      <div>
        <h3 className="text-sm font-semibold text-on-surface mb-3">은퇴 후 연간 수입 vs 지출</h3>
        <RetirementIncomeChart data={data} retirementAge={retirementAge} />
      </div>
    </div>
  )
}

function RetirementIncomeChart({ data, retirementAge }: { data: YearlyData[]; retirementAge: number }) {
  const retirementData = data.filter((d) => d.phase === 'retirement').slice(0, 30)

  if (retirementData.length === 0) return null
  const hasRental = retirementData.some((d) => (d.rentalIncome ?? 0) > 0)

  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={retirementData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
        <defs>
          <linearGradient id="pensionGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={COLORS.pension} stopOpacity={0.4} />
            <stop offset="95%" stopColor={COLORS.pension} stopOpacity={0.02} />
          </linearGradient>
          <linearGradient id="rentalGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={COLORS.rental} stopOpacity={0.4} />
            <stop offset="95%" stopColor={COLORS.rental} stopOpacity={0.02} />
          </linearGradient>
          <linearGradient id="withdrawalGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={COLORS.withdrawal} stopOpacity={0.4} />
            <stop offset="95%" stopColor={COLORS.withdrawal} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} />
        <XAxis
          dataKey="age"
          tickFormatter={(v) => `${v}세`}
          tick={{ fontSize: 11, fill: COLORS.axis }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          tickFormatter={formatYAxis}
          tick={{ fontSize: 11, fill: COLORS.axis }}
          tickLine={false}
          axisLine={false}
          width={55}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend
          iconType="circle"
          iconSize={8}
          wrapperStyle={{ fontSize: '12px' }}
        />
        <Area
          type="monotone"
          dataKey="pensionIncome"
          name="연금 수입"
          stroke={COLORS.pension}
          strokeWidth={2}
          fill="url(#pensionGrad)"
          stackId="income"
          dot={false}
        />
        {/* 값이 0인 누적 영역은 선이 아래 영역의 윗선을 덮어 색이 섞여 보이므로 생략 */}
        {hasRental && (
          <Area
            type="monotone"
            dataKey="rentalIncome"
            name="임대 수입"
            stroke={COLORS.rental}
            strokeWidth={2}
            fill="url(#rentalGrad)"
            stackId="income"
            dot={false}
          />
        )}
        <Area
          type="monotone"
          dataKey="portfolioWithdrawal"
          name="자산 인출"
          stroke={COLORS.withdrawal}
          strokeWidth={2}
          fill="url(#withdrawalGrad)"
          stackId="income"
          dot={false}
        />
        <Area
          type="monotone"
          dataKey={(d: YearlyData) => d.annualExpenses + (d.healthInsurance ?? 0)}
          name="생활비 + 건강보험료"
          stroke={COLORS.reference}
          strokeWidth={2}
          strokeDasharray="5 3"
          fill="none"
          dot={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
