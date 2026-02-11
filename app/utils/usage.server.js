import prisma from "../db.server";
import { getVariantLimitForPlan } from "./subscription";

/**
 * Get current billing period start date based on billing cycle day
 * Example: If billing day is 15 and today is Feb 20, returns "2026-02-15"
 */
function getCurrentBillingPeriod(billingCycleDay) {
  const now = new Date();
  const currentDay = now.getDate();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  
  let periodStart;
  
  if (currentDay >= billingCycleDay) {
    // We're in the current month's billing period
    periodStart = new Date(currentYear, currentMonth, billingCycleDay);
  } else {
    // We're in the previous month's billing period
    periodStart = new Date(currentYear, currentMonth - 1, billingCycleDay);
  }
  
  return periodStart.toISOString().split('T')[0]; // "2026-02-15"
}

/**
 * Get next reset date for billing cycle
 */
function getNextResetDate(billingCycleDay) {
  const now = new Date();
  const currentDay = now.getDate();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  
  if (currentDay >= billingCycleDay) {
    // Next reset is next month
    return new Date(currentYear, currentMonth + 1, billingCycleDay);
  } else {
    // Next reset is this month
    return new Date(currentYear, currentMonth, billingCycleDay);
  }
}

/**
 * Get or create subscription info for a shop
 */
export async function getOrCreateSubscriptionInfo(shop, subscription) {
  let subInfo = await prisma.subscriptionInfo.findUnique({
    where: { shop }
  });
  
  if (!subInfo) {
    // Create new subscription info
    // Use subscription createdAt or current date
    const startDate = subscription?.createdAt 
      ? new Date(subscription.createdAt) 
      : new Date();
    
    subInfo = await prisma.subscriptionInfo.create({
      data: {
        shop,
        subscriptionId: subscription?.id,
        planName: subscription?.name || "Free",
        billingCycleDay: startDate.getDate(),
        startedAt: startDate
      }
    });
  } else if (subscription && subInfo.subscriptionId !== subscription.id) {
    // Update if subscription changed
    subInfo = await prisma.subscriptionInfo.update({
      where: { shop },
      data: {
        subscriptionId: subscription.id,
        planName: subscription.name
      }
    });
  }
  
  return subInfo;
}

/**
 * Get current billing period usage for a shop
 */
export async function getCurrentBillingUsage(shop) {
  const subInfo = await prisma.subscriptionInfo.findUnique({
    where: { shop }
  });
  
  if (!subInfo) {
    throw new Error("Subscription info not found for shop");
  }
  
  const billingPeriod = getCurrentBillingPeriod(subInfo.billingCycleDay);
  
  let usage = await prisma.usageTracking.findUnique({
    where: { 
      shop_billingPeriod: { 
        shop, 
        billingPeriod 
      } 
    }
  });
  
  if (!usage) {
    usage = await prisma.usageTracking.create({
      data: {
        shop,
        billingPeriod,
        priceUpdates: 0,
        compareAtUpdates: 0
      }
    });
  }
  
  return { 
    usage, 
    billingPeriod, 
    nextResetDate: getNextResetDate(subInfo.billingCycleDay) 
  };
}

/**
 * Increment usage counters for current billing period
 */
export async function incrementUsage(shop, priceCount, compareAtCount) {
  const subInfo = await prisma.subscriptionInfo.findUnique({
    where: { shop }
  });
  
  if (!subInfo) {
    throw new Error("Subscription info not found");
  }
  
  const billingPeriod = getCurrentBillingPeriod(subInfo.billingCycleDay);
  
  return await prisma.usageTracking.upsert({
    where: { 
      shop_billingPeriod: { 
        shop, 
        billingPeriod 
      } 
    },
    update: {
      priceUpdates: { increment: priceCount },
      compareAtUpdates: { increment: compareAtCount }
    },
    create: {
      shop,
      billingPeriod,
      priceUpdates: priceCount,
      compareAtUpdates: compareAtCount
    }
  });
}

/**
 * Check if import is within usage limits
 */
export async function checkUsageLimit(shop, subscriptionName, newPriceCount, newCompareAtCount) {
  const limits = getVariantLimitForPlan(subscriptionName);
  const { usage } = await getCurrentBillingUsage(shop);
  
  // Unlimited tier
  if (limits.price === null) {
    return { allowed: true };
  }
  
  // Check price limit
  if (usage.priceUpdates + newPriceCount > limits.price) {
    return { 
      allowed: false, 
      type: 'price',
      limit: limits.price,
      current: usage.priceUpdates,
      attempted: newPriceCount
    };
  }
  
  // Check compare-at limit
  if (usage.compareAtUpdates + newCompareAtCount > limits.compareAt) {
    return { 
      allowed: false, 
      type: 'compareAt',
      limit: limits.compareAt,
      current: usage.compareAtUpdates,
      attempted: newCompareAtCount
    };
  }
  
  return { allowed: true };
}

/**
 * Get formatted usage statistics for display
 */
export async function getUsageStats(shop, subscriptionName) {
  const limits = getVariantLimitForPlan(subscriptionName);
  const { usage, nextResetDate } = await getCurrentBillingUsage(shop);
  
  return {
    priceUpdates: usage.priceUpdates,
    compareAtUpdates: usage.compareAtUpdates,
    limits,
    nextResetDate,
    priceRemaining: limits.price ? limits.price - usage.priceUpdates : null,
    compareAtRemaining: limits.compareAt ? limits.compareAt - usage.compareAtUpdates : null
  };
}
