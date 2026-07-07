interface AboutViewProps {
  onBack: () => void
}

export function AboutView({ onBack }: AboutViewProps) {
  return (
    <section className="view">
      <h2 className="step-title">
        <span className="step-eyebrow">The method</span>
        How it works
      </h2>
      <p>
        FitCheck runs a pose-estimation model (MediaPipe PoseLandmarker)
        directly in your browser. Your entered height calibrates the camera
        image from pixels to centimeters; lengths are measured between body
        landmarks, and chest, waist and hips are estimated by combining your
        front-view width with your side-view depth into an elliptical
        cross-section model. Every number is shown as a range because camera
        estimates have real uncertainty — treat them as sizing guidance, not
        tailor measurements.
      </p>
      <h2 className="step-title">
        <span className="step-eyebrow">The promise</span>
        Privacy
      </h2>
      <p>
        Nothing leaves your device. There is no server, no account, no
        analytics, and no cookies: the camera stream, the pose landmarks and
        your measurements are processed and kept only in your browser tab, and
        are gone when you close it. The AI models are static files served with
        this page — you can verify in your browser's network tools that no image
        or measurement data is ever uploaded.
      </p>
      <button type="button" className="primary" onClick={onBack}>
        Back
      </button>
    </section>
  )
}
