import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { phonesTable, locationsTable } from '../db/schema';
import { type GetPhoneInput } from '../schema';
import { getLocationHistory } from '../handlers/get_location_history';

describe('getLocationHistory', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return location history ordered by timestamp (newest first)', async () => {
    // Create a test phone
    const phoneResult = await db.insert(phonesTable)
      .values({
        device_id: 'test-device-123',
        device_name: 'Test Phone',
        phone_number: '+1234567890'
      })
      .returning()
      .execute();

    const phone = phoneResult[0];

    // Create multiple location records with different timestamps
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);

    await db.insert(locationsTable)
      .values([
        {
          phone_id: phone.id,
          latitude: 37.7749,
          longitude: -122.4194,
          accuracy: 10.5,
          altitude: 100.0,
          battery_level: 85,
          timestamp: twoHoursAgo // Oldest
        },
        {
          phone_id: phone.id,
          latitude: 37.7849,
          longitude: -122.4094,
          accuracy: 8.2,
          altitude: 95.0,
          battery_level: 80,
          timestamp: oneHourAgo // Middle
        },
        {
          phone_id: phone.id,
          latitude: 37.7949,
          longitude: -122.3994,
          accuracy: 12.1,
          altitude: 110.0,
          battery_level: 75,
          timestamp: now // Newest
        }
      ])
      .execute();

    const input: GetPhoneInput = {
      device_id: 'test-device-123'
    };

    const result = await getLocationHistory(input);

    // Should return all 3 locations
    expect(result).toHaveLength(3);

    // Should be ordered by timestamp (newest first)
    expect(result[0].timestamp).toEqual(now);
    expect(result[1].timestamp).toEqual(oneHourAgo);
    expect(result[2].timestamp).toEqual(twoHoursAgo);

    // Verify location data for newest record
    expect(result[0].latitude).toEqual(37.7949);
    expect(result[0].longitude).toEqual(-122.3994);
    expect(result[0].accuracy).toEqual(12.1); // real columns stored as numbers
    expect(result[0].altitude).toEqual(110.0);
    expect(result[0].battery_level).toEqual(75);
    expect(result[0].phone_id).toEqual(phone.id);
    expect(result[0].id).toBeDefined();
    expect(result[0].created_at).toBeInstanceOf(Date);
  });

  it('should return empty array for non-existent device_id', async () => {
    const input: GetPhoneInput = {
      device_id: 'non-existent-device'
    };

    const result = await getLocationHistory(input);

    expect(result).toEqual([]);
  });

  it('should return empty array for phone with no location history', async () => {
    // Create a phone without any location records
    await db.insert(phonesTable)
      .values({
        device_id: 'phone-no-locations',
        device_name: 'Phone Without Locations',
        phone_number: null
      })
      .execute();

    const input: GetPhoneInput = {
      device_id: 'phone-no-locations'
    };

    const result = await getLocationHistory(input);

    expect(result).toEqual([]);
  });

  it('should handle phones with nullable fields correctly', async () => {
    // Create a phone with minimal data
    const phoneResult = await db.insert(phonesTable)
      .values({
        device_id: 'minimal-phone',
        device_name: 'Minimal Phone',
        phone_number: null // nullable field
      })
      .returning()
      .execute();

    const phone = phoneResult[0];

    // Create location with nullable fields
    await db.insert(locationsTable)
      .values({
        phone_id: phone.id,
        latitude: 40.7128,
        longitude: -74.0060,
        accuracy: null, // nullable
        altitude: null, // nullable
        battery_level: null // nullable
      })
      .execute();

    const input: GetPhoneInput = {
      device_id: 'minimal-phone'
    };

    const result = await getLocationHistory(input);

    expect(result).toHaveLength(1);
    expect(result[0].latitude).toEqual(40.7128);
    expect(result[0].longitude).toEqual(-74.0060);
    expect(result[0].accuracy).toBeNull();
    expect(result[0].altitude).toBeNull();
    expect(result[0].battery_level).toBeNull();
    expect(result[0].phone_id).toEqual(phone.id);
  });

  it('should only return locations for the specified device', async () => {
    // Create two phones
    const phone1Result = await db.insert(phonesTable)
      .values({
        device_id: 'device-1',
        device_name: 'Phone 1',
        phone_number: '+1111111111'
      })
      .returning()
      .execute();

    const phone2Result = await db.insert(phonesTable)
      .values({
        device_id: 'device-2',
        device_name: 'Phone 2',
        phone_number: '+2222222222'
      })
      .returning()
      .execute();

    const phone1 = phone1Result[0];
    const phone2 = phone2Result[0];

    // Create locations for both phones
    await db.insert(locationsTable)
      .values([
        {
          phone_id: phone1.id,
          latitude: 37.7749,
          longitude: -122.4194,
          accuracy: 10.0,
          altitude: null,
          battery_level: 80
        },
        {
          phone_id: phone1.id,
          latitude: 37.7849,
          longitude: -122.4094,
          accuracy: 12.0,
          altitude: null,
          battery_level: 75
        },
        {
          phone_id: phone2.id,
          latitude: 40.7128,
          longitude: -74.0060,
          accuracy: 15.0,
          altitude: null,
          battery_level: 90
        }
      ])
      .execute();

    // Query locations for phone 1
    const input1: GetPhoneInput = {
      device_id: 'device-1'
    };

    const result1 = await getLocationHistory(input1);

    // Should only return locations for phone 1
    expect(result1).toHaveLength(2);
    result1.forEach(location => {
      expect(location.phone_id).toEqual(phone1.id);
    });

    // Query locations for phone 2
    const input2: GetPhoneInput = {
      device_id: 'device-2'
    };

    const result2 = await getLocationHistory(input2);

    // Should only return locations for phone 2
    expect(result2).toHaveLength(1);
    expect(result2[0].phone_id).toEqual(phone2.id);
    expect(result2[0].latitude).toEqual(40.7128);
    expect(result2[0].longitude).toEqual(-74.0060);
  });
});