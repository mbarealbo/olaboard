export default function OlaboardLogo({ size = 22, fontSize = 15, color = '#0a0a0a', gap = 7 }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap }}>
      <svg width={size} height={size * (46 / 48)} viewBox="0 0 48 46" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
        <path fill="#863bff" d="M25.946 44.938c-.664.845-2.021.375-2.021-.698V33.937a2.26 2.26 0 0 0-2.262-2.262H10.287c-.92 0-1.456-1.04-.92-1.788l7.48-10.471c1.07-1.497 0-3.578-1.842-3.578H1.237c-.92 0-1.456-1.04-.92-1.788L10.013.474c.214-.297.556-.474.92-.474h28.894c.92 0 1.456 1.04.92 1.788l-7.48 10.471c-1.07 1.498 0 3.579 1.842 3.579h11.377c.943 0 1.473 1.088.89 1.83L25.947 44.94z"/>
      </svg>
      <span style={{ fontSize, fontWeight: 750, letterSpacing: '-0.5px', color, lineHeight: 1 }}>
        Olaboard
      </span>
    </span>
  )
}
