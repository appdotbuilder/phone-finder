import { db } from '../db';
import { phonesTable, locationsTable } from '../db/schema';
import { type UpdateLocationInput, type Location } from '../schema';
import { eq } from 'drizzle-orm';

export async function updateLocation(input: UpdateLocationInput): Promise<Location> {
  try {
    // Find the phone by device_id
    const phones = await db.select()
      .from(phonesTable)
      .where(eq(phonesTable.device_id, input.device_id))
      .execute();

    if (phones.length === 0) {
      throw new Error(`Phone with device_id ${input.device_id} not found`);
    }

    const phone = phones[0];

    // Create a new location record
    const locationResult = await db.insert(locationsTable)
      .values({
        phone_id: phone.id,
        latitude: input.latitude,
        longitude: input.longitude,
        accuracy: input.accuracy,
        altitude: input.altitude,
        battery_level: input.battery_level,
        timestamp: new Date() // Current timestamp when location is recorded
      })
      .returning()
      .execute();

    // Update the phone's last_seen_at timestamp
    await db.update(phonesTable)
      .set({ last_seen_at: new Date() })
      .where(eq(phonesTable.id, phone.id))
      .execute();

    // Return the created location record
    return locationResult[0];
  } catch (error) {
    console.error('Location update failed:', error);
    throw error;
  }
}