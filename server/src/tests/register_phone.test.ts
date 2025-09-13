import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { phonesTable } from '../db/schema';
import { type RegisterPhoneInput } from '../schema';
import { registerPhone } from '../handlers/register_phone';
import { eq } from 'drizzle-orm';

// Test input for phone registration
const testInput: RegisterPhoneInput = {
  device_id: 'test-device-123',
  device_name: 'Test iPhone',
  phone_number: '+1234567890'
};

// Test input without phone number
const testInputNoPhone: RegisterPhoneInput = {
  device_id: 'test-device-456',
  device_name: 'Test Android',
  phone_number: null
};

describe('registerPhone', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should register a new phone with phone number', async () => {
    const result = await registerPhone(testInput);

    // Basic field validation
    expect(result.device_id).toEqual('test-device-123');
    expect(result.device_name).toEqual('Test iPhone');
    expect(result.phone_number).toEqual('+1234567890');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.last_seen_at).toBeInstanceOf(Date);
  });

  it('should register a new phone without phone number', async () => {
    const result = await registerPhone(testInputNoPhone);

    // Basic field validation
    expect(result.device_id).toEqual('test-device-456');
    expect(result.device_name).toEqual('Test Android');
    expect(result.phone_number).toBeNull();
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.last_seen_at).toBeInstanceOf(Date);
  });

  it('should save phone to database', async () => {
    const result = await registerPhone(testInput);

    // Query database to verify phone was saved
    const phones = await db.select()
      .from(phonesTable)
      .where(eq(phonesTable.id, result.id))
      .execute();

    expect(phones).toHaveLength(1);
    expect(phones[0].device_id).toEqual('test-device-123');
    expect(phones[0].device_name).toEqual('Test iPhone');
    expect(phones[0].phone_number).toEqual('+1234567890');
    expect(phones[0].created_at).toBeInstanceOf(Date);
    expect(phones[0].last_seen_at).toBeInstanceOf(Date);
  });

  it('should update existing phone when device_id already exists', async () => {
    // Register phone first time
    const firstResult = await registerPhone(testInput);
    const firstLastSeen = firstResult.last_seen_at;

    // Wait a bit to ensure different timestamps
    await new Promise(resolve => setTimeout(resolve, 10));

    // Register same device_id again with different data
    const updatedInput: RegisterPhoneInput = {
      device_id: 'test-device-123',
      device_name: 'Updated iPhone',
      phone_number: '+9876543210'
    };

    const secondResult = await registerPhone(updatedInput);

    // Should be same phone ID but updated data
    expect(secondResult.id).toEqual(firstResult.id);
    expect(secondResult.device_id).toEqual('test-device-123');
    expect(secondResult.device_name).toEqual('Updated iPhone');
    expect(secondResult.phone_number).toEqual('+9876543210');
    expect(secondResult.last_seen_at > firstLastSeen).toBe(true);
  });

  it('should maintain unique device_id constraint', async () => {
    // Register first phone
    await registerPhone(testInput);

    // Verify only one phone exists in database
    const phones = await db.select()
      .from(phonesTable)
      .where(eq(phonesTable.device_id, 'test-device-123'))
      .execute();

    expect(phones).toHaveLength(1);

    // Register same device_id again
    const updatedInput: RegisterPhoneInput = {
      device_id: 'test-device-123',
      device_name: 'Different Name',
      phone_number: null
    };

    await registerPhone(updatedInput);

    // Should still be only one phone with updated data
    const phonesAfterUpdate = await db.select()
      .from(phonesTable)
      .where(eq(phonesTable.device_id, 'test-device-123'))
      .execute();

    expect(phonesAfterUpdate).toHaveLength(1);
    expect(phonesAfterUpdate[0].device_name).toEqual('Different Name');
    expect(phonesAfterUpdate[0].phone_number).toBeNull();
  });

  it('should handle multiple different phones', async () => {
    // Register multiple phones with different device_ids
    const phone1 = await registerPhone(testInput);
    const phone2 = await registerPhone(testInputNoPhone);

    // Should have different IDs
    expect(phone1.id).not.toEqual(phone2.id);
    expect(phone1.device_id).toEqual('test-device-123');
    expect(phone2.device_id).toEqual('test-device-456');

    // Verify both exist in database
    const allPhones = await db.select()
      .from(phonesTable)
      .execute();

    expect(allPhones).toHaveLength(2);
  });

  it('should update last_seen_at timestamp on existing phone', async () => {
    // Register phone first time
    const firstResult = await registerPhone(testInput);
    const originalLastSeen = firstResult.last_seen_at;

    // Wait to ensure different timestamp
    await new Promise(resolve => setTimeout(resolve, 50));

    // Register same phone again
    const secondResult = await registerPhone(testInput);

    // last_seen_at should be updated
    expect(secondResult.last_seen_at > originalLastSeen).toBe(true);
    expect(secondResult.id).toEqual(firstResult.id);
  });
});