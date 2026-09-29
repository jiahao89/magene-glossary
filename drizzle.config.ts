import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './server/src/common/database/schema/schema.ts',
  out: './server/drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL || 'postgresql://glossa:glossa_password@localhost:5432/glossa_hub',
  },
});
