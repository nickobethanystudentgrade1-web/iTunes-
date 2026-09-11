/**
 * Semantic design tokens for the mobile app.
 *
 * These tokens mirror the naming conventions used in web artifacts (index.css)
 * so that multi-artifact projects share a cohesive visual identity.
 *
 * Replace the placeholder values below with values that match the project's
 * brand. If a sibling web artifact exists, read its index.css and convert the
 * HSL values to hex so both artifacts use the same palette.
 *
 * To add dark mode, add a `dark` key with the same token names.
 * The useColors() hook will automatically pick it up.
 */

const colors = {
  light: {
    // Legacy aliases (kept for backward compatibility)
    text: '#F5F7FF',
    tint: '#9D7BFF',

    // Core surfaces
    background: '#090B18',
    foreground: '#F5F7FF',

    // Cards / elevated surfaces
    card: '#14182B',
    cardForeground: '#F5F7FF',

    // Primary action color (buttons, links, active states)
    primary: '#A884FF',
    primaryForeground: '#0B0C18',

    // Secondary / less-emphasis interactive surfaces
    secondary: '#202640',
    secondaryForeground: '#F5F7FF',

    // Muted / subdued elements (dividers, timestamps, placeholders)
    muted: '#1B2037',
    mutedForeground: '#A7AEC8',

    // Accent highlights (badges, selected items, focus rings)
    accent: '#252D52',
    accentForeground: '#D9D4FF',

    // Destructive actions (delete, error states)
    destructive: '#FF6B82',
    destructiveForeground: '#230914',

    // Borders and input outlines
    border: '#2A3150',
    input: '#2B3355',
  },

  // Border radius (in px). Sync from the sibling web artifact's --radius
  // CSS variable. This value applies to cards, buttons, inputs, and modals.
  radius: 18,
};

export default colors;
