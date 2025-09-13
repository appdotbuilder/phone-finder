import { db } from '../db';
import { phonesTable } from '../db/schema';
import { type RegisterPhoneInput, type Phone } from '../schema';
import { eq } from 'drizzle-orm';

export async function registerPhone(input: RegisterPhoneInput): Promise<Phone> {
  try {
    // Check if a phone with the same device_id already exists
    const existingPhone = await db.select()
      .from(phonesTable)
      .where(eq(phonesTable.device_id, input.device_id))
      .execute();

    if (existingPhone.length > 0) {
      // If phone exists, update its information and last_seen_at timestamp
      const updatedPhone = await db.update(phonesTable)
        .set({
          device_name: input.device_name,
          phone_number: input.phone_number,
          last_seen_at: new Date()
        })
        .where(eq(phonesTable.device_id, input.device_id))
        .returning()
        .execute();

      return updatedPhone[0];
    }

    // Create new phone record
    const result = await db.insert(phonesTable)
      .values({
        device_id: input.device_id,
        device_name: input.device_name,
        phone_number: input.phone_number
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Phone registration failed:', error);
    throw error;
  }
}