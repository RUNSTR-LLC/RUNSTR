# Activity Components Directory

UI components for the activity tracking screens, including real-time cardio metrics, goal tracking, and workout controls.

## Files

- **BatteryWarning.tsx** - Shows battery level warnings during activity tracking to alert users when battery may affect GPS accuracy.
- **ControlBar.tsx** - Fixed bottom control buttons for cardio tracking, showing HoldToStart in idle, Pause/Stop during tracking, and Resume/Stop when paused.
- **CountdownOverlay.tsx** - Full-screen countdown display (3-2-1-GO!) shown before starting any cardio activity.
- **DailyStepGoalCard.tsx** - Displays daily step count with circular progress ring, current steps, and goal indicator.
- **DistanceGoalPickerModal.tsx** - Modal for selecting weekly distance goal, supporting both running and cycling with different preset options.
- **HeroMetric.tsx** - Large centered metric display for cardio tracking screens, showing primary metric (distance/steps/speed) with optional secondary value.
- **HoldToStartButton.tsx** - Hold-down button with SVG circular progress indicator requiring a 2-second hold to trigger the start action.
- **LastActivityCard.tsx** - Shows last activity summary for running/walking/cycling with distance, duration, and date.
- **SecondaryMetricRow.tsx** - Row of 2-3 smaller metrics displayed below the hero metric for pace, elevation, distance, etc.
- **SpeedGauge.tsx** - Visual SVG speed gauge for cycling, showing current speed with average and max indicators.
- **SplitsBar.tsx** - Horizontal scrolling display of kilometer splits showing pace for each completed kilometer during a run.
- **StepGoalPickerModal.tsx** - Modal for selecting daily step goal with a vertical scrollable list of goal options.
- **StepProgressRing.tsx** - Circular SVG progress ring for step count display showing steps, percentage, and estimated distance.
- **SwipeGridNavigator.tsx** - 2D gesture handling for activity grid navigation with smooth slide and fade transitions between activities and categories.
- **WeeklyDistanceGoalCard.tsx** - Displays weekly distance with progress bar and goal for running or cycling.
- **WorkoutSummaryModal.tsx** - Post-workout summary modal with workout stats, competition entry, and social sharing options.
