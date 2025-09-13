import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { phonesTable, locationsTable } from '../db/schema';
import { type GetPhoneInput } from '../schema';
import { getPhoneLocation } from '../handlers/get_phone_location';

describe('getPhoneLocation', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return phone with last location', async () => {
    // Create test phone
    const phoneResult = await db.insert(phonesTable)
      .values({
        device_id: 'test-device-123',
        device_name: 'Test Phone',
        phone_number: '+1234567890'
      })
      .returning()
      .execute();

    const phone = phoneResult[0];

    // Create older location
    await db.insert(locationsTable)
      .values({
        phone_id: phone.id,
        latitude: 37.7749,
        longitude: -122.4194,
        accuracy: 10.5,
        altitude: 100.0,
        battery_level: 85,
        timestamp: new Date('2024-01-01T10:00:00Z')
      })
      .execute();

    // Create newer location (should be the "last" location)
    await db.insert(locationsTable)
      .values({
        phone_id: phone.id,
        latitude: 40.7128,
        longitude: -74.0060,
        accuracy: 5.0,
        altitude: 50.0,
        battery_level: 65,
        timestamp: new Date('2024-01-02T15:00:00Z')
      })
      .execute();

    const input: GetPhoneInput = {
      device_id: 'test-device-123'
    };

    const result = await getPhoneLocation(input);

    // Verify phone data
    expect(result.id).toEqual(phone.id);
    expect(result.device_id).toEqual('test-device-123');
    expect(result.device_name).toEqual('Test Phone');
    expect(result.phone_number).toEqual('+1234567890');
    expect(result.last_seen_at).toBeInstanceOf(Date);
    expect(result.created_at).toBeInstanceOf(Date);

    // Verify last location (should be the newer one)
    expect(result.last_location).not.toBeNull();
    expect(result.last_location!.phone_id).toEqual(phone.id);
    expect(result.last_location!.latitude).toEqual(40.7128);
    expect(result.last_location!.longitude).toEqual(-74.0060);
    expect(result.last_location!.accuracy).toEqual(5.0);
    expect(result.last_location!.altitude).toEqual(50.0);
    expect(result.last_location!.battery_level).toEqual(65);
    expect(result.last_location!.timestamp).toBeInstanceOf(Date);
    expect(result.last_location!.created_at).toBeInstanceOf(Date);
  });

  it('should return phone with null location when no locations exist', async () => {
    // Create test phone without any locations
    const phoneResult = await db.insert(phonesTable)
      .values({
        device_id: 'phone-no-location',
        device_name: 'Phone Without Location',
        phone_number: null
      })
      .returning()
      .execute();

    const phone = phoneResult[0];

    const input: GetPhoneInput = {
      device_id: 'phone-no-location'
    };

    const result = await getPhoneLocation(input);

    // Verify phone data
    expect(result.id).toEqual(phone.id);
    expect(result.device_id).toEqual('phone-no-location');
    expect(result.device_name).toEqual('Phone Without Location');
    expect(result.phone_number).toBeNull();
    expect(result.last_seen_at).toBeInstanceOf(Date);
    expect(result.created_at).toBeInstanceOf(Date);

    // Verify no location data
    expect(result.last_location).toBeNull();
  });

  it('should throw error when phone not found', async () => {
    const input: GetPhoneInput = {
      device_id: 'non-existent-device'
    };

    await expect(getPhoneLocation(input)).rejects.toThrow(/Phone with device_id 'non-existent-device' not found/);
  });

  it('should handle phone with nullable phone_number', async () => {
    // Create test phone with null phone_number
    const phoneResult = await db.insert(phonesTable)
      .values({
        device_id: 'device-null-number',
        device_name: 'Device Without Number'
        // phone_number is nullable, so we don't set it
      })
      .returning()
      .execute();

    const phone = phoneResult[0];

    // Create a location for this phone
    await db.insert(locationsTable)
      .values({
        phone_id: phone.id,
        latitude: 51.5074,
        longitude: -0.1278,
        accuracy: null,
        altitude: null,
        battery_level: null
      })
      .execute();

    const input: GetPhoneInput = {
      device_id: 'device-null-number'
    };

    const result = await getPhoneLocation(input);

    expect(result.device_id).toEqual('device-null-number');
    expect(result.device_name).toEqual('Device Without Number');
    expect(result.phone_number).toBeNull();
    expect(result.last_location).not.toBeNull();
    expect(result.last_location!.latitude).toEqual(51.5074);
    expect(result.last_location!.longitude).toEqual(-0.1278);
    expect(result.last_location!.accuracy).toBeNull();
    expect(result.last_location!.altitude).toBeNull();
    expect(result.last_location!.battery_level).toBeNull();
  });

  it('should return most recent location when multiple locations exist', async () => {
    // Create test phone
    const phoneResult = await db.insert(phonesTable)
      .values({
        device_id: 'multi-location-device',
        device_name: 'Multi Location Phone',
        phone_number: '+9876543210'
      })
      .returning()
      .execute();

    const phone = phoneResult[0];

    // Create multiple locations with different timestamps
    const locations = [
      {
        phone_id: phone.id,
        latitude: 34.0522,
        longitude: -118.2437,
        battery_level: 90,
        timestamp: new Date('2024-01-01T08:00:00Z')
      },
      {
        phone_id: phone.id,
        latitude: 41.8781,
        longitude: -87.6298,
        battery_level: 75,
        timestamp: new Date('2024-01-01T12:00:00Z') // Most recent
      },
      {
        phone_id: phone.id,
        latitude: 29.7604,
        longitude: -95.3698,
        battery_level: 60,
        timestamp: new Date('2024-01-01T06:00:00Z')
      }
    ];

    // Insert locations in random order
    for (const location of locations) {
      await db.insert(locationsTable)
        .values(location)
        .execute();
    }

    const input: GetPhoneInput = {
      device_id: 'multi-location-device'
    };

    const result = await getPhoneLocation(input);

    // Should return the location with the most recent timestamp
    expect(result.last_location).not.toBeNull();
    expect(result.last_location!.latitude).toEqual(41.8781); // Chicago coordinates
    expect(result.last_location!.longitude).toEqual(-87.6298);
    expect(result.last_location!.battery_level).toEqual(75);
  });
});