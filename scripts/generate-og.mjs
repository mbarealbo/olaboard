import sharp from 'sharp'

const svg = `<svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="4" stdDeviation="12" flood-color="rgba(0,0,0,0.10)"/>
    </filter>
    <filter id="shadow-sm" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="2" stdDeviation="6" flood-color="rgba(0,0,0,0.08)"/>
    </filter>
  </defs>

  <!-- Background -->
  <rect width="1200" height="630" fill="#ffffff"/>

  <!-- Dot grid -->
  <pattern id="dots" x="0" y="0" width="24" height="24" patternUnits="userSpaceOnUse">
    <circle cx="1" cy="1" r="1" fill="#e5e7eb"/>
  </pattern>
  <rect width="1200" height="630" fill="url(#dots)" opacity="0.7"/>

  <!-- Post-it 1 — yellow, slight tilt left -->
  <g transform="translate(680, 90) rotate(-2)" filter="url(#shadow)">
    <rect width="190" height="170" rx="10" fill="#FFF176"/>
    <rect x="14" y="18" width="80" height="10" rx="5" fill="rgba(0,0,0,0.18)"/>
    <rect x="14" y="36" width="130" height="7" rx="3.5" fill="rgba(0,0,0,0.10)"/>
    <rect x="14" y="50" width="110" height="7" rx="3.5" fill="rgba(0,0,0,0.10)"/>
    <rect x="14" y="64" width="120" height="7" rx="3.5" fill="rgba(0,0,0,0.10)"/>
  </g>

  <!-- Post-it 2 — blue, slight tilt right -->
  <g transform="translate(900, 140) rotate(1.5)" filter="url(#shadow)">
    <rect width="190" height="160" rx="10" fill="#B3E5FC"/>
    <rect x="14" y="18" width="100" height="10" rx="5" fill="rgba(0,0,0,0.18)"/>
    <rect x="14" y="36" width="140" height="7" rx="3.5" fill="rgba(0,0,0,0.10)"/>
    <rect x="14" y="50" width="90" height="7" rx="3.5" fill="rgba(0,0,0,0.10)"/>
  </g>

  <!-- Post-it 3 — green, slight tilt left -->
  <g transform="translate(750, 300) rotate(-1)" filter="url(#shadow)">
    <rect width="190" height="150" rx="10" fill="#C8E6C9"/>
    <rect x="14" y="18" width="90" height="10" rx="5" fill="rgba(0,0,0,0.18)"/>
    <rect x="14" y="36" width="130" height="7" rx="3.5" fill="rgba(0,0,0,0.10)"/>
    <rect x="14" y="50" width="100" height="7" rx="3.5" fill="rgba(0,0,0,0.10)"/>
    <rect x="14" y="64" width="115" height="7" rx="3.5" fill="rgba(0,0,0,0.10)"/>
  </g>

  <!-- Post-it 4 — pink, slight tilt right -->
  <g transform="translate(960, 330) rotate(2)" filter="url(#shadow)">
    <rect width="190" height="160" rx="10" fill="#F8BBD0"/>
    <rect x="14" y="18" width="110" height="10" rx="5" fill="rgba(0,0,0,0.18)"/>
    <rect x="14" y="36" width="140" height="7" rx="3.5" fill="rgba(0,0,0,0.10)"/>
    <rect x="14" y="50" width="80" height="7" rx="3.5" fill="rgba(0,0,0,0.10)"/>
  </g>

  <!-- Arrows between post-its -->
  <!-- Arrow 1: from post-it 1 to post-it 3 -->
  <path d="M 790 240 C 790 280 790 290 800 310" stroke="#378ADD" stroke-width="2.5" fill="none" stroke-linecap="round" opacity="0.6"/>
  <polygon points="796,308 800,320 804,308" fill="#378ADD" opacity="0.6"/>

  <!-- Arrow 2: from post-it 2 to post-it 4 -->
  <path d="M 975 300 C 975 315 975 320 980 335" stroke="#378ADD" stroke-width="2.5" fill="none" stroke-linecap="round" opacity="0.6"/>
  <polygon points="976,333 980,345 984,333" fill="#378ADD" opacity="0.6"/>

  <!-- Arrow 3: from post-it 1 to post-it 2 -->
  <path d="M 868 175 C 890 175 895 175 902 175" stroke="#378ADD" stroke-width="2.5" fill="none" stroke-linecap="round" opacity="0.6"/>
  <polygon points="900,171 912,175 900,179" fill="#378ADD" opacity="0.6"/>

  <!-- Left panel — brand + text -->
  <!-- Logo icon -->
  <svg x="80" y="132" width="60" height="58" viewBox="0 0 48 46" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path fill="#863bff" d="M25.946 44.938c-.664.845-2.021.375-2.021-.698V33.937a2.26 2.26 0 0 0-2.262-2.262H10.287c-.92 0-1.456-1.04-.92-1.788l7.48-10.471c1.07-1.497 0-3.578-1.842-3.578H1.237c-.92 0-1.456-1.04-.92-1.788L10.013.474c.214-.297.556-.474.92-.474h28.894c.92 0 1.456 1.04.92 1.788l-7.48 10.471c-1.07 1.498 0 3.579 1.842 3.579h11.377c.943 0 1.473 1.088.89 1.83L25.947 44.94z"/>
  </svg>
  <text x="152" y="200" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" font-size="72" font-weight="800" fill="#0a0a0a" letter-spacing="-3">Olaboard</text>

  <text x="82" y="258" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" font-size="26" font-weight="400" fill="#555" letter-spacing="-0.5">Visual thinking on an infinite canvas.</text>

  <!-- Feature pills -->
  <g transform="translate(82, 308)">
    <!-- Pill 1 -->
    <rect width="130" height="34" rx="17" fill="#f0f7ff" stroke="#d0e6ff" stroke-width="1"/>
    <text x="18" y="22" font-family="-apple-system, sans-serif" font-size="14" font-weight="600" fill="#378ADD">Post-its</text>

    <!-- Pill 2 -->
    <rect x="144" width="110" height="34" rx="17" fill="#f0f7ff" stroke="#d0e6ff" stroke-width="1"/>
    <text x="162" y="22" font-family="-apple-system, sans-serif" font-size="14" font-weight="600" fill="#378ADD">Notes</text>

    <!-- Pill 3 -->
    <rect x="268" width="130" height="34" rx="17" fill="#f0f7ff" stroke="#d0e6ff" stroke-width="1"/>
    <text x="286" y="22" font-family="-apple-system, sans-serif" font-size="14" font-weight="600" fill="#378ADD">Folders</text>

    <!-- Pill 4 -->
    <rect x="412" width="120" height="34" rx="17" fill="#f0f7ff" stroke="#d0e6ff" stroke-width="1"/>
    <text x="430" y="22" font-family="-apple-system, sans-serif" font-size="14" font-weight="600" fill="#378ADD">Arrows</text>
  </g>

  <!-- CTA badge -->
  <g transform="translate(82, 380)">
    <rect width="210" height="50" rx="25" fill="#0a0a0a"/>
    <text x="28" y="31" font-family="-apple-system, sans-serif" font-size="16" font-weight="700" fill="#ffffff">Free to use →</text>
  </g>

  <!-- Subtle domain -->
  <text x="82" y="580" font-family="-apple-system, sans-serif" font-size="15" font-weight="500" fill="#ccc">olaboard.netlify.app</text>
</svg>`

await sharp(Buffer.from(svg))
  .png()
  .toFile('public/og-image.png')

console.log('og-image.png generated ✓')
