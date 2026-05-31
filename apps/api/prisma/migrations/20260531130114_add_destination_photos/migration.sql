/*
  Warnings:

  - You are about to drop the column `customerCpf` on the `Booking` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Booking" DROP COLUMN "customerCpf";

-- AlterTable
ALTER TABLE "Destination" ADD COLUMN     "photos" TEXT[];
