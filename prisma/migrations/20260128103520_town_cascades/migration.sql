-- DropForeignKey
ALTER TABLE "BankItem" DROP CONSTRAINT "BankItem_townId_fkey";

-- DropForeignKey
ALTER TABLE "Zone" DROP CONSTRAINT "Zone_townId_fkey";

-- DropForeignKey
ALTER TABLE "ZoneItem" DROP CONSTRAINT "ZoneItem_townId_fkey";

-- AddForeignKey
ALTER TABLE "BankItem" ADD CONSTRAINT "BankItem_townId_fkey" FOREIGN KEY ("townId") REFERENCES "Town"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ZoneItem" ADD CONSTRAINT "ZoneItem_townId_fkey" FOREIGN KEY ("townId") REFERENCES "Town"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Zone" ADD CONSTRAINT "Zone_townId_fkey" FOREIGN KEY ("townId") REFERENCES "Town"("id") ON DELETE CASCADE ON UPDATE CASCADE;
