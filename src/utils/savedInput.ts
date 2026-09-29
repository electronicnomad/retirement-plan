import type { RetirementInput } from '../types'

const STORAGE_KEY = 'retirement-plan:input'

// 저장된 값 중 기본값과 타입이 같은 필드만 받아들인다 (필드가 추가·변경되어도 안전하게 복원)
export function parseSavedInput(saved: string | null, defaults: RetirementInput): RetirementInput {
  if (saved === null) return defaults

  let parsed: unknown
  try {
    parsed = JSON.parse(saved)
  } catch {
    return defaults
  }
  if (typeof parsed !== 'object' || parsed === null) return defaults

  const savedFields = parsed as Record<string, unknown>
  const restored: Record<string, unknown> = { ...defaults }
  for (const key of Object.keys(defaults)) {
    const value = savedFields[key]
    if (typeof value === typeof restored[key]) restored[key] = value
  }
  return restored as unknown as RetirementInput
}

// 사생활 보호 모드 등에서 localStorage 접근이 막혀도 앱은 동작해야 한다
export function loadInput(defaults: RetirementInput): RetirementInput {
  try {
    return parseSavedInput(localStorage.getItem(STORAGE_KEY), defaults)
  } catch {
    return defaults
  }
}

export function saveInput(input: RetirementInput): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(input))
  } catch {
    // 저장하지 못해도 현재 세션 계산에는 영향 없음
  }
}
