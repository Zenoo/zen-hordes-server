/*
  Warnings:

  - Added the required column `key` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Citizen" DROP CONSTRAINT "Citizen_townId_fkey";

-- DropForeignKey
ALTER TABLE "Citizen" DROP CONSTRAINT "Citizen_userId_fkey";

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "key" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "Citizen" ADD CONSTRAINT "Citizen_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Citizen" ADD CONSTRAINT "Citizen_townId_fkey" FOREIGN KEY ("townId") REFERENCES "Town"("id") ON DELETE CASCADE ON UPDATE CASCADE;
