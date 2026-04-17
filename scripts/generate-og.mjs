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
  <!-- Logo icon (inlined) -->
  <g transform="translate(80, 130) scale(0.233)">
    <circle cx="150" cy="150" r="150" fill="#ffffff"/>
    <circle cx="150" cy="150" r="148" fill="none" stroke="#000000" stroke-width="4"/>
    <path d="M 90 240 C 90 195, 115 160, 150 160 C 185 160, 210 195, 210 240 L 210 280 L 90 280 Z" fill="#000000"/>
    <path d="M 95 130 C 95 90, 120 65, 150 65 C 180 65, 205 90, 205 130 L 205 190 C 205 220, 180 240, 150 240 C 120 240, 95 220, 95 190 Z" fill="#ffffff" stroke="#000000" stroke-width="4"/>
    <path d="M 90 130 C 90 82, 120 55, 150 55 C 180 55, 210 82, 210 130 L 235 135 C 242 137, 244 141, 244 145 L 244 149 C 244 153, 240 155, 235 154 L 215 150 L 210 150 C 205 150, 95 150, 90 150 Z" fill="#000000"/>
    <g transform="rotate(-8 135 125)">
      <rect x="116" y="107" width="38" height="38" rx="2" fill="#ffffff" stroke="#000000" stroke-width="4"/>
      <line x1="122" y1="119" x2="146" y2="119" stroke="#000000" stroke-width="2.5" stroke-linecap="round"/>
      <line x1="122" y1="127" x2="146" y2="127" stroke="#000000" stroke-width="2.5" stroke-linecap="round"/>
      <line x1="122" y1="135" x2="138" y2="135" stroke="#000000" stroke-width="2.5" stroke-linecap="round"/>
    </g>
    <circle cx="135" cy="175" r="5" fill="#000000"/>
    <circle cx="175" cy="175" r="5" fill="#000000"/>
    <path d="M 175 185 C 182 180, 190 183, 190 190 C 190 195, 185 200, 178 198" fill="none" stroke="#000000" stroke-width="3" stroke-linecap="round"/>
    <path d="M 140 210 C 145 215, 160 215, 165 210" fill="none" stroke="#000000" stroke-width="3" stroke-linecap="round"/>
  </g>
  <text x="162" y="200" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" font-size="72" font-weight="800" fill="#0a0a0a" letter-spacing="-3">Olaboard</text>

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
