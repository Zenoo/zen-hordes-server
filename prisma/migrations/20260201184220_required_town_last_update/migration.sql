/*
  Warnings:

  - Made the column `lastUpdate` on table `Town` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Town" ALTER COLUMN "lastUpdate" SET NOT NULL;
