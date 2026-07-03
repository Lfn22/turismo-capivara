import prisma from '../src/database'

async function main() {
  console.log('=== Backfill v2.1: PackageGuide + DepartureSlot.guideId + duration ===\n')

  // 1. Backfill PackageGuide from TourPackage.conductorId
  const packages = await prisma.tourPackage.findMany({
    where: { conductorId: { not: null } },
    select: { id: true, name: true, conductorId: true },
  })
  console.log(`Found ${packages.length} packages with conductorId`)

  let pgCreated = 0
  let pgSkipped = 0
  for (const pkg of packages) {
    const guide = await prisma.guideProfile.findFirst({
      where: { userId: pkg.conductorId! },
      select: { id: true },
    })
    if (!guide) {
      console.warn(`  WARN: No GuideProfile for conductorId ${pkg.conductorId} (package: ${pkg.name})`)
      continue
    }
    const existing = await prisma.packageGuide.findUnique({
      where: { packageId_guideId: { packageId: pkg.id, guideId: guide.id } },
    })
    if (existing) { pgSkipped++; continue }
    await prisma.packageGuide.create({
      data: { packageId: pkg.id, guideId: guide.id, active: true },
    })
    pgCreated++
    console.log(`  + PackageGuide: ${pkg.name} → guide ${guide.id}`)
  }
  console.log(`PackageGuide: ${pgCreated} created, ${pgSkipped} already existed\n`)

  // 2. Backfill DepartureSlot.guideId from parent package
  const slots = await prisma.departureSlot.findMany({
    where: { guideId: null },
    select: { id: true, packageId: true },
  })
  console.log(`Found ${slots.length} slots without guideId`)

  let slotUpdated = 0
  let slotOrphaned = 0
  for (const slot of slots) {
    const pkg = await prisma.tourPackage.findUnique({
      where: { id: slot.packageId },
      select: { conductorId: true },
    })
    if (!pkg?.conductorId) { slotOrphaned++; continue }
    const guide = await prisma.guideProfile.findFirst({
      where: { userId: pkg.conductorId },
      select: { id: true },
    })
    if (!guide) { slotOrphaned++; continue }
    await prisma.departureSlot.update({
      where: { id: slot.id },
      data: { guideId: guide.id },
    })
    slotUpdated++
  }
  console.log(`DepartureSlot.guideId: ${slotUpdated} updated, ${slotOrphaned} orphaned (no conductorId)\n`)

  // 3. Backfill TourPackage duration fields from existing duration field
  const pkgsNoDuration = await prisma.tourPackage.findMany({
    where: { durationMinHours: null },
    select: { id: true, name: true, duration: true },
  })
  console.log(`Found ${pkgsNoDuration.length} packages without durationMinHours`)

  for (const pkg of pkgsNoDuration) {
    await prisma.tourPackage.update({
      where: { id: pkg.id },
      data: { durationMinHours: pkg.duration, durationMaxHours: pkg.duration },
    })
    console.log(`  + duration for "${pkg.name}": min=${pkg.duration}h max=${pkg.duration}h`)
  }
  console.log(`Duration backfill complete\n`)

  // 4. Validation: future slots with guideId=null AND active bookings = CRITICAL
  const criticalSlots = await prisma.departureSlot.findMany({
    where: {
      guideId: null,
      startsAt: { gte: new Date() },
      bookings: { some: { status: { in: ['PENDING', 'CONFIRMED'] } } },
    },
    select: { id: true, packageId: true, startsAt: true, bookings: { select: { id: true, status: true } } },
  })
  if (criticalSlots.length > 0) {
    console.error(`\n🚨 CRÍTICO: ${criticalSlots.length} slots futuros sem guia com reservas ativas:`)
    criticalSlots.forEach(s => console.error(`  - Slot ${s.id} (${s.startsAt.toISOString()}) — ${s.bookings.length} booking(s)`))
  } else {
    console.log('✅ Validação: nenhum slot futuro crítico sem guia\n')
  }

  // 5. Summary
  const pgTotal = await prisma.packageGuide.count()
  const slotsWithGuide = await prisma.departureSlot.count({ where: { guideId: { not: null } } })
  const slotsTotal = await prisma.departureSlot.count()
  console.log('=== RESUMO ===')
  console.log(`PackageGuide total: ${pgTotal}`)
  console.log(`DepartureSlots com guideId: ${slotsWithGuide}/${slotsTotal}`)
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
