# Project Cost Monitoring & Invoice Reconciliation Automation

[Case study](https://briannaufal211.github.io/personal-portfolio/project-cost-monitoring.html) · [Interactive demo](https://briannaufal211.github.io/personal-portfolio/assets/project-cost/demo/) · [Video walkthrough](https://briannaufal211.github.io/personal-portfolio/project-cost-monitoring.html#demo) · [Management report](https://briannaufal211.github.io/personal-portfolio/assets/project-cost/Management-Report.pdf) · [Excel and Power Query guide](https://briannaufal211.github.io/personal-portfolio/assets/project-cost/Excel-Power-Query-Guide.pdf)

## Executive summary

The Finance Director needed an earlier view of project costs while field receipts and payment records were still being collected. This independent portfolio project uses public data and simulated transactions to show how Finance can capture receipts, compare invoices with payments, and investigate discrepancies from one dashboard.

## Business problem and objectives

Periodic recaps delayed the director’s view of recorded project costs. Finance also had to trace installments and payments covering multiple invoices. The project automates repeatable imports and matching, makes exceptions visible, and gives management a way to review recorded costs by project and category.

## Data and assumptions

The starting point was TheAgentCompany’s public Finance Invoice Matching task, with 500 invoices and 486 payment records. Invoice IDs and payment relationships came from that source. Project codes, construction cost categories, descriptions, quantities, unit costs, and IDR amounts were added for the simulation. The public CORD receipt example is a separate input used to test receipt capture.

## My contribution and AI assistance

I defined the reporting and receipt requirements, built and tested the Excel matching workflow with guidance, checked the results after changing source records, and tested receipt uploads. AI assisted with application code, interface design, debugging, tests, deployment, and documentation. I used an existing OCR engine and kept human review before saving an invoice.

## Excel imports and preparation

The monitoring workbook imports the invoice and payment workbooks using saved Power Query steps. IDs are text, invoice dates have the Date type, and amounts are numeric. Trim removes unwanted spaces. Staging queries can remain connection-only. Reference creates a query that follows its parent output, while Duplicate copies the steps into a separate query.

## Direct, installment, and combined payment matching

Direct matching joins Invoice_ID to Reference. Installment matching strips the Partial and Remaining markers, groups payment rows by invoice, and compares their sum with the invoice. Combined matching splits references into individual invoice IDs, joins each ID to its invoice amount, then groups by Payment_ID so the payment is counted once.

## Reconciliation table and controls

The three query outputs are aligned to the same columns and appended to Hasil_Rekonsiliasi. A direct or installment case uses the invoice ID. A combined case uses the payment ID and retains the linked invoice list. The PivotTable counts cases by type and status. Finance can verify the totals, inspect unmatched records, and refresh the source after saving changes.

## Online architecture

The receipt app runs Tesseract.js in the browser. The operator reviews the total and transaction details before confirming. The server assigns the next invoice ID, writes the invoice to Google Sheets, and stores the photo privately in Supabase. Finance records the payment separately using its invoice reference. A Supabase function calculates reconciliation from the source sheets, and GitHub Pages serves the dashboard.

## Refresh behavior

The online dashboard checks for updates approximately every 15 seconds while open. A short server cache and network response times affect when changes appear. The desktop Excel workbook refreshes when the user runs Refresh All, and the Google Sheets sources are maintained separately from local Excel files.

## Verified snapshot on November 26, 2026

At 10:13 p.m. Jakarta time, the dashboard showed 502 invoices and 452 cases. Of these, 432 matched, 19 had an amount difference, one had no payment recorded, and zero had a reference issue. Billed costs were IDR 3,250,455,000 and recorded payments were IDR 3,248,896,000. The IDR 1,559,000 aggregate difference combines several types of open items and requires transaction-level review.

## Receipt example and recorded outcome

The public CORD food receipt shows a grand total of IDR 48,000, cash tendered of IDR 50,000, and change of IDR 2,000. The saved example, INV0501, recorded IDR 48,000 for Project A and appeared with no recorded payment in the dated snapshot. The separate interactive portfolio demo uses INV-DEMO-06 and lets visitors simulate a matching payment.

## How a Finance Director uses the dashboard

Open the dashboard, check the last successful refresh, and select the project, invoice date range, and category. Read billed costs, recorded payments, and exceptions. Look at the trend and the largest categories. Select Needs follow-up and use an invoice ID to review the case with Finance before drawing a conclusion.

## How filters affect the totals

Date filters use the invoice date. A combined payment can relate to invoices in more than one selected or unselected project, category, or period. The case list can show a payment that overlaps the filters. The payment card only includes cases whose linked invoices all fall within the selection. Search narrows the case table while the summary cards continue to reflect the report filters.

## How Finance handles exceptions

Matched means the references and amounts satisfy the matching rules. An amount difference is invoice value minus recorded payment. Positive values indicate a smaller recorded payment, while negative values indicate a larger one. No payment recorded calls for checking the payment source and reference. Check reference calls for tracing missing or invalid invoice IDs before editing the source.

## Management follow-up priorities

At the recorded snapshot, subcontracted work was the largest billed category at IDR 1,192,145,000, followed by equipment rental at IDR 428,580,000. In the example case INV0003, billed costs of IDR 2,900,000 and a recorded payment of IDR 1,732,000 left a difference of IDR 1,168,000. Finance should review the payment evidence, record the reason and owner, and confirm the status following any source correction.

## Verification

The public demo was tested from receipt confirmation to a recorded payment. The status of INV-DEMO-06 changed from No payment recorded to Matched with an IDR 0 difference. Other checks covered three payment patterns, pending cases, duplicate-save protection, shared sessions, and dashboard refresh. The CORD sample produced the expected IDR 48,000, with human confirmation required before saving.

## Scope and limitations

The prototype relies on timely source entry and human review of OCR output. Recorded payment status reflects the sheet. Bank transfer execution, approval, official accounting, budget variance, and fuel anomalies are outside the current scope. The shared access code is for this prototype. A broader rollout would benefit from separate operator and management accounts, a tracked review queue, and an agreed refresh and completeness target.

## Tools

Excel and Power Query build the desktop reconciliation. Google Sheets holds the online source records. HTML, CSS, and JavaScript deliver the interfaces. Tesseract.js reads sample receipt photos. Supabase handles authenticated data access and private photo storage. GitHub Pages hosts the web front end.

## What is CORD?

CORD is a public research collection of Indonesian store and restaurant receipt images. NAVER CLOVA provides annotations for fields such as item names, tax, and totals. This project uses a food receipt from that collection to demonstrate how Tesseract.js reads text from a photo and how an operator verifies the proposed total before saving. IDR 48,000 is the purchase total. IDR 50,000 is cash tendered and IDR 2,000 is the change.

## Sources and live applications

- [Finance Invoice Matching source](https://github.com/TheAgentCompany/TheAgentCompany/tree/main/workspaces/tasks/finance-invoice-matching)
- [CORD by NAVER CLOVA](https://github.com/clovaai/cord) and its [CC BY 4.0 license](https://creativecommons.org/licenses/by/4.0/)
- [Finance dashboard](https://briannaufal211.github.io/bon-proyek-dashboard/) and [receipt upload app](https://briannaufal211.github.io/bon-proyek-dashboard/unggah/), available to authorized users
