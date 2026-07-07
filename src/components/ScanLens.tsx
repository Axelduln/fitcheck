import { useRef, type ReactNode } from 'react'

interface ScanLensProps {
  children: ReactNode
  /** Blueprint elements revealed under the cursor lens. */
  annotations?: ReactNode
  /** Extra class for the content wrapper (layout styles). */
  contentClassName?: string
}

/**
 * Cursor-lens blueprint wrapper (the landing-page mechanic, reusable):
 * a hidden measurement layer + fine grid sits under the children and is
 * revealed by a radial mask following the pointer. Faintly visible on
 * touch devices (see .scan-reveal media query).
 */
export function ScanLens({
  children,
  annotations,
  contentClassName,
}: ScanLensProps) {
  const wrapRef = useRef<HTMLDivElement>(null)

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = wrapRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    el.style.setProperty('--mx', `${e.clientX - rect.left}px`)
    el.style.setProperty('--my', `${e.clientY - rect.top}px`)
  }

  return (
    <div ref={wrapRef} className="lens-wrap" onPointerMove={onPointerMove}>
      <div className="scan-reveal" aria-hidden="true">
        {annotations}
      </div>
      <div
        className={`lens-content${contentClassName ? ` ${contentClassName}` : ''}`}
      >
        {children}
      </div>
    </div>
  )
}
