---
name: Ember & Grain
colors:
  surface: '#131313'
  surface-dim: '#131313'
  surface-bright: '#393939'
  surface-container-lowest: '#0e0e0e'
  surface-container-low: '#1b1c1c'
  surface-container: '#1f2020'
  surface-container-high: '#2a2a2a'
  surface-container-highest: '#353535'
  on-surface: '#e4e2e1'
  on-surface-variant: '#ddc1ae'
  inverse-surface: '#e4e2e1'
  inverse-on-surface: '#303030'
  outline: '#a48c7a'
  outline-variant: '#564334'
  surface-tint: '#ffb77d'
  primary: '#ffb77d'
  on-primary: '#4d2600'
  primary-container: '#ff8c00'
  on-primary-container: '#623200'
  inverse-primary: '#904d00'
  secondary: '#f0bba4'
  on-secondary: '#492818'
  secondary-container: '#66402f'
  on-secondary-container: '#e1ad96'
  tertiary: '#c8c6c5'
  on-tertiary: '#313030'
  tertiary-container: '#aba9a9'
  on-tertiary-container: '#3f3e3e'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#ffdcc3'
  primary-fixed-dim: '#ffb77d'
  on-primary-fixed: '#2f1500'
  on-primary-fixed-variant: '#6e3900'
  secondary-fixed: '#ffdbcc'
  secondary-fixed-dim: '#f0bba4'
  on-secondary-fixed: '#301406'
  on-secondary-fixed-variant: '#633e2c'
  tertiary-fixed: '#e5e2e1'
  tertiary-fixed-dim: '#c8c6c5'
  on-tertiary-fixed: '#1c1b1b'
  on-tertiary-fixed-variant: '#474746'
  background: '#131313'
  on-background: '#e4e2e1'
  surface-variant: '#353535'
typography:
  display-lg:
    fontFamily: Libre Caslon Text
    fontSize: 48px
    fontWeight: '700'
    lineHeight: '1.2'
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Libre Caslon Text
    fontSize: 32px
    fontWeight: '600'
    lineHeight: '1.3'
  headline-sm:
    fontFamily: Libre Caslon Text
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.4'
  body-lg:
    fontFamily: Hanken Grotesk
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
  body-md:
    fontFamily: Hanken Grotesk
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.5'
  body-sm:
    fontFamily: Hanken Grotesk
    fontSize: 14px
    fontWeight: '400'
    lineHeight: '1.5'
  label-caps:
    fontFamily: Hanken Grotesk
    fontSize: 12px
    fontWeight: '700'
    lineHeight: '1'
    letterSpacing: 0.08em
  headline-md-mobile:
    fontFamily: Libre Caslon Text
    fontSize: 28px
    fontWeight: '600'
    lineHeight: '1.3'
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  unit: 4px
  gutter: 24px
  margin-desktop: 64px
  margin-mobile: 16px
  container-max-width: 1440px
---

## Brand & Style
The design system reflects the premium craftsmanship of high-end charcoal grilling, blending traditional culinary authority with modern HR efficiency. It targets recruitment managers and hospitality professionals, evoking a sense of prestige, warmth, and culinary excellence.

The visual style is **Corporate Modern with Tactile influences**. It utilizes a dark, sophisticated foundation to mirror the atmosphere of a steakhouse, while maintaining high-utility through clean layouts. Depth is achieved via subtle textures—mimicking dark slate or polished mahogany—paired with crisp, glass-like cards for candidate management. The interface should feel as precise as a chef’s knife and as inviting as a hearth.

## Colors
The palette is rooted in the "Fire and Wood" concept.
- **Primary (Amber/Orange):** Used sparingly for key actions, embers, and "active" recruitment statuses. It represents the heat of the grill.
- **Secondary (Mahogany):** A rich, deep brown used for subtle accents, sidebars, or headers to ground the UI in tradition.
- **Tertiary/Neutral (Charcoal & Slate):** The primary background colors. `#1A1A1A` serves as the base surface, while `#2D2D2D` is used for containers and cards to create a tiered visual hierarchy.
- **Semantic Colors:** Status indicators use desaturated, "cooked" versions of standard colors to maintain the premium dark aesthetic without appearing overly neon.

## Typography
The typography strategy contrasts the heritage of the steakhouse with the data-driven nature of recruitment.
- **Headlines:** Use **Libre Caslon Text**. This serif face conveys authority, history, and the "premium" nature of the brand. Use for page titles and section headers.
- **UI & Data:** Use **Hanken Grotesk**. This contemporary sans-serif provides the clarity needed for scanning candidate resumes and pipeline metrics.
- **Letter Spacing:** Apply tight tracking to headings for a sophisticated editorial look. Labels should be uppercase with wide tracking for maximum legibility against dark backgrounds.

## Layout & Spacing
The design system utilizes a **12-column fixed grid** for desktop, centered within the viewport. 
- **Rhythm:** A 4px baseline grid ensures consistent vertical rhythm.
- **Density:** Use generous padding within cards (24px to 32px) to reflect the "spacious" feel of a luxury dining room. 
- **Mobile:** Transition to a 4-column fluid layout with reduced margins. Elements like candidate lists should utilize full-width patterns on mobile to maximize horizontal space for text.

## Elevation & Depth
Depth is created through **Tonal Layering** and **Subtle Textures** rather than heavy shadows.
- **Base Level (L0):** The deepest charcoal (`#1A1A1A`), optionally featuring a very low-opacity grain or slate texture overlay.
- **Surface Level (L1):** Cards and main content areas use `#2D2D2D`. 
- **Elevation Level (L2):** Overlays, modals, and tooltips use a slightly lighter neutral with a 1px inner border (`#FFFFFF` at 10% opacity) to simulate the edge of a polished surface.
- **Shadows:** Use large, highly diffused shadows (`blur: 40px`, `opacity: 40%`) with a dark brown/black tint to suggest weight and presence without breaking the dark-mode immersion.

## Shapes
The shape language is **Soft (0.25rem)**. 
- Sharp corners are avoided to keep the UI from feeling too "Brutalist," but high roundedness (pills) is reserved strictly for status tags and specific buttons to maintain a professional, architectural feel.
- **Candidate Avatars:** Should be circular to contrast against the rectangular grid of the pipeline.
- **Input Fields:** Use 4px (Soft) corner radius to match the overall container language.

## Components
- **Buttons:** Primary buttons use the Amber (`#FF8C00`) fill with dark text. Secondary buttons use an "Outlined" style with a Mahogany border.
- **Status Badges:** Use a "Pill" shape (Roundedness 3) with a low-opacity background tint and a solid-colored dot indicator (e.g., 'Interviewing' has a semi-transparent amber background with a solid amber dot).
- **Candidate Cards:** Utilize L1 surfaces. The top border of the card can feature a 2px mahogany accent line for candidates marked as "High Priority."
- **Data Lists:** High-contrast rows with subtle separators (`#FFFFFF` at 5% opacity). Hover states should subtly lighten the background of the row to `#363636`.
- **Pipeline Boards:** Use vertical columns with clear "drop zones" that utilize a dashed amber border when a candidate card is being dragged.
- **Inputs:** Dark backgrounds (`#121212`) with a subtle 1px border. On focus, the border transitions to Amber.