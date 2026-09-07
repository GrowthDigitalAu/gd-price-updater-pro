# GD: Price Updater Pro

GD: Price Updater Pro is an embedded Shopify app for bulk product variant price updates.

The app supports two import paths:

- Export product prices from Shopify, edit the Excel file, then import it back.
- Upload a supplier or wholesaler price list directly, map its SKU and price columns, preview changes, then confirm the update.

## Main Features

- Export all product variant SKUs, option values, prices, and compare-at prices to Excel.
- Import Excel files by matching rows to Shopify variants by SKU.
- Map supplier spreadsheet columns to Shopify fields.
- Preview rows that will update before writing to Shopify.
- Report failed rows, duplicate SKUs, missing Shopify variants, skipped rows, and unchanged prices.
- Update Shopify in bulk using `productVariantsBulkUpdate`.
- Gate app access behind an active Shopify app subscription.

## Supplier Import Flow

1. Open **Import Product Prices**.
2. Upload an `.xlsx` or `.xls` supplier file.
3. Map the supplier columns:
   - SKU column
   - Price column
   - Optional compare-at price column
4. Click **Preview Changes**.
5. Review rows ready to update, failed rows, and skipped rows.
6. Click **Confirm and Update Shopify**.

The importer accepts common money formats such as `12.50`, `$12.50`, `AUD 12.50`, and `1,250.00`.

To clear compare-at price, use `null` in the mapped compare-at price column.

## Shopify Requirements

The app requires the Shopify Admin API scope:

```text
write_products
```

## Development

Install dependencies:

```shell
npm ci
```

Run locally with Shopify CLI:

```shell
npm run dev
```

Run checks:

```shell
npm run typecheck
npm run build
```

## Deployment Notes

The app uses Prisma for Shopify session storage. Configure `DATABASE_URL` for the production database.

Required environment variables include:

```text
DATABASE_URL
SHOPIFY_API_KEY
SHOPIFY_API_SECRET
SHOPIFY_APP_URL
SCOPES
```

## Improvement Backlog

- Add downloadable Excel reports for failed, skipped, and updated rows.
- Add saved supplier templates so repeat suppliers do not need remapping each time.
- Add Google Sheets sync with saved sheet mapping, scheduled imports, preview logs, and failure notifications.
- Add support for CSV supplier files.
- Improve large-store lookup performance by querying only uploaded SKUs or using a dedicated bulk lookup.
- Reconcile Shopify bulk mutation output back to each SKU after completion.
- Add automated tests for import validation, price parsing, duplicate detection, and dry-run behavior.
- Clean up historic `updator` naming where it is safe to change Shopify handles, URLs, and billing references.
