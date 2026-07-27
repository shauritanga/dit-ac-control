/**
 * Provision a real ESP32 controller for the IoT engineer.
 *
 * Usage:
 *   npm --workspace apps/api run iot:provision -- \
 *     --serial ESP32-DIT-LAB01-A \
 *     --asset-tag DIT-AC-001
 *
 * Or by AC unit id:
 *   npm --workspace apps/api run iot:provision -- \
 *     --serial ESP32-DIT-LAB01-A \
 *     --ac-unit-id clxxxxxxxx
 *
 * Optional:
 *   --firmware 1.0.0
 *   --token <custom-16+-char-token>
 *
 * Prints serial + token once. Store the token securely and give it only to the IoT owner.
 */
import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';
import { randomBytes } from 'crypto';

const prisma = new PrismaClient();

function arg(name: string): string | undefined {
  const idx = process.argv.indexOf(`--${name}`);
  if (idx === -1) return undefined;
  return process.argv[idx + 1];
}

function required(name: string, value: string | undefined): string {
  if (!value?.trim()) {
    console.error(`Missing required --${name}`);
    process.exit(1);
  }
  return value.trim();
}

async function main() {
  const serial = required('serial', arg('serial'));
  const assetTag = arg('asset-tag');
  const acUnitIdArg = arg('ac-unit-id');
  const firmware = arg('firmware') ?? '1.0.0';
  const customToken = arg('token');

  if (!assetTag && !acUnitIdArg) {
    console.error('Provide either --asset-tag or --ac-unit-id');
    process.exit(1);
  }

  const acUnit = acUnitIdArg
    ? await prisma.acUnit.findUnique({
        where: { id: acUnitIdArg },
        include: {
          device: true,
          room: { include: { floor: { include: { building: true } } } }
        }
      })
    : await prisma.acUnit.findUnique({
        where: { assetTag: assetTag! },
        include: {
          device: true,
          room: { include: { floor: { include: { building: true } } } }
        }
      });

  if (!acUnit) {
    console.error('AC unit not found. Create the unit in the database first.');
    process.exit(1);
  }

  if (acUnit.device) {
    console.error(
      `AC unit ${acUnit.assetTag} already has controller ${acUnit.device.serial} (id=${acUnit.device.id}).`
    );
    console.error('Use rotate-token flow if you need a new secret for the same serial.');
    process.exit(1);
  }

  const existingSerial = await prisma.iotDevice.findUnique({ where: { serial } });
  if (existingSerial) {
    console.error(`Serial already registered: ${serial}`);
    process.exit(1);
  }

  const plainToken = customToken?.trim() || randomBytes(32).toString('hex');
  if (plainToken.length < 16) {
    console.error('Token must be at least 16 characters');
    process.exit(1);
  }

  const device = await prisma.iotDevice.create({
    data: {
      serial,
      tokenHash: await hash(plainToken, 10),
      firmware,
      acUnitId: acUnit.id
    }
  });

  const apiBase = process.env.IOT_API_BASE_URL ?? 'http://<LAN-IP>:3001/v1';

  console.log('');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  IoT DEVICE PROVISIONED — give this to the IoT engineer');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('');
  console.log('  Linked AC unit');
  console.log(`    Name:       ${acUnit.name}`);
  console.log(`    Asset tag:  ${acUnit.assetTag}`);
  console.log(`    Location:   ${acUnit.room.floor.building.name} / ${acUnit.room.name}`);
  console.log(`    AC unit id: ${acUnit.id}`);
  console.log('');
  console.log('  Controller credentials (store securely)');
  console.log(`    Serial:     ${device.serial}`);
  console.log(`    Token:      ${plainToken}`);
  console.log(`    Device id:  ${device.id}`);
  console.log('');
  console.log('  HTTP auth header on every IoT request');
  console.log(`    x-device-token: ${plainToken}`);
  console.log('');
  console.log('  API base URL (use LAN IP from ESP32, not localhost)');
  console.log(`    ${apiBase}`);
  console.log('');
  console.log('  Endpoints');
  console.log(`    POST ${apiBase}/iot/telemetry`);
  console.log(`    POST ${apiBase}/iot/checkin`);
  console.log(`    POST ${apiBase}/iot/commands/:id/ack`);
  console.log('');
  console.log('  WARNING: Token is hashed in the DB and cannot be shown again.');
  console.log('  Save it now. If lost, rotate the token and reflash firmware.');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
