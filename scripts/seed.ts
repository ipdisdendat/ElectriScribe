import { PrismaClient, Role, SolutionType } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const user = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: { email: 'admin@example.com', name: 'Admin', role: Role.ADMIN },
  })

  const site = await prisma.site.create({
    data: { ownerId: user.id, name: 'Default Site', address: 'N/A', type: 'Residential' },
  })

  const panel = await prisma.panel.create({
    data: { siteId: site.id, name: 'Main Panel', capacityAmps: 200, voltage: 240 },
  })

  await prisma.circuit.createMany({
    data: [
      { panelId: panel.id, number: 1, name: 'Heat Pump A', breakerSize: 30, wireGauge: '10 AWG' },
      { panelId: panel.id, number: 3, name: 'Heat Pump B', breakerSize: 30, wireGauge: '10 AWG' },
      { panelId: panel.id, number: 5, name: 'Kitchen Plugs', breakerSize: 20, wireGauge: '12 AWG' },
      { panelId: panel.id, number: 7, name: 'Dishwasher', breakerSize: 15, wireGauge: '14 AWG' },
    ],
    skipDuplicates: true,
  })

  const issue = await prisma.issue.create({
    data: { title: 'Heat pump startup flicker', category: 'HVAC', severity: 2 },
  })

  await prisma.symptom.createMany({
    data: [
      { issueId: issue.id, description: 'Lights flicker briefly at compressor start' },
      { issueId: issue.id, description: 'Voltage sag recorded on L1/L2' },
    ],
  })

  await prisma.rootCause.createMany({
    data: [
      { issueId: issue.id, description: 'Compressor inrush current exceeds capacity' },
      { issueId: issue.id, description: 'Shared circuits amplifying sag' },
    ],
  })

  await prisma.solution.createMany({
    data: [
      { issueId: issue.id, type: SolutionType.IMMEDIATE, description: 'Install soft-start kit', costEstimate: 300, difficulty: 2, safetyRating: 3 },
      { issueId: issue.id, type: SolutionType.SMART, description: 'Stagger compressor starts', costEstimate: 50, difficulty: 1, safetyRating: 4 },
      { issueId: issue.id, type: SolutionType.INFRASTRUCTURE, description: 'Upgrade service or dedicated circuit', costEstimate: 2000, difficulty: 4, safetyRating: 5 },
    ],
  })

  console.log('Seed complete:', { user: user.email, site: site.name })
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

