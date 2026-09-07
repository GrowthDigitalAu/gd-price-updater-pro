export default function HowToUse() {
    return (
        <s-page heading="Help Center" inlineSize="large">
            <div className="page-frame">
                <div className="help-layout">
                    <div className="primary-workspace">
                        <s-section heading="GD: Price Updater Pro">
                            <div className="help-intro">
                                <p className="panel-title">Bulk update Shopify product prices from Excel, Google Sheets, or CSV URLs.</p>
                                <p className="panel-copy">Use this app to export Shopify variant pricing, upload supplier price lists, load public sheet URLs, map spreadsheet columns, apply price rules, preview changes, and update product prices safely.</p>
                            </div>
                        </s-section>

                        <div className="section-gap">
                            <s-section heading="Import Product Prices">
                                <div className="help-steps">
                                    <div className="help-step">
                                        <span>1</span>
                                        <div>
                                            <strong>Load your source</strong>
                                            <p>Choose an Excel workbook, paste a public Google Sheet link, or paste an approved CSV or Excel workbook URL.</p>
                                        </div>
                                    </div>
                                    <div className="help-step">
                                        <span>2</span>
                                        <div>
                                            <strong>Map columns</strong>
                                            <p>Select the SKU column, then choose whether prices come from the file or from a bulk price rule.</p>
                                        </div>
                                    </div>
                                    <div className="help-step">
                                        <span>3</span>
                                        <div>
                                            <strong>Choose price rules</strong>
                                            <p>Set prices from the file, increase or decrease current Shopify prices by percent or amount, apply rounding, and control compare-at prices.</p>
                                        </div>
                                    </div>
                                    <div className="help-step">
                                        <span>4</span>
                                        <div>
                                            <strong>Preview changes</strong>
                                            <p>Review rows ready to update, rows already matching Shopify, failed rows, invalid prices, duplicates, and SKUs not found in Shopify.</p>
                                        </div>
                                    </div>
                                    <div className="help-step">
                                        <span>5</span>
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
                                        <strong>Price can come from the file</strong>
                                        <p>For supplier price imports, the selected price column can contain values like 12.50, $12.50, AUD 12.50, or 1,250.00.</p>
                                    </div>
                                    <div className="help-card">
                                        <strong>Compare-at price is optional</strong>
                                        <p>Keep it unchanged, set it from the file, set it to the old Shopify price, or clear it during the update.</p>
                                    </div>
                                </div>
                            </s-section>
                        </div>

                        <div className="section-gap">
                            <s-section heading="Google Sheet and URL Imports">
                                <div className="help-card-grid">
                                    <div className="help-card">
                                        <strong>Public approved links only</strong>
                                        <p>The sheet or file URL must be accessible to the app. Private Google Sheets need to be shared or published before loading.</p>
                                    </div>
                                    <div className="help-card">
                                        <strong>Google Sheets and supplier URLs</strong>
                                        <p>Google Sheet links work by default. Other supplier CSV or Excel domains can be approved by support before use.</p>
                                    </div>
                                    <div className="help-card">
                                        <strong>Same preview safety</strong>
                                        <p>URL imports still go through column mapping, price rules, preview, and confirmation before Shopify is updated.</p>
                                    </div>
                                </div>
                            </s-section>
                        </div>

                        <div className="section-gap">
                            <s-section heading="Price Update Options">
                                <div className="help-card-grid">
                                    <div className="help-card">
                                        <strong>Bulk markups and discounts</strong>
                                        <p>Increase or decrease current Shopify prices by a percentage without adding a price column to the file.</p>
                                    </div>
                                    <div className="help-card">
                                        <strong>Fixed price adjustments</strong>
                                        <p>Add or subtract a fixed amount from each matched SKU, useful for freight, margin, or supplier surcharge changes.</p>
                                    </div>
                                    <div className="help-card">
                                        <strong>Rounding and safeguards</strong>
                                        <p>Round prices to .99, .95, or the nearest dollar, and set a minimum price so calculated updates do not go too low.</p>
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
                                <div className="growth-brand">
                                    <span className="growth-brand-icon" aria-hidden="true">GD</span>
                                    <p className="growth-kicker">Growth Digital</p>
                                </div>
                                <p className="growth-title">Need help with supplier files or Shopify price updates?</p>
                                <p className="panel-copy">Email us with the store name, supplier file, and what you expected to happen.</p>
                                <div className="growth-list">
                                    <span>dev@growthdigital.com.au</span>
                                    <span>Supplier sheet setup</span>
                                    <span>Shopify automation planning</span>
                                </div>
                                <a className="growth-link" href="mailto:dev@growthdigital.com.au">Email support</a>
                            </div>
                        </s-section>
                    </aside>
                </div>
            </div>
        </s-page>
    );
}
