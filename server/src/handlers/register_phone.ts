import { db } from '../db';
import { phonesTable } from '../db/schema';
import { type RegisterPhoneInput, type Phone } from '../schema';
import { eq } from 'drizzle-orm';

export async function registerPhone(input: RegisterPhoneInput): Promise<Phone> {
  try {
    console.log('Starting phone registration for device_id:', input.device_id);

    // Use a transaction to ensure atomicity
    const result = await db.transaction(async (tx) => {
      try {
        // Check if a phone with the same device_id already exists
        const existingPhones = await tx.select()
          .from(phonesTable)
          .where(eq(phonesTable.device_id, input.device_id))
          .execute();

        if (existingPhones.length > 0) {
          console.log('Phone already exists, updating information for device_id:', input.device_id);
          
          // If phone exists, update its information and last_seen_at timestamp
          const updatedPhones = await tx.update(phonesTable)
            .set({
              device_name: input.device_name,
              phone_number: input.phone_number,
              last_seen_at: new Date()
            })
            .where(eq(phonesTable.device_id, input.device_id))
            .returning()
            .execute();

          if (updatedPhones.length === 0) {
            throw new Error('Failed to update existing phone record - no rows returned');
          }

          console.log('Successfully updated phone information for device_id:', input.device_id);
          return updatedPhones[0];
        }

        console.log('Creating new phone record for device_id:', input.device_id);

        // Create new phone record
        const newPhones = await tx.insert(phonesTable)
          .values({
            device_id: input.device_id,
            device_name: input.device_name,
            phone_number: input.phone_number
          })
          .returning()
          .execute();

        if (newPhones.length === 0) {
          throw new Error('Failed to create new phone record - no rows returned');
        }

        console.log('Successfully created new phone record with id:', newPhones[0].id);
        return newPhones[0];

      } catch (transactionError) {
        console.error('Transaction error during phone registration:', {
          device_id: input.device_id,
          error: transactionError,
          stack: transactionError instanceof Error ? transactionError.stack : undefined
        });
        throw new Error(`Phone registration transaction failed: ${transactionError instanceof Error ? transactionError.message : 'Unknown transaction error'}`);
      }
    });

    return result;

  } catch (error) {
    console.error('Phone registration failed:', {
      device_id: input.device_id,
      device_name: input.device_name,
      error: error,
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    });

    // Provide more specific error messages for different failure scenarios
    if (error instanceof Error) {
      if (error.message.includes('unique constraint')) {
        throw new Error(`Device with ID ${input.device_id} is already registered. Please use a unique device identifier.`);
      }
      
      if (error.message.includes('foreign key')) {
        throw new Error('Invalid reference data provided during phone registration');
      }
      
      if (error.message.includes('not null')) {
        throw new Error('Required phone information is missing. Please provide all mandatory fields.');
      }
      
      if (error.message.includes('transaction')) {
        // Re-throw transaction errors as they already have good context
        throw error;
      }
    }

    // Generic error for unexpected cases
    throw new Error(`Phone registration failed for device ${input.device_id}. Please check your input data and try again.`);
  }
}