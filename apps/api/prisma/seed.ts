import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';

/**
 * Clean prototype seed:
 * - 1 admin user (dashboard login only)
 * - 1 building, 1 floor, 2 rooms
 * - 2 AC units only
 * - NO telemetry, alerts, commands, or IoT devices
 * Dashboard shows empty/offline until real ESP32 data arrives.
 */
const prisma = new PrismaClient();

async function main() {
  // Wipe operational data so only structure + two ACs remain
  await prisma.command.deleteMany();
  await prisma.alert.deleteMany();
  await prisma.telemetry.deleteMany();
  await prisma.iotDevice.deleteMany();
  await prisma.acUnit.deleteMany();
  await prisma.room.deleteMany();
  await prisma.floor.deleteMany();
  await prisma.building.deleteMany();
  // Keep users — only ensure admin exists

  const passwordHash = await hash('password123', 10);

  await prisma.user.upsert({
    where: { email: 'admin@dit.ac.tz' },
    update: {
      name: 'DIT Facilities Admin',
      passwordHash,
      role: 'ADMIN',
    },
    create: {
      name: 'DIT Facilities Admin',
      email: 'admin@dit.ac.tz',
      passwordHash,
      role: 'ADMIN',
    },
  });

  // Remove any non-admin demo users if present
  await prisma.user.deleteMany({
    where: { email: { not: 'admin@dit.ac.tz' } },
  });

  const building = await prisma.building.create({
    data: {
      id: 'dit-main-building',
      name: 'DIT Main Building',
      campus: 'Dar es Salaam',
      floors: {
        create: {
          id: 'dit-main-building-floor-1',
          name: 'First Floor',
          level: 1,
          rooms: {
            create: [
              { name: 'Computer Lab 1', code: 'DIT-LAB-01' },
              { name: 'Computer Lab 2', code: 'DIT-LAB-02' },
            ],
          },
        },
      },
    },
    include: {
      floors: { include: { rooms: true } },
    },
  });

  const rooms = building.floors[0].rooms;
  const room1 = rooms.find((r) => r.code === 'DIT-LAB-01')!;
  const room2 = rooms.find((r) => r.code === 'DIT-LAB-02')!;

  await prisma.acUnit.createMany({
    data: [
      {
        name: 'Lab 1 AC',
        assetTag: 'DIT-AC-001',
        manufacturer: null,
        model: null,
        roomId: room1.id,
        powerState: 'UNKNOWN',
        mode: 'AUTO',
        setpointC: 24,
        fanSpeed: 'AUTO',
        online: false,
        lastSeenAt: null,
      },
      {
        name: 'Lab 2 AC',
        assetTag: 'DIT-AC-002',
        manufacturer: null,
        model: null,
        roomId: room2.id,
        powerState: 'UNKNOWN',
        mode: 'AUTO',
        setpointC: 24,
        fanSpeed: 'AUTO',
        online: false,
        lastSeenAt: null,
      },
    ],
  });

  const unitCount = await prisma.acUnit.count();
  const roomCount = await prisma.room.count();
  const telemetryCount = await prisma.telemetry.count();
  const alertCount = await prisma.alert.count();
  const commandCount = await prisma.command.count();
  const deviceCount = await prisma.iotDevice.count();

  console.log('Clean prototype seed complete.');
  console.log(`  AC units:     ${unitCount} (expect 2)`);
  console.log(`  Rooms:        ${roomCount} (expect 2)`);
  console.log(`  Telemetry:    ${telemetryCount} (expect 0)`);
  console.log(`  Alerts:       ${alertCount} (expect 0)`);
  console.log(`  Commands:     ${commandCount} (expect 0)`);
  console.log(`  IoT devices:  ${deviceCount} (expect 0)`);
  console.log('  Login: admin@dit.ac.tz / password123');
  console.log('  Units offline until real IoT telemetry arrives.');
}

main()
  .finally(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
