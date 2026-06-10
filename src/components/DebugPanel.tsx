import { LANDMARK_NAMES } from '../lib/landmarkNames'

interface DebugPanelProps {
  fps: number
  visibilities: number[]
}

export function DebugPanel({ fps, visibilities }: DebugPanelProps) {
  return (
    <div className="debug-panel">
      <p className="debug-fps">{fps} FPS</p>
      {visibilities.length === 0 ? (
        <p>No landmarks detected.</p>
      ) : (
        <table className="debug-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Landmark</th>
              <th>Visibility</th>
            </tr>
          </thead>
          <tbody>
            {visibilities.map((v, i) => (
              <tr key={i} className={v < 0.7 ? 'low-visibility' : undefined}>
                <td>{i}</td>
                <td>{LANDMARK_NAMES[i] ?? `landmark ${i}`}</td>
                <td>{v.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
