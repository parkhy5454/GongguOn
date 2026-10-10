import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
export const dynamic = 'force-dynamic';
export async function POST(req){ try{ const d=await req.json(); return Response.json({success:true, received:d}); }catch(e){ return Response.json({success:false, error:e.message},{status:500}); } }
