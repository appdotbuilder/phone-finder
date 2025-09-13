import { db } from '../db';
import { phonesTable, locationsTable } from '../db/schema';
import { type GetPhoneInput, type Location } from '../schema';
import { eq, desc } from 'drizzle-orm';

export async function getLocationHistory(input: GetPhoneInput): Promise<Location[]> {
  try {
    // First, find the phone by device_id
    const phones = await db.select()
      .from(phonesTable)
      .where(eq(phonesTable.device_id, input.device_id))
      .execute();

    // If phone not found, return empty array
    if (phones.length === 0) {
      return [];
    }

    const phone = phones[0];

    // Get all location records for this phone, ordered by timestamp (newest first)
    const locations = await db.select()
      .from(locationsTable)
      .where(eq(locationsTable.phone_id, phone.id))
      .orderBy(desc(locationsTable.timestamp))
      .execute();

    // Return the location history
    return locations;
  } catch (error) {
    console.error('Location history retrieval failed:', error);
    throw error;
  }
}