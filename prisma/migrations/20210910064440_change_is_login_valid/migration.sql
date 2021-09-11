/*
  Warnings:

  - You are about to drop the column `isValid` on the `User` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "User" DROP COLUMN "isValid",
ADD COLUMN     "isLoginValid" BOOLEAN NOT NULL DEFAULT false;
