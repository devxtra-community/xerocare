#!/bin/bash
export PGPASSWORD=password123

echo "Resetting Billing Database..."
psql -h localhost -U xerouser -d xerocare_billing -c "TRUNCATE TABLE payment_ledgers, usage_record_items, usage_records, return_credits, product_allocations, device_meter_readings, invoice_items, invoices CASCADE;"

echo "Resetting Vendor/Inventory Database..."
psql -h localhost -U xerouser -d xerocare_vendor -c "TRUNCATE TABLE purchase_payments, purchase_costs, purchases, rfq_vendor_items, rfq_vendors, rfq_items, rfqs, spare_part_inventories, products, spare_parts, lot_items, lots, vendor_requests, processed_invoice_items CASCADE;"

echo "Resetting CRM Database..."
psql -h localhost -U xerouser -d xerocare_crm -c "TRUNCATE TABLE customers CASCADE;"

echo "Data reset complete."
