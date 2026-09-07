export default function HowToUse() {
    return (
        <s-page heading="Help Center">
            <div className="page-frame">
                <div className="help-layout">
                    <div className="primary-workspace">
                        <s-section heading="GD: Price Updater Pro">
                            <div className="help-intro">
                                <p className="panel-title">Bulk update Shopify product prices with Excel.</p>
                                <p className="panel-copy">Use this app to export Shopify variant pricing, upload supplier price lists, map spreadsheet columns, preview changes, and update product prices safely.</p>
                            </div>
                        </s-section>

                        <div className="section-gap">
                            <s-section heading="Import Product Prices">
                                <div className="help-steps">
                                    <div className="help-step">
                                        <span>1</span>
                                        <div>
                                            <strong>Upload your file</strong>
                                            <p>Choose an Excel workbook from a supplier or an exported Shopify price file.</p>
                                        </div>
                                    </div>
                                    <div className="help-step">
                                        <span>2</span>
                                        <div>
                                            <strong>Map columns</strong>
                                            <p>Select the column that contains SKU, the column that contains price, and optionally the compare-at price column.</p>
                                        </div>
                                    </div>
                                    <div className="help-step">
                                        <span>3</span>
                                        <div>
                                            <strong>Preview changes</strong>
                                            <p>Review rows ready to update, rows already matching Shopify, failed rows, invalid prices, duplicates, and SKUs not found in Shopify.</p>
                                        </div>
                                    </div>
                                    <div className="help-step">
                                        <span>4</span>
                                        <div>
                                            <strong>Update Shopify</strong>
                                            <p>Confirm the preview to run the Shopify bulk update in the background.</p>
                                        </div>
                                    </div>
                                </div>
                            </s-section>
                        </div>

                        <div className="section-gap">
                            <s-section heading="Export Product Prices">
                                <div className="help-card-grid">
                                    <div className="help-card">
                                        <strong>What it exports</strong>
                                        <p>Product title, SKU, option values, price, and compare-at price.</p>
                                    </div>
                                    <div className="help-card">
                                        <strong>When to use it</strong>
                                        <p>Export before a major update to keep a backup, or use the file as a clean Shopify price template.</p>
                                    </div>
                                    <div className="help-card">
                                        <strong>How to edit it</strong>
                                        <p>Keep the SKU column unchanged. Update only the rows and price fields you want Shopify to change.</p>
                                    </div>
                                </div>
                            </s-section>
                        </div>

                        <div className="section-gap">
                            <s-section heading="Spreadsheet Rules">
                                <div className="help-card-grid">
                                    <div className="help-card">
                                        <strong>SKU is required</strong>
                                        <p>The app uses SKU to find the matching Shopify variant. Rows without a SKU are ignored or reported as failed.</p>
                                    </div>
                                    <div className="help-card">
                                        <strong>Price is required for updates</strong>
                                        <p>The selected price column can contain values like 12.50, $12.50, AUD 12.50, or 1,250.00.</p>
                                    </div>
                                    <div className="help-card">
                                        <strong>Compare-at price is optional</strong>
                                        <p>Leave it unmapped to avoid changing compare-at prices. Use null to clear an existing compare-at price.</p>
                                    </div>
                                </div>
                            </s-section>
                        </div>

                        <div className="section-gap">
                            <s-section heading="Planned: Google Sheets Sync">
                                <div className="help-card-grid">
                                    <div className="help-card">
                                        <strong>Connect a sheet</strong>
                                        <p>Save a Google Sheet link and map its SKU, price, and compare-at price columns.</p>
                                    </div>
                                    <div className="help-card">
                                        <strong>Schedule updates</strong>
                                        <p>Run imports automatically on a daily, weekly, or custom schedule after safeguards are added.</p>
                                    </div>
                                    <div className="help-card">
                                        <strong>Review sync logs</strong>
                                        <p>Track successful updates, skipped rows, failed rows, and supplier file issues after each scheduled run.</p>
                                    </div>
                                </div>
                            </s-section>
                        </div>
                    </div>

                    <aside className="growth-aside" aria-label="Help and support">
                        <s-section heading="Support">
                            <div className="growth-panel">
                                <p className="growth-kicker">Growth Digital</p>
                                <p className="growth-title">Need help with supplier files or Shopify price updates?</p>
                                <p className="panel-copy">Email us with the store name, supplier file, and what you expected to happen.</p>
                                <div className="growth-list">
                                    <span>dev@growthdigital.com.au</span>
                                    <span>Supplier sheet setup</span>
                                    <span>Shopify automation planning</span>
                                </div>
                                <s-link href="mailto:dev@growthdigital.com.au">Email support</s-link>
                            </div>
                        </s-section>
                    </aside>
                </div>
            </div>
        </s-page>
    );
}
