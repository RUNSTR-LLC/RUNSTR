/**
 * LocationTrackingService - Cross-platform GPS tracking
 * Handles location permissions, tracking, and distance calculations
 */

import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const LOCATION_TASK_NAME = 'background-location-task';
const LOCATION_STORAGE_KEY = '@runstr:location_data';

export interface LocationPoint {
  latitude: number;
  longitude: number;
  altitude?: number;
  timestamp: number;
  accuracy?: number;
  speed?: number; // meters per second
}

export interface TrackingSession {
  id: string;
  startTime: number;
  endTime?: number;
  activityType: 'running' | 'walking' | 'cycling';
  locations: LocationPoint[];
  totalDistance: number; // meters
  totalElevationGain: number; // meters
  isPaused: boolean;
  pausedDuration: number; // milliseconds - cumulative total paused time
  pauseStartTime?: number; // timestamp when pause started (for calculating pause duration)
}

class LocationTrackingService {
  private static instance: LocationTrackingService;
  private currentSession: TrackingSession | null = null;
  private locationSubscription: Location.LocationSubscription | null = null;
  private lastLocation: LocationPoint | null = null;

  private constructor() {}

  static getInstance(): LocationTrackingService {
    if (!LocationTrackingService.instance) {
      LocationTrackingService.instance = new LocationTrackingService();
    }
    return LocationTrackingService.instance;
  }

  /**
   * Request location permissions
   */
  async requestPermissions(): Promise<boolean> {
    try {
      const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
      if (foregroundStatus !== 'granted') {
        console.log('Foreground location permission denied');
        return false;
      }

      // Request background permissions for tracking during workout
      if (Platform.OS === 'ios' || Platform.OS === 'android') {
        const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
        if (backgroundStatus !== 'granted') {
          console.log('Background location permission denied');
          // Can still work with foreground only
        }
      }

      return true;
    } catch (error) {
      console.error('Error requesting location permissions:', error);
      return false;
    }
  }

  /**
   * Start tracking location for an activity
   */
  async startTracking(activityType: 'running' | 'walking' | 'cycling'): Promise<boolean> {
    try {
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        return false;
      }

      // Stop any existing session
      if (this.currentSession) {
        await this.stopTracking();
      }

      // Create new session
      this.currentSession = {
        id: `session_${Date.now()}`,
        startTime: Date.now(),
        activityType,
        locations: [],
        totalDistance: 0,
        totalElevationGain: 0,
        isPaused: false,
        pausedDuration: 0,
        pauseStartTime: undefined,
      };

      // Configure location tracking options based on activity
      const options = this.getLocationOptions(activityType);

      // Start location updates
      this.locationSubscription = await Location.watchPositionAsync(
        options,
        (location) => this.handleLocationUpdate(location)
      );

      console.log(`Started tracking for ${activityType}`);
      return true;
    } catch (error) {
      console.error('Error starting location tracking:', error);
      return false;
    }
  }

  /**
   * Stop tracking location
   */
  async stopTracking(): Promise<TrackingSession | null> {
    if (this.locationSubscription) {
      this.locationSubscription.remove();
      this.locationSubscription = null;
    }

    if (this.currentSession) {
      this.currentSession.endTime = Date.now();
      const session = { ...this.currentSession };

      // Save session to storage
      await this.saveSession(session);

      this.currentSession = null;
      this.lastLocation = null;

      console.log('Stopped tracking, session saved');
      return session;
    }

    return null;
  }

  /**
   * Pause tracking
   */
  pauseTracking() {
    if (this.currentSession && !this.currentSession.isPaused) {
      this.currentSession.isPaused = true;
      this.currentSession.pauseStartTime = Date.now(); // Store when pause started
      console.log('Tracking paused');
    }
  }

  /**
   * Resume tracking
   */
  resumeTracking() {
    if (this.currentSession && this.currentSession.isPaused) {
      // Calculate actual pause duration
      const pauseDuration = this.currentSession.pauseStartTime
        ? Date.now() - this.currentSession.pauseStartTime
        : 0;
      this.currentSession.pausedDuration += pauseDuration; // Add to cumulative total
      this.currentSession.pauseStartTime = undefined; // Clear after calculating
      this.currentSession.isPaused = false;
      console.log('Tracking resumed');
    }
  }

  /**
   * Get current tracking session
   */
  getCurrentSession(): TrackingSession | null {
    return this.currentSession;
  }

  /**
   * Handle location update
   */
  private handleLocationUpdate(location: Location.LocationObject) {
    if (!this.currentSession || this.currentSession.isPaused) {
      return;
    }

    const newPoint: LocationPoint = {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      altitude: location.coords.altitude || undefined,
      timestamp: location.timestamp,
      accuracy: location.coords.accuracy || undefined,
      speed: location.coords.speed || undefined,
    };

    // Calculate distance from last point
    if (this.lastLocation) {
      const distance = this.calculateDistance(
        this.lastLocation.latitude,
        this.lastLocation.longitude,
        newPoint.latitude,
        newPoint.longitude
      );

      // Only add point if it's accurate enough and moved enough
      if (newPoint.accuracy && newPoint.accuracy < 50 && distance > 5) {
        this.currentSession.totalDistance += distance;

        // Calculate elevation gain
        if (newPoint.altitude && this.lastLocation.altitude) {
          const elevationDiff = newPoint.altitude - this.lastLocation.altitude;
          if (elevationDiff > 0) {
            this.currentSession.totalElevationGain += elevationDiff;
          }
        }

        this.currentSession.locations.push(newPoint);
        this.lastLocation = newPoint;
      }
    } else {
      // First location
      this.currentSession.locations.push(newPoint);
      this.lastLocation = newPoint;
    }
  }

  /**
   * Calculate distance between two coordinates using Haversine formula
   */
  private calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371000; // Earth's radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
  }

  /**
   * Get location options based on activity type
   */
  private getLocationOptions(activityType: string): Location.LocationOptions {
    const baseOptions: Location.LocationOptions = {
      accuracy: Location.Accuracy.BestForNavigation,
      distanceInterval: 5, // Update every 5 meters
    };

    switch (activityType) {
      case 'running':
        return {
          ...baseOptions,
          timeInterval: 2000, // Update every 2 seconds
        };
      case 'walking':
        return {
          ...baseOptions,
          timeInterval: 5000, // Update every 5 seconds
          distanceInterval: 10, // Update every 10 meters
        };
      case 'cycling':
        return {
          ...baseOptions,
          timeInterval: 1000, // Update every second for better speed tracking
          distanceInterval: 10, // Update every 10 meters
        };
      default:
        return baseOptions;
    }
  }

  /**
   * Save session to storage
   */
  private async saveSession(session: TrackingSession) {
    try {
      const existingSessions = await AsyncStorage.getItem(LOCATION_STORAGE_KEY);
      const sessions = existingSessions ? JSON.parse(existingSessions) : [];
      sessions.push(session);

      // Keep only last 50 sessions
      if (sessions.length > 50) {
        sessions.shift();
      }

      await AsyncStorage.setItem(LOCATION_STORAGE_KEY, JSON.stringify(sessions));
    } catch (error) {
      console.error('Error saving session:', error);
    }
  }

  /**
   * Get saved sessions
   */
  async getSavedSessions(): Promise<TrackingSession[]> {
    try {
      const sessions = await AsyncStorage.getItem(LOCATION_STORAGE_KEY);
      return sessions ? JSON.parse(sessions) : [];
    } catch (error) {
      console.error('Error loading sessions:', error);
      return [];
    }
  }
}

export const locationTrackingService = LocationTrackingService.getInstance();