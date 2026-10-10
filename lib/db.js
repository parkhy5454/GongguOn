const { PrismaClient } = require('@prisma/client');
const globalForPrisma = globalThis;
const prisma = globalForPrisma.prisma || new PrismaClient();
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
const db = prisma;
module.exports = { prisma, db };
module.exports.default = prisma;
module.exports.db = prisma;
