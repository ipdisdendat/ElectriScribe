import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const q = searchParams.get('search')?.trim()
  const category = searchParams.get('category')?.trim()

  const where: any = {}
  if (q) where.title = { contains: q, mode: 'insensitive' }
  if (category) where.category = category

  const issues = await prisma.issue.findMany({
    where,
    include: { symptoms: true, causes: true, solutions: true },
    orderBy: { createdAt: 'desc' },
    take: 50,
  })
  return NextResponse.json({ items: issues })
}

