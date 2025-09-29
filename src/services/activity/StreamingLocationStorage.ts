/**
 * StreamingLocationStorage - Efficient storage with memory management
 * Implements rolling buffer, data compression, and streaming to storage
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { LocationPoint } from './LocationTrackingService';

const STORAGE_PREFIX = '@runstr:location_stream_';
const BUFFER_SIZE = 100;
const COMPRESSION_THRESHOLD = 300; // Start compressing after 300 points
const FULL_FIDELITY_DURATION = 300000; // Keep full detail for last 5 minutes

export interface StorageSegment {
  id: string;
  sessionId: string;
  startTime: number;
  endTime: number;
  points: LocationPoint[];
  compressed: boolean;
  statistics: SegmentStatistics;
}

export interface SegmentStatistics {
  totalDistance: number;
  averageSpeed: number;
  maxSpeed: number;
  elevationGain: number;
  pointCount: number;
}

export class StreamingLocationStorage {
  private buffer: LocationPoint[] = [];
  private sessionId: string;
  private segments: StorageSegment[] = [];
  private totalPoints = 0;
  private lastFlushTime = Date.now();

  constructor(sessionId: string) {
    this.sessionId = sessionId;
  }

  /**
   * Add a location point to the buffer
   */
  async addPoint(point: LocationPoint): Promise<void> {
    this.buffer.push(point);
    this.totalPoints++;

    // Flush buffer when it reaches capacity
    if (this.buffer.length >= BUFFER_SIZE) {
      await this.flushBuffer();
    }
  }

  /**
   * Add multiple points at once (from background task)
   */
  async addPoints(points: LocationPoint[]): Promise<void> {
    for (const point of points) {
      await this.addPoint(point);
    }
  }

  /**
   * Flush buffer to storage
   */
  private async flushBuffer(): Promise<void> {
    if (this.buffer.length === 0) return;

    const segment: StorageSegment = {
      id: `${this.sessionId}_${Date.now()}`,
      sessionId: this.sessionId,
      startTime: this.buffer[0].timestamp,
      endTime: this.buffer[this.buffer.length - 1].timestamp,
      points: [...this.buffer],
      compressed: false,
      statistics: this.calculateStatistics(this.buffer),
    };

    // Store segment
    await this.storeSegment(segment);
    this.segments.push(segment);

    // Clear buffer
    this.buffer = [];
    this.lastFlushTime = Date.now();

    // Compress older segments if needed
    if (this.totalPoints > COMPRESSION_THRESHOLD) {
      await this.compressOldSegments();
    }
  }

  /**
   * Store segment to AsyncStorage
   */
  private async storeSegment(segment: StorageSegment): Promise<void> {
    const key = `${STORAGE_PREFIX}${segment.id}`;

    try {
      // Compress points if segment is large
      if (segment.points.length > 200 && !segment.compressed) {
        segment = this.compressSegment(segment);
      }

      await AsyncStorage.setItem(key, JSON.stringify(segment));
    } catch (error) {
      console.error('Failed to store segment:', error);
      // If storage fails, keep in memory but mark for retry
      segment.id += '_pending';
    }
  }

  /**
   * Compress a segment using Douglas-Peucker algorithm
   */
  private compressSegment(segment: StorageSegment): StorageSegment {
    const epsilon = this.calculateEpsilon(segment.statistics.averageSpeed);
    const compressed = this.douglasPeucker(segment.points, epsilon);

    return {
      ...segment,
      points: compressed,
      compressed: true,
    };
  }

  /**
   * Douglas-Peucker algorithm for path simplification
   */
  private douglasPeucker(points: LocationPoint[], epsilon: number): LocationPoint[] {
    if (points.length <= 2) return points;

    // Find point with maximum distance from line
    let maxDist = 0;
    let maxIndex = 0;
    const end = points.length - 1;

    for (let i = 1; i < end; i++) {
      const dist = this.perpendicularDistance(
        points[i],
        points[0],
        points[end]
      );
      if (dist > maxDist) {
        maxDist = dist;
        maxIndex = i;
      }
    }

    // If max distance is greater than epsilon, recursively simplify
    if (maxDist > epsilon) {
      const left = this.douglasPeucker(points.slice(0, maxIndex + 1), epsilon);
      const right = this.douglasPeucker(points.slice(maxIndex), epsilon);
      return [...left.slice(0, -1), ...right];
    } else {
      // Return just the endpoints
      return [points[0], points[end]];
    }
  }

  /**
   * Calculate perpendicular distance from point to line
   */
  private perpendicularDistance(
    point: LocationPoint,
    lineStart: LocationPoint,
    lineEnd: LocationPoint
  ): number {
    const x0 = point.longitude;
    const y0 = point.latitude;
    const x1 = lineStart.longitude;
    const y1 = lineStart.latitude;
    const x2 = lineEnd.longitude;
    const y2 = lineEnd.latitude;

    const A = x0 - x1;
    const B = y0 - y1;
    const C = x2 - x1;
    const D = y2 - y1;

    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    let param = -1;

    if (lenSq !== 0) {
      param = dot / lenSq;
    }

    let xx, yy;

    if (param < 0) {
      xx = x1;
      yy = y1;
    } else if (param > 1) {
      xx = x2;
      yy = y2;
    } else {
      xx = x1 + param * C;
      yy = y1 + param * D;
    }

    const dx = x0 - xx;
    const dy = y0 - yy;

    // Convert to meters (approximate)
    return Math.sqrt(dx * dx + dy * dy) * 111000;
  }

  /**
   * Calculate epsilon based on speed (faster = less precision needed)
   */
  private calculateEpsilon(averageSpeed: number): number {
    if (averageSpeed < 2) return 2; // Walking - 2m precision
    if (averageSpeed < 5) return 5; // Running - 5m precision
    return 10; // Cycling - 10m precision
  }

  /**
   * Compress segments older than threshold
   */
  private async compressOldSegments(): Promise<void> {
    const now = Date.now();
    const compressionThreshold = now - FULL_FIDELITY_DURATION;

    for (let i = 0; i < this.segments.length; i++) {
      const segment = this.segments[i];
      if (!segment.compressed && segment.endTime < compressionThreshold) {
        const compressed = this.compressSegment(segment);
        await this.storeSegment(compressed);
        this.segments[i] = compressed;
      }
    }
  }

  /**
   * Calculate statistics for a set of points
   */
  private calculateStatistics(points: LocationPoint[]): SegmentStatistics {
    if (points.length === 0) {
      return {
        totalDistance: 0,
        averageSpeed: 0,
        maxSpeed: 0,
        elevationGain: 0,
        pointCount: 0,
      };
    }

    let totalDistance = 0;
    let maxSpeed = 0;
    let elevationGain = 0;

    for (let i = 1; i < points.length; i++) {
      const dist = this.calculateDistance(points[i - 1], points[i]);
      totalDistance += dist;

      if (points[i].speed !== undefined) {
        maxSpeed = Math.max(maxSpeed, points[i].speed);
      }

      if (points[i].altitude !== undefined && points[i - 1].altitude !== undefined) {
        const gain = points[i].altitude - points[i - 1].altitude;
        if (gain > 0) elevationGain += gain;
      }
    }

    const duration = (points[points.length - 1].timestamp - points[0].timestamp) / 1000;
    const averageSpeed = duration > 0 ? totalDistance / duration : 0;

    return {
      totalDistance,
      averageSpeed,
      maxSpeed,
      elevationGain,
      pointCount: points.length,
    };
  }

  /**
   * Calculate distance between two points
   */
  private calculateDistance(p1: LocationPoint, p2: LocationPoint): number {
    const R = 6371000;
    const φ1 = (p1.latitude * Math.PI) / 180;
    const φ2 = (p2.latitude * Math.PI) / 180;
    const Δφ = ((p2.latitude - p1.latitude) * Math.PI) / 180;
    const Δλ = ((p2.longitude - p1.longitude) * Math.PI) / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  /**
   * Get all points for reconstruction
   */
  async getAllPoints(): Promise<LocationPoint[]> {
    // Flush current buffer first
    await this.flushBuffer();

    const allPoints: LocationPoint[] = [];

    // Load all segments
    for (const segment of this.segments) {
      allPoints.push(...segment.points);
    }

    return allPoints;
  }

  /**
   * Get session statistics
   */
  getStatistics(): SegmentStatistics {
    let combined: SegmentStatistics = {
      totalDistance: 0,
      averageSpeed: 0,
      maxSpeed: 0,
      elevationGain: 0,
      pointCount: 0,
    };

    for (const segment of this.segments) {
      combined.totalDistance += segment.statistics.totalDistance;
      combined.maxSpeed = Math.max(combined.maxSpeed, segment.statistics.maxSpeed);
      combined.elevationGain += segment.statistics.elevationGain;
      combined.pointCount += segment.statistics.pointCount;
    }

    // Add current buffer
    if (this.buffer.length > 0) {
      const bufferStats = this.calculateStatistics(this.buffer);
      combined.totalDistance += bufferStats.totalDistance;
      combined.maxSpeed = Math.max(combined.maxSpeed, bufferStats.maxSpeed);
      combined.elevationGain += bufferStats.elevationGain;
      combined.pointCount += bufferStats.pointCount;
    }

    return combined;
  }

  /**
   * Clear all storage for this session
   */
  async clearStorage(): Promise<void> {
    for (const segment of this.segments) {
      const key = `${STORAGE_PREFIX}${segment.id}`;
      await AsyncStorage.removeItem(key);
    }
    this.segments = [];
    this.buffer = [];
    this.totalPoints = 0;
  }
}