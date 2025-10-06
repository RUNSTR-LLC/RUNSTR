/**
 * ActivityStateMachine - State management for activity tracking
 * Manages tracking states and transitions with proper validation
 */

export type ActivityState =
  | 'idle'
  | 'requesting_permissions'
  | 'initializing'
  | 'tracking_active'
  | 'tracking_paused'
  | 'gps_lost'
  | 'gps_recovering'
  | 'completing'
  | 'completed'
  | 'error';

export interface StateContext {
  activityType?: 'running' | 'walking' | 'cycling';
  sessionId?: string;
  startTime?: number;
  error?: string;
  gpsSignalStrength?: 'strong' | 'weak' | 'none';
  batteryLevel?: number;
  isBackgroundTracking?: boolean;
}

export type StateEvent =
  | { type: 'START_TRACKING'; activityType: 'running' | 'walking' | 'cycling' }
  | { type: 'PERMISSIONS_GRANTED' }
  | { type: 'PERMISSIONS_DENIED' }
  | { type: 'INITIALIZATION_COMPLETE'; sessionId: string }
  | { type: 'INITIALIZATION_FAILED'; error: string }
  | { type: 'PAUSE' }
  | { type: 'RESUME' }
  | { type: 'STOP' }
  | { type: 'GPS_LOST' }
  | { type: 'GPS_RECOVERED' }
  | { type: 'GPS_WEAK' }
  | { type: 'BATTERY_LOW'; level: number }
  | { type: 'ENTER_BACKGROUND' }
  | { type: 'ENTER_FOREGROUND' }
  | { type: 'ERROR'; error: string }
  | { type: 'RESET' };

export interface StateTransition {
  from: ActivityState;
  event: StateEvent['type'];
  to: ActivityState;
  guard?: (context: StateContext, event: StateEvent) => boolean;
  action?: (context: StateContext, event: StateEvent) => StateContext;
}

export class ActivityStateMachine {
  private currentState: ActivityState = 'idle';
  private context: StateContext = {};
  private listeners: Set<(state: ActivityState, context: StateContext) => void> = new Set();
  private stateHistory: Array<{ state: ActivityState; timestamp: number }> = [];

  // Define valid state transitions
  private transitions: StateTransition[] = [
    // Starting tracking flow
    {
      from: 'idle',
      event: 'START_TRACKING',
      to: 'requesting_permissions',
      action: (ctx, event) => ({
        ...ctx,
        activityType: (event as any).activityType,
        startTime: Date.now(),
      }),
    },
    {
      from: 'requesting_permissions',
      event: 'PERMISSIONS_GRANTED',
      to: 'initializing',
    },
    {
      from: 'requesting_permissions',
      event: 'PERMISSIONS_DENIED',
      to: 'error',
      action: (ctx) => ({
        ...ctx,
        error: 'Location permissions required',
      }),
    },
    {
      from: 'initializing',
      event: 'INITIALIZATION_COMPLETE',
      to: 'tracking_active',
      action: (ctx, event) => ({
        ...ctx,
        sessionId: (event as any).sessionId,
      }),
    },
    {
      from: 'initializing',
      event: 'INITIALIZATION_FAILED',
      to: 'error',
      action: (ctx, event) => ({
        ...ctx,
        error: (event as any).error,
      }),
    },

    // Active tracking transitions
    {
      from: 'tracking_active',
      event: 'PAUSE',
      to: 'tracking_paused',
    },
    {
      from: 'tracking_paused',
      event: 'RESUME',
      to: 'tracking_active',
    },
    {
      from: 'tracking_active',
      event: 'STOP',
      to: 'completing',
    },
    {
      from: 'tracking_paused',
      event: 'STOP',
      to: 'completing',
    },
    {
      from: 'gps_lost',
      event: 'STOP',
      to: 'completing',
    },
    {
      from: 'gps_recovering',
      event: 'STOP',
      to: 'completing',
    },
    {
      from: 'completing',
      event: 'RESET',
      to: 'completed',
    },
    {
      from: 'completed',
      event: 'RESET',
      to: 'idle',
      action: () => ({}), // Clear context
    },

    // GPS signal transitions
    {
      from: 'tracking_active',
      event: 'GPS_LOST',
      to: 'gps_lost',
      action: (ctx) => ({
        ...ctx,
        gpsSignalStrength: 'none',
      }),
    },
    {
      from: 'gps_lost',
      event: 'GPS_RECOVERED',
      to: 'tracking_active',
      action: (ctx) => ({
        ...ctx,
        gpsSignalStrength: 'strong',
      }),
    },
    {
      from: 'tracking_active',
      event: 'GPS_WEAK',
      to: 'gps_recovering',
      action: (ctx) => ({
        ...ctx,
        gpsSignalStrength: 'weak',
      }),
    },
    {
      from: 'gps_recovering',
      event: 'GPS_RECOVERED',
      to: 'tracking_active',
      action: (ctx) => ({
        ...ctx,
        gpsSignalStrength: 'strong',
      }),
    },
    {
      from: 'gps_recovering',
      event: 'GPS_LOST',
      to: 'gps_lost',
      action: (ctx) => ({
        ...ctx,
        gpsSignalStrength: 'none',
      }),
    },

    // Background/foreground transitions
    {
      from: 'tracking_active',
      event: 'ENTER_BACKGROUND',
      to: 'tracking_active',
      action: (ctx) => ({
        ...ctx,
        isBackgroundTracking: true,
      }),
    },
    {
      from: 'tracking_active',
      event: 'ENTER_FOREGROUND',
      to: 'tracking_active',
      action: (ctx) => ({
        ...ctx,
        isBackgroundTracking: false,
      }),
    },

    // Error handling
    {
      from: 'error',
      event: 'RESET',
      to: 'idle',
      action: () => ({}), // Clear context
    },

    // Battery management
    {
      from: 'tracking_active',
      event: 'BATTERY_LOW',
      to: 'tracking_active',
      guard: (ctx, event) => (event as any).level > 5, // Continue if above 5%
      action: (ctx, event) => ({
        ...ctx,
        batteryLevel: (event as any).level,
      }),
    },
    {
      from: 'tracking_active',
      event: 'BATTERY_LOW',
      to: 'error',
      guard: (ctx, event) => (event as any).level <= 5, // Stop if 5% or below
      action: (ctx, event) => ({
        ...ctx,
        batteryLevel: (event as any).level,
        error: 'Battery too low to continue tracking',
      }),
    },
  ];

  /**
   * Send an event to the state machine
   */
  send(event: StateEvent): boolean {
    const transition = this.findTransition(this.currentState, event);

    if (!transition) {
      console.warn(
        `No valid transition from ${this.currentState} with event ${event.type}`
      );
      return false;
    }

    // Check guard condition if present
    if (transition.guard && !transition.guard(this.context, event)) {
      console.log(`Guard prevented transition from ${this.currentState} to ${transition.to}`);
      return false;
    }

    // Apply action if present
    if (transition.action) {
      this.context = transition.action(this.context, event);
    }

    // Update state
    const previousState = this.currentState;
    this.currentState = transition.to;

    // Record in history
    this.stateHistory.push({
      state: this.currentState,
      timestamp: Date.now(),
    });

    // Keep only last 50 state changes
    if (this.stateHistory.length > 50) {
      this.stateHistory.shift();
    }

    console.log(`State transition: ${previousState} → ${this.currentState}`);

    // Notify listeners
    this.notifyListeners();

    return true;
  }

  /**
   * Find matching transition
   */
  private findTransition(
    fromState: ActivityState,
    event: StateEvent
  ): StateTransition | undefined {
    return this.transitions.find(
      t => t.from === fromState && t.event === event.type
    );
  }

  /**
   * Subscribe to state changes
   */
  subscribe(listener: (state: ActivityState, context: StateContext) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Notify all listeners of state change
   */
  private notifyListeners(): void {
    this.listeners.forEach(listener => {
      listener(this.currentState, this.context);
    });
  }

  /**
   * Get current state
   */
  getState(): ActivityState {
    return this.currentState;
  }

  /**
   * Get state context
   */
  getContext(): StateContext {
    return { ...this.context };
  }

  /**
   * Get state history (states only)
   */
  getStateHistory(): ActivityState[] {
    return this.stateHistory.map(h => h.state);
  }

  /**
   * Get previous state
   */
  getPreviousState(): ActivityState | null {
    if (this.stateHistory.length < 2) return null;
    return this.stateHistory[this.stateHistory.length - 2].state;
  }

  /**
   * Check if in active tracking state
   */
  isTracking(): boolean {
    return ['tracking_active', 'tracking_paused', 'gps_lost', 'gps_recovering'].includes(
      this.currentState
    );
  }

  /**
   * Check if can start tracking
   */
  canStart(): boolean {
    return this.currentState === 'idle';
  }

  /**
   * Check if can pause
   */
  canPause(): boolean {
    return this.currentState === 'tracking_active';
  }

  /**
   * Check if can resume
   */
  canResume(): boolean {
    return this.currentState === 'tracking_paused';
  }

  /**
   * Check if can stop
   */
  canStop(): boolean {
    return ['tracking_active', 'tracking_paused', 'gps_lost', 'gps_recovering'].includes(
      this.currentState
    );
  }

  /**
   * Get state history
   */
  getHistory(): Array<{ state: ActivityState; timestamp: number }> {
    return [...this.stateHistory];
  }

  /**
   * Reset state machine
   */
  reset(): void {
    this.currentState = 'idle';
    this.context = {};
    this.stateHistory = [];
    this.notifyListeners();
  }
}