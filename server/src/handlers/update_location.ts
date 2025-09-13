import { db } from '../db';
import { phonesTable, locationsTable } from '../db/schema';
import { type UpdateLocationInput, type Location } from '../schema';
import { eq } from 'drizzle-orm';

export async function updateLocation(input: UpdateLocationInput): Promise<Location> {
  try {
    console.log('Starting location update for device_id:', input.device_id);

    // Validate input coordinates
    if (input.latitude < -90 || input.latitude > 90) {
      throw new Error(`Invalid latitude: ${input.latitude}. Must be between -90 and 90 degrees.`);
    }
    
    if (input.longitude < -180 || input.longitude > 180) {
      throw new Error(`Invalid longitude: ${input.longitude}. Must be between -180 and 180 degrees.`);
    }

    if (input.battery_level !== null && (input.battery_level < 0 || input.battery_level > 100)) {
      throw new Error(`Invalid battery level: ${input.battery_level}. Must be between 0 and 100.`);
    }

    // Use a transaction to ensure both location creation and phone update succeed together
    const result = await db.transaction(async (tx) => {
      try {
        // Find the phone by device_id
        const phones = await tx.select()
          .from(phonesTable)
          .where(eq(phonesTable.device_id, input.device_id))
          .execute();

        if (phones.length === 0) {
          throw new Error(`Phone with device_id ${input.device_id} not found`);
        }

        if (phones.length > 1) {
          console.warn('Multiple phones found with same device_id:', input.device_id);
          throw new Error(`Data integrity issue: Multiple phones found with device_id '${input.device_id}'`);
        }

        const phone = phones[0];
        console.log('Found phone with id:', phone.id, 'for device_id:', input.device_id);

        // Create a new location record
        const locationResults = await tx.insert(locationsTable)
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

        if (locationResults.length === 0) {
          throw new Error('Failed to create location record - no rows returned');
        }

        const newLocation = locationResults[0];
        console.log('Successfully created location record with id:', newLocation.id);

        // Update the phone's last_seen_at timestamp
        const updatedPhones = await tx.update(phonesTable)
          .set({ last_seen_at: new Date() })
          .where(eq(phonesTable.id, phone.id))
          .returning()
          .execute();

        if (updatedPhones.length === 0) {
          throw new Error('Failed to update phone last_seen_at timestamp - no rows returned');
        }

        console.log('Successfully updated phone last_seen_at for phone id:', phone.id);

        // Return the created location record
        return newLocation;

      } catch (transactionError) {
        console.error('Transaction error during location update:', {
          device_id: input.device_id,
          latitude: input.latitude,
          longitude: input.longitude,
          error: transactionError,
          stack: transactionError instanceof Error ? transactionError.stack : undefined
        });
        throw new Error(`Location update transaction failed: ${transactionError instanceof Error ? transactionError.message : 'Unknown transaction error'}`);
      }
    });

    console.log('Location update completed successfully for device_id:', input.device_id);
    return result;

  } catch (error) {
    console.error('Location update failed:', {
      device_id: input.device_id,
      coordinates: { latitude: input.latitude, longitude: input.longitude },
      accuracy: input.accuracy,
      altitude: input.altitude,
      battery_level: input.battery_level,
      error: error,
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    });

    // Provide more specific error messages for different failure scenarios
    if (error instanceof Error) {
      if (error.message.includes('Phone with device_id') && error.message.includes('not found')) {
        // Re-throw with original format for test compatibility, but log detailed message
        console.error(`Device '${input.device_id}' is not registered in the tracking system. Please register the device first before updating its location.`);
        throw error;
      }
      
      if (error.message.includes('Invalid latitude') || error.message.includes('Invalid longitude') || error.message.includes('Invalid battery level')) {
        // Re-throw validation errors as they already have good context
        throw error;
      }
      
      if (error.message.includes('foreign key')) {
        throw new Error(`Data integrity error: Unable to link location to phone for device '${input.device_id}'`);
      }
      
      if (error.message.includes('not null')) {
        throw new Error('Required location data is missing. Please provide valid latitude and longitude coordinates.');
      }
      
      if (error.message.includes('transaction')) {
        // Re-throw transaction errors as they already have good context
        throw error;
      }
      
      if (error.message.includes('Multiple phones found')) {
        // Re-throw data integrity errors as they already have good context
        throw error;
      }
    }

    // Generic error for unexpected cases
    throw new Error(`Location update failed for device '${input.device_id}'. Please check your coordinates and try again.`);
  }
}