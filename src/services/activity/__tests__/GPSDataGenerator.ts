/**
 * GPSDataGenerator - Synthetic GPS data generation for testing
 * Generates realistic GPS coordinates with known distances
 */

export interface GPSPoint {
  latitude: number;
  longitude: number;
  altitude?: number;
  timestamp: number;
  accuracy?: number;
  speed?: number;
}

export class GPSDataGenerator {
  private readonly EARTH_RADIUS_METERS = 6371000;
  private readonly AVERAGE_RUNNING_SPEED_MPS = 3.5; // 3.5 m/s = ~12.6 km/h
  private readonly GPS_UPDATE_INTERVAL_MS = 3000; // 3 seconds between points

  /**
   * Generate a single GPS point
   */
  private generatePoint(
    startLat: number,
    startLon: number,
    distanceMeters: number,
    bearing: number,
    timestamp: number,
    accuracy: number = 10,
    speed?: number
  ): GPSPoint {
    // Calculate new position using bearing and distance
    const { lat, lon } = this.calculateNewPosition(
      startLat,
      startLon,
      distanceMeters,
      bearing
    );

    return {
      latitude: lat,
      longitude: lon,
      altitude: 10 + Math.random() * 5, // Simulate slight elevation changes
      timestamp,
      accuracy,
      speed: speed || this.AVERAGE_RUNNING_SPEED_MPS,
    };
  }

  /**
   * Calculate new GPS position given start point, distance, and bearing
   */
  private calculateNewPosition(
    lat: number,
    lon: number,
    distance: number,
    bearing: number
  ): { lat: number; lon: number } {
    const latRad = (lat * Math.PI) / 180;
    const lonRad = (lon * Math.PI) / 180;
    const bearingRad = (bearing * Math.PI) / 180;

    const newLatRad = Math.asin(
      Math.sin(latRad) * Math.cos(distance / this.EARTH_RADIUS_METERS) +
        Math.cos(latRad) *
          Math.sin(distance / this.EARTH_RADIUS_METERS) *
          Math.cos(bearingRad)
    );

    const newLonRad =
      lonRad +
      Math.atan2(
        Math.sin(bearingRad) *
          Math.sin(distance / this.EARTH_RADIUS_METERS) *
          Math.cos(latRad),
        Math.cos(distance / this.EARTH_RADIUS_METERS) -
          Math.sin(latRad) * Math.sin(newLatRad)
      );

    return {
      lat: (newLatRad * 180) / Math.PI,
      lon: (newLonRad * 180) / Math.PI,
    };
  }

  /**
   * Calculate distance between two GPS points using Haversine formula
   */
  calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return this.EARTH_RADIUS_METERS * c;
  }

  /**
   * Create straight line route (e.g., 1km straight)
   */
  createStraightRoute(
    distanceMeters: number,
    startLat: number = 37.7749, // San Francisco default
    startLon: number = -122.4194
  ): GPSPoint[] {
    const points: GPSPoint[] = [];
    const bearing = 0; // Due north
    const numPoints = Math.floor(distanceMeters / (this.AVERAGE_RUNNING_SPEED_MPS * (this.GPS_UPDATE_INTERVAL_MS / 1000)));

    let currentLat = startLat;
    let currentLon = startLon;
    let timestamp = Date.now();

    for (let i = 0; i < numPoints; i++) {
      const segmentDistance = this.AVERAGE_RUNNING_SPEED_MPS * (this.GPS_UPDATE_INTERVAL_MS / 1000);

      const point = this.generatePoint(
        currentLat,
        currentLon,
        segmentDistance,
        bearing,
        timestamp,
        10 + Math.random() * 5 // Good GPS accuracy: 10-15m
      );

      points.push(point);

      currentLat = point.latitude;
      currentLon = point.longitude;
      timestamp += this.GPS_UPDATE_INTERVAL_MS;
    }

    return points;
  }

  /**
   * Create tunnel scenario: GPS loss for 15 seconds
   */
  createTunnelScenario(): GPSPoint[] {
    const points: GPSPoint[] = [];
    const startLat = 37.7749;
    const startLon = -122.4194;
    let timestamp = Date.now();

    // 100m before tunnel (good GPS)
    const beforeTunnel = this.createStraightRoute(100, startLat, startLon);
    points.push(...beforeTunnel);

    // 15 second gap (no GPS points - tunnel)
    timestamp = beforeTunnel[beforeTunnel.length - 1].timestamp + 15000;

    // After tunnel: first 2 points have poor accuracy
    const lastPoint = beforeTunnel[beforeTunnel.length - 1];
    const afterTunnelStartLat = lastPoint.latitude;
    const afterTunnelStartLon = lastPoint.longitude;

    // First point after tunnel: very poor accuracy
    points.push(
      this.generatePoint(
        afterTunnelStartLat,
        afterTunnelStartLon,
        10,
        0,
        timestamp,
        80 // Poor accuracy
      )
    );

    timestamp += this.GPS_UPDATE_INTERVAL_MS;

    // Second point: improving accuracy
    points.push(
      this.generatePoint(
        points[points.length - 1].latitude,
        points[points.length - 1].longitude,
        10,
        0,
        timestamp,
        50 // Better but still not great
      )
    );

    timestamp += this.GPS_UPDATE_INTERVAL_MS;

    // Rest of points: good accuracy
    const afterTunnel = this.createStraightRoute(
      100,
      points[points.length - 1].latitude,
      points[points.length - 1].longitude
    );

    // Adjust timestamps
    afterTunnel.forEach((point, i) => {
      point.timestamp = timestamp + i * this.GPS_UPDATE_INTERVAL_MS;
    });

    points.push(...afterTunnel);

    return points;
  }

  /**
   * Create background scenario: duplicate points simulation
   */
  createBackgroundScenario(): GPSPoint[] {
    const points: GPSPoint[] = [];

    // Normal tracking for 500m
    const normalPoints = this.createStraightRoute(500);
    points.push(...normalPoints);

    // Simulate background sync - add duplicate points
    const lastTenPoints = normalPoints.slice(-10);
    points.push(...lastTenPoints); // Duplicates with same timestamps

    // Continue normal tracking for another 500m
    const lastPoint = normalPoints[normalPoints.length - 1];
    const continuePoints = this.createStraightRoute(
      500,
      lastPoint.latitude,
      lastPoint.longitude
    );

    // Adjust timestamps for continuation
    const timestampOffset = lastPoint.timestamp + this.GPS_UPDATE_INTERVAL_MS;
    continuePoints.forEach((point, i) => {
      point.timestamp = timestampOffset + i * this.GPS_UPDATE_INTERVAL_MS;
    });

    points.push(...continuePoints);

    return points;
  }

  /**
   * Create 30 minute run simulation
   */
  create30MinuteRun(): GPSPoint[] {
    // 30 minutes at 3.5 m/s = 6.3 km
    return this.createStraightRoute(6300);
  }

  /**
   * Create 10 minute run simulation
   */
  create10MinuteRun(): GPSPoint[] {
    // 10 minutes at 3.5 m/s = 2.1 km
    return this.createStraightRoute(2100);
  }

  /**
   * Create scenario that could cause recovery mode to get stuck
   */
  createStuckRecoveryScenario(): GPSPoint[] {
    const points: GPSPoint[] = [];
    let timestamp = Date.now();

    // Normal start
    const start = this.createStraightRoute(100);
    points.push(...start);

    timestamp = start[start.length - 1].timestamp;

    // GPS loss
    timestamp += 15000;

    // Recovery with persistently poor accuracy (could get stuck)
    const lastPoint = start[start.length - 1];
    for (let i = 0; i < 5; i++) {
      points.push(
        this.generatePoint(
          lastPoint.latitude + i * 0.0001,
          lastPoint.longitude + i * 0.0001,
          10,
          0,
          timestamp + i * this.GPS_UPDATE_INTERVAL_MS,
          60 // Consistently poor accuracy
        )
      );
    }

    timestamp += 5 * this.GPS_UPDATE_INTERVAL_MS;

    // Eventually good GPS returns
    const recovery = this.createStraightRoute(
      100,
      points[points.length - 1].latitude,
      points[points.length - 1].longitude
    );

    recovery.forEach((point, i) => {
      point.timestamp = timestamp + i * this.GPS_UPDATE_INTERVAL_MS;
    });

    points.push(...recovery);

    return points;
  }

  /**
   * Create complex route with turns (5km)
   */
  createComplexRoute(): GPSPoint[] {
    const points: GPSPoint[] = [];
    let currentLat = 37.7749;
    let currentLon = -122.4194;
    let timestamp = Date.now();

    // Define route segments with different bearings
    const segments = [
      { distance: 1000, bearing: 0 }, // 1km north
      { distance: 500, bearing: 90 }, // 0.5km east
      { distance: 1500, bearing: 180 }, // 1.5km south
      { distance: 1000, bearing: 270 }, // 1km west
      { distance: 1000, bearing: 0 }, // 1km north to finish
    ];

    for (const segment of segments) {
      const segmentPoints = Math.floor(
        segment.distance /
          (this.AVERAGE_RUNNING_SPEED_MPS * (this.GPS_UPDATE_INTERVAL_MS / 1000))
      );

      for (let i = 0; i < segmentPoints; i++) {
        const segmentDistance =
          this.AVERAGE_RUNNING_SPEED_MPS * (this.GPS_UPDATE_INTERVAL_MS / 1000);

        const point = this.generatePoint(
          currentLat,
          currentLon,
          segmentDistance,
          segment.bearing,
          timestamp,
          10 + Math.random() * 10
        );

        points.push(point);

        currentLat = point.latitude;
        currentLon = point.longitude;
        timestamp += this.GPS_UPDATE_INTERVAL_MS;
      }
    }

    return points;
  }

  /**
   * Calculate total distance of a GPS point array
   */
  getTotalDistance(points: GPSPoint[]): number {
    let totalDistance = 0;

    for (let i = 1; i < points.length; i++) {
      totalDistance += this.calculateDistance(
        points[i - 1].latitude,
        points[i - 1].longitude,
        points[i].latitude,
        points[i].longitude
      );
    }

    return totalDistance;
  }

  /**
   * Get duration in seconds from GPS points
   */
  getTotalDuration(points: GPSPoint[]): number {
    if (points.length < 2) return 0;
    return (points[points.length - 1].timestamp - points[0].timestamp) / 1000;
  }
}
