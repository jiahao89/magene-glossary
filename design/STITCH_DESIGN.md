---
name: GlossaHub HeroUI Dark System
colors:
  primary: '#f97316'
  secondary: '#06b6d4'
  success: '#10b981'
  warning: '#f59e0b'
  danger: '#f43f5e'
  background: '#020617'
  surface: '#0f172a'
  surface-secondary: '#1e293b'
  foreground: '#f8fafc'
  muted: '#94a3b8'
typography:
  display-xl:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.025em
  headline-md:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.015em
  headline-sm:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  mono-kw:
    fontFamily: JetBrains Mono
    fontSize: 13px
    fontWeight: '500'
    lineHeight: 18px
    letterSpacing: 0.02em
rounded:
  sm: 0.25rem
  DEFAULT: 0.375rem
  md: 0.5rem
  lg: 0.75rem
  xl: 1rem
  full: 9999px
spacing:
  unit: 4px
  container-max: 1440px
  gutter: 16px
  margin-desktop: 24px
  stack-xs: 4px
  stack-sm: 8px
  stack-md: 16px
  stack-lg: 24px
---

## Brand & Style

GlossaHub is Magene's next-generation mission-critical smart hardware & bike computer firmware localization and translation collaboration platform.
The design language is **HeroUI Cyber-Instrument Precision**:
- **HeroUI Pro Aesthetics**: Combining rich dark glassmorphism surfaces (`#0f172a` backdrop-blur-md) with high-energy Magene Orange (`#f97316`) and Aurora Cyan (`#06b6d4`) accents.
- **Instrument Density**: Engineered for firmware engineers, product managers, and translators who navigate thousands of multi-language strings with hardware LCD/OLED constraints.
- **Visual Confidence**: Distinct status pills (`TM 100%`, `DeepSeek-V3`, `ADD`, `MOD`, `DEL`), character gauge meters preventing firmware text clipping, and instant time-machine regret protection.

## Colors

- **Primary Action (Magene Orange #f97316)**: Primary action buttons, active navigation indicators, active cell borders, tab indicators.
- **Accent High-Tech (Aurora Cyan #06b6d4)**: AI suggestions, TM vector similarity matches, live QA badges.
- **Canvas Background (#020617)**: Deep slate obsidian canvas.
- **Elevated Surface 1 (#0f172a)**: Main card containers, 3-pane panels, table background.
- **Elevated Surface 2 (#1e293b)**: Secondary panels, active input boxes, nested lists.
- **Semantic Green (#10b981)**: Safe character length (<70%), TM exact match, ADD diff status.
- **Semantic Amber (#f59e0b)**: Warning character length (70%-95%), MOD diff status.
- **Semantic Red (#f43f5e)**: Danger hardware screen overflow (>100%), DEL diff status, missing %s placeholder.

## Layout & Components

- **3-Pane Master-Detail Workspace**:
  - Left Pane (300px): Folders & category tree (Ride Main Screen, Radar Sensor, Power Meter Settings), version dropdown, filter chips.
  - Middle Pane (380px): Virtualized high-density string list with search box, KW macro identifiers, Chinese source text, character limits.
  - Right Pane (Flex-1): Deep translation editor with source card, target input, dynamic HardwareConstraintMeter, 2.4" LCD matrix hardware screen preview, and right AICopilotDock (Multi-LLM DeepSeek-V3 CoT reasoning accordion).
- **Global App Shell**:
  - Slim collapsible sidebar (64px/260px) with Magene logo, project switcher, and Cmd+K Command Palette.
