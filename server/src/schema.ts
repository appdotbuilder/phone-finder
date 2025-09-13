import { z } from 'zod';

// Phone schema
export const phoneSchema = z.object({
  id: z.number(),
  device_id: z.string(), // Unique device identifier (IMEI, device UUID, etc.)
  device_name: z.string(), // User-friendly name for the device
  phone_number: z.string().nullable(), // Optional phone number
  last_seen_at: z.coerce.date(), // Last time the phone was seen
  created_at: z.coerce.date()
});

export type Phone = z.infer<typeof phoneSchema>;

// Location schema
export const locationSchema = z.object({
  id: z.number(),
  phone_id: z.number(), // Foreign key to phone
  latitude: z.number(), // GPS latitude coordinate
  longitude: z.number(), // GPS longitude coordinate
  accuracy: z.number().nullable(), // Location accuracy in meters (optional)
  altitude: z.number().nullable(), // Altitude in meters (optional)
  battery_level: z.number().int().min(0).max(100).nullable(), // Battery percentage (optional)
  timestamp: z.coerce.date(), // When this location was recorded
  created_at: z.coerce.date()
});

export type Location = z.infer<typeof locationSchema>;

// Input schema for registering a phone
export const registerPhoneInputSchema = z.object({
  device_id: z.string().min(1),
  device_name: z.string().min(1),
  phone_number: z.string().nullable()
});

export type RegisterPhoneInput = z.infer<typeof registerPhoneInputSchema>;

// Input schema for updating phone location
export const updateLocationInputSchema = z.object({
  device_id: z.string().min(1), // Identify phone by device_id
  latitude: z.number().min(-90).max(90), // Valid latitude range
  longitude: z.number().min(-180).max(180), // Valid longitude range
  accuracy: z.number().positive().nullable(),
  altitude: z.number().nullable(),
  battery_level: z.number().int().min(0).max(100).nullable()
});

export type UpdateLocationInput = z.infer<typeof updateLocationInputSchema>;

// Input schema for getting phone by device_id
export const getPhoneInputSchema = z.object({
  device_id: z.string().min(1)
});

export type GetPhoneInput = z.infer<typeof getPhoneInputSchema>;

// Response schema for phone with last known location
export const phoneWithLocationSchema = z.object({
  id: z.number(),
  device_id: z.string(),
  device_name: z.string(),
  phone_number: z.string().nullable(),
  last_seen_at: z.coerce.date(),
  created_at: z.coerce.date(),
  last_location: locationSchema.nullable() // Latest location data
});

export type PhoneWithLocation = z.infer<typeof phoneWithLocationSchema>;