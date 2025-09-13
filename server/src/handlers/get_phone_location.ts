import { db } from '../db';
import { phonesTable, locationsTable } from '../db/schema';
import { type GetPhoneInput, type PhoneWithLocation } from '../schema';
import { eq, desc } from 'drizzle-orm';

export async function getPhoneLocation(input: GetPhoneInput): Promise<PhoneWithLocation> {
  try {
    // Find the phone by device_id
    const phones = await db.select()
      .from(phonesTable)
      .where(eq(phonesTable.device_id, input.device_id))
      .execute();

    if (phones.length === 0) {
      throw new Error(`Phone with device_id '${input.device_id}' not found`);
    }

    const phone = phones[0];

    // Get the most recent location record for this phone
    const locations = await db.select()
      .from(locationsTable)
      .where(eq(locationsTable.phone_id, phone.id))
      .orderBy(desc(locationsTable.timestamp))
      .limit(1)
      .execute();

    // Build the response with phone data and last location
    const result: PhoneWithLocation = {
      id: phone.id,
      device_id: phone.device_id,
      device_name: phone.device_name,
      phone_number: phone.phone_number,
      last_seen_at: phone.last_seen_at,
      created_at: phone.created_at,
      last_location: locations.length > 0 ? {
        id: locations[0].id,
        phone_id: locations[0].phone_id,
        latitude: locations[0].latitude,
        longitude: locations[0].longitude,
        accuracy: locations[0].accuracy,
        altitude: locations[0].altitude,
        battery_level: locations[0].battery_level,
        timestamp: locations[0].timestamp,
        created_at: locations[0].created_at
      } : null
    };

    return result;
  } catch (error) {
    console.error('Failed to get phone location:', error);
    throw error;
  }
}