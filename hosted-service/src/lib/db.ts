import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

/**
 * DATABASE_CA_CERT, when set, is the PEM of the certificate authority that
 * signs the database server's certificate. Providers like Supabase run their
 * own CA, so the public roots cannot verify them. With it we verify fully;
 * without it the connection string decides.
 */
function sslConfig(): { ca: string; rejectUnauthorized: true } | undefined {
  const ca = process.env.DATABASE_CA_CERT;
  return ca ? { ca: ca.replace(/\\n/g, "\n"), rejectUnauthorized: true } : undefined;
}

function create(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("Missing environment variable DATABASE_URL");
  return new PrismaClient({ adapter: new PrismaPg({ connectionString, max: 3, ssl: sslConfig() }) });
}

export const db: PrismaClient = globalForPrisma.prisma ?? create();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
