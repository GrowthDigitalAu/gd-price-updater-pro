import { useState, useEffect, useRef } from "react";
import { useFetcher } from "react-router";
import { authenticate } from "../shopify.server";
import ExcelJS from "exceljs";
import { useAppBridge } from "@shopify/app-bridge-react";
import { Pagination, ProgressBar } from "@shopify/polaris";
import { boundary } from "@shopify/shopify-app-react-router/server";

const guessColumn = (headers, candidates) => {
    const normalizedCandidates = candidates.map((candidate) =>
        candidate.toLowerCase().replace(/[^a-z0-9]/g, "")
    );

    return headers.find((header) => {
        const normalizedHeader = header.toLowerCase().replace(/[^a-z0-9]/g, "");
        return normalizedCandidates.some((candidate) => normalizedHeader === candidate || normalizedHeader.includes(candidate));
    }) || "";
};

const parseMoneyValue = (value) => {
    if (value === undefined || value === null || String(value).trim() === "") {
        return null;
    }

    if (typeof value === "number") {
        return Number.isFinite(value) ? value : NaN;
    }

    const cleaned = String(value)
        .trim()
        .replace(/,/g, "")
        .replace(/^(aud|usd|nzd|cad|gbp|eur)\s*/i, "")
        .replace(/[$£€]/g, "");

    if (!/^-?\d+(\.\d+)?$/.test(cleaned)) {
        return NaN;
    }

    return Number(cleaned);
};

export const loader = async ({ request }) => {
    const { admin } = await authenticate.admin(request);
    const url = new URL(request.url);
    const checkStatus = url.searchParams.get("checkStatus");
    const operationId = url.searchParams.get("operationId");

    // Fetch subscription info
    const billingCheck = await admin.graphql(
        `#graphql
          query {
            currentAppInstallation {
              activeSubscriptions {
                id
                name
                status
                createdAt
              }
            }
          }
        `
    );
    const billingJson = await billingCheck.json();
    const subscription = billingJson.data?.currentAppInstallation?.activeSubscriptions?.find(
        (activeSubscription) => activeSubscription.status === "ACTIVE"
    ) || null;

    // Identify active plan based on Shopify GQL
    const planName = subscription?.name || "None";

    if (checkStatus === "true" && operationId) {
        const response = await admin.graphql(
            `#graphql
            query($id: ID!) {
                node(id: $id) {
                    ... on BulkOperation {
                        id
                        status
                        objectCount
                        url
                    }
                }
            }`,
            { variables: { id: operationId } }
        );

        const data = await response.json();
        const bulkOperation = data.data?.node;

        if (!bulkOperation) {
            return { success: false, status: "NONE", operationId, planName };
        }

        if (bulkOperation.status === "COMPLETED") {
             let bulkErrors = [];
             
             if (bulkOperation.url) {
                try {
                    const fileResponse = await fetch(bulkOperation.url);
                    const text = await fileResponse.text();
                    const lines = text.split("\n").filter(line => line.trim() !== "");
                    lines.forEach(line => {
                        const result = JSON.parse(line);
                        const userErrors = result.productVariantsBulkUpdate?.userErrors || [];
                        if (userErrors.length > 0) {
                             bulkErrors.push(userErrors[0].message);
                        }
                    });
                } catch (error) {
                    console.error("Failed to parse bulk operation results:", error);
                }
             }
             
             return { success: true, status: "COMPLETED", bulkResults: { errors: bulkErrors }, operationId, planName };

        } else if (bulkOperation.status === "RUNNING" || bulkOperation.status === "CREATED") {
             return { success: true, status: "RUNNING", progress: bulkOperation.objectCount, operationId, planName };
        } else {
             return { success: false, status: bulkOperation.status, operationId, planName };
        }
    }

    return { success: true, planName };
};

export const action = async ({ request }) => {
    const { admin } = await authenticate.admin(request);
    const formData = await request.formData();
    const dataString = formData.get("data");
    const headersString = formData.get("headers");
    const mappingString = formData.get("mapping");
    const dryRun = formData.get("dryRun") === "true";
    const sourceType = formData.get("sourceType") || "mapped";
    const sourceFileName = formData.get("sourceFileName") || "";
    const rawRows = JSON.parse(dataString);
    const headersFromFrontend = headersString ? JSON.parse(headersString) : null;
    const mapping = mappingString ? JSON.parse(mappingString) : {};
    const skuColumn = mapping.sku || "SKU";
    const priceColumn = mapping.price || "Price";
    const compareAtPriceColumn = Object.prototype.hasOwnProperty.call(mapping, "compareAtPrice")
        ? mapping.compareAtPrice
        : "CompareAt Price";
    const rows = rawRows.map((row) => ({
        ...row,
        SKU: row[skuColumn],
        Price: row[priceColumn],
        "CompareAt Price": compareAtPriceColumn ? row[compareAtPriceColumn] : undefined
    }));

    const results = {
        total: rows.length,
        updated: 0, 
        dryRun,
        sourceType,
        sourceFileName,
        errors: [],
        failedRows: [],
        skippedRows: [],
        updatedRows: [],
        priceUpdatesCount: 0,
        compareAtUpdatesCount: 0,
        bulkOperationId: null
    };

    let allColumns = [];
    if (headersFromFrontend && headersFromFrontend.length > 0) {
        allColumns = headersFromFrontend;
    } else {
        const allColumnsSet = new Set();
        rows.forEach(row => {
            Object.keys(row).forEach(key => {
                if (!allColumnsSet.has(key)) {
                    allColumnsSet.add(key);
                    allColumns.push(key);
                }
            });
        });
    }

    ["SKU", "Price", "CompareAt Price"].forEach((col) => {
        if (!allColumns.includes(col)) {
            allColumns.push(col);
        }
    });

    const normalizeRow = (row, additionalFields = {}) => {
        const normalized = {};
        allColumns.forEach(col => {
            if (col === "SKU") {
                normalized[col] = row[skuColumn] !== undefined ? row[skuColumn] : row[col] || "";
            } else if (col === "Price") {
                normalized[col] = row[priceColumn] !== undefined ? row[priceColumn] : row[col] || "";
            } else if (col === "CompareAt Price") {
                normalized[col] = compareAtPriceColumn && row[compareAtPriceColumn] !== undefined ? row[compareAtPriceColumn] : row[col] || "";
            } else {
                normalized[col] = row[col] !== undefined ? row[col] : "";
            }
        });
        Object.keys(additionalFields).forEach(key => {
            normalized[key] = additionalFields[key];
        });
        return normalized;
    };

    if (!skuColumn || !priceColumn) {
        results.errors.push("SKU and Price columns are required.");
        results.failedRows = rawRows.map((row) => normalizeRow(row, { "Error Reason": "Missing column mapping" }));
        return { success: true, results };
    }

    let skuMap = new Map();
    
    let hasNextPage = true;
    let endCursor = null;

    while (hasNextPage) {
        const query = `#graphql
        query getPriceData($after: String) {
            productVariants(first: 250, after: $after) {
                pageInfo { hasNextPage endCursor }
                edges {
                    node {
                        id
                        sku
                        price
                        compareAtPrice
                        product {
                            id
                        }
                    }
                }
            }
        }`;
        
        const res = await admin.graphql(query, { variables: { after: endCursor } });
        const data = await res.json();
        
        data.data?.productVariants?.edges.forEach(edge => {
            const node = edge.node;
            if (node.sku) {
                skuMap.set(node.sku.toLowerCase(), {
                    id: node.id,
                    productId: node.product.id,
                    price: parseFloat(node.price),
                    compareAtPrice: node.compareAtPrice ? parseFloat(node.compareAtPrice) : null
                });
            }
        });
        
        hasNextPage = data.data?.productVariants?.pageInfo?.hasNextPage;
        endCursor = data.data?.productVariants?.pageInfo?.endCursor;
    }



    const processedCombinations = new Set();
    const bulkUpdates = [];

    for (const row of rows) {
        try {
            if (!row["SKU"] || row["SKU"] === "SKU") continue;

            const sku = String(row["SKU"]).trim();
            const skuKey = sku.toLowerCase();
            
            const priceRaw = row["Price"];
            const compareAtPriceRaw = row["CompareAt Price"];

            let newPrice = null;
            if (priceRaw !== undefined && priceRaw !== null && String(priceRaw).trim() !== "") {
                const parsed = parseMoneyValue(priceRaw);
                if (isNaN(parsed)) {
                    results.errors.push(`Skipped SKU ${sku}: Invalid Price value '${priceRaw}'`);
                    results.failedRows.push(normalizeRow(row, { "Error Reason": 'Invalid Price value' }));
                    continue;
                }
                newPrice = parsed;
            }

            let newCompareAtPrice = null;
            let shouldClearCompareAt = false;
            
            if (compareAtPriceRaw !== undefined && compareAtPriceRaw !== null) {
                const trimmed = String(compareAtPriceRaw).trim();
                
                if (trimmed.toLowerCase() === "null") {
                    shouldClearCompareAt = true;
                } else if (trimmed !== "") {
                    const parsed = parseMoneyValue(trimmed);
                    if (isNaN(parsed)) {
                        results.errors.push(`Skipped SKU ${sku}: Invalid CompareAt Price value '${compareAtPriceRaw}'`);
                        results.failedRows.push(normalizeRow(row, { "Error Reason": 'Invalid CompareAt Price value' }));
                        continue;
                    }
                    newCompareAtPrice = parsed;
                }
            }


            if (processedCombinations.has(skuKey)) {
                results.errors.push(`Skipped SKU ${sku}: Duplicate SKU in file`);
                results.failedRows.push(normalizeRow(row, { "Error Reason": 'Duplicate SKU in file' }));
                continue;
            }
            processedCombinations.add(skuKey);

            const variantData = skuMap.get(skuKey);
            
            if (!variantData) {
                results.errors.push(`Variant not found for SKU: ${sku}`);
                results.failedRows.push(normalizeRow(row, { "Error Reason": 'Variant not found' }));
                continue;
            }

            const variantInput = {
                id: variantData.id
            };

            let needsUpdate = false;

            if (newPrice !== null && variantData.price !== newPrice) {
                variantInput.price = String(newPrice);
                needsUpdate = true;
            }

            if (shouldClearCompareAt) {
                if (variantData.compareAtPrice !== null) {
                    variantInput.compareAtPrice = null;
                    needsUpdate = true;
                }
            } else if (newCompareAtPrice !== null && variantData.compareAtPrice !== newCompareAtPrice) {
                variantInput.compareAtPrice = String(newCompareAtPrice);
                needsUpdate = true;
            }

            if (!needsUpdate) {
                results.skippedRows.push(normalizeRow(row, { "Reason": 'Prices already match' }));
                continue;
            }

            // Determine Reason
            let updateReason = "";
            if (variantInput.price && variantInput.compareAtPrice !== undefined) {
                updateReason = "Price and CompareAt price both updated";
            } else if (variantInput.price) {
                updateReason = "Price updated";
            } else if (variantInput.compareAtPrice !== undefined) {
                updateReason = "CompareAt price updated";
            }

            results.updatedRows.push(normalizeRow(row, { "Reason": updateReason }));

            bulkUpdates.push({
                productId: variantData.productId,
                variantInput: variantInput
            });

        } catch (error) {
            results.errors.push(`Error processing SKU ${row["SKU"]}: ${error.message}`);
            results.failedRows.push(normalizeRow(row, { "Error Reason": error.message }));
        }
    }

    let finalPriceUpdatesCount = 0;
    let finalCompareAtUpdatesCount = 0;

    bulkUpdates.forEach(update => {
        if (update.variantInput.price) finalPriceUpdatesCount++;
        if (update.variantInput.compareAtPrice !== undefined) finalCompareAtUpdatesCount++;
    });

    results.priceUpdatesCount = finalPriceUpdatesCount;
    results.compareAtUpdatesCount = finalCompareAtUpdatesCount;

    if (bulkUpdates.length === 0) {
        return { success: true, results };
    }

    if (dryRun) {
        results.expectedUpdateCount = bulkUpdates.length;
        return { success: true, results };
    }

    const productGroups = new Map();
    bulkUpdates.forEach(update => {
        if (!productGroups.has(update.productId)) {
            productGroups.set(update.productId, []);
        }
        productGroups.get(update.productId).push(update.variantInput);
    });

    const jsonlLines = [];
    for (const [productId, variants] of productGroups) {
        jsonlLines.push(JSON.stringify({
            productId: productId,
            variants: variants
        }));
    }

    const { stagedUploadsCreate, userErrors: stageErrors } = await (await admin.graphql(`#graphql
    mutation stagedUploadsCreate($input: [StagedUploadInput!]!) {
        stagedUploadsCreate(input: $input) {
            stagedTargets { url resourceUrl parameters { name value } }
            userErrors { field message }
        }
    }`, {
        variables: {
            input: [{
                filename: "price_updates.jsonl",
                mimeType: "text/jsonl",
                httpMethod: "POST",
                resource: "BULK_MUTATION_VARIABLES"
            }]
        }
    })).json().then(r => r.data || {});

    if (stageErrors?.length > 0 || stagedUploadsCreate?.userErrors?.length > 0) {
        const msg = stageErrors?.[0]?.message || stagedUploadsCreate?.userErrors?.[0]?.message;
        results.errors.push("Failed to create upload target: " + msg);
        return { success: true, results };
    }

    const target = stagedUploadsCreate?.stagedTargets?.[0];
    if (target) {
        const formData = new FormData();
        const keyParam = target.parameters.find(p => p.name === "key");
        const uploadPath = keyParam?.value;

        target.parameters.forEach(p => formData.append(p.name, p.value));
        formData.append("file", new Blob([jsonlLines.join("\n")], { type: "text/jsonl" }));

        const uploadRes = await fetch(target.url, { method: "POST", body: formData });
        if (!uploadRes.ok) {
             results.errors.push(`Upload failed: ${uploadRes.statusText}`);
             return { success: true, results };
        }

        const bulkRes = await admin.graphql(`#graphql
        mutation bulkOperationRunMutation($mutation: String!, $stagedUploadPath: String!) {
            bulkOperationRunMutation(mutation: $mutation, stagedUploadPath: $stagedUploadPath) {
                bulkOperation { id }
                userErrors { field message }
            }
        }`, {
            variables: {
                mutation: `mutation productVariantsBulkUpdate($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
                    productVariantsBulkUpdate(productId: $productId, variants: $variants) {
                        productVariants { id }
                        userErrors { field message }
                    }
                }`,
                stagedUploadPath: uploadPath
            }
        });
        
        const bulkData = await bulkRes.json();
        if (bulkData.data?.bulkOperationRunMutation?.userErrors?.length > 0) {
             results.errors.push("Bulk Mutation Error: " + bulkData.data.bulkOperationRunMutation.userErrors[0].message);
        } else {
             const opId = bulkData.data?.bulkOperationRunMutation?.bulkOperation?.id;
             console.log("Bulk Op Started:", opId, "Upload Key:", uploadPath);
             
             if (opId) {
                 results.bulkOperationId = opId;
                 results.expectedUpdateCount = bulkUpdates.length;
             } else {
                 results.errors.push("Failed to trigger backend bulk operation (No ID returned)");
             }
        }
    } else {
        results.errors.push("Failed to get upload target URL");
    }

    return { success: true, results };
};

export default function ImportProductPrices() {
    const shopify = useAppBridge();
    const fetcher = useFetcher();
    const pollFetcher = useFetcher(); 

    const [file, setFile] = useState(null);
    const [parsedData, setParsedData] = useState(null);
    const [headers, setHeaders] = useState([]);
    const [columnMapping, setColumnMapping] = useState({
        sku: "",
        price: "",
        compareAtPrice: ""
    });
    const [progress, setProgress] = useState(0);
    const [isProgressVisible, setIsProgressVisible] = useState(false);
    const fileInputRef = useRef(null);

    const [validatedResults, setValidatedResults] = useState(null);
    const [finalResults, setFinalResults] = useState(null);

    const [failedPage, setFailedPage] = useState(1);
    const failedRowsPerPage = 10;
    const [skippedPage, setSkippedPage] = useState(1);
    const skippedRowsPerPage = 10;
    const [updatedPage, setUpdatedPage] = useState(1);
    const updatedRowsPerPage = 10;

    const isLoading = fetcher.state === "submitting" || fetcher.state === "loading";
    const canPreview = parsedData?.length > 0 && columnMapping.sku && columnMapping.price;

    const submitImport = (isDryRun) => {
        if (!canPreview) {
            shopify.toast.show("Choose the SKU and Price columns first.", { duration: 5000 });
            return;
        }

        setValidatedResults(null);
        setFinalResults(null);
        setIsProgressVisible(true);
        setProgress(isDryRun ? 15 : 10);
        fetcher.submit({
            data: JSON.stringify(parsedData),
            headers: JSON.stringify(headers),
            mapping: JSON.stringify(columnMapping),
            dryRun: isDryRun ? "true" : "false",
            sourceType: "supplier",
            sourceFileName: file?.name || ""
        }, { method: "POST" });
    };

    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0];
        if (selectedFile) {
            setFile(selectedFile);
            setFailedPage(1);
            setSkippedPage(1);
            setUpdatedPage(1);
            setValidatedResults(null); 
            setFinalResults(null);
            setParsedData(null);
            setHeaders([]);
            setColumnMapping({ sku: "", price: "", compareAtPrice: "" });

            e.target.value = ""; 

            const reader = new FileReader();
            reader.onload = async (event) => {
                const buffer = event.target.result;
                const workbook = new ExcelJS.Workbook();
                await workbook.xlsx.load(buffer);
                const worksheet = workbook.worksheets[0];
                const jsonData = [];
                const headers = [];
                worksheet.getRow(1).eachCell((cell, colNumber) => {
                   headers[colNumber] = cell.value ? String(cell.value).trim() : "";
                });
                const headersInOrder = headers.filter(h => h);
                worksheet.eachRow((row, rowNumber) => {
                    if (rowNumber > 1) {
                        const rowData = {};
                        row.eachCell((cell, colNumber) => {
                            if (headers[colNumber]) rowData[headers[colNumber]] = cell.value;
                        });
                        if (Object.values(rowData).some((value) => value !== undefined && value !== null && String(value).trim() !== "")) {
                            jsonData.push(rowData);
                        }
                    }
                });
                setParsedData(jsonData);
                setHeaders(headersInOrder);
                setColumnMapping({
                    sku: guessColumn(headersInOrder, ["SKU", "Product SKU", "Item SKU", "Item Code", "Code", "Part Number"]),
                    price: guessColumn(headersInOrder, ["Price", "Wholesale Price", "Sell Price", "Selling Price", "RRP", "Unit Price"]),
                    compareAtPrice: guessColumn(headersInOrder, ["CompareAt Price", "Compare At Price", "Compare Price", "Was Price", "Retail Price", "RRP"])
                });
                shopify.toast.show(`File loaded: ${jsonData.length} rows. Check the column mapping before previewing.`, { duration: 5000 });
            };
            reader.readAsArrayBuffer(selectedFile);
        }
    };

    const handleButtonClick = () => {
        if (fileInputRef.current) fileInputRef.current.click();
    };

    useEffect(() => {
        if (fetcher.data?.success && fetcher.state === "idle") {
            const res = fetcher.data.results;
            setValidatedResults(res);

            if (res.dryRun) {
                setFinalResults(null);
                setProgress(100);
                setTimeout(() => setIsProgressVisible(false), 800);
                shopify.toast.show(`Preview ready. ${res.updatedRows?.length || 0} rows can be updated.`, { duration: 5000 });
            } else if (res.bulkOperationId) {
                pollFetcher.load(`/app/import-product-prices?checkStatus=true&operationId=${res.bulkOperationId}`);
            } else {
                setFinalResults(res); 
                setProgress(100);
                setTimeout(() => setIsProgressVisible(false), 2000);
                shopify.toast.show(`Import complete.`, { duration: 5000 });
            }
        }
    }, [fetcher.data, fetcher.state]);

    useEffect(() => {
        if (validatedResults?.bulkOperationId) {
             const opId = validatedResults.bulkOperationId;
             if (pollFetcher.data && pollFetcher.data.operationId) {
                  if (pollFetcher.data.operationId !== opId) return;

                  if (pollFetcher.data.status === "RUNNING" || pollFetcher.data.status === "CREATED") {
                       const timer = setTimeout(() => {
                           pollFetcher.load(`/app/import-product-prices?checkStatus=true&operationId=${opId}`);
                       }, 2000);
                       return () => clearTimeout(timer);
                  } else if (pollFetcher.data.status === "COMPLETED") {
                       const bulkRes = pollFetcher.data.bulkResults || { errors: [] };
                       
                       const merged = {
                           ...validatedResults,
                           updated: validatedResults.expectedUpdateCount || 0,
                           errors: [...validatedResults.errors, ...bulkRes.errors]
                       };
                       setFinalResults(merged);
                       setProgress(100);
                       shopify.toast.show(`Import complete. ${merged.updated} products updated.`, { duration: 5000 });
                       setTimeout(() => setIsProgressVisible(false), 2000);
                  } else if (pollFetcher.data.status === "FAILED") {
                       shopify.toast.show("Background update failed.", { duration: 5000 });
                       setIsProgressVisible(false);
                  }
             }
        }
    }, [pollFetcher.data, validatedResults]);

    useEffect(() => {
        if (isLoading) {
             const interval = setInterval(() => {
                setProgress((prev) => {
                    if (prev < 30) return prev + 2;
                    if (prev < 60) return prev + 0.5;
                    if (prev < 90) return prev + 0.05;
                    return prev;
                });
            }, 100);
            return () => clearInterval(interval);
        } else if (validatedResults?.bulkOperationId && !finalResults) {
             const interval = setInterval(() => {
                setProgress((prev) => {
                     if (prev < 80) return prev + 1;
                     if (prev < 95) return prev + 0.1; 
                     return prev;
                });
            }, 500);
            return () => clearInterval(interval);
        }
    }, [isLoading, validatedResults, finalResults]);

    const displayResults = finalResults || validatedResults;
    const selectedFileName = file?.name || "No file selected";
    const sampleHeaders = headers.slice(0, 6);
    const sampleRows = parsedData?.slice(0, 3) || [];
    const isUpdatingShopify = !!validatedResults?.bulkOperationId && !finalResults;

    return (
        <s-page heading="Import Product Prices">
            <div className="page-frame">
                <div className="workflow-strip">
                    <div className={`workflow-step ${file ? "is-complete" : "is-active"}`}>
                        <span>1</span>
                        <strong>Upload</strong>
                    </div>
                    <div className={`workflow-step ${parsedData?.length > 0 ? "is-active" : ""}`}>
                        <span>2</span>
                        <strong>Map columns</strong>
                    </div>
                    <div className={`workflow-step ${displayResults?.dryRun ? "is-active" : ""}`}>
                        <span>3</span>
                        <strong>Preview</strong>
                    </div>
                    <div className={`workflow-step ${finalResults ? "is-complete" : ""}`}>
                        <span>4</span>
                        <strong>Update</strong>
                    </div>
                </div>

                <s-section heading="Upload Price File">
                    <div className="upload-panel">
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".xlsx,.xls"
                            onChange={handleFileChange}
                            style={{ display: 'none' }}
                        />
                        <div>
                            <p className="panel-title">Supplier price list or Shopify export</p>
                            <p className="panel-copy">Accepted format: Excel workbook with a header row and one row per SKU.</p>
                            <div className="file-meta">
                                <span>{selectedFileName}</span>
                                {parsedData?.length > 0 && <span>{parsedData.length} rows loaded</span>}
                            </div>
                        </div>
                        <s-button
                            variant="primary"
                            onClick={handleButtonClick}
                            loading={(isLoading || isUpdatingShopify) ? "true" : undefined}
                        >
                            Choose Excel File
                        </s-button>
                    </div>
                </s-section>

            {parsedData?.length > 0 && (
                <div className="section-gap">
                    <s-section heading="Map Supplier Columns">
                        <div className="mapping-grid">
                            <label>
                                <span>SKU column</span>
                                <select
                                    value={columnMapping.sku}
                                    onChange={(event) => setColumnMapping((current) => ({ ...current, sku: event.target.value }))}
                                >
                                    <option value="">Select a column</option>
                                    {headers.map((header) => <option key={header} value={header}>{header}</option>)}
                                </select>
                            </label>
                            <label>
                                <span>Price column</span>
                                <select
                                    value={columnMapping.price}
                                    onChange={(event) => setColumnMapping((current) => ({ ...current, price: event.target.value }))}
                                >
                                    <option value="">Select a column</option>
                                    {headers.map((header) => <option key={header} value={header}>{header}</option>)}
                                </select>
                            </label>
                            <label>
                                <span>Compare-at price column</span>
                                <select
                                    value={columnMapping.compareAtPrice}
                                    onChange={(event) => setColumnMapping((current) => ({ ...current, compareAtPrice: event.target.value }))}
                                >
                                    <option value="">Do not update</option>
                                    {headers.map((header) => <option key={header} value={header}>{header}</option>)}
                                </select>
                            </label>
                        </div>
                        {sampleRows.length > 0 && sampleHeaders.length > 0 && (
                            <div className="sample-table-wrap">
                                <table className="sample-table">
                                    <thead>
                                        <tr>
                                            {sampleHeaders.map((header) => <th key={header}>{header}</th>)}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {sampleRows.map((row, rowIndex) => (
                                            <tr key={rowIndex}>
                                                {sampleHeaders.map((header) => (
                                                    <td key={header}>{row[header]?.toString() || "-"}</td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                        <div className="button-row">
                            <s-button
                                variant="primary"
                                onClick={() => submitImport(true)}
                                loading={isLoading ? "true" : undefined}
                                disabled={!canPreview ? "true" : undefined}
                            >
                                Preview Changes
                            </s-button>
                        </div>
                    </s-section>
                </div>
            )}

            {isProgressVisible && (
                <div className="progress-container">
                    <ProgressBar progress={progress} size="small" />
                    <s-text variant="bodyLg">
                         {isUpdatingShopify ? "Processing price updates..." : "Checking product prices..."}
                    </s-text>
                </div>
            )}

            {displayResults && !isProgressVisible && (
                <>
                    <div className="section-gap">
                        <s-section heading="Import Results">
                            <div className="summary-grid">
                                <div className="summary-tile">
                                    <span>Total rows</span>
                                    <strong>{displayResults.total}</strong>
                                </div>
                                <div className="summary-tile">
                                    <span>{displayResults.dryRun ? "Prices ready" : "Prices updated"}</span>
                                    <strong>{displayResults.priceUpdatesCount || 0}</strong>
                                </div>
                                <div className="summary-tile">
                                    <span>{displayResults.dryRun ? "Compare-at ready" : "Compare-at updated"}</span>
                                    <strong>{displayResults.compareAtUpdatesCount || 0}</strong>
                                </div>
                                <div className={`summary-tile ${displayResults.errors.length > 0 ? "has-errors" : ""}`}>
                                    <span>Errors</span>
                                    <strong>{displayResults.errors.length}</strong>
                                </div>
                            </div>
                            {displayResults.dryRun && displayResults.updatedRows?.length > 0 && (
                                <div className="button-row">
                                    <s-button
                                        variant="primary"
                                        onClick={() => submitImport(false)}
                                        loading={(isLoading || isUpdatingShopify) ? "true" : undefined}
                                    >
                                        Confirm and Update Shopify
                                    </s-button>
                                </div>
                            )}
                        </s-section>
                    </div>

                    {displayResults.updatedRows?.length > 0 && (
                        <div className="section-gap">
                            <s-section heading={displayResults.dryRun ? "Rows Ready to Update" : "Updated Rows"}>
                                <s-table>
                                    <s-table-header-row>
                                        {Object.keys(displayResults.updatedRows[0] || {}).map((key) => (
                                            <s-table-header key={key}>{key}</s-table-header>
                                        ))}
                                    </s-table-header-row>
                                    <s-table-body>
                                        {displayResults.updatedRows
                                            .slice((updatedPage - 1) * updatedRowsPerPage, updatedPage * updatedRowsPerPage)
                                            .map((row, index) => (
                                                <s-table-row key={index}>
                                                    {Object.keys(displayResults.updatedRows[0] || {}).map((key, cellIndex) => (
                                                        <s-table-cell key={cellIndex}>
                                                            {row[key]?.toString() || '-'}
                                                        </s-table-cell>
                                                    ))}
                                                </s-table-row>
                                            ))}
                                    </s-table-body>
                                </s-table>
                                {displayResults.updatedRows.length > updatedRowsPerPage && (
                                    <Pagination
                                        hasPrevious={updatedPage > 1}
                                        onPrevious={() => setUpdatedPage(updatedPage - 1)}
                                        hasNext={updatedPage < Math.ceil(displayResults.updatedRows.length / updatedRowsPerPage)}
                                        onNext={() => setUpdatedPage(updatedPage + 1)}
                                        type="table"
                                        label={`${((updatedPage - 1) * updatedRowsPerPage) + 1}-${Math.min(updatedPage * updatedRowsPerPage, displayResults.updatedRows.length)} of ${displayResults.updatedRows.length}`}
                                    />
                                )}
                            </s-section>
                        </div>
                    )}

                    {displayResults.failedRows?.length > 0 && (
                        <div className="section-gap">
                            <s-section heading="Failed Rows">
                                <s-table>
                                    <s-table-header-row>
                                        {Object.keys(displayResults.failedRows[0] || {}).map((key) => (
                                            <s-table-header key={key}>{key}</s-table-header>
                                        ))}
                                    </s-table-header-row>
                                    <s-table-body>
                                        {displayResults.failedRows
                                            .slice((failedPage - 1) * failedRowsPerPage, failedPage * failedRowsPerPage)
                                            .map((row, index) => (
                                                <s-table-row key={index}>
                                                    {Object.keys(displayResults.failedRows[0] || {}).map((key, cellIndex) => (
                                                        <s-table-cell key={cellIndex}>
                                                            {row[key]?.toString() || '-'}
                                                        </s-table-cell>
                                                    ))}
                                                </s-table-row>
                                            ))}
                                    </s-table-body>
                                </s-table>
                                {displayResults.failedRows.length > failedRowsPerPage && (
                                    <Pagination
                                        hasPrevious={failedPage > 1}
                                        onPrevious={() => setFailedPage(failedPage - 1)}
                                        hasNext={failedPage < Math.ceil(displayResults.failedRows.length / failedRowsPerPage)}
                                        onNext={() => setFailedPage(failedPage + 1)}
                                        type="table"
                                        label={`${((failedPage - 1) * failedRowsPerPage) + 1}-${Math.min(failedPage * failedRowsPerPage, displayResults.failedRows.length)} of ${displayResults.failedRows.length}`}
                                    />
                                )}
                            </s-section>
                        </div>
                    )}

                    {displayResults.skippedRows?.length > 0 && (
                        <div className="section-gap page-bottom">
                            <s-section heading="Skipped Rows - Prices Already Match">
                                <s-table>
                                    <s-table-header-row>
                                        {Object.keys(displayResults.skippedRows[0] || {}).map((key) => (
                                            <s-table-header key={key}>{key}</s-table-header>
                                        ))}
                                    </s-table-header-row>
                                    <s-table-body>
                                        {displayResults.skippedRows
                                            .slice((skippedPage - 1) * skippedRowsPerPage, skippedPage * skippedRowsPerPage)
                                            .map((row, index) => (
                                                <s-table-row key={index}>
                                                    {Object.keys(displayResults.skippedRows[0] || {}).map((key, cellIndex) => (
                                                        <s-table-cell key={cellIndex}>
                                                            {row[key]?.toString() || '-'}
                                                        </s-table-cell>
                                                    ))}
                                                </s-table-row>
                                            ))}
                                    </s-table-body>
                                </s-table>
                                {displayResults.skippedRows.length > skippedRowsPerPage && (
                                    <Pagination
                                        hasPrevious={skippedPage > 1}
                                        onPrevious={() => setSkippedPage(skippedPage - 1)}
                                        hasNext={skippedPage < Math.ceil(displayResults.skippedRows.length / skippedRowsPerPage)}
                                        onNext={() => setSkippedPage(skippedPage + 1)}
                                        type="table"
                                        label={`${((skippedPage - 1) * skippedRowsPerPage) + 1}-${Math.min(skippedPage * skippedRowsPerPage, displayResults.skippedRows.length)} of ${displayResults.skippedRows.length}`}
                                    />
                                )}
                            </s-section>
                        </div>
                    )}
                </>
            )}
            </div>
        </s-page>
    );
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};
