import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }) => {
  await authenticate.admin(request);
  return null;
};

export default function Index() {

  return (
    <s-page heading="Price Updater" inlineSize="large">
      <div className="page-frame">
        <div className="action-grid two-columns">
          <s-section heading="Import Product Prices">
            <div className="action-panel">
              <p className="panel-copy">Upload a supplier sheet or an exported price file, map the columns, preview changes, then update Shopify.</p>
              <s-link href="/app/import-product-prices">Open import</s-link>
            </div>
          </s-section>
          <s-section heading="Export Product Prices">
            <div className="action-panel">
              <p className="panel-copy">Download the current Shopify variant price file with SKUs, options, prices, and compare-at prices.</p>
              <s-link href="/app/export-product-prices">Open export</s-link>
            </div>
          </s-section>
        </div>
      </div>
    </s-page>
  );
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};
