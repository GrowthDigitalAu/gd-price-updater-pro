-- CreateTable
CREATE TABLE "SubscriptionInfo" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "subscriptionId" TEXT,
    "planName" TEXT,
    "billingCycleDay" INTEGER NOT NULL DEFAULT 1,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "UsageTracking" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "billingPeriod" TEXT NOT NULL,
    "priceUpdates" INTEGER NOT NULL DEFAULT 0,
    "compareAtUpdates" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "SubscriptionInfo_shop_key" ON "SubscriptionInfo"("shop");

-- CreateIndex
CREATE INDEX "UsageTracking_shop_idx" ON "UsageTracking"("shop");

-- CreateIndex
CREATE UNIQUE INDEX "UsageTracking_shop_billingPeriod_key" ON "UsageTracking"("shop", "billingPeriod");
