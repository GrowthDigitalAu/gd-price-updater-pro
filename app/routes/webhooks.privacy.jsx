import { authenticate } from "../shopify.server";
import db from "../db.server";

export const action = async ({ request }) => {
  const { topic, shop, payload } = await authenticate.webhook(request);

  console.log(`Received ${topic} webhook for ${shop}`);

  switch (topic) {
    case "CUSTOMERS_DATA_REQUEST":
      console.log(`Handling CUSTOMERS_DATA_REQUEST for ${shop}. No customer data stored to export.`);
      // We don't store customer-specific data that requires exporting.
      break;
    case "CUSTOMERS_REDACT":
      console.log(`Handling CUSTOMERS_REDACT for ${shop}. No customer data stored to redact.`);
      // We don't store customer-specific data that requires redaction.
      break;
    case "SHOP_REDACT":
      console.log(`Handling SHOP_REDACT for ${shop}. Deleting shop data.`);
      try {
        await db.session.deleteMany({ where: { shop } });
        await db.subscriptionInfo.deleteMany({ where: { shop } });
        await db.usageTracking.deleteMany({ where: { shop } });
        console.log(`Successfully deleted data for shop ${shop}`);
      } catch (error) {
        console.error(`Error deleting data for shop ${shop}:`, error);
      }
      break;
    default:
      console.log(`Unhandled topic: ${topic}`);
      break;
  }

  return new Response("OK", { status: 200 });
};
