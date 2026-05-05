Design consistency and UX review for RUNSTR. Dispatches parallel agents to find theme violations, component reuse gaps, UX flow problems, layout inconsistencies, and polish opportunities. Report-only, brand-aware (orange-on-black), scoped to src/.

## Phase 1: Baseline (run in parallel)

```bash
grep -rn '#[0-9A-Fa-f]\{3,6\}' src/screens/ src/components/ --include='*.tsx' --include='*.ts' | grep -v 'theme\|import\|//' | head -30
```

```bash
grep -rn "white\|#fff\|#FFF\|#ffffff\|#FFFFFF" src/screens/ src/components/ --include='*.tsx' --include='*.ts' | grep -v '//\|import\|\.d\.ts' | head -20
```

```bash
grep -rn 'TouchableOpacity' src/screens/ src/components/ --include='*.tsx' -l | head -20
```

## Phase 2: Parallel Agent Deep Inspection

After Phase 1 completes, dispatch **5 parallel agents** using the Task tool (subagent_type: general-purpose). Each agent should read the relevant files and report back findings.

### Agent 1: Theme Compliance Scanner
Prompt: "Audit RUNSTR's React Native screens and components for design system compliance. This is a brand-aware review — RUNSTR uses an orange-on-black theme with NO white text.

First, read the theme file: src/styles/theme.ts — understand every color, typography value, spacing value, and border radius defined there.

Then scan these directories for violations:
- src/screens/ (all .tsx files)
- src/components/ (all .tsx files)

Look for:

1. **Hardcoded hex colors**: Any color value (#xxx, #xxxxxx, rgb(), rgba()) in StyleSheet.create or inline styles that doesn't come from theme.colors. Exception: rgba() opacity variants of theme colors are OK.

2. **White text violations**: Any use of '#fff', '#ffffff', '#FFF', '#FFFFFF', 'white', or 'rgb(255,255,255)' in text styling. RUNSTR uses orange text (theme.colors.text = '#FFB366'), NEVER white. This is a critical brand violation.

3. **Non-orange status colors**: Green for success, red for error, blue for info — RUNSTR uses orange variants for ALL status colors (theme.colors.success = '#FF9D42', theme.colors.error = '#FF6B00'). Find any green (#00xx00, #4CAF50, 'green'), red (#FF0000, 'red'), or blue (#0000FF, 'blue', '#2196F3') status indicators.

4. **Raw font sizes**: fontSize values that don't map to any theme.typography value. The theme defines sizes 10-24. Any fontSize outside that range or used inconsistently (e.g., fontSize: 13 when 12 or 14 exist in theme) should be flagged.

5. **Missing activeOpacity**: TouchableOpacity components without an activeOpacity prop — the default 0.2 creates a harsh flash on the dark theme. Should be 0.7 or 0.8.

6. **Raw spacing values**: padding/margin values that don't align with theme.spacing (2, 4, 6, 8, 12, 16, 20). Flag odd values like 3, 5, 7, 9, 10, 11, 13, 14, 15, 17, 18, 19.

For EACH finding, report:
- File:line
- Priority: BROKEN UX / INCONSISTENCY / ENHANCEMENT
- What the violation is
- What it should be (the theme value to use instead)"

### Agent 2: Component Usage Auditor
Prompt: "Audit RUNSTR screens to check whether they use shared UI components or reinvent them.

First, read the shared component library:
- src/components/ui/Card.tsx
- src/components/ui/Button.tsx
- src/components/ui/PrimaryButton.tsx
- src/components/ui/Avatar.tsx
- src/components/ui/LoadingStates.tsx
- src/components/ui/CustomAlert.tsx
- src/components/ui/ProgressBar.tsx
- src/components/ui/StatCard.tsx
- src/components/ui/ActionButton.tsx

Understand what each provides — its props, variants, and visual output.

Then read every screen in src/screens/ (the main .tsx files, not subdirectories) and check:

1. **Custom card containers**: Screens that create their own card-like Views (dark background, border, border-radius) instead of importing Card from ui/. Look for patterns like: View with backgroundColor: theme.colors.cardBackground or '#0a0a0a' and borderRadius — these should use Card.

2. **Custom buttons**: Screens that build TouchableOpacity buttons with inline styling instead of using Button or PrimaryButton. Look for TouchableOpacity with backgroundColor: theme.colors.orangeDeep/primary and text inside — these should use the shared button.

3. **Custom avatars**: Image components styled as circular avatars (borderRadius: 50% or width/height equal with borderRadius half) instead of using Avatar.

4. **Custom loading states**: ActivityIndicator or skeleton patterns that don't use LoadingStates.tsx.

5. **Custom alerts/confirmations**: Alert.alert() calls that could use CustomAlert for consistent styling.

6. **Missing shared components**: Patterns that repeat across 3+ screens but have no shared component. Examples might include: section headers, dividers, empty state messages, modal containers.

For EACH finding, report:
- File:line
- Priority: BROKEN UX / INCONSISTENCY / ENHANCEMENT
- What's custom vs what shared component should be used
- Estimated effort to refactor (easy/medium/hard)

Also list: shared components that SHOULD exist but don't (patterns repeated in 3+ places with no abstraction)."

### Agent 3: UX Flow Reviewer
Prompt: "Walk the critical user journeys in RUNSTR and flag UX problems. Read the screen files and trace the navigation flow.

**Flow 1: First Launch → First Workout**
Read in order:
- src/screens/LoginScreen.tsx (entry point)
- src/screens/ProfileScreen.tsx (lands here after auth)
- src/screens/activity/ActivityTrackerScreen.tsx (workout start)
- src/components/activity/WorkoutSummaryModal.tsx (post-workout)

Check: Can a new user figure out how to start a workout? Is there guidance? After the workout, do they understand what happened (rewards, where data went)? Any dead ends where the user is stuck?

**Flow 2: Browse → Join Club**
Read in order:
- src/screens/ClubsScreen.tsx (browse clubs)
- src/components/club/ClubCard.tsx (club preview)
- src/screens/ClubPageScreen.tsx (club detail)

Check: Is the join flow clear? After joining, does the UI update immediately? Can the user find their club easily? Is the 'no clubs yet' state handled?

**Flow 3: Track → Earn → Choose Destination**
Read in order:
- src/screens/activity/RunningTrackerScreen.tsx (during workout)
- src/screens/RewardsScreen.tsx (see earnings)
- src/components/rewards/RewardDestinationPicker.tsx (choose destination)

Check: After a workout completes, does the user see confirmation of rewards? Is the connection between workout and reward clear? Can they easily change their destination?

**Flow 4: Settings Navigation**
Read:
- src/screens/SettingsScreen.tsx

Check: Are settings logically grouped? Can users find what they need? Are there sections that should be separate screens? Any settings that are confusing without explanation?

For EACH UX issue found, report:
- Flow name and step where it occurs
- File:line
- Priority: BROKEN UX / INCONSISTENCY / ENHANCEMENT
- Description of the user's confusion or frustration
- Suggested improvement"

### Agent 4: Layout & Spacing Consistency
Prompt: "Review RUNSTR screen layouts for visual consistency across the app.

Read ALL main screen files in src/screens/ (top-level .tsx files) and compare their layout patterns.

Check:

1. **Header patterns**: Do all screens use the same header height, horizontal padding, title font size, title font weight, and title color? List each screen's header values in a comparison table.

2. **Section spacing**: What's the vertical gap between major sections (cards, lists, headers)? Is it consistent? Create a table: screen name → gap between sections.

3. **Horizontal padding**: What's the main content padding on each screen? Should be theme.spacing.xxl (16) everywhere. Flag deviations.

4. **Card internal padding**: When Card or card-like containers are used, is the internal padding consistent?

5. **Safe area handling**: Which screens use SafeAreaView or safe area insets? Which don't? Create a table.

6. **ScrollView patterns**: Which screens use ScrollView vs FlatList vs no scroll? Do scrollable screens have:
   - keyboardDismissMode (for screens with inputs)?
   - Pull-to-refresh (RefreshControl)?
   - Proper bottom padding so content isn't hidden behind the tab bar?

7. **Empty states**: When a list or section has no data, what does each screen show? Is it consistent? Some may show 'No data' text, others show illustrations, others show nothing.

8. **Loading states**: When data is loading, what does each screen show? Skeleton, spinner, or nothing?

For EACH inconsistency found, report:
- The screens that differ
- Priority: BROKEN UX / INCONSISTENCY / ENHANCEMENT
- What the pattern should be (based on majority usage)
- Which screens deviate"

### Agent 5: Polish & Enhancement Opportunities
Prompt: "Review RUNSTR's screens and components for polish opportunities — things that work but could look/feel better.

Read the main screens: ProfileScreen, ClubsScreen, RewardsScreen, SettingsScreen, and the activity tracker screens (ActivityTrackerScreen, RunningTrackerScreen, WalkingTrackerScreen, CyclingTrackerScreen, HikingTrackerScreen).

Look for:

1. **Missing press feedback**: Buttons or tappable elements that don't animate, scale, or provide haptic feedback on press. Look for TouchableOpacity without activeOpacity or without any press animation.

2. **Image loading**: Images (avatars, banners, club logos) without loading placeholders. When the image is loading, does the user see a skeleton, a blur, or just empty space?

3. **Text truncation**: Text that can overflow its container. Look for long strings (names, descriptions, addresses) displayed without numberOfLines, ellipsizeMode, or flexible layout.

4. **Missing separators**: Lists of items (members, workouts, settings) without visual separators between items. Flat lists of same-styled items are hard to scan.

5. **Skeleton loading**: Screens that show a blank/white flash before data loads. Which screens have skeleton loading states and which don't?

6. **Form inputs**: TextInput components without:
   - Placeholder text
   - Error state styling
   - Clear button
   - Appropriate keyboard type (numeric for numbers, email for email)
   - returnKeyType for form flow

7. **Transition polish**: Screen transitions that feel abrupt. Are there any screens that should have custom transitions (slide, fade) but use the default?

8. **Visual density**: Screens that feel too sparse (lots of empty space) or too crowded (elements packed together). Compare against the overall app aesthetic.

9. **Accessibility basics**: Missing accessibilityLabel on icon-only buttons, images without alt text, touch targets smaller than 44x44 points.

For EACH finding, report:
- File:line
- Priority: BROKEN UX / INCONSISTENCY / ENHANCEMENT
- What the current experience is
- What the improved experience would be
- Effort estimate (easy/medium/hard)"

## Phase 3: Consolidated Report

After all agents return, compile findings into a structured report:

```markdown
# RUNSTR Design Review — [date]

## Brand Compliance
- Theme violations: X
- White text instances: X
- Non-orange status colors: X

## Component Reuse
- Screens using shared components consistently: X%
- Custom implementations that should use shared: X
- Missing shared components to create: X

## UX Flow Issues
- Dead ends: X
- Missing feedback (loading/success/error): X
- Confusing transitions: X

## Layout Consistency
- Header inconsistencies: X
- Spacing violations: X
- Safe area gaps: X

## Polish Opportunities
- Quick wins: X
- Medium effort: X

## Findings by Priority

### Broken UX (fix now)
[Issues that actively hurt the user experience — traps, missing feedback, broken flows]

### Inconsistency (fix when touching that file)
[Theme violations, component reuse gaps, layout deviations — fix opportunistically]

### Enhancement (backlog)
[Polish items, accessibility improvements, animation opportunities — nice to have]

## Top 5 Recommendations
[Prioritized by visual impact — what makes the app feel most polished for least effort]

## Design Score: X/10
[1 = inconsistent mess, 10 = pixel-perfect design system. Brief justification.]
```

Present this report to the user. Lead with Broken UX findings since those are most urgent. Group Inconsistency findings by screen/component for easy batch fixing.
