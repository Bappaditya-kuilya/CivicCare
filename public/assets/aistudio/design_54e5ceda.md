# Design System and UI Specification

> Purpose: Reproduce the visual design and responsive layout shown in the supplied reference images.
>
> Scope: **Visual design only.** Do not copy the reference product's domain model, workflows, business rules, or core functionality. Keep the existing project's features and data model unchanged.

## 1. Design Direction

Build a polished, responsive web application with a clean productivity-dashboard aesthetic.

- Light, near-white surfaces with subtle cool-gray backgrounds.
- Deep indigo and violet for primary actions and selected navigation.
- Rounded cards with fine borders and restrained shadows.
- Dark navy headers for compact mobile panels and preview surfaces.
- Clear typography, generous whitespace, compact data rows, and small illustrative graphics.
- Desktop layouts use a persistent left sidebar and a wide content canvas.
- Mobile layouts use a narrow single-column flow, compact headers, and bottom navigation where appropriate to the existing application.

Do not reproduce the reference text, names, sample balances, expense records, avatars, or expense-specific concepts. Use the current product's own content and labels.

## 2. Visual Tokens

Use CSS variables or the project's existing token system. Treat these values as starting points and tune them to match the reference.

```css
:root {
  /* Surfaces */
  --color-page: #f4f5f8;
  --color-surface: #ffffff;
  --color-surface-muted: #f7f8fb;
  --color-header-dark: #171925;
  --color-header-dark-raised: #222431;

  /* Text */
  --color-text: #17181d;
  --color-text-secondary: #5e606b;
  --color-text-muted: #858793;
  --color-text-on-dark: #f7f7fb;

  /* Brand */
  --color-primary: #4f46c8;
  --color-primary-hover: #4338b5;
  --color-primary-soft: #e8e8fb;
  --color-primary-border: #c9c8f1;

  /* Status */
  --color-success: #25985a;
  --color-success-soft: #d8f3e3;
  --color-danger: #a33e3e;
  --color-danger-soft: #fae4e4;
  --color-info: #344da6;

  /* Borders and shadows */
  --color-border: #d8dbe2;
  --color-border-strong: #c7cad3;
  --shadow-card: 0 2px 8px rgb(23 25 37 / 5%);
  --shadow-window: 0 14px 32px rgb(18 20 30 / 15%);
  --shadow-floating: 0 5px 12px rgb(18 20 30 / 18%);

  /* Shape */
  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 16px;
  --radius-pill: 999px;

  /* Spacing */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-8: 32px;
  --space-10: 40px;

  /* Typography */
  --font-sans: Inter, ui-sans-serif, system-ui, -apple-system,
    BlinkMacSystemFont, "Segoe UI", sans-serif;
}
```

## 3. Typography

Use a modern sans-serif family such as Inter or the system UI stack.

- Page title: 30–34px desktop, 25–29px mobile; weight 600–700.
- Section title: 19–22px; weight 600.
- Card title: 16–18px; weight 600.
- Body text: 14–16px; weight 400.
- Navigation labels: 14–15px.
- Table headers and metadata: 12–14px; medium weight.
- Large numeric highlights: 25–30px; weight 650–700.
- Supporting notes: 12–14px with comfortable line-height.
- Use tabular numerals for numeric values that need consistent alignment.

Keep hierarchy obvious. Avoid excessive font weights, uppercase labels, and oversized text outside the main page heading.

## 4. Application Shell

### Desktop: 1280px and wider

Use a full-height application shell.

- A slim top bar, approximately 54–60px high.
- Brand mark and product name aligned left.
- Status indicator and one or two key actions aligned right.
- A left sidebar approximately 170–220px wide.
- Main content fills the remaining width with 20–24px internal padding.
- Use a subtle vertical border between the sidebar and content.
- Keep the page background light gray and content cards white.
- Allow the content area to scroll independently if the application already uses that pattern.

Suggested structure:

```text
┌──────────────────────────────────────────────────────────────┐
│ Brand / Product                      Status       Actions    │
├───────────────┬──────────────────────────────────────────────┤
│ Sidebar       │ Page title                       Main action │
│ Navigation    │ Supporting metadata / avatars                │
│               │                                              │
│               │ Summary cards                                │
│               │                                              │
│               │ Main content card / table / form             │
└───────────────┴──────────────────────────────────────────────┘
```

### Tablet: 768–1279px

- Keep the sidebar if space allows; otherwise collapse it to an icon rail.
- Reduce main content padding to 16–20px.
- Use two columns only when each card can retain a usable width.
- Move secondary actions into an overflow menu when the header becomes crowded.

### Mobile: up to 767px

- Use a single-column layout.
- Hide the full desktop sidebar.
- Use a compact top bar with a small brand mark and essential utility icons.
- Place page title and primary action in a compact dark header when it suits the existing screen.
- Stack summary cards vertically, or use a two-column grid only for short, compact metrics.
- Convert wide tables into stacked rows or cards. Never force the whole page to scroll horizontally.
- Keep important actions reachable with a fixed bottom action or bottom navigation only where appropriate.
- Respect safe-area insets on mobile devices.
- Use 12–16px horizontal page padding.

## 5. Header and Navigation

### Top bar

- White background with a subtle bottom border.
- Height around 56px.
- Small square brand icon with a violet background and white glyph.
- Product name in 14–16px semibold text.
- Align utility controls in a compact horizontal row.
- Use consistent icon size, around 16–20px.
- Primary action uses the brand color and a subtle shadow.

### Sidebar

- White or near-white background.
- Width around 190px on desktop.
- Navigation items are approximately 34–40px high.
- Use simple outline icons with consistent stroke weight.
- Selected item has a pale violet background, dark violet text, and a narrow violet indicator on the left edge.
- Unselected items use muted text and neutral icons.
- Group related navigation items with consistent vertical spacing.
- If the current product has user or workspace entries, display compact circular avatars or icons with labels.

### Mobile navigation

- Use a bottom navigation bar only if the current product needs persistent top-level navigation.
- White surface, thin top border, four or fewer visible destinations.
- Center icons and labels; highlight the active destination in violet.
- Reserve space so content is not hidden behind the bar.

## 6. Cards and Surfaces

### Standard card

- White background.
- 1px solid neutral border.
- 12–16px corner radius.
- 16–24px padding on desktop; 12–16px on mobile.
- Very subtle shadow, or no shadow when cards sit on a white content canvas.
- Use clear spacing between the card title and its content.

### Summary card

- Compact, high-contrast label.
- Large value or primary result beneath the label.
- Optional icon or small trend graphic aligned to the side.
- Green is reserved for positive or successful states; red for negative or failed states.
- Avoid gradients except for small decorative details.

### Informational callout

- White card with a fine border and rounded corners.
- Small information icon aligned to the top-left.
- Short title and compact supporting text.
- Use 12–14px body text and a line-height of roughly 1.35–1.5.
- On desktop, a callout may sit beside or overlay an illustration if it does not obscure essential content.
- On mobile, place it in normal document flow.

### Dark panel

Use sparingly for mobile page headers, compact previews, or secondary panels.

- Background: deep navy or charcoal.
- Light foreground text.
- Slightly lighter nested cards.
- Thin low-contrast borders.
- Keep text and controls readable at all times.
- Do not turn every card dark.

## 7. Buttons and Form Controls

### Buttons

Primary button:
- Violet background.
- White label.
- 8–10px corner radius.
- 40–44px minimum height.
- Medium or semibold text.
- Optional leading icon with 8px gap.
- Subtle shadow.

Secondary button:
- White or light-gray background.
- Neutral border.
- Dark-gray label.
- Same height and radius as the primary button.

Icon button:
- Minimum 40×40px interactive area.
- Transparent background at rest.
- Visible hover, focus, active, and disabled states.

Hover and focus:
- Darken the primary color slightly on hover.
- Provide a clearly visible keyboard focus ring.
- Do not rely on color alone to communicate focus or status.
- Disabled controls must look disabled and must not imply successful activation.

### Inputs and selectors

- White background with a 1px neutral border.
- 40–44px height for standard controls.
- 8–10px corner radius.
- 14–16px text.
- Labels appear above fields rather than relying on placeholder text.
- Focus state uses a violet border and visible focus ring.
- Error messages sit immediately below the relevant field.
- Preserve the current application's validation behavior and field semantics.

### Selection tiles

For screens that already use selectable categories or options:

- Arrange tiles in a responsive grid.
- Use simple icons, short labels, and consistent tile dimensions.
- Selected tile: pale violet fill, violet border, and dark text.
- Unselected tile: white fill and neutral border.
- Keep the whole tile keyboard accessible if it acts as a control.

## 8. Data Tables and Repeated Rows

On desktop:

- Use a full-width table inside a bordered card.
- Keep column headings visually distinct from data rows.
- Use 12–14px headings and 14–15px body text.
- Add thin horizontal separators between rows.
- Vertically center content.
- Right-align numeric columns.
- Use compact circular avatars only when the current product has user identities.
- Keep row heights around 42–48px.

On mobile:

- Transform each record into a stacked row or compact card.
- Place the primary label on the first line and supporting metadata below it.
- Keep key values aligned to the right when the layout allows.
- Use separators between records.
- Avoid tiny text and horizontal overflow.
- Preserve the same information hierarchy as desktop even if the layout changes.

## 9. Avatars and Illustrations

### Avatars

- Use circular crops.
- Typical sizes: 28–36px for compact rows, 36–44px for member or profile strips.
- Keep consistent sizing within the same component.
- Use small, controlled gaps between adjacent avatars.
- If no real avatar is available, use a neutral initial-based fallback.
- Do not reuse reference-image people or imply that sample identities belong to the current product.

### Illustrations

The references use friendly, flat vector illustrations with a restrained palette.

- Use simple geometric forms and clean outlines.
- Prefer indigo, blue, green, muted skin tones, and neutral grays.
- Keep illustrations secondary to the page's primary task.
- Use one prominent illustration per empty state or introductory panel.
- On desktop, an illustration may sit beside a form or below a summary.
- On mobile, place it above the heading or omit it when space is limited.
- Use project-owned or properly licensed assets. Do not copy embedded reference artwork directly.

## 10. Landing and Authentication Layout

Apply this layout only if the current product has a landing or sign-in screen.

### Desktop

- White top navigation with brand on the left and a small set of links on the right.
- Main section uses a spacious two-column composition.
- Left column: concise heading, short supporting paragraph, primary call to action, and illustration.
- Right column: bordered authentication card with labels, inputs, primary button, and optional supported sign-in providers.
- Separate the columns with whitespace or a subtle vertical divider.
- Keep the login card around 300–360px wide when the viewport permits.

### Mobile

- Stack the illustration, heading, description, and authentication card vertically.
- Reduce heading size and maintain readable line lengths.
- Make form controls and primary actions full width.
- Keep external sign-in buttons equal in size and spacing.
- Avoid desktop-only columns or clipped content.

Do not add authentication or third-party login options if the existing product does not support them.

## 11. Page Layout Patterns

Use the pattern that best fits each existing screen.

### Overview page

1. Page title and primary action.
2. Compact supporting information or identity strip.
3. Summary cards.
4. Main content card containing the primary information.
5. Optional illustration, empty state, or informational callout.

### Creation or setup page

1. Page title with cancel and confirm actions.
2. Clearly numbered sections or grouped cards.
3. Labels and controls arranged in a logical order.
4. Optional illustration in a secondary desktop column.
5. Single-column form on mobile, with a clear final action.

### Detail page

1. Compact header with title and primary action.
2. Summary information near the top.
3. Main records or detail sections.
4. Secondary information in a sidebar on wide screens, moving below the main content on mobile.

These patterns define presentation only. Retain the existing application's actual screens, routes, and workflows.

## 12. Responsive Breakpoints

Use the project's current breakpoint conventions when they exist. Otherwise, start with:

```css
/* Small mobile */
@media (max-width: 389px) {}

/* Mobile */
@media (max-width: 767px) {}

/* Tablet */
@media (min-width: 768px) and (max-width: 1279px) {}

/* Desktop */
@media (min-width: 1280px) {}
```

Responsive rules:

- No horizontal page overflow at 320px viewport width.
- Desktop sidebar collapses or disappears on mobile.
- Multi-column layouts collapse to one column when their content becomes cramped.
- Buttons remain comfortably tappable.
- Cards never exceed their parent container width.
- Long labels wrap safely.
- Tables reflow into mobile-friendly rows.
- Fixed mobile controls must not cover content or form actions.

## 13. Motion and Interaction States

Keep motion restrained and functional.

- Hover transitions: approximately 120–180ms.
- Use small color or border transitions rather than large movement.
- Avoid decorative animation that distracts from the task.
- Respect `prefers-reduced-motion`.
- Provide hover, focus-visible, active, disabled, loading, success, and error states where applicable.
- Use accessible contrast and do not encode status by color alone.
- All controls must work with keyboard navigation and touch input.

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    scroll-behavior: auto !important;
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

## 14. Accessibility Requirements

- Use semantic landmarks and headings in logical order.
- Associate each form control with a visible label.
- Keep keyboard focus visible.
- Maintain sufficient text and control contrast.
- Provide accessible names for icon-only buttons.
- Use at least 40×40px targets where practical; aim for 44×44px on mobile.
- Do not use color as the only status indicator.
- Ensure dialogs, menus, and other overlays support keyboard interaction and focus management.
- Respect reduced-motion preferences.
- Preserve native input semantics and validation.

## 15. Implementation Constraints

1. Inspect the existing codebase before changing the UI. Reuse its framework, component library, routing, and CSS approach.
2. Apply this document as a **design layer**. Do not replace or redesign the product's core functionality.
3. Do not add expense-splitting rules, ledger logic, balances, settlement flows, or reference-specific business concepts merely because they appear in the images.
4. Do not copy the reference's sample data, text, identities, or illustrations.
5. Reuse existing components where possible. Extract shared components only when doing so reduces duplication.
6. Keep components responsive and avoid unnecessary dependencies.
7. Preserve existing API contracts, state management, validation, permissions, and data flow.
8. Do not add decorative charts, social sign-in providers, bottom navigation, or floating actions unless they fit the existing product.
9. Use the design tokens above as defaults. Prefer the project's established conventions when they already provide equivalent behavior.
10. Verify at 1440px desktop, 768px tablet, 390px mobile, and 320px small mobile.

## 16. Acceptance Checklist

- [ ] The overall look matches the references: light canvas, violet primary actions, rounded white cards, subtle borders, restrained shadows.
- [ ] Desktop has a compact top bar, left navigation where appropriate, and a spacious content area.
- [ ] Mobile uses a clean single-column layout without horizontal overflow.
- [ ] Titles, supporting text, tables, forms, and actions maintain clear visual hierarchy.
- [ ] Forms, buttons, selected states, and navigation have visible interaction states.
- [ ] Illustrations and avatars use suitable project-owned or licensed assets.
- [ ] Accessibility requirements remain intact.
- [ ] Existing product behavior, data structures, and business logic remain unchanged.
- [ ] No reference-specific expense-splitting functionality has been added.

---

**Design principle:** Match the reference's visual system and responsive composition. Keep the current product's identity, content, and functionality.
