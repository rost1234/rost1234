# Momentum palettes: WCAG audit and fixed tokens

Ratios computed with the WCAG 2.x relative-luminance formula (python). Thresholds: 4.5:1 text under 24px, 3:1 for icons, graphics and UI component borders. Pairs are the ones the app really draws (text on background/surface/soft fills, streak flame+number on warningSoft, check on success, outline button text, chart bars).

Rules kept: blue / teal-green / purple hues, moderate saturation; yellow/amber only as small accent; missed days neutral grey (use `textMuted` / `surfaceMuted`, never danger); success always next to a check mark or text; streak colour warm but dark enough for small text.

Note on checkbox ring: `border` is decorative (about 1.1:1). The empty-checkbox ring and any interactive outline must use `textMuted` (5.7:1 in current-fixed light, 6.0:1 in Calm light), not `border`.

## What failed in the CURRENT palette (theme.ts as is)

| Pair | Light | Ratio | Needed |
|---|---|---|---|
| textMuted/surfaceMuted | #6B6E85 on #EEEFF6 | 4.37 | 4.5 |
| primary/primarySoft | #5B5BD6 on #E7E7FB | 4.40 | 4.5 |
| success/surface | #16A34A on #FFFFFF | 3.30 | 4.5 |
| success/successSoft | #16A34A on #DCFCE7 | 3.00 | 4.5 |
| success/doneCard | #16A34A on #F2FBF5 | 3.12 | 4.5 |
| warning/warningSoft (streak) | #D97706 on #FEF3C7 | 2.86 | 4.5 |
| warning/surface | #D97706 on #FFFFFF | 3.19 | 4.5 |
| danger/dangerSoft | #DC2626 on #FEE2E2 | 3.95 | 4.5 |
| freeze/freezeSoft | #0EA5E9 on #E0F2FE | 2.42 | 4.5 |
| freeze/surface | #0EA5E9 on #FFFFFF | 2.77 | 4.5 |
| accent/surface | #8B5CF6 on #FFFFFF | 4.23 | 4.5 |
| partial/surface (graphic 3:1) | #86D6A0 on #FFFFFF | 1.73 | 3 |

Dark mode of the current palette passes every pair.

Also: the mockup hero (white on `#8B5CF6` end of the gradient) is 4.23:1, so small hero text fails; `accent` on white is the same 4.23.

Calm as first drawn in the mockup: success `#2F7D4F` on `#E6F3EB` 4.41 (fail), empty-checkbox ring `#7E9C9B` 2.73 to 2.95 (fail 3:1). Play: success on okbg 4.41 (fail). Night passes. Everything else in those mockups passed.

## Current-fixed, light (changes: textMuted, primary, success, warning, danger, freeze, accent, partial)

| Token | Hex |
|---|---|
| background | `#F5F5FA` |
| surface | `#FFFFFF` |
| surfaceMuted | `#EEEFF6` |
| border | `#E4E5EE` |
| text | `#16172B` |
| textMuted | `#626579` |
| primary | `#5252CC` |
| primaryDeep | `#4338CA` |
| primarySoft | `#E7E7FB` |
| accent | `#7C3AED` |
| success | `#15803D` |
| successSoft | `#DCFCE7` |
| warning | `#B45309` |
| warningSoft | `#FEF3C7` |
| danger | `#B91C1C` |
| dangerSoft | `#FEE2E2` |
| freeze | `#0369A1` |
| freezeSoft | `#E0F2FE` |
| onPrimary | `#FFFFFF` |
| doneCard | `#F2FBF5` |
| partial | `#3E9F61` |

| Pair | Ratio | Needed | Result |
|---|---|---|---|
| text/background | 16.22 | 4.5 | pass |
| text/surface | 17.62 | 4.5 | pass |
| textMuted/background | 5.28 | 4.5 | pass |
| textMuted/surface | 5.74 | 4.5 | pass |
| textMuted/surfaceMuted | 5.01 | 4.5 | pass |
| textMuted/doneCard | 5.44 | 4.5 | pass |
| text/doneCard | 16.69 | 4.5 | pass |
| primary/surface (text,outline btn) | 6.11 | 4.5 | pass |
| primary/background | 5.62 | 4.5 | pass |
| primaryDeep/surface | 7.90 | 4.5 | pass |
| primaryDeep/primarySoft | 6.48 | 4.5 | pass |
| primary/primarySoft | 5.01 | 4.5 | pass |
| onPrimary/primary | 6.11 | 4.5 | pass |
| success/surface | 5.02 | 4.5 | pass |
| success/successSoft | 4.57 | 4.5 | pass |
| success/doneCard | 4.75 | 4.5 | pass |
| onPrimary/success (check btn,3:1 icon) | 5.02 | 3 | pass |
| warning/warningSoft (streak) | 4.51 | 4.5 | pass |
| warning/surface | 5.02 | 4.5 | pass |
| danger/dangerSoft | 5.30 | 4.5 | pass |
| danger/surface | 6.47 | 4.5 | pass |
| freeze/freezeSoft | 5.17 | 4.5 | pass |
| freeze/surface | 5.93 | 4.5 | pass |
| accent/surface | 5.70 | 4.5 | pass |
| partial/surface (graphic 3:1) | 3.31 | 3 | pass |
| primary/surface graphic 3:1 | 6.11 | 3 | pass |
| success/surface graphic 3:1 | 5.02 | 3 | pass |

Dark is unchanged from theme.ts (all pairs already pass):

| Token | Hex |
|---|---|
| background | `#0F1020` |
| surface | `#1A1B2E` |
| surfaceMuted | `#25263D` |
| border | `#303252` |
| text | `#ECECF6` |
| textMuted | `#9EA0BC` |
| primary | `#8E8CFF` |
| primaryDeep | `#A5A3FF` |
| primarySoft | `#2B2B55` |
| accent | `#A78BFA` |
| success | `#4ADE80` |
| successSoft | `#153322` |
| warning | `#FBBF24` |
| warningSoft | `#3A2D10` |
| danger | `#F87171` |
| dangerSoft | `#3D1719` |
| freeze | `#38BDF8` |
| freezeSoft | `#0E2E3E` |
| onPrimary | `#0F1020` |
| doneCard | `#16291F` |
| partial | `#2F7A4B` |

Diff for `lightColors`: `textMuted #6B6E85 -> #626579`, `primary #5B5BD6 -> #5252CC`, `success #16A34A -> #15803D`, `warning #D97706 -> #B45309`, `danger #DC2626 -> #B91C1C`, `freeze #0EA5E9 -> #0369A1`, `accent #8B5CF6 -> #7C3AED`, `partial #86D6A0 -> #3E9F61`. Hero gradient end `#8B5CF6` -> `#7C3AED` (white 5.7:1).

## Calm (רוגע) fixed, light

| Token | Hex |
|---|---|
| background | `#F2F7F6` |
| surface | `#FFFFFF` |
| surfaceMuted | `#E6EFEE` |
| border | `#D5E3E1` |
| text | `#12312F` |
| textMuted | `#4F6868` |
| primary | `#2D6A9F` |
| primaryDeep | `#1F5685` |
| primarySoft | `#E1EEF7` |
| accent | `#6554C0` |
| success | `#2A7048` |
| successSoft | `#E6F3EB` |
| warning | `#8F5200` |
| warningSoft | `#FBEFD5` |
| danger | `#B3261E` |
| dangerSoft | `#FBE9E7` |
| freeze | `#0B6A89` |
| freezeSoft | `#E0F1F6` |
| onPrimary | `#FFFFFF` |
| doneCard | `#EAF5EE` |
| partial | `#4E9A74` |

| Pair | Ratio | Needed | Result |
|---|---|---|---|
| text/background | 12.89 | 4.5 | pass |
| text/surface | 13.94 | 4.5 | pass |
| textMuted/background | 5.53 | 4.5 | pass |
| textMuted/surface | 5.98 | 4.5 | pass |
| textMuted/surfaceMuted | 5.11 | 4.5 | pass |
| textMuted/doneCard | 5.35 | 4.5 | pass |
| text/doneCard | 12.48 | 4.5 | pass |
| primary/surface (text,outline btn) | 5.72 | 4.5 | pass |
| primary/background | 5.28 | 4.5 | pass |
| primaryDeep/surface | 7.70 | 4.5 | pass |
| primaryDeep/primarySoft | 6.52 | 4.5 | pass |
| primary/primarySoft | 4.84 | 4.5 | pass |
| onPrimary/primary | 5.72 | 4.5 | pass |
| success/surface | 5.98 | 4.5 | pass |
| success/successSoft | 5.24 | 4.5 | pass |
| success/doneCard | 5.35 | 4.5 | pass |
| onPrimary/success (check btn,3:1 icon) | 5.98 | 3 | pass |
| warning/warningSoft (streak) | 5.45 | 4.5 | pass |
| warning/surface | 6.22 | 4.5 | pass |
| danger/dangerSoft | 5.58 | 4.5 | pass |
| danger/surface | 6.54 | 4.5 | pass |
| freeze/freezeSoft | 5.26 | 4.5 | pass |
| freeze/surface | 6.11 | 4.5 | pass |
| accent/surface | 5.86 | 4.5 | pass |
| partial/surface (graphic 3:1) | 3.39 | 3 | pass |
| primary/surface graphic 3:1 | 5.72 | 3 | pass |
| success/surface graphic 3:1 | 5.98 | 3 | pass |

## Calm (רוגע) fixed, dark

| Token | Hex |
|---|---|
| background | `#101A1C` |
| surface | `#172427` |
| surfaceMuted | `#1F3033` |
| border | `#2C4144` |
| text | `#E4EEEE` |
| textMuted | `#9DB2B3` |
| primary | `#7FB8E6` |
| primaryDeep | `#A3CDEF` |
| primarySoft | `#1D3447` |
| accent | `#B3A5F0` |
| success | `#6FCF97` |
| successSoft | `#17302A` |
| warning | `#E7B25C` |
| warningSoft | `#33290F` |
| danger | `#F2998F` |
| dangerSoft | `#3A1D1C` |
| freeze | `#5CC4DD` |
| freezeSoft | `#12303A` |
| onPrimary | `#0D1A22` |
| doneCard | `#15292A` |
| partial | `#3C8A63` |

| Pair | Ratio | Needed | Result |
|---|---|---|---|
| text/background | 14.97 | 4.5 | pass |
| text/surface | 13.48 | 4.5 | pass |
| textMuted/background | 7.97 | 4.5 | pass |
| textMuted/surface | 7.17 | 4.5 | pass |
| textMuted/surfaceMuted | 6.18 | 4.5 | pass |
| textMuted/doneCard | 6.84 | 4.5 | pass |
| text/doneCard | 12.85 | 4.5 | pass |
| primary/surface (text,outline btn) | 7.51 | 4.5 | pass |
| primary/background | 8.34 | 4.5 | pass |
| primaryDeep/surface | 9.51 | 4.5 | pass |
| primaryDeep/primarySoft | 7.67 | 4.5 | pass |
| primary/primarySoft | 6.06 | 4.5 | pass |
| onPrimary/primary | 8.33 | 4.5 | pass |
| success/surface | 8.38 | 4.5 | pass |
| success/successSoft | 7.40 | 4.5 | pass |
| success/doneCard | 7.99 | 4.5 | pass |
| onPrimary/success (check btn,3:1 icon) | 9.30 | 3 | pass |
| warning/warningSoft (streak) | 7.46 | 4.5 | pass |
| warning/surface | 8.29 | 4.5 | pass |
| danger/dangerSoft | 7.09 | 4.5 | pass |
| danger/surface | 7.38 | 4.5 | pass |
| freeze/freezeSoft | 6.89 | 4.5 | pass |
| freeze/surface | 7.89 | 4.5 | pass |
| accent/surface | 7.25 | 4.5 | pass |
| partial/surface (graphic 3:1) | 3.80 | 3 | pass |
| primary/surface graphic 3:1 | 7.51 | 3 | pass |
| success/surface graphic 3:1 | 8.38 | 3 | pass |
