import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { DEFAULT_ACTIVE_GAMES } from '@/lib/games/defaults';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const config = await prisma.appConfig.findUnique({
      where: { id: 'default' },
      select: { activeGames: true }
    });
    
    // If no config found in DB, return all chapters as default
    if (!config) {
      return NextResponse.json({ activeGames: DEFAULT_ACTIVE_GAMES });
    }

    return NextResponse.json({ activeGames: config.activeGames });
  } catch (error) {
    console.error("Error fetching games config:", error);
    return NextResponse.json({ activeGames: [] });
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    
    await prisma.appConfig.upsert({
      where: { id: 'default' },
      update: { activeGames: body.activeGames },
      create: { id: 'default', activeGames: body.activeGames }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error saving games config:", error);
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 });
  }
}
