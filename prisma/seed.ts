import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import bcryptjs from "bcryptjs";
const { hash } = bcryptjs;

const prisma = new PrismaClient();

async function main() {
  const masterEmail = process.env.MASTER_EMAIL ?? "admin@supercrown.com";
  const masterPassword = process.env.MASTER_PASSWORD ?? "master2026!";
  const masterName = process.env.MASTER_NAME ?? "Victor";

  const masterHash = await hash(masterPassword, 12);
  const salesHash = await hash("sales123", 12);
  const deliveryHash = await hash("delivery123", 12);

  await prisma.user.upsert({
    where: { email: masterEmail },
    update: { passwordHash: masterHash, name: masterName, role: "MASTER" },
    create: {
      email: masterEmail,
      passwordHash: masterHash,
      name: masterName,
      role: "MASTER",
    },
  });

  await prisma.user.upsert({
    where: { email: "ventas@supercrown.com" },
    update: {},
    create: {
      email: "ventas@supercrown.com",
      passwordHash: salesHash,
      name: "Sales Team",
      role: "SALES",
    },
  });

  await prisma.user.upsert({
    where: { email: "repartidor@supercrown.com" },
    update: {},
    create: {
      email: "repartidor@supercrown.com",
      passwordHash: deliveryHash,
      name: "Delivery Driver",
      role: "DELIVERY",
    },
  });

  console.log("Seed completed:");
  console.log(`  MASTER: ${masterEmail} / ${masterPassword}`);
  console.log("  SALES: ventas@supercrown.com / sales123");
  console.log("  DELIVERY: repartidor@supercrown.com / delivery123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
