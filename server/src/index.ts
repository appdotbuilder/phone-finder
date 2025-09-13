import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';

// Import schemas for validation
import { 
  registerPhoneInputSchema, 
  updateLocationInputSchema, 
  getPhoneInputSchema 
} from './schema';

// Import handlers
import { registerPhone } from './handlers/register_phone';
import { updateLocation } from './handlers/update_location';
import { getPhoneLocation } from './handlers/get_phone_location';
import { getLocationHistory } from './handlers/get_location_history';

const t = initTRPC.create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

const appRouter = router({
  // Health check endpoint
  healthcheck: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),

  // Register a new phone device in the tracking system
  registerPhone: publicProcedure
    .input(registerPhoneInputSchema)
    .mutation(({ input }) => registerPhone(input)),

  // Update the location of a phone (typically called by the phone itself)
  updateLocation: publicProcedure
    .input(updateLocationInputSchema)
    .mutation(({ input }) => updateLocation(input)),

  // Get phone details with its last known location (main tracking feature)
  getPhoneLocation: publicProcedure
    .input(getPhoneInputSchema)
    .query(({ input }) => getPhoneLocation(input)),

  // Get the complete location history for a phone
  getLocationHistory: publicProcedure
    .input(getPhoneInputSchema)
    .query(({ input }) => getLocationHistory(input)),
});

export type AppRouter = typeof appRouter;

async function start() {
  const port = process.env['SERVER_PORT'] || 2022;
  const server = createHTTPServer({
    middleware: (req, res, next) => {
      cors()(req, res, next);
    },
    router: appRouter,
    createContext() {
      return {};
    },
  });
  server.listen(port);
  console.log(`Phone Tracking TRPC server listening at port: ${port}`);
}

start();