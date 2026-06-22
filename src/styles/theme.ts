/**
 * RUNSTR Theme System
 * Exact values from HTML mockup CSS
 */

export const colors = {
  // Core backgrounds - OLED-friendly, cards layer visibly on canvas
  background: '#050505', // body background (near-black, lets cards layer)
  cardBackground: '#0a0a0a', // all cards
  card: '#0a0a0a', // alias for cardBackground for compatibility
  border: '#1a1a1a', // card borders, separators

  // Orange palette - from RUNSTR logo
  orangeBright: '#FF9D42', // Bright orange (highlights, active states)
  orangeDeep: '#FF7B1C', // Deep orange (primary actions, mid-tones)
  orangeBurnt: '#E65100', // Burnt orange (darker accents, emphasis)
  orangeDark: '#BF360C', // Dark orange (subtle accents)

  // Text colors - ALL ORANGE, NO WHITE
  text: '#FFB366', // Light orange for primary text (readable on black)
  textSecondary: '#FF9D42', // Bright orange for secondary text
  textMuted: '#CC7A33', // Muted orange for labels
  textDark: '#996633', // Dark orange for details
  textOrange: '#FF9D42', // Bright orange for headings/emphasis
  textOrangeDeep: '#FF7B1C', // Deep orange text variant
  textBright: '#FFB366', // Light orange (replaces white)

  // Accent colors - updated to orange theme
  accent: '#FF7B1C', // Primary accent (deep orange)
  accentBright: '#FF9D42', // Bright accent (bright orange)
  accentText: '#000000', // Black text on bright orange backgrounds

  // Button styles - orange theme
  button: 'transparent', // .manage-wallet-btn, .edit-btn background
  buttonBorder: '#FF7B1C', // Orange button borders
  buttonHover: '#1a1a1a', // hover states, .nav-item.active
  buttonPrimary: '#FF7B1C', // Primary button background (deep orange)

  // Modal overlay - standardized opacity
  modalOverlay: 'rgba(0, 0, 0, 0.92)', // Near-opaque for OLED; avoids the 0.85 uncanny valley

  // Input focus state
  inputFocus: '#FF7B1C', // Orange border when input is focused

  // Special backgrounds
  prizeBackground: '#1a1a1a', // .challenge-prize background
  navBackground: '#0a0a0a', // .bottom-nav background
  syncBackground: '#333333', // .sync-icon, .leaderboard-avatar background
  switchTrackOff: '#3a3a3a', // Switch/toggle track when OFF (neutral, reads as off; NOT orange)

  // Status indicators
  statusConnected: '#FF9D42', // Connected state (bright orange)
  statusDot: '#666666', // .status-dot

  // Additional colors needed by components
  textPrimary: '#FFB366', // Light orange for primary text (NO WHITE)
  primary: '#FF7B1C', // Primary action color (deep orange)
  textTertiary: '#999999', // For darker text
  gray: '#333333', // For borders and backgrounds
  error: '#FF6B00', // Error messages and validation (vivid orange)
  warning: '#FF9D42', // Warning/security indicators (bright orange)
  success: '#FF9D42', // Success states - ORANGE not green (matches theme)

  // Consolidated button styling - single source of truth
  buttons: {
    primary: {
      background: '#FF7B1C',
      text: '#000000',
      border: '#E65100',
    },
    secondary: {
      background: 'transparent',
      text: '#FF7B1C',
      border: '#FF7B1C',
    },
  },
} as const;

export const typography = {
  // Exact font sizes from CSS
  statusBar: 16, // .status-bar
  teamName: 20, // .team-name
  prizeNumber: 24, // .prize-number
  balanceNumber: 24, // .balance-number
  leaderboardTitle: 18, // .leaderboard-title
  cardTitle: 16, // .card-title
  leaderboardName: 15, // .leaderboard-name
  aboutText: 14, // .about-text
  eventName: 13, // .event-name, .challenge-name
  prizeCurrency: 12, // .prize-currency
  rankText: 12, // .rank font-size
  eventDetails: 11, // .event-details
  aboutTitle: 11, // .about-title
  addBtn: 10, // .add-btn
  challengePrize: 10, // .challenge-prize
  navLabel: 10, // .nav-label

  // Additional typography needed by components
  headingSecondary: 18, // Secondary heading size
  headingTertiary: 16, // Tertiary heading size
  body: 14, // Body text size

  // Font weights - exact from CSS
  weights: {
    regular: '400' as const,
    medium: '500' as const,
    semiBold: '600' as const,
    bold: '700' as const,
    extraBold: '800' as const,
  },

  // Semantic size scale — prefer for new work
  size: {
    xs: 11, // UPPERCASE labels, micro-eyebrow
    sm: 13, // secondary body, metadata
    base: 15, // body text
    md: 17, // item titles, nav
    lg: 22, // section headings
    xl: 32, // stat numbers, prominent values
    '2xl': 48, // hero numbers
    '3xl': 72, // tracker distance / timer
  },
} as const;

export const spacing = {
  // Legacy scale — kept for existing call sites, prefer spacing.scale for new work
  xs: 2,
  sm: 4,
  md: 6,
  lg: 8,
  xl: 12,
  xxl: 16,
  xxxl: 20,

  // Semantic scale — 4pt grid, use for new work
  scale: {
    xs: 4, // tight gaps, inner padding
    sm: 8, // default element gap
    md: 12, // between grouped elements
    lg: 16, // card internal padding
    xl: 24, // section gap
    '2xl': 32, // screen padding
    '3xl': 48, // hero / top-of-screen breathing room
  },
} as const;

export const borderRadius = {
  // Exact border radius from CSS
  small: 6, // .menu-btn, .manage-wallet-btn, .challenge-prize
  medium: 8, // .nav-item
  large: 12, // .main-leaderboard, .events-card, .rank.top3, .add-btn
  xl: 16, // .leaderboard-avatar size / 2
  circle: 18, // .leaderboard-avatar border-radius
  round: 50, // For fully round elements
} as const;

export const layout = {
  // Exact layout values from CSS
  phoneWidth: 375, // .phone-container width
  phoneHeight: 812, // .phone-container height
  statusBarHeight: 44, // Combined status bar area
  bottomNavHeight: 50, // .bottom-nav height
  headerHeight: 56, // .header total height

  // Component sizes - exact from CSS
  menuBtnSize: 28, // .menu-btn width/height
  rankSize: 24, // .rank width/height
  avatarSize: 36, // .leaderboard-avatar width/height
  profileAvatarSize: 64, // .profile-avatar width/height
  syncIconSize: 32, // .sync-icon width/height

  // Battery indicator - exact from CSS
  batteryWidth: 24, // .battery width
  batteryHeight: 12, // .battery height
} as const;

// Theme object combining all values
export const theme = {
  colors,
  typography,
  spacing,
  borderRadius,
  layout,
} as const;

export type Theme = typeof theme;
export type Colors = typeof colors;
export type Typography = typeof typography;
