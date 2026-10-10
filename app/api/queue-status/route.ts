import { NextResponse } from 'next/server';
import { compilerQueueState } from '@/lib/queue-state';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json(compilerQueueState);
}
