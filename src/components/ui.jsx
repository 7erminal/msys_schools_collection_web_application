export function Alert({ kind = 'error', children }) {
  if (!children) return null
  return (
    <div className={`alert alert-${kind}`} role={kind === 'error' ? 'alert' : 'status'}>
      <span className="alert-icon" aria-hidden="true">{kind === 'error' ? '!' : '✓'}</span>
      <span>{children}</span>
    </div>
  )
}

export function Field({ label, hint, children }) {
  return (
    <label className="field">
      <span className="field-label">
        {label}
        {hint && <em>{hint}</em>}
      </span>
      {children}
    </label>
  )
}

export function Button({ loading, children, className = '', ...props }) {
  return (
    <button {...props} className={`btn ${className}`} disabled={loading || props.disabled}>
      {loading && <span className="spinner" aria-hidden="true" />}
      {children}
    </button>
  )
}

export function Logo({ size = 44 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
      <defs>
        <linearGradient id="lg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#16a34a" />
          <stop offset="1" stopColor="#06b6d4" />
        </linearGradient>
      </defs>
      <rect width="48" height="48" rx="12" fill="url(#lg)" />
      <path
        d="M24 12 8 20l16 8 13-6.5V31h3V20L24 12Zm-9 15.5V33c0 2.2 4 4 9 4s9-1.800 9-4v-5.5L24 32l-9-4.500Z"
        fill="#fff"
      />
    </svg>
  )
}
