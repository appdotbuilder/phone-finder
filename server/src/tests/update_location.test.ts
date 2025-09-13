import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { phonesTable, locationsTable } from '../db/schema';
import { type UpdateLocationInput } from '../schema';
import { updateLocation } from '../handlers/update_location';
import { eq } from 'drizzle-orm';

// Test input data
const testLocationInput: UpdateLocationInput = {
  device_id: 'test-device-123',
  latitude: 40.7128,
  longitude: -74.0060,
  accuracy: 5.2,
  altitude: 10.5,
  battery_level: 85
};

const testLocationInputMinimal: UpdateLocationInput = {
  device_id: 'test-device-456',
  latitude: 34.0522,
  longitude: -118.2437,
  accuracy: null,
  altitude: null,
  battery_level: null
};

describe('updateLocation', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create location record for existing phone', async () => {
    // Create a test phone first
    const phoneResult = await db.insert(phonesTable)
      .values({
        device_id: 'test-device-123',
        device_name: 'Test iPhone',
        phone_number: '+1234567890'
      })
      .returning()
      .execute();

    const result = await updateLocation(testLocationInput);

    // Validate returned location data
    expect(result.phone_id).toEqual(phoneResult[0].id);
    expect(result.latitude).toEqual(40.7128);
    expect(result.longitude).toEqual(-74.0060);
    expect(result.accuracy).toEqual(5.2);
    expect(result.altitude).toEqual(10.5);
    expect(result.battery_level).toEqual(85);
    expect(result.id).toBeDefined();
    expect(result.timestamp).toBeInstanceOf(Date);
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should save location record to database', async () => {
    // Create a test phone first
    const phoneResult = await db.insert(phonesTable)
      .values({
        device_id: 'test-device-123',
        device_name: 'Test Android',
        phone_number: null
      })
      .returning()
      .execute();

    const result = await updateLocation(testLocationInput);

    // Query the location from database
    const locations = await db.select()
      .from(locationsTable)
      .where(eq(locationsTable.id, result.id))
      .execute();

    expect(locations).toHaveLength(1);
    const location = locations[0];
    expect(location.phone_id).toEqual(phoneResult[0].id);
    expect(location.latitude).toEqual(40.7128);
    expect(location.longitude).toEqual(-74.0060);
    expect(location.accuracy).toEqual(5.2);
    expect(location.altitude).toEqual(10.5);
    expect(location.battery_level).toEqual(85);
    expect(location.timestamp).toBeInstanceOf(Date);
    expect(location.created_at).toBeInstanceOf(Date);
  });

  it('should update phone last_seen_at timestamp', async () => {
    // Create a test phone first
    const phoneResult = await db.insert(phonesTable)
      .values({
        device_id: 'test-device-123',
        device_name: 'Test Phone',
        phone_number: '+9876543210'
      })
      .returning()
      .execute();

    const originalLastSeen = phoneResult[0].last_seen_at;

    // Wait a moment to ensure timestamp difference
    await new Promise(resolve => setTimeout(resolve, 10));

    await updateLocation(testLocationInput);

    // Query updated phone record
    const phones = await db.select()
      .from(phonesTable)
      .where(eq(phonesTable.id, phoneResult[0].id))
      .execute();

    expect(phones).toHaveLength(1);
    const updatedPhone = phones[0];
    expect(updatedPhone.last_seen_at).toBeInstanceOf(Date);
    expect(updatedPhone.last_seen_at.getTime()).toBeGreaterThan(originalLastSeen.getTime());
  });

  it('should handle location with minimal data', async () => {
    // Create a test phone first
    await db.insert(phonesTable)
      .values({
        device_id: 'test-device-456',
        device_name: 'Minimal Test Phone',
        phone_number: null
      })
      .returning()
      .execute();

    const result = await updateLocation(testLocationInputMinimal);

    // Validate returned location data
    expect(result.latitude).toEqual(34.0522);
    expect(result.longitude).toEqual(-118.2437);
    expect(result.accuracy).toBeNull();
    expect(result.altitude).toBeNull();
    expect(result.battery_level).toBeNull();
    expect(result.id).toBeDefined();
    expect(result.timestamp).toBeInstanceOf(Date);
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should handle multiple location updates for same phone', async () => {
    // Create a test phone first
    const phoneResult = await db.insert(phonesTable)
      .values({
        device_id: 'test-device-123',
        device_name: 'Multi-Location Phone',
        phone_number: '+5555555555'
      })
      .returning()
      .execute();

    // First location update
    const location1 = await updateLocation({
      device_id: 'test-device-123',
      latitude: 40.7128,
      longitude: -74.0060,
      accuracy: 5.0,
      altitude: null,
      battery_level: 90
    });

    // Second location update
    const location2 = await updateLocation({
      device_id: 'test-device-123',
      latitude: 40.7589,
      longitude: -73.9851,
      accuracy: 3.2,
      altitude: 15.0,
      battery_level: 75
    });

    // Both locations should exist
    expect(location1.id).not.toEqual(location2.id);
    expect(location1.phone_id).toEqual(phoneResult[0].id);
    expect(location2.phone_id).toEqual(phoneResult[0].id);

    // Query all locations for this phone
    const allLocations = await db.select()
      .from(locationsTable)
      .where(eq(locationsTable.phone_id, phoneResult[0].id))
      .execute();

    expect(allLocations).toHaveLength(2);
    expect(allLocations.map(l => l.latitude)).toContain(40.7128);
    expect(allLocations.map(l => l.latitude)).toContain(40.7589);
  });

  it('should throw error for non-existent device_id', async () => {
    await expect(updateLocation({
      device_id: 'non-existent-device',
      latitude: 0,
      longitude: 0,
      accuracy: null,
      altitude: null,
      battery_level: null
    })).rejects.toThrow(/Phone with device_id non-existent-device not found/i);
  });

  it('should handle valid coordinate boundaries', async () => {
    // Create test phone
    await db.insert(phonesTable)
      .values({
        device_id: 'boundary-test-phone',
        device_name: 'Boundary Test',
        phone_number: null
      })
      .returning()
      .execute();

    // Test valid latitude/longitude boundaries
    const extremeLocation = await updateLocation({
      device_id: 'boundary-test-phone',
      latitude: 90, // Maximum latitude
      longitude: -180, // Minimum longitude
      accuracy: 0.1,
      altitude: -500, // Below sea level
      battery_level: 1 // Minimum battery
    });

    expect(extremeLocation.latitude).toEqual(90);
    expect(extremeLocation.longitude).toEqual(-180);
    expect(extremeLocation.altitude).toEqual(-500);
    expect(extremeLocation.battery_level).toEqual(1);
  });
});