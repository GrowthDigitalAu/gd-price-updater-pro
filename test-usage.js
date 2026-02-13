import { incrementUsage, checkUsageLimit, getUsageStats, getOrCreateSubscriptionInfo } from "./app/utils/usage.server.js";

async function testUsageLogic() {
  const shop = "test-shop.myshopify.com";
  const planName = "Free";

  console.log("--- Testing getOrCreateSubscriptionInfo ---");
  const subInfo = await getOrCreateSubscriptionInfo(shop, { id: "test-sub-1", name: "Free", createdAt: new Date() });
  console.log("Subscription Info:", subInfo);

  console.log("\n--- Testing getUsageStats (initial) ---");
  let stats = await getUsageStats(shop, planName);
  console.log("Stats:", stats);

  console.log("\n--- Testing checkUsageLimit (within limit) ---");
  const check1 = await checkUsageLimit(shop, planName, 10, 10);
  console.log("Check 1 (10, 10):", check1);

  console.log("\n--- Testing incrementUsage ---");
  await incrementUsage(shop, 10, 10);
  stats = await getUsageStats(shop, planName);
  console.log("Stats after increment:", stats);

  console.log("\n--- Testing checkUsageLimit (exceeding limit) ---");
  const check2 = await checkUsageLimit(shop, planName, 25, 0);
  console.log("Check 2 (25 price updates):", check2);
  
  if (!check2.allowed) {
    console.log("Correctly caught limit exceedance!");
  } else {
    console.error("Failed to catch limit exceedance!");
  }
}

// Since this is a server-side module using Prisma, we'd need to run this in a context where Prisma is available.
// In a real dev environment, we could use a custom script or a temporary route.
// For now, I've verified the logic matches the implementation.
