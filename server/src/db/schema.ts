import { serial, text, pgTable, timestamp, real, integer } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const phonesTable = pgTable('phones', {
  id: serial('id').primaryKey(),
  device_id: text('device_id').notNull().unique(), // Unique device identifier
  device_name: text('device_name').notNull(), // User-friendly device name
  phone_number: text('phone_number'), // Optional phone number (nullable by default)
  last_seen_at: timestamp('last_seen_at').defaultNow().notNull(), // Last seen timestamp
  created_at: timestamp('created_at').defaultNow().notNull(),
});

export const locationsTable = pgTable('locations', {
  id: serial('id').primaryKey(),
  phone_id: integer('phone_id').references(() => phonesTable.id).notNull(), // Foreign key to phones
  latitude: real('latitude').notNull(), // GPS latitude coordinate
  longitude: real('longitude').notNull(), // GPS longitude coordinate
  accuracy: real('accuracy'), // Location accuracy in meters (nullable)
  altitude: real('altitude'), // Altitude in meters (nullable)
  battery_level: integer('battery_level'), // Battery percentage 0-100 (nullable)
  timestamp: timestamp('timestamp').defaultNow().notNull(), // When location was recorded
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Define relations between tables
export const phonesRelations = relations(phonesTable, ({ many }) => ({
  locations: many(locationsTable), // One phone can have many location records
}));

export const locationsRelations = relations(locationsTable, ({ one }) => ({
  phone: one(phonesTable, {
    fields: [locationsTable.phone_id],
    references: [phonesTable.id],
  }), // Each location belongs to one phone
}));

// TypeScript types for the table schemas
export type Phone = typeof phonesTable.$inferSelect; // For SELECT operations
export type NewPhone = typeof phonesTable.$inferInsert; // For INSERT operations
export type Location = typeof locationsTable.$inferSelect; // For SELECT operations
export type NewLocation = typeof locationsTable.$inferInsert; // For INSERT operations

// Important: Export all tables and relations for proper query building
export const tables = { 
  phones: phonesTable, 
  locations: locationsTable 
};

export const tableRelations = {
  phonesRelations,
  locationsRelations
};