// Stylised brand marks drawn in SVG. To use official artwork instead, put the
// files in src/assets and return <img src={...} /> for each id below.
export default function TelcoLogo({ id, size = 56 }) {
  const common = { width: size, height: size, viewBox: '0 0 64 64', role: 'img' }
  const font = { fontFamily: 'Arial, Helvetica, sans-serif', fontWeight: 900, textAnchor: 'middle' }

  if (id === 'MTN')
    return (
      <svg {...common} aria-label="MTN">
        <rect width="64" height="64" rx="14" fill="#FFCB05" />
        <ellipse cx="32" cy="32" rx="24" ry="14" fill="none" stroke="#00284B" strokeWidth="3.500" />
        <text x="32" y="38" fontSize="16" fill="#00284B" {...font}>MTN</text>
      </svg>
    )

  if (id === 'TELECEL')
    return (
      <svg {...common} aria-label="Telecel">
        <rect width="64" height="64" rx="14" fill="#E4002B" />
        <text x="32" y="37" fontSize="14.500" fill="#fff" letterSpacing="-0.300" {...font}>telecel</text>
      </svg>
    )

  return (
    <svg {...common} aria-label="AT">
      <rect width="64" height="64" rx="14" fill="#0B2A8F" />
      <text x="29" y="44" fontSize="34" fill="#fff" letterSpacing="-2" {...font}>at</text>
      <circle cx="50" cy="19" r="5" fill="#E4002B" />
    </svg>
  )
}
