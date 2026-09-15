import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/authServer';

export async function PATCH(req, { params }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const body = await req.json();
  const data = {};
  if (body.status) data.status = body.status;
  if (body.assigneeId !== undefined) data.assigneeId = body.assigneeId;
  if (body.dueDate !== undefined) data.dueDate = body.dueDate ? new Date(body.dueDate) : null;

  const todo = await prisma.todo.update({
    where: { id: params.id },
    data,
    include: {
      assignee: { select: { id: true, name: true } },
      creator: { select: { id: true, name: true } },
      channel: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json({ todo });
}
