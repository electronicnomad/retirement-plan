import { useEffect, useRef } from 'react'

const AD_CLIENT = 'ca-pub-9199867433920998'

declare global {
  interface Window {
    adsbygoogle?: unknown[]
  }
}

export default function AdUnit({ slot, className }: { slot: string; className?: string }) {
  const pushed = useRef(false)

  useEffect(() => {
    // StrictMode가 effect를 두 번 실행하므로 한 번만 push (중복 시 AdSense가 오류 발생)
    if (pushed.current) return
    pushed.current = true
    try {
      ;(window.adsbygoogle = window.adsbygoogle || []).push({})
    } catch {
      // localhost나 광고 차단 환경에서는 로더가 없어 실패 — 무시
    }
  }, [])

  return (
    <ins
      className={`adsbygoogle ${className ?? ''}`}
      style={{ display: 'block' }}
      data-ad-client={AD_CLIENT}
      data-ad-slot={slot}
      data-ad-format="auto"
      data-full-width-responsive="true"
    />
  )
}
