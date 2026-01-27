-- CreateEnum
CREATE TYPE "Locale" AS ENUM ('EN', 'FR', 'ES', 'DE');

-- CreateEnum
CREATE TYPE "TownPhase" AS ENUM ('ALPHA', 'BETA', 'IMPORT', 'NATIVE');

-- CreateEnum
CREATE TYPE "TownType" AS ENUM ('SMALL', 'REMOTE', 'PANDEMONIUM', 'CUSTOM');

-- CreateEnum
CREATE TYPE "Job" AS ENUM ('RESIDENT', 'GUARDIAN', 'SCAVENGER', 'SCOUT', 'SURVIVALIST', 'TAMER', 'TECHNICIAN');

-- CreateTable
CREATE TABLE "User" (
    "id" INTEGER NOT NULL,
    "twinoidId" INTEGER,
    "etwinId" INTEGER,
    "name" TEXT NOT NULL,
    "locale" "Locale" NOT NULL DEFAULT 'EN',
    "avatar" TEXT,
    "lastUpdate" TIMESTAMP(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BankItem" (
    "townId" INTEGER NOT NULL,
    "id" INTEGER NOT NULL,
    "broken" BOOLEAN NOT NULL DEFAULT false,
    "quantity" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "BankItem_pkey" PRIMARY KEY ("townId","id","broken")
);

-- CreateTable
CREATE TABLE "ZoneItem" (
    "townId" INTEGER NOT NULL,
    "x" INTEGER NOT NULL,
    "y" INTEGER NOT NULL,
    "id" INTEGER NOT NULL,
    "broken" BOOLEAN NOT NULL DEFAULT false,
    "quantity" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "ZoneItem_pkey" PRIMARY KEY ("townId","x","y","id","broken")
);

-- CreateTable
CREATE TABLE "Zone" (
    "townId" INTEGER NOT NULL,
    "x" INTEGER NOT NULL,
    "y" INTEGER NOT NULL,
    "visitedToday" BOOLEAN NOT NULL DEFAULT false,
    "depleted" BOOLEAN NOT NULL DEFAULT false,
    "zombies" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3),
    "updatedById" INTEGER,

    CONSTRAINT "Zone_pkey" PRIMARY KEY ("townId","x","y")
);

-- CreateTable
CREATE TABLE "Citizen" (
    "userId" INTEGER NOT NULL,
    "townId" INTEGER NOT NULL,
    "job" "Job",
    "x" INTEGER NOT NULL,
    "y" INTEGER NOT NULL,
    "dead" BOOLEAN NOT NULL DEFAULT false,
    "out" BOOLEAN NOT NULL DEFAULT false,
    "banned" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Citizen_pkey" PRIMARY KEY ("userId","townId")
);

-- CreateTable
CREATE TABLE "Town" (
    "id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "start" TIMESTAMP(3) NOT NULL,
    "season" INTEGER NOT NULL,
    "phase" "TownPhase" NOT NULL,
    "source" TEXT,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "x" INTEGER NOT NULL,
    "y" INTEGER NOT NULL,
    "bonusPoints" INTEGER NOT NULL DEFAULT 0,
    "waterInWell" INTEGER NOT NULL DEFAULT 0,
    "type" "TownType" NOT NULL,
    "lastUpdate" TIMESTAMP(3),
    "insurrected" BOOLEAN NOT NULL DEFAULT false,
    "custom" BOOLEAN NOT NULL DEFAULT false,
    "chaos" BOOLEAN NOT NULL DEFAULT false,
    "devastated" BOOLEAN NOT NULL DEFAULT false,
    "doorOpened" BOOLEAN NOT NULL DEFAULT false,
    "pandemonium" BOOLEAN NOT NULL DEFAULT false,
    "guideId" INTEGER,
    "shamanId" INTEGER,
    "catapultMasterId" INTEGER,

    CONSTRAINT "Town_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "BankItem" ADD CONSTRAINT "BankItem_townId_fkey" FOREIGN KEY ("townId") REFERENCES "Town"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ZoneItem" ADD CONSTRAINT "ZoneItem_townId_x_y_fkey" FOREIGN KEY ("townId", "x", "y") REFERENCES "Zone"("townId", "x", "y") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ZoneItem" ADD CONSTRAINT "ZoneItem_townId_fkey" FOREIGN KEY ("townId") REFERENCES "Town"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Zone" ADD CONSTRAINT "Zone_townId_fkey" FOREIGN KEY ("townId") REFERENCES "Town"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Zone" ADD CONSTRAINT "Zone_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Citizen" ADD CONSTRAINT "Citizen_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Citizen" ADD CONSTRAINT "Citizen_townId_fkey" FOREIGN KEY ("townId") REFERENCES "Town"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Town" ADD CONSTRAINT "Town_guideId_fkey" FOREIGN KEY ("guideId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Town" ADD CONSTRAINT "Town_shamanId_fkey" FOREIGN KEY ("shamanId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Town" ADD CONSTRAINT "Town_catapultMasterId_fkey" FOREIGN KEY ("catapultMasterId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
