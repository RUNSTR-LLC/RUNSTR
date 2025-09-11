# Database Services - Phase 1 Foundation

This directory contains the local database services that provide the foundation for all competition features.

## Files

**workoutDatabase.ts** - Core workout metrics storage and calculation service. Provides local storage for workout data with competition calculation methods. Currently implemented with AsyncStorage as Phase 1 foundation, designed to be upgraded to SQLite for production performance.

## Purpose

The database layer enables fast competition calculations by storing workout metrics locally rather than constantly querying Nostr relays. This foundation supports:

- Real-time league ranking calculations
- Event eligibility detection
- Personal record tracking
- Competition scoring algorithms

## Implementation Notes

This is a foundational implementation using AsyncStorage to resolve immediate import dependencies. The service provides all the interfaces and methods needed by the competition system while maintaining compatibility for future SQLite upgrade.