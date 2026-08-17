--
-- PostgreSQL database dump
--

\restrict clzkuLkgMhI1fyR9XOdCUKtbveTtYk5sXyiTBCVmtS56FcFvglCxbjMJlJRhZiH

-- Dumped from database version 16.14 (Ubuntu 16.14-0ubuntu0.24.04.1)
-- Dumped by pg_dump version 16.14 (Ubuntu 16.14-0ubuntu0.24.04.1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- Name: branches_status_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.branches_status_enum AS ENUM (
    'ACTIVE',
    'INACTIVE',
    'DELETED'
);


--
-- Name: brands_status_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.brands_status_enum AS ENUM (
    'ACTIVE',
    'INACTIVE'
);


--
-- Name: lot_documents_document_type_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.lot_documents_document_type_enum AS ENUM (
    'BILL_OF_LADING',
    'CUSTOMS_DECLARATION',
    'COMMERCIAL_INVOICE',
    'PACKING_LIST',
    'INSURANCE_CERTIFICATE',
    'OTHER'
);


--
-- Name: lot_items_item_type_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.lot_items_item_type_enum AS ENUM (
    'MODEL',
    'SPARE_PART'
);


--
-- Name: lots_purchase_origin_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.lots_purchase_origin_enum AS ENUM (
    'DOMESTIC',
    'INTERNATIONAL'
);


--
-- Name: lots_shipment_status_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.lots_shipment_status_enum AS ENUM (
    'PENDING_DISPATCH',
    'IN_TRANSIT',
    'CUSTOMS_CLEARANCE',
    'ARRIVED',
    'RELEASED'
);


--
-- Name: lots_status_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.lots_status_enum AS ENUM (
    'PENDING',
    'RECEIVING',
    'RECEIVED',
    'COMPLETED',
    'CANCELLED'
);


--
-- Name: lots_transport_mode_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.lots_transport_mode_enum AS ENUM (
    'SEA',
    'AIR',
    'ROAD',
    'RAIL',
    'COURIER',
    'PICKUP',
    'OTHER'
);


--
-- Name: print_colour_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.print_colour_enum AS ENUM (
    'BLACK_WHITE',
    'COLOUR',
    'BOTH'
);


--
-- Name: products_ownership_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.products_ownership_enum AS ENUM (
    'RENT',
    'LEASE',
    'SALE',
    'EXTERNAL'
);


--
-- Name: products_product_status_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.products_product_status_enum AS ENUM (
    'AVAILABLE',
    'RENTED',
    'LEASE',
    'SOLD',
    'DAMAGED',
    'RETURNED'
);


--
-- Name: purchases_goodsorservice_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.purchases_goodsorservice_enum AS ENUM (
    'GOODS',
    'SERVICE'
);


--
-- Name: purchases_purchase_origin_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.purchases_purchase_origin_enum AS ENUM (
    'DOMESTIC',
    'INTERNATIONAL'
);


--
-- Name: purchases_purchasecategory_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.purchases_purchasecategory_enum AS ENUM (
    'PRODUCT',
    'SPARE_PART',
    'SERVICE',
    'OTHER'
);


--
-- Name: purchases_taxstatus_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.purchases_taxstatus_enum AS ENUM (
    'PENDING',
    'RECORDED',
    'FILED'
);


--
-- Name: rfq_items_item_type_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.rfq_items_item_type_enum AS ENUM (
    'PRODUCT',
    'SPARE_PART'
);


--
-- Name: rfq_vendor_items_stock_status_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.rfq_vendor_items_stock_status_enum AS ENUM (
    'IN_STOCK',
    'OUT_OF_STOCK',
    'ON_PRODUCTION'
);


--
-- Name: rfq_vendors_status_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.rfq_vendors_status_enum AS ENUM (
    'INVITED',
    'QUOTED',
    'REJECTED',
    'AWARDED'
);


--
-- Name: rfqs_purchase_origin_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.rfqs_purchase_origin_enum AS ENUM (
    'DOMESTIC',
    'INTERNATIONAL'
);


--
-- Name: rfqs_status_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.rfqs_status_enum AS ENUM (
    'DRAFT',
    'SENT',
    'PARTIAL_QUOTED',
    'FULLY_QUOTED',
    'AWARDED',
    'CANCELLED',
    'CLOSED'
);


--
-- Name: service_contracts_contracttype_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.service_contracts_contracttype_enum AS ENUM (
    'FSMA',
    'SMA',
    'AMC'
);


--
-- Name: service_ticket_items_itemsource_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.service_ticket_items_itemsource_enum AS ENUM (
    'SPARE_PART',
    'CUSTOM'
);


--
-- Name: service_tickets_jobtype_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.service_tickets_jobtype_enum AS ENUM (
    'ONSITE',
    'BRING_TO_CENTRE',
    'WARRANTY_ONSITE'
);


--
-- Name: service_tickets_servicecontext_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.service_tickets_servicecontext_enum AS ENUM (
    'RENT',
    'LEASE_UNDER_WARRANTY',
    'FSMA',
    'SMA',
    'AMC',
    'CHARGEABLE',
    'LEASE_EXPIRED',
    'WARRANTY',
    'EXTERNAL_MACHINE'
);


--
-- Name: service_tickets_status_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.service_tickets_status_enum AS ENUM (
    'OPEN',
    'ASSIGNED',
    'DIAGNOSED',
    'QUOTED',
    'WAITING_FINANCE_APPROVAL',
    'FINANCE_APPROVED',
    'FINANCE_REJECTED',
    'CUSTOMER_APPROVED',
    'CUSTOMER_REJECTED',
    'IN_PROGRESS',
    'COMPLETED',
    'CANCELLED',
    'FREE_SERVICE',
    'ESTIMATE_RECORDED',
    'ADDITIONAL_ESTIMATE_PENDING',
    'WAITING_FINANCE_APPROVAL_2',
    'FINANCE_APPROVED_2'
);


--
-- Name: stock_transfer_items_item_status_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.stock_transfer_items_item_status_enum AS ENUM (
    'PENDING',
    'APPROVED',
    'REJECTED'
);


--
-- Name: stock_transfer_items_item_type_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.stock_transfer_items_item_type_enum AS ENUM (
    'SPARE_PART',
    'PRODUCT'
);


--
-- Name: stock_transfers_status_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.stock_transfers_status_enum AS ENUM (
    'DRAFT',
    'SENT',
    'APPROVED',
    'REJECTED',
    'IN_TRANSIT',
    'COMPLETED',
    'CANCELLED'
);


--
-- Name: stock_transfers_transfer_type_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.stock_transfers_transfer_type_enum AS ENUM (
    'INTRA_BRANCH',
    'INTER_BRANCH'
);


--
-- Name: vendors_status_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.vendors_status_enum AS ENUM (
    'ACTIVE',
    'INACTIVE',
    'DELETED'
);


--
-- Name: vendors_type_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.vendors_type_enum AS ENUM (
    'Supplier',
    'Distributor',
    'Service'
);


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: branches; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.branches (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name character varying NOT NULL,
    address character varying NOT NULL,
    location character varying NOT NULL,
    manager_id character varying,
    started_date date NOT NULL,
    status public.branches_status_enum DEFAULT 'ACTIVE'::public.branches_status_enum NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    country_code character varying(2),
    currency_code character varying(3),
    currency_symbol character varying(10),
    currency_name character varying(100),
    has_tax boolean DEFAULT false,
    tax_name character varying(50),
    tax_percent numeric(5,2),
    tax_registration_number character varying(50),
    city character varying(100),
    state character varying(100),
    postal_code character varying(20)
);


--
-- Name: brands; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.brands (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name character varying NOT NULL,
    description text,
    status public.brands_status_enum DEFAULT 'ACTIVE'::public.brands_status_enum NOT NULL,
    branch_id uuid,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: consumable_yield_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.consumable_yield_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    "productId" uuid,
    "serialNumber" character varying(255) NOT NULL,
    "tonerSku" character varying(255) NOT NULL,
    "installedDate" timestamp without time zone NOT NULL,
    "installedMeterReading" integer NOT NULL,
    "replacedDate" timestamp without time zone,
    "replacedMeterReading" integer,
    "yieldPages" integer,
    "ticketId" uuid NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: contract_meter_readings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.contract_meter_readings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    "contractId" uuid NOT NULL,
    "readingDate" timestamp without time zone DEFAULT now() NOT NULL,
    "totalReading" integer,
    "bwReading" integer,
    "colorReading" integer,
    "clicksTotal" integer DEFAULT 0 NOT NULL,
    "clicksBW" integer DEFAULT 0 NOT NULL,
    "clicksColor" integer DEFAULT 0 NOT NULL,
    "amountCharged" numeric(12,2) DEFAULT 0 NOT NULL,
    "chargeBreakdown" jsonb,
    notes text,
    "recordedBy" uuid,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    "billedAt" timestamp without time zone,
    "billingInvoiceId" uuid
);


--
-- Name: employee_managers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.employee_managers (
    employee_id character varying NOT NULL,
    email character varying NOT NULL,
    status character varying NOT NULL,
    name character varying,
    synced_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: exchange_rates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.exchange_rates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    from_currency character varying(3) NOT NULL,
    to_currency character varying(3) NOT NULL,
    rate numeric(18,6) NOT NULL,
    fetched_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: inventory_reservations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.inventory_reservations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    "ticketId" uuid NOT NULL,
    "sparePartId" uuid NOT NULL,
    "reservedQuantity" integer NOT NULL,
    status character varying(50) DEFAULT 'RESERVED'::character varying NOT NULL,
    "reservedAt" timestamp without time zone DEFAULT now(),
    "consumedAt" timestamp without time zone
);


--
-- Name: lot_documents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lot_documents (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    lot_id uuid NOT NULL,
    document_type public.lot_documents_document_type_enum DEFAULT 'OTHER'::public.lot_documents_document_type_enum NOT NULL,
    document_name character varying(255) DEFAULT 'Untitled document'::character varying NOT NULL,
    notes text,
    file_url character varying(1000) NOT NULL,
    file_name character varying(500) NOT NULL,
    mime_type character varying(150),
    file_size integer,
    uploaded_by uuid,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: lot_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lot_items (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    lot_id uuid NOT NULL,
    item_type public.lot_items_item_type_enum NOT NULL,
    model_id uuid,
    spare_part_id uuid,
    quantity integer NOT NULL,
    received_quantity integer DEFAULT 0 NOT NULL,
    damaged_quantity integer DEFAULT 0 NOT NULL,
    returned_quantity integer DEFAULT 0 NOT NULL,
    used_quantity integer DEFAULT 0 NOT NULL,
    custom_product_name character varying,
    custom_spare_part_name character varying,
    unit_price numeric(12,2) NOT NULL,
    total_price numeric(12,2) NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    mpn character varying,
    compatible_models text,
    model_ids text,
    selling_price numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    hs_code character varying(50),
    CONSTRAINT "CHK_649fcfd36164c053bdb7d9b1a4" CHECK (((((model_id IS NOT NULL) OR (custom_product_name IS NOT NULL)) AND (spare_part_id IS NULL) AND (custom_spare_part_name IS NULL)) OR (((spare_part_id IS NOT NULL) OR (custom_spare_part_name IS NOT NULL)) AND (model_id IS NULL) AND (custom_product_name IS NULL))))
);


--
-- Name: lots; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lots (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    lot_number character varying(50) NOT NULL,
    vendor_id uuid,
    purchase_date date NOT NULL,
    total_amount numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    status public.lots_status_enum DEFAULT 'PENDING'::public.lots_status_enum NOT NULL,
    branch_id character varying,
    warehouse_id uuid,
    created_by character varying,
    notes text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    currency_code character varying(3),
    exchange_rate_snapshot numeric(18,6),
    purchase_origin public.lots_purchase_origin_enum,
    transfer_origin boolean DEFAULT false NOT NULL,
    transfer_id uuid,
    transport_mode public.lots_transport_mode_enum,
    carrier_name character varying(150),
    dispatch_date date,
    estimated_arrival date,
    actual_arrival date,
    shipment_status public.lots_shipment_status_enum,
    shipment_details jsonb
);


--
-- Name: machine_service_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.machine_service_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    "productId" uuid NOT NULL,
    "serialNumber" character varying(255) NOT NULL,
    "totalServiceVisits" integer DEFAULT 0,
    "totalPreventativeVisits" integer DEFAULT 0,
    "lastServiceDate" timestamp without time zone,
    "nextScheduledMaintenanceDate" timestamp without time zone,
    "totalPartsSpend" numeric(12,2) DEFAULT 0,
    "totalLabourSpend" numeric(12,2) DEFAULT 0,
    "totalLifetimeCost" numeric(12,2) DEFAULT 0,
    "updatedAt" timestamp without time zone DEFAULT now()
);


--
-- Name: model; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.model (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    model_no character varying(100) NOT NULL,
    model_name character varying(255) NOT NULL,
    hs_code character varying(100),
    brand_id uuid,
    description text,
    quantity numeric DEFAULT '0'::numeric NOT NULL,
    available numeric DEFAULT '0'::numeric NOT NULL,
    rented numeric DEFAULT '0'::numeric NOT NULL,
    leased numeric DEFAULT '0'::numeric NOT NULL,
    sold numeric DEFAULT '0'::numeric NOT NULL,
    branch_id uuid,
    max_discountable_amount numeric(10,2) DEFAULT 0
);


--
-- Name: processed_invoice_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.processed_invoice_items (
    invoice_item_id uuid NOT NULL,
    processed_at timestamp without time zone DEFAULT now()
);


--
-- Name: products; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.products (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    model_id uuid,
    warehouse_id uuid,
    spare_part_id uuid,
    vendor_id uuid,
    lot_id uuid,
    serial_no character varying(255) NOT NULL,
    name character varying(255) NOT NULL,
    brand character varying(100) NOT NULL,
    "MFD" date,
    tax_rate numeric(5,2) NOT NULL,
    sale_price numeric(12,2),
    product_status public.products_product_status_enum DEFAULT 'AVAILABLE'::public.products_product_status_enum,
    print_colour public.print_colour_enum DEFAULT 'BLACK_WHITE'::public.print_colour_enum,
    max_discount_amount numeric(12,2) DEFAULT '0'::numeric,
    wholesale_price numeric(12,2),
    "imageUrl" character varying(1000),
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    purchase_price numeric(12,2),
    description text,
    hs_code character varying(100),
    features jsonb,
    warranty character varying(255),
    consumables jsonb,
    barcode_id character varying(255),
    ownership public.products_ownership_enum DEFAULT 'SALE'::public.products_ownership_enum,
    warranty_start_date timestamp without time zone,
    warranty_end_date timestamp without time zone,
    warranty_max_pages integer DEFAULT 200000,
    meter_reading integer DEFAULT 0,
    customer_id uuid,
    branch_id uuid,
    contract_id uuid,
    transfer_status character varying(20) DEFAULT 'NONE'::character varying,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    created_by uuid,
    updated_by uuid,
    deleted_at timestamp with time zone,
    CONSTRAINT "CHK_05813a376a575d477ea8517cd2" CHECK ((max_discount_amount >= (0)::numeric))
);


--
-- Name: purchase_costs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.purchase_costs (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    purchase_id uuid NOT NULL,
    branch_id uuid NOT NULL,
    amount numeric(12,2) NOT NULL,
    cost_type character varying(50) NOT NULL,
    cost_date timestamp without time zone DEFAULT now() NOT NULL,
    description text,
    created_by uuid,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    attachment_url character varying(500)
);


--
-- Name: purchase_payments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.purchase_payments (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    purchase_id uuid NOT NULL,
    branch_id uuid NOT NULL,
    amount numeric(12,2) NOT NULL,
    payment_date timestamp without time zone DEFAULT now() NOT NULL,
    description text,
    payment_method character varying(50) NOT NULL,
    reference_number character varying(100),
    created_by uuid,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    attachment_url character varying(500)
);


--
-- Name: purchases; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.purchases (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    lot_id uuid NOT NULL,
    vendor_id uuid NOT NULL,
    branch_id uuid NOT NULL,
    purchase_amount numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    documentation_fee numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    labour_cost numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    handling_fee numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    transportation_cost numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    shipping_cost numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    groundfield_cost numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    total_amount numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    created_by uuid,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    purchase_origin public.purchases_purchase_origin_enum,
    vendor_vat_number character varying(50),
    vendor_country character varying(2),
    currency_code character varying(3),
    exchange_rate numeric(12,6),
    purchase_category public.purchases_purchasecategory_enum,
    taxable_amount numeric(12,2),
    tax_percent numeric(5,2),
    tax_name character varying(50),
    input_vat_amount numeric(12,2),
    reverse_charge_vat_amount numeric(12,2),
    import_invoice_no character varying(100),
    customs_entry_no character varying(100),
    customs_duty numeric(12,2),
    goods_or_service public.purchases_goodsorservice_enum,
    vat_claimable boolean DEFAULT true NOT NULL,
    tax_status public.purchases_taxstatus_enum DEFAULT 'PENDING'::public.purchases_taxstatus_enum NOT NULL,
    vendor_state_province character varying(100),
    vendor_city character varying(100)
);


--
-- Name: rfq_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.rfq_items (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    rfq_id uuid NOT NULL,
    branch_id uuid,
    item_type public.rfq_items_item_type_enum NOT NULL,
    model_id uuid,
    product_id uuid,
    custom_product_name character varying(255),
    brand_id uuid,
    spare_part_id uuid,
    custom_brand_name character varying(255),
    custom_spare_part_name character varying(255),
    hs_code character varying(50),
    description text,
    quantity integer NOT NULL,
    expected_delivery_date date,
    created_by uuid,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    mpn character varying(255),
    compatible_models text,
    model_ids text
);


--
-- Name: rfq_vendor_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.rfq_vendor_items (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    rfq_vendor_id uuid NOT NULL,
    rfq_item_id uuid NOT NULL,
    unit_price numeric(15,2),
    total_price numeric(15,2),
    stock_status public.rfq_vendor_items_stock_status_enum,
    available_quantity integer,
    estimated_shipment_date date,
    vendor_note text,
    remarks text
);


--
-- Name: rfq_vendors; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.rfq_vendors (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    rfq_id uuid NOT NULL,
    vendor_id uuid NOT NULL,
    status public.rfq_vendors_status_enum DEFAULT 'INVITED'::public.rfq_vendors_status_enum NOT NULL,
    total_quoted_amount numeric(15,2),
    quoted_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    vendor_currency_code character varying(3),
    vendor_amount numeric(15,2),
    branch_currency_code character varying(3),
    branch_converted_amount numeric(15,2),
    exchange_rate_snapshot numeric(18,6),
    exchange_rate_fetched_at timestamp without time zone
);


--
-- Name: rfqs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.rfqs (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    rfq_number character varying(50) NOT NULL,
    branch_id uuid NOT NULL,
    created_by character varying NOT NULL,
    status public.rfqs_status_enum DEFAULT 'DRAFT'::public.rfqs_status_enum NOT NULL,
    awarded_vendor_id uuid,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    purchase_origin public.rfqs_purchase_origin_enum
);


--
-- Name: service_contracts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.service_contracts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    "productId" uuid NOT NULL,
    "customerId" uuid NOT NULL,
    "contractType" public.service_contracts_contracttype_enum NOT NULL,
    "startDate" timestamp without time zone NOT NULL,
    "endDate" timestamp without time zone NOT NULL,
    "contractValue" numeric(12,2) DEFAULT 0 NOT NULL,
    "coverageRules" jsonb NOT NULL,
    status character varying(50) DEFAULT 'ACTIVE'::character varying NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    "monthlyCharge" numeric(12,2),
    "copyLimit" integer,
    "overagePerCopyRate" numeric(12,4),
    "startMeterReading" integer,
    "fsmaBillingMode" character varying(20),
    "ratePerClickBW" numeric(12,4),
    "ratePerClickColor" numeric(12,4),
    "ratePerClickCombined" numeric(12,4),
    "startMeterBW" integer,
    "startMeterColor" integer,
    notes text,
    "invoiceId" uuid,
    "branchId" uuid,
    "nextBillingDate" date
);


--
-- Name: service_diagnoses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.service_diagnoses (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    "ticketId" uuid NOT NULL,
    "problemFound" text NOT NULL,
    "rootCause" text NOT NULL,
    "technicianNotes" text,
    "meterReading" integer DEFAULT 0 NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: service_estimate_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.service_estimate_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    "estimateId" uuid,
    "revisionId" uuid,
    "itemSource" character varying(50) NOT NULL,
    "sparePartId" uuid,
    sku character varying(255),
    "partName" character varying(255) NOT NULL,
    quantity integer DEFAULT 1 NOT NULL,
    "unitPrice" numeric(10,2),
    "totalPrice" numeric(10,2),
    "isFree" boolean DEFAULT false NOT NULL,
    "isApproved" boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: service_estimate_revisions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.service_estimate_revisions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    invoice_id uuid NOT NULL,
    "ticketId" uuid NOT NULL,
    revision_number integer NOT NULL,
    revision_type character varying(50) NOT NULL,
    items_snapshot jsonb NOT NULL,
    total_amount numeric(10,2) NOT NULL,
    discount_applied numeric(10,2) DEFAULT 0,
    visit_charge_amount numeric(10,2) DEFAULT 0,
    technician_note_to_finance text,
    submitted_by character varying(255) NOT NULL,
    finance_decision character varying(50) DEFAULT NULL::character varying,
    finance_decision_by character varying(255) DEFAULT NULL::character varying,
    finance_decision_note text,
    finance_decision_at timestamp without time zone,
    valid_until timestamp without time zone,
    submitted_at timestamp without time zone DEFAULT now() NOT NULL,
    "labourCost" numeric(10,2) DEFAULT 0,
    "totalCost" numeric(10,2) DEFAULT 0,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: service_estimates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.service_estimates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    "ticketId" uuid NOT NULL,
    "labourCost" numeric(10,2) DEFAULT 0 NOT NULL,
    "totalCost" numeric(10,2) DEFAULT 0 NOT NULL,
    status character varying(50) DEFAULT 'DRAFT'::character varying NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    currency_code character varying(3),
    exchange_rate_snapshot numeric(18,6),
    parts_cost numeric(12,2) DEFAULT 0,
    visit_charge_amount numeric(12,2) DEFAULT 0,
    transport_charge_amount numeric(12,2) DEFAULT 0,
    discount_amount numeric(12,2) DEFAULT 0
);


--
-- Name: service_part_usage_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.service_part_usage_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    "productId" uuid NOT NULL,
    "ticketId" uuid NOT NULL,
    "sparePartId" uuid,
    "partName" character varying(255) NOT NULL,
    sku character varying(255),
    "quantityUsed" integer NOT NULL,
    "unitCost" numeric(12,2) NOT NULL,
    "totalCost" numeric(12,2) NOT NULL,
    "isFree" boolean DEFAULT false,
    "isConsumable" boolean DEFAULT false,
    "meterReadingAtReplacement" integer,
    "previousMeterReading" integer,
    "calculatedYield" integer,
    "linkedInvoiceId" character varying(255),
    "replacedAt" timestamp without time zone DEFAULT now()
);


--
-- Name: service_reports; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.service_reports (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    "ticketId" uuid NOT NULL,
    "workPerformed" text NOT NULL,
    "resolutionDetails" text NOT NULL,
    "meterReading" integer DEFAULT 0 NOT NULL,
    "startTime" timestamp without time zone NOT NULL,
    "endTime" timestamp without time zone NOT NULL,
    "totalTimeSpent" integer NOT NULL,
    "customerRemarks" text,
    "technicianRemarks" text,
    "customerSignature" text,
    "technicianSignature" text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: service_ticket_activities; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.service_ticket_activities (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    "ticketId" uuid NOT NULL,
    "activityType" character varying(50) NOT NULL,
    description text NOT NULL,
    "performedBy" uuid,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: service_ticket_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.service_ticket_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    "ticketId" uuid NOT NULL,
    "itemSource" public.service_ticket_items_itemsource_enum NOT NULL,
    "sparePartId" uuid,
    sku character varying(255),
    "barcodeId" character varying(255),
    "customPartName" character varying(255),
    "customPartBrand" character varying(255),
    "customPartDescription" text,
    "partName" character varying(255) NOT NULL,
    quantity integer DEFAULT 1 NOT NULL,
    "unitPrice" numeric(10,2),
    "totalPrice" numeric(10,2),
    "isFree" boolean DEFAULT false NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    "partBrand" character varying(255),
    mpn character varying(255)
);


--
-- Name: service_tickets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.service_tickets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    "ticketNumber" character varying(255) NOT NULL,
    "customerId" uuid,
    "leadId" character varying(255),
    "productId" uuid,
    "productBrand" character varying(255) NOT NULL,
    "productModel" character varying(255) NOT NULL,
    "productName" character varying(255) NOT NULL,
    "serialNumber" character varying(255) NOT NULL,
    "serviceContext" public.service_tickets_servicecontext_enum NOT NULL,
    "contractReferenceId" uuid,
    "issueDescription" text NOT NULL,
    "jobType" public.service_tickets_jobtype_enum NOT NULL,
    status public.service_tickets_status_enum DEFAULT 'OPEN'::public.service_tickets_status_enum NOT NULL,
    "assignedTechnicianId" uuid,
    "createdBy" uuid NOT NULL,
    "branchId" uuid NOT NULL,
    "serviceQuotationId" uuid,
    "diagnosisNotes" text,
    "scheduledVisitDate" timestamp without time zone,
    "completedAt" timestamp without time zone,
    "completionNotes" text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    "diagnosisStartedAt" timestamp without time zone,
    "diagnosisCompletedAt" timestamp without time zone,
    "repairStartedAt" timestamp without time zone,
    "repairCompletedAt" timestamp without time zone,
    "diagnosisDuration" integer,
    "repairDuration" integer,
    track character varying(1),
    ticket_type character varying(30) DEFAULT 'COMPLAINT'::character varying,
    estimate_sent_to_finance boolean DEFAULT false,
    repair_started_at timestamp without time zone,
    problem_found text,
    root_cause text,
    work_performed text,
    resolution_details text,
    additional_estimate_count integer DEFAULT 0,
    linked_invoice_id uuid,
    meter_reading_at_service integer,
    report_url character varying(500),
    completion_bill_number character varying(50),
    visit_charge_amount numeric(10,2) DEFAULT 0,
    visit_charge_method character varying(30) DEFAULT NULL::character varying,
    visit_charge_collected boolean DEFAULT false,
    visit_charge_collected_at timestamp without time zone,
    visit_charge_informed boolean DEFAULT false,
    discount_amount numeric(10,2) DEFAULT 0,
    technician_note_to_finance text,
    meter_reading_at_creation integer,
    "diagnosisStartedBy" uuid,
    repair_paused_at timestamp without time zone,
    repair_paused_duration_minutes integer DEFAULT 0,
    transport_charge_amount numeric(10,2) DEFAULT 0,
    service_location character varying(500)
);


--
-- Name: spare_part_inventories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.spare_part_inventories (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    spare_part_id uuid NOT NULL,
    warehouse_id uuid NOT NULL,
    vendor_id uuid,
    quantity integer DEFAULT 0 NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    transfer_reserved_qty integer DEFAULT 0 NOT NULL
);


--
-- Name: spare_parts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.spare_parts (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    item_code character varying NOT NULL,
    part_name character varying NOT NULL,
    brand character varying NOT NULL,
    description text,
    model_id uuid,
    branch_id uuid NOT NULL,
    lot_id uuid,
    base_price numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    purchase_price numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    wholesale_price numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    quantity integer DEFAULT 0 NOT NULL,
    image_url character varying,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    mpn character varying,
    compatible_models text,
    warehouse_id uuid,
    vendor_id uuid,
    yield text,
    tax_rate numeric(5,2) DEFAULT 0,
    max_discount_amount numeric(12,2) DEFAULT 0,
    barcode_id character varying(255),
    reserved_quantity integer DEFAULT 0,
    consumed_quantity integer DEFAULT 0,
    damaged_quantity integer DEFAULT 0,
    max_discountable_amount numeric(10,2) DEFAULT 0,
    part_category character varying(30),
    created_by uuid,
    updated_by uuid,
    deleted_at timestamp with time zone
);


--
-- Name: spare_parts_models; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.spare_parts_models (
    spare_part_id uuid NOT NULL,
    model_id uuid NOT NULL
);


--
-- Name: stock_transfer_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.stock_transfer_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    transfer_id uuid NOT NULL,
    item_type public.stock_transfer_items_item_type_enum NOT NULL,
    spare_part_id uuid,
    model_id uuid,
    product_id uuid,
    requested_qty integer DEFAULT 1 NOT NULL,
    approved_qty integer,
    item_status public.stock_transfer_items_item_status_enum DEFAULT 'PENDING'::public.stock_transfer_items_item_status_enum NOT NULL,
    assigned_product_ids text,
    source_warehouse_id uuid,
    dispatched_qty integer,
    received_qty integer,
    unit_cost numeric(12,2) DEFAULT 0 NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: stock_transfers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.stock_transfers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    transfer_number character varying(50) NOT NULL,
    transfer_type public.stock_transfers_transfer_type_enum NOT NULL,
    status public.stock_transfers_status_enum DEFAULT 'DRAFT'::public.stock_transfers_status_enum NOT NULL,
    source_branch_id uuid NOT NULL,
    source_warehouse_id uuid,
    destination_branch_id uuid NOT NULL,
    destination_warehouse_id uuid NOT NULL,
    requested_by_id uuid NOT NULL,
    approved_by_id uuid,
    reason text NOT NULL,
    notes text,
    rejection_reason text,
    lot_id uuid,
    dispatched_at timestamp without time zone,
    received_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: vendor_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vendor_requests (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    vendor_id uuid NOT NULL,
    requested_by character varying,
    branch_id uuid,
    products text NOT NULL,
    message text,
    total_amount numeric(10,2),
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: vendors; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vendors (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name character varying NOT NULL,
    email character varying NOT NULL,
    phone character varying,
    type public.vendors_type_enum DEFAULT 'Supplier'::public.vendors_type_enum NOT NULL,
    "contactPerson" character varying,
    "totalOrders" integer DEFAULT 0 NOT NULL,
    "purchaseValue" numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    "outstandingAmount" numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    status public.vendors_status_enum DEFAULT 'ACTIVE'::public.vendors_status_enum NOT NULL,
    currency character varying(10) DEFAULT 'QAR'::character varying NOT NULL,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL,
    country_code character varying(2),
    country_name character varying(100),
    bank_accounts jsonb DEFAULT '[]'::jsonb,
    vat_number character varying(50),
    branch_id uuid,
    state_province character varying(100),
    city character varying(100),
    created_by uuid,
    updated_by uuid
);


--
-- Name: warehouses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.warehouses (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    warehouse_name character varying NOT NULL,
    warehouse_code character varying NOT NULL,
    location character varying NOT NULL,
    address character varying NOT NULL,
    capacity character varying NOT NULL,
    status character varying(20) DEFAULT 'ACTIVE'::character varying NOT NULL,
    branch_id uuid,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Data for Name: branches; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.branches (id, name, address, location, manager_id, started_date, status, created_at, updated_at, country_code, currency_code, currency_symbol, currency_name, has_tax, tax_name, tax_percent, tax_registration_number, city, state, postal_code) FROM stdin;
426625c1-62e8-4e14-952b-457452eb0f28	XEROCARE PRIVET LIMITE QATAR	STREET NO:22 DOHA QATER	DOHA QATAR	019c5b7d-20cf-4ef4-971a-91235dd6c10c	2026-08-10	DELETED	2026-08-10 11:30:45.005879	2026-08-13 12:44:48.532136	QA	QAR	QAR	Qatari Riyal	f	\N	\N	\N	DOHA	DOHA	7648839
d7b8ef01-87a7-4e0b-bd92-f0c6c4cd3352	XEROCARE UAE DUBAI BRANCH	DAIRA DUBAI 	DAIRA NAKHEEL STREET	b9708648-f4d7-4aaa-ad34-0949ceb8400c	2026-08-13	ACTIVE	2026-08-13 13:13:14.579537	2026-08-13 14:23:10.235049	AE	AED	AED	United Arab Emirates Dirham	t	VAT	5.00	TRN1452678919277387892	DAIRA	DUBAI	667557
\.


--
-- Data for Name: brands; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.brands (id, name, description, status, branch_id, created_at, updated_at) FROM stdin;
d56dd26e-c448-4b09-b637-a767d16b87ab	HP		ACTIVE	d7b8ef01-87a7-4e0b-bd92-f0c6c4cd3352	2026-08-13 13:30:12.608934	2026-08-13 13:30:12.608934
3634a361-0865-4817-8cfc-c8a334e2f62d	Canon		ACTIVE	d7b8ef01-87a7-4e0b-bd92-f0c6c4cd3352	2026-08-13 13:30:17.401135	2026-08-13 13:30:17.401135
c29f80dc-ac6b-46f0-9cc8-c58cd060856e	Epson		ACTIVE	d7b8ef01-87a7-4e0b-bd92-f0c6c4cd3352	2026-08-13 13:30:23.725022	2026-08-13 13:30:23.725022
\.


--
-- Data for Name: consumable_yield_history; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.consumable_yield_history (id, "productId", "serialNumber", "tonerSku", "installedDate", "installedMeterReading", "replacedDate", "replacedMeterReading", "yieldPages", "ticketId", created_at) FROM stdin;
\.


--
-- Data for Name: contract_meter_readings; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.contract_meter_readings (id, "contractId", "readingDate", "totalReading", "bwReading", "colorReading", "clicksTotal", "clicksBW", "clicksColor", "amountCharged", "chargeBreakdown", notes, "recordedBy", created_at, "billedAt", "billingInvoiceId") FROM stdin;
\.


--
-- Data for Name: employee_managers; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.employee_managers (employee_id, email, status, name, synced_at) FROM stdin;
e864a3e4-fa37-4754-9440-613c6a7cdd2c	muhammedriyas9218@gmail.com	ACTIVE	RIYAS  BRANCH MANAGER	2026-08-13 13:15:12.855981
\.


--
-- Data for Name: exchange_rates; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.exchange_rates (id, from_currency, to_currency, rate, fetched_at) FROM stdin;
\.


--
-- Data for Name: inventory_reservations; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.inventory_reservations (id, "ticketId", "sparePartId", "reservedQuantity", status, "reservedAt", "consumedAt") FROM stdin;
\.


--
-- Data for Name: lot_documents; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.lot_documents (id, lot_id, document_type, document_name, notes, file_url, file_name, mime_type, file_size, uploaded_by, created_at) FROM stdin;
\.


--
-- Data for Name: lot_items; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.lot_items (id, lot_id, item_type, model_id, spare_part_id, quantity, received_quantity, damaged_quantity, returned_quantity, used_quantity, custom_product_name, custom_spare_part_name, unit_price, total_price, created_at, updated_at, mpn, compatible_models, model_ids, selling_price, hs_code) FROM stdin;
c020d65e-2512-4330-9591-eeb978e16271	9c12ebec-aac0-4af6-ba38-9abce0da6929	MODEL	0f70661e-2916-4f23-a581-e9fd2f08154e	\N	5	5	0	0	5	HP SMARTTANK 585	\N	25000.00	125000.00	2026-08-13 13:36:58.971651	2026-08-13 13:47:57.326127	\N	\N	\N	0.00	2343
\.


--
-- Data for Name: lots; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.lots (id, lot_number, vendor_id, purchase_date, total_amount, status, branch_id, warehouse_id, created_by, notes, created_at, updated_at, currency_code, exchange_rate_snapshot, purchase_origin, transfer_origin, transfer_id, transport_mode, carrier_name, dispatch_date, estimated_arrival, actual_arrival, shipment_status, shipment_details) FROM stdin;
9c12ebec-aac0-4af6-ba38-9abce0da6929	LOT-202608-8156	beae8f5c-212b-4a31-8113-387669da24c3	2026-08-13	125000.00	RECEIVED	d7b8ef01-87a7-4e0b-bd92-f0c6c4cd3352	8aeeb54e-559c-40b3-a763-4ab460eda748	e864a3e4-fa37-4754-9440-613c6a7cdd2c	Auto-generated from RFQ RFQ-202608-9718	2026-08-13 13:36:58.971651	2026-08-13 13:37:30.725756	AED	\N	DOMESTIC	f	\N	\N	\N	\N	\N	\N	\N	\N
\.


--
-- Data for Name: machine_service_history; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.machine_service_history (id, "productId", "serialNumber", "totalServiceVisits", "totalPreventativeVisits", "lastServiceDate", "nextScheduledMaintenanceDate", "totalPartsSpend", "totalLabourSpend", "totalLifetimeCost", "updatedAt") FROM stdin;
\.


--
-- Data for Name: model; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.model (id, model_no, model_name, hs_code, brand_id, description, quantity, available, rented, leased, sold, branch_id, max_discountable_amount) FROM stdin;
0f70661e-2916-4f23-a581-e9fd2f08154e	HP ST-585	SMART TANK	\N	d56dd26e-c448-4b09-b637-a767d16b87ab		5	0	3	0	2	d7b8ef01-87a7-4e0b-bd92-f0c6c4cd3352	0.00
\.


--
-- Data for Name: processed_invoice_items; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.processed_invoice_items (invoice_item_id, processed_at) FROM stdin;
\.


--
-- Data for Name: products; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.products (id, model_id, warehouse_id, spare_part_id, vendor_id, lot_id, serial_no, name, brand, "MFD", tax_rate, sale_price, product_status, print_colour, max_discount_amount, wholesale_price, "imageUrl", created_at, purchase_price, description, hs_code, features, warranty, consumables, barcode_id, ownership, warranty_start_date, warranty_end_date, warranty_max_pages, meter_reading, customer_id, branch_id, contract_id, transfer_status, updated_at, created_by, updated_by, deleted_at) FROM stdin;
6badd3cb-68a4-445d-9fdd-b79b927384a0	0f70661e-2916-4f23-a581-e9fd2f08154e	8aeeb54e-559c-40b3-a763-4ab460eda748	\N	beae8f5c-212b-4a31-8113-387669da24c3	9c12ebec-aac0-4af6-ba38-9abce0da6929	457876544	HP SMARTTANK 585	HP	2026-08-13	5.00	35000.00	SOLD	BOTH	1000.00	30000.00	\N	2026-08-13 13:47:57.332851	25000.00		2343	[]	\N	[]	XC-P-457876544	SALE	\N	\N	200000	0	42318e59-0a36-46e3-aa08-50330ba4a78d	\N	\N	NONE	2026-08-13 14:43:45.353513	e864a3e4-fa37-4754-9440-613c6a7cdd2c	\N	\N
83831148-303f-4c71-8bed-11a340013d5e	0f70661e-2916-4f23-a581-e9fd2f08154e	8aeeb54e-559c-40b3-a763-4ab460eda748	\N	beae8f5c-212b-4a31-8113-387669da24c3	9c12ebec-aac0-4af6-ba38-9abce0da6929	4678665446	HP SMARTTANK 585	HP	2026-08-13	5.00	35000.00	RENTED	BOTH	1000.00	30000.00	\N	2026-08-13 13:47:57.307271	25000.00		2343	[]	\N	[]	XC-P-4678665446	RENT	\N	\N	200000	0	42318e59-0a36-46e3-aa08-50330ba4a78d	\N	\N	NONE	2026-08-13 14:55:46.433255	e864a3e4-fa37-4754-9440-613c6a7cdd2c	\N	\N
aaa164a8-7bd6-4b26-9e23-b58c112fc44a	0f70661e-2916-4f23-a581-e9fd2f08154e	8aeeb54e-559c-40b3-a763-4ab460eda748	\N	beae8f5c-212b-4a31-8113-387669da24c3	9c12ebec-aac0-4af6-ba38-9abce0da6929	54435534	HP SMARTTANK 585	HP	2026-08-13	5.00	35000.00	SOLD	BOTH	1000.00	30000.00	\N	2026-08-13 13:47:57.281231	25000.00		2343	[]	\N	[]	XC-P-54435534	SALE	\N	\N	200000	0	42318e59-0a36-46e3-aa08-50330ba4a78d	\N	\N	NONE	2026-08-13 17:33:01.077518	e864a3e4-fa37-4754-9440-613c6a7cdd2c	\N	\N
ac670a58-b8ed-47b3-8b47-c6c89c563138	0f70661e-2916-4f23-a581-e9fd2f08154e	8aeeb54e-559c-40b3-a763-4ab460eda748	\N	beae8f5c-212b-4a31-8113-387669da24c3	9c12ebec-aac0-4af6-ba38-9abce0da6929	456643445555	HP SMARTTANK 585	HP	2026-08-13	5.00	35000.00	RENTED	BOTH	1000.00	30000.00	\N	2026-08-13 13:47:57.253263	25000.00		2343	[]	\N	[]	XC-P-456643445555	RENT	\N	\N	200000	0	42318e59-0a36-46e3-aa08-50330ba4a78d	\N	\N	NONE	2026-08-13 18:32:24.498614	e864a3e4-fa37-4754-9440-613c6a7cdd2c	\N	\N
3c6dae6e-49d6-424e-a175-37b2c7be848d	0f70661e-2916-4f23-a581-e9fd2f08154e	8aeeb54e-559c-40b3-a763-4ab460eda748	\N	beae8f5c-212b-4a31-8113-387669da24c3	9c12ebec-aac0-4af6-ba38-9abce0da6929	674893993494004	HP SMARTTANK 585	HP	2026-08-13	5.00	35000.00	RENTED	BOTH	1000.00	30000.00	\N	2026-08-13 13:47:57.203416	25000.00		2343	[]	\N	[]	XC-P-674893993494004	RENT	\N	\N	200000	0	42318e59-0a36-46e3-aa08-50330ba4a78d	\N	\N	NONE	2026-08-13 19:42:31.25523	e864a3e4-fa37-4754-9440-613c6a7cdd2c	\N	\N
\.


--
-- Data for Name: purchase_costs; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.purchase_costs (id, purchase_id, branch_id, amount, cost_type, cost_date, description, created_by, created_at, attachment_url) FROM stdin;
\.


--
-- Data for Name: purchase_payments; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.purchase_payments (id, purchase_id, branch_id, amount, payment_date, description, payment_method, reference_number, created_by, created_at, attachment_url) FROM stdin;
3d7b67e8-9809-444d-9afa-f861e192037a	00574140-45f9-4223-b603-cb6e89ca35d7	d7b8ef01-87a7-4e0b-bd92-f0c6c4cd3352	10000.00	2026-08-13 05:30:00	PAYMENT FROM 	Cash	VENDOR PAYMENT	e864a3e4-fa37-4754-9440-613c6a7cdd2c	2026-08-13 13:52:09.64553	https://pub-8bbb88e1d79042349d0bc47ad1f3eb23.r2.dev/expense-proofs/00574140-45f9-4223-b603-cb6e89ca35d7/1786609329262-1.jpg
0967dc13-cea8-42c7-b632-ca0c6f010302	00574140-45f9-4223-b603-cb6e89ca35d7	d7b8ef01-87a7-4e0b-bd92-f0c6c4cd3352	115000.00	2026-08-13 05:30:00	Vendor payment — vendor (N/A)	Cash	VENDOR PAYMENT CLOSED	e864a3e4-fa37-4754-9440-613c6a7cdd2c	2026-08-13 15:41:42.148041	https://pub-8bbb88e1d79042349d0bc47ad1f3eb23.r2.dev/expense-proofs/00574140-45f9-4223-b603-cb6e89ca35d7/1786615901628-3.jpg
\.


--
-- Data for Name: purchases; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.purchases (id, lot_id, vendor_id, branch_id, purchase_amount, documentation_fee, labour_cost, handling_fee, transportation_cost, shipping_cost, groundfield_cost, total_amount, created_by, created_at, updated_at, purchase_origin, vendor_vat_number, vendor_country, currency_code, exchange_rate, purchase_category, taxable_amount, tax_percent, tax_name, input_vat_amount, reverse_charge_vat_amount, import_invoice_no, customs_entry_no, customs_duty, goods_or_service, vat_claimable, tax_status, vendor_state_province, vendor_city) FROM stdin;
00574140-45f9-4223-b603-cb6e89ca35d7	9c12ebec-aac0-4af6-ba38-9abce0da6929	beae8f5c-212b-4a31-8113-387669da24c3	d7b8ef01-87a7-4e0b-bd92-f0c6c4cd3352	125000.00	0.00	0.00	0.00	0.00	0.00	0.00	125000.00	e864a3e4-fa37-4754-9440-613c6a7cdd2c	2026-08-13 13:36:58.971651	2026-08-13 13:36:58.971651	DOMESTIC	563772389892773	AE	AED	\N	\N	125000.00	5.00	VAT	6250.00	\N	\N	\N	\N	\N	t	PENDING	Dubai	Dubai
\.


--
-- Data for Name: rfq_items; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.rfq_items (id, rfq_id, branch_id, item_type, model_id, product_id, custom_product_name, brand_id, spare_part_id, custom_brand_name, custom_spare_part_name, hs_code, description, quantity, expected_delivery_date, created_by, created_at, mpn, compatible_models, model_ids) FROM stdin;
c8c2c0f9-dc81-4f40-9e2d-39721b657b7c	9b878a06-ff0c-47ce-a697-0c8a17fd39ce	d7b8ef01-87a7-4e0b-bd92-f0c6c4cd3352	PRODUCT	0f70661e-2916-4f23-a581-e9fd2f08154e	\N	HP SMARTTANK 585	\N	\N	\N	\N	2343	\N	5	\N	e864a3e4-fa37-4754-9440-613c6a7cdd2c	2026-08-13 13:32:35.292519	\N	\N	\N
\.


--
-- Data for Name: rfq_vendor_items; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.rfq_vendor_items (id, rfq_vendor_id, rfq_item_id, unit_price, total_price, stock_status, available_quantity, estimated_shipment_date, vendor_note, remarks) FROM stdin;
df6c4b3c-8b89-41ad-a14d-9514682a15ad	1c29a796-da58-41b0-b497-283d43ce099f	c8c2c0f9-dc81-4f40-9e2d-39721b657b7c	25000.00	125000.00	IN_STOCK	5	2026-08-14	\N	\N
\.


--
-- Data for Name: rfq_vendors; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.rfq_vendors (id, rfq_id, vendor_id, status, total_quoted_amount, quoted_at, created_at, vendor_currency_code, vendor_amount, branch_currency_code, branch_converted_amount, exchange_rate_snapshot, exchange_rate_fetched_at) FROM stdin;
1c29a796-da58-41b0-b497-283d43ce099f	9b878a06-ff0c-47ce-a697-0c8a17fd39ce	beae8f5c-212b-4a31-8113-387669da24c3	AWARDED	125000.00	2026-08-13 13:36:26.966	2026-08-13 13:32:35.292519	AED	125000.00	AED	125000.00	1.000000	2026-08-13 13:36:49.139
\.


--
-- Data for Name: rfqs; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.rfqs (id, rfq_number, branch_id, created_by, status, awarded_vendor_id, created_at, updated_at, purchase_origin) FROM stdin;
9b878a06-ff0c-47ce-a697-0c8a17fd39ce	RFQ-202608-9718	d7b8ef01-87a7-4e0b-bd92-f0c6c4cd3352	e864a3e4-fa37-4754-9440-613c6a7cdd2c	CLOSED	beae8f5c-212b-4a31-8113-387669da24c3	2026-08-13 13:32:35.292519	2026-08-13 13:36:58.971651	DOMESTIC
\.


--
-- Data for Name: service_contracts; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.service_contracts (id, "productId", "customerId", "contractType", "startDate", "endDate", "contractValue", "coverageRules", status, created_at, updated_at, "monthlyCharge", "copyLimit", "overagePerCopyRate", "startMeterReading", "fsmaBillingMode", "ratePerClickBW", "ratePerClickColor", "ratePerClickCombined", "startMeterBW", "startMeterColor", notes, "invoiceId", "branchId", "nextBillingDate") FROM stdin;
\.


--
-- Data for Name: service_diagnoses; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.service_diagnoses (id, "ticketId", "problemFound", "rootCause", "technicianNotes", "meterReading", created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: service_estimate_items; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.service_estimate_items (id, "estimateId", "revisionId", "itemSource", "sparePartId", sku, "partName", quantity, "unitPrice", "totalPrice", "isFree", "isApproved", created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: service_estimate_revisions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.service_estimate_revisions (id, invoice_id, "ticketId", revision_number, revision_type, items_snapshot, total_amount, discount_applied, visit_charge_amount, technician_note_to_finance, submitted_by, finance_decision, finance_decision_by, finance_decision_note, finance_decision_at, valid_until, submitted_at, "labourCost", "totalCost", created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: service_estimates; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.service_estimates (id, "ticketId", "labourCost", "totalCost", status, version, created_at, updated_at, currency_code, exchange_rate_snapshot, parts_cost, visit_charge_amount, transport_charge_amount, discount_amount) FROM stdin;
\.


--
-- Data for Name: service_part_usage_logs; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.service_part_usage_logs (id, "productId", "ticketId", "sparePartId", "partName", sku, "quantityUsed", "unitCost", "totalCost", "isFree", "isConsumable", "meterReadingAtReplacement", "previousMeterReading", "calculatedYield", "linkedInvoiceId", "replacedAt") FROM stdin;
\.


--
-- Data for Name: service_reports; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.service_reports (id, "ticketId", "workPerformed", "resolutionDetails", "meterReading", "startTime", "endTime", "totalTimeSpent", "customerRemarks", "technicianRemarks", "customerSignature", "technicianSignature", created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: service_ticket_activities; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.service_ticket_activities (id, "ticketId", "activityType", description, "performedBy", created_at) FROM stdin;
\.


--
-- Data for Name: service_ticket_items; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.service_ticket_items (id, "ticketId", "itemSource", "sparePartId", sku, "barcodeId", "customPartName", "customPartBrand", "customPartDescription", "partName", quantity, "unitPrice", "totalPrice", "isFree", created_at, updated_at, "partBrand", mpn) FROM stdin;
\.


--
-- Data for Name: service_tickets; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.service_tickets (id, "ticketNumber", "customerId", "leadId", "productId", "productBrand", "productModel", "productName", "serialNumber", "serviceContext", "contractReferenceId", "issueDescription", "jobType", status, "assignedTechnicianId", "createdBy", "branchId", "serviceQuotationId", "diagnosisNotes", "scheduledVisitDate", "completedAt", "completionNotes", created_at, updated_at, "diagnosisStartedAt", "diagnosisCompletedAt", "repairStartedAt", "repairCompletedAt", "diagnosisDuration", "repairDuration", track, ticket_type, estimate_sent_to_finance, repair_started_at, problem_found, root_cause, work_performed, resolution_details, additional_estimate_count, linked_invoice_id, meter_reading_at_service, report_url, completion_bill_number, visit_charge_amount, visit_charge_method, visit_charge_collected, visit_charge_collected_at, visit_charge_informed, discount_amount, technician_note_to_finance, meter_reading_at_creation, "diagnosisStartedBy", repair_paused_at, repair_paused_duration_minutes, transport_charge_amount, service_location) FROM stdin;
\.


--
-- Data for Name: spare_part_inventories; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.spare_part_inventories (id, spare_part_id, warehouse_id, vendor_id, quantity, created_at, updated_at, transfer_reserved_qty) FROM stdin;
\.


--
-- Data for Name: spare_parts; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.spare_parts (id, item_code, part_name, brand, description, model_id, branch_id, lot_id, base_price, purchase_price, wholesale_price, quantity, image_url, created_at, updated_at, mpn, compatible_models, warehouse_id, vendor_id, yield, tax_rate, max_discount_amount, barcode_id, reserved_quantity, consumed_quantity, damaged_quantity, max_discountable_amount, part_category, created_by, updated_by, deleted_at) FROM stdin;
\.


--
-- Data for Name: spare_parts_models; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.spare_parts_models (spare_part_id, model_id) FROM stdin;
\.


--
-- Data for Name: stock_transfer_items; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.stock_transfer_items (id, transfer_id, item_type, spare_part_id, model_id, product_id, requested_qty, approved_qty, item_status, assigned_product_ids, source_warehouse_id, dispatched_qty, received_qty, unit_cost, created_at) FROM stdin;
\.


--
-- Data for Name: stock_transfers; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.stock_transfers (id, transfer_number, transfer_type, status, source_branch_id, source_warehouse_id, destination_branch_id, destination_warehouse_id, requested_by_id, approved_by_id, reason, notes, rejection_reason, lot_id, dispatched_at, received_at, created_at) FROM stdin;
\.


--
-- Data for Name: vendor_requests; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.vendor_requests (id, vendor_id, requested_by, branch_id, products, message, total_amount, created_at) FROM stdin;
\.


--
-- Data for Name: vendors; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.vendors (id, name, email, phone, type, "contactPerson", "totalOrders", "purchaseValue", "outstandingAmount", status, currency, "createdAt", "updatedAt", country_code, country_name, bank_accounts, vat_number, branch_id, state_province, city, created_by, updated_by) FROM stdin;
beae8f5c-212b-4a31-8113-387669da24c3	NADHIL XEROX LIMITED	riyasdevxtra@gmail.com	+971 554737733	Supplier	NADHIL	0	0.00	0.00	ACTIVE	AED	2026-08-13 13:28:12.010772	2026-08-13 13:28:12.010772	AE	United Arab Emirates (the)	[{"iban": "AE070331234567890123456", "branch": "DAIRA BRANCH ", "address": " DAIRA NAKHEEL STREET", "bankName": "First Abu Dhabi Bank (FAB)", "currency": "AED", "isPrimary": true, "swiftCode": "QNBASYYUE", "accountType": "Current Account", "bankCountry": "AE", "accountNumber": "674889387457783", "routingNumber": "", "accountHolderName": "NADHIL KN"}]	563772389892773	d7b8ef01-87a7-4e0b-bd92-f0c6c4cd3352	Dubai	Dubai	e864a3e4-fa37-4754-9440-613c6a7cdd2c	\N
\.


--
-- Data for Name: warehouses; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.warehouses (id, warehouse_name, warehouse_code, location, address, capacity, status, branch_id, created_at, updated_at) FROM stdin;
8aeeb54e-559c-40b3-a763-4ab460eda748	XEOCARE LIMITED DUBAI WAREHOUSE	WH-001	DAIRA DUBAI 	DENIBA EXCHANGE NEAR MADINA SUPERNARKET	56000	ACTIVE	d7b8ef01-87a7-4e0b-bd92-f0c6c4cd3352	2026-08-13 13:29:19.292387	2026-08-13 13:29:19.292387
\.


--
-- Name: products PK_0806c755e0aca124e67c0cf6d7d; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT "PK_0806c755e0aca124e67c0cf6d7d" PRIMARY KEY (id);


--
-- Name: purchases PK_1d55032f37a34c6eceacbbca6b8; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchases
    ADD CONSTRAINT "PK_1d55032f37a34c6eceacbbca6b8" PRIMARY KEY (id);


--
-- Name: rfq_items PK_2694c253e3966a3a8d5e9dc3d60; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rfq_items
    ADD CONSTRAINT "PK_2694c253e3966a3a8d5e9dc3d60" PRIMARY KEY (id);


--
-- Name: lots PK_2bb990a4015865cb1daa1d22fd9; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lots
    ADD CONSTRAINT "PK_2bb990a4015865cb1daa1d22fd9" PRIMARY KEY (id);


--
-- Name: spare_parts_models PK_47b3647e703f7ce2af2acaeb44a; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.spare_parts_models
    ADD CONSTRAINT "PK_47b3647e703f7ce2af2acaeb44a" PRIMARY KEY (spare_part_id, model_id);


--
-- Name: warehouses PK_56ae21ee2432b2270b48867e4be; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.warehouses
    ADD CONSTRAINT "PK_56ae21ee2432b2270b48867e4be" PRIMARY KEY (id);


--
-- Name: spare_parts PK_6fe9b0bb96e021d248731580f1b; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.spare_parts
    ADD CONSTRAINT "PK_6fe9b0bb96e021d248731580f1b" PRIMARY KEY (id);


--
-- Name: branches PK_7f37d3b42defea97f1df0d19535; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.branches
    ADD CONSTRAINT "PK_7f37d3b42defea97f1df0d19535" PRIMARY KEY (id);


--
-- Name: spare_part_inventories PK_879e85e7fed7afb946d8ecd456f; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.spare_part_inventories
    ADD CONSTRAINT "PK_879e85e7fed7afb946d8ecd456f" PRIMARY KEY (id);


--
-- Name: purchase_payments PK_9765d702e073d3cdf9b1600792d; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_payments
    ADD CONSTRAINT "PK_9765d702e073d3cdf9b1600792d" PRIMARY KEY (id);


--
-- Name: vendors PK_9c956c9797edfae5c6ddacc4e6e; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendors
    ADD CONSTRAINT "PK_9c956c9797edfae5c6ddacc4e6e" PRIMARY KEY (id);


--
-- Name: vendor_requests PK_9eabd13d4d98baadad81c73d7c8; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendor_requests
    ADD CONSTRAINT "PK_9eabd13d4d98baadad81c73d7c8" PRIMARY KEY (id);


--
-- Name: brands PK_b0c437120b624da1034a81fc561; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.brands
    ADD CONSTRAINT "PK_b0c437120b624da1034a81fc561" PRIMARY KEY (id);


--
-- Name: rfq_vendor_items PK_b9eab4b7df0524ceaf746222e00; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rfq_vendor_items
    ADD CONSTRAINT "PK_b9eab4b7df0524ceaf746222e00" PRIMARY KEY (id);


--
-- Name: rfqs PK_c8b7481584218bdee534e5fc436; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rfqs
    ADD CONSTRAINT "PK_c8b7481584218bdee534e5fc436" PRIMARY KEY (id);


--
-- Name: employee_managers PK_c987dcb5277b78f2fc219948c1c; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_managers
    ADD CONSTRAINT "PK_c987dcb5277b78f2fc219948c1c" PRIMARY KEY (employee_id);


--
-- Name: model PK_d6df271bba301d5cc79462912a4; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.model
    ADD CONSTRAINT "PK_d6df271bba301d5cc79462912a4" PRIMARY KEY (id);


--
-- Name: rfq_vendors PK_ead00c4131c7ac9eaadf6e14f9e; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rfq_vendors
    ADD CONSTRAINT "PK_ead00c4131c7ac9eaadf6e14f9e" PRIMARY KEY (id);


--
-- Name: lot_items PK_fbec0c48d40f6c6cf8267c814cb; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lot_items
    ADD CONSTRAINT "PK_fbec0c48d40f6c6cf8267c814cb" PRIMARY KEY (id);


--
-- Name: purchase_costs PK_ffc0ba1f58c046e6d50f73511a4; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_costs
    ADD CONSTRAINT "PK_ffc0ba1f58c046e6d50f73511a4" PRIMARY KEY (id);


--
-- Name: warehouses UQ_182bbb8c4c53a982923d40f2bdc; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.warehouses
    ADD CONSTRAINT "UQ_182bbb8c4c53a982923d40f2bdc" UNIQUE (warehouse_code);


--
-- Name: purchases UQ_2b7ac4cff15f6652dd49546efa9; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchases
    ADD CONSTRAINT "UQ_2b7ac4cff15f6652dd49546efa9" UNIQUE (lot_id);


--
-- Name: lots UQ_44d1ab9ec40107245961ef52453; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lots
    ADD CONSTRAINT "UQ_44d1ab9ec40107245961ef52453" UNIQUE (lot_number);


--
-- Name: rfqs UQ_b19e346f96ffd54c4d436a95869; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rfqs
    ADD CONSTRAINT "UQ_b19e346f96ffd54c4d436a95869" UNIQUE (rfq_number);


--
-- Name: consumable_yield_history consumable_yield_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.consumable_yield_history
    ADD CONSTRAINT consumable_yield_history_pkey PRIMARY KEY (id);


--
-- Name: contract_meter_readings contract_meter_readings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contract_meter_readings
    ADD CONSTRAINT contract_meter_readings_pkey PRIMARY KEY (id);


--
-- Name: exchange_rates exchange_rates_from_currency_to_currency_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exchange_rates
    ADD CONSTRAINT exchange_rates_from_currency_to_currency_key UNIQUE (from_currency, to_currency);


--
-- Name: exchange_rates exchange_rates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exchange_rates
    ADD CONSTRAINT exchange_rates_pkey PRIMARY KEY (id);


--
-- Name: inventory_reservations inventory_reservations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_reservations
    ADD CONSTRAINT inventory_reservations_pkey PRIMARY KEY (id);


--
-- Name: lot_documents lot_documents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lot_documents
    ADD CONSTRAINT lot_documents_pkey PRIMARY KEY (id);


--
-- Name: machine_service_history machine_service_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.machine_service_history
    ADD CONSTRAINT machine_service_history_pkey PRIMARY KEY (id);


--
-- Name: machine_service_history machine_service_history_productId_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.machine_service_history
    ADD CONSTRAINT "machine_service_history_productId_key" UNIQUE ("productId");


--
-- Name: processed_invoice_items processed_invoice_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.processed_invoice_items
    ADD CONSTRAINT processed_invoice_items_pkey PRIMARY KEY (invoice_item_id);


--
-- Name: service_contracts service_contracts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.service_contracts
    ADD CONSTRAINT service_contracts_pkey PRIMARY KEY (id);


--
-- Name: service_diagnoses service_diagnoses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.service_diagnoses
    ADD CONSTRAINT service_diagnoses_pkey PRIMARY KEY (id);


--
-- Name: service_estimate_items service_estimate_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.service_estimate_items
    ADD CONSTRAINT service_estimate_items_pkey PRIMARY KEY (id);


--
-- Name: service_estimate_revisions service_estimate_revisions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.service_estimate_revisions
    ADD CONSTRAINT service_estimate_revisions_pkey PRIMARY KEY (id);


--
-- Name: service_estimates service_estimates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.service_estimates
    ADD CONSTRAINT service_estimates_pkey PRIMARY KEY (id);


--
-- Name: service_part_usage_logs service_part_usage_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.service_part_usage_logs
    ADD CONSTRAINT service_part_usage_logs_pkey PRIMARY KEY (id);


--
-- Name: service_reports service_reports_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.service_reports
    ADD CONSTRAINT service_reports_pkey PRIMARY KEY (id);


--
-- Name: service_ticket_activities service_ticket_activities_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.service_ticket_activities
    ADD CONSTRAINT service_ticket_activities_pkey PRIMARY KEY (id);


--
-- Name: service_ticket_items service_ticket_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.service_ticket_items
    ADD CONSTRAINT service_ticket_items_pkey PRIMARY KEY (id);


--
-- Name: service_tickets service_tickets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.service_tickets
    ADD CONSTRAINT service_tickets_pkey PRIMARY KEY (id);


--
-- Name: service_tickets service_tickets_ticketNumber_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.service_tickets
    ADD CONSTRAINT "service_tickets_ticketNumber_key" UNIQUE ("ticketNumber");


--
-- Name: stock_transfer_items stock_transfer_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_transfer_items
    ADD CONSTRAINT stock_transfer_items_pkey PRIMARY KEY (id);


--
-- Name: stock_transfers stock_transfers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_transfers
    ADD CONSTRAINT stock_transfers_pkey PRIMARY KEY (id);


--
-- Name: stock_transfers stock_transfers_transfer_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_transfers
    ADD CONSTRAINT stock_transfers_transfer_number_key UNIQUE (transfer_number);


--
-- Name: IDX_0ce77ddd703c1c07bc8fdcf414; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_0ce77ddd703c1c07bc8fdcf414" ON public.spare_parts USING btree (item_code);


--
-- Name: IDX_0e859a83f1dd6b774c20c02885; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_0e859a83f1dd6b774c20c02885" ON public.products USING btree (vendor_id);


--
-- Name: IDX_20c984fa6b83cfba4b4a1e5211; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_20c984fa6b83cfba4b4a1e5211" ON public.products USING btree (product_status);


--
-- Name: IDX_245465fef3c9b3bdfbece9c556; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_245465fef3c9b3bdfbece9c556" ON public.spare_parts USING btree (branch_id);


--
-- Name: IDX_32da74acefb3d0dd46c16180ba; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_32da74acefb3d0dd46c16180ba" ON public.spare_parts_models USING btree (spare_part_id);


--
-- Name: IDX_3854764df939001979ad9a91e4; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_3854764df939001979ad9a91e4" ON public.spare_parts_models USING btree (model_id);


--
-- Name: IDX_38ec60656c643d659309227f6d; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "IDX_38ec60656c643d659309227f6d" ON public.model USING btree (model_no, branch_id);


--
-- Name: IDX_44d1ab9ec40107245961ef5245; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_44d1ab9ec40107245961ef5245" ON public.lots USING btree (lot_number);


--
-- Name: IDX_46ff1216d04be03e1f2b005c50; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_46ff1216d04be03e1f2b005c50" ON public.spare_parts USING btree (mpn);


--
-- Name: IDX_673223dde0a5416c6d8daa6bfb; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "IDX_673223dde0a5416c6d8daa6bfb" ON public.rfq_vendors USING btree (rfq_id, vendor_id);


--
-- Name: IDX_6fe9b0bb96e021d248731580f1; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_6fe9b0bb96e021d248731580f1" ON public.spare_parts USING btree (id);


--
-- Name: IDX_73b2794977984b8694203f4f40; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "IDX_73b2794977984b8694203f4f40" ON public.rfq_items USING btree (rfq_id, model_id) WHERE (model_id IS NOT NULL);


--
-- Name: IDX_76ac0a401091bd373753579c97; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_76ac0a401091bd373753579c97" ON public.products USING btree (warehouse_id);


--
-- Name: IDX_76b02d9aaedb7ddacf6dcf2c94; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "IDX_76b02d9aaedb7ddacf6dcf2c94" ON public.spare_part_inventories USING btree (spare_part_id, warehouse_id);


--
-- Name: IDX_9708b19a4817823e782ac398be; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "IDX_9708b19a4817823e782ac398be" ON public.brands USING btree (name, branch_id);


--
-- Name: IDX_9d131b8b8db5708fb71500c57d; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_9d131b8b8db5708fb71500c57d" ON public.products USING btree (model_id);


--
-- Name: IDX_RFQ_VENDOR_AWARDED; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "IDX_RFQ_VENDOR_AWARDED" ON public.rfq_vendors USING btree (rfq_id) WHERE (status = 'AWARDED'::public.rfq_vendors_status_enum);


--
-- Name: IDX_d1a87bf9de7503bb1b6fc0cb85; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_d1a87bf9de7503bb1b6fc0cb85" ON public.warehouses USING btree (branch_id);


--
-- Name: IDX_fe403886915578889ba661ce00; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "IDX_fe403886915578889ba661ce00" ON public.rfq_vendor_items USING btree (rfq_vendor_id, rfq_item_id);


--
-- Name: idx_contract_meter_readings_contract; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_contract_meter_readings_contract ON public.contract_meter_readings USING btree ("contractId");


--
-- Name: idx_lot_documents_lot_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lot_documents_lot_id ON public.lot_documents USING btree (lot_id);


--
-- Name: idx_lots_purchase_origin; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lots_purchase_origin ON public.lots USING btree (purchase_origin);


--
-- Name: idx_purchases_purchase_origin; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_purchases_purchase_origin ON public.purchases USING btree (purchase_origin);


--
-- Name: idx_vendors_branch_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vendors_branch_id ON public.vendors USING btree (branch_id);


--
-- Name: uq_products_barcode_id_active; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_products_barcode_id_active ON public.products USING btree (barcode_id) WHERE ((deleted_at IS NULL) AND (barcode_id IS NOT NULL));


--
-- Name: uq_products_serial_no_active; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_products_serial_no_active ON public.products USING btree (serial_no) WHERE (deleted_at IS NULL);


--
-- Name: uq_spare_parts_barcode_id_active; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_spare_parts_barcode_id_active ON public.spare_parts USING btree (barcode_id) WHERE ((deleted_at IS NULL) AND (barcode_id IS NOT NULL));


--
-- Name: uq_spare_parts_item_code_active; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_spare_parts_item_code_active ON public.spare_parts USING btree (item_code) WHERE (deleted_at IS NULL);


--
-- Name: uq_vendors_branch_email; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_vendors_branch_email ON public.vendors USING btree (COALESCE((branch_id)::text, 'GLOBAL'::text), email);


--
-- Name: uq_vendors_branch_name; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_vendors_branch_name ON public.vendors USING btree (COALESCE((branch_id)::text, 'GLOBAL'::text), name);


--
-- Name: rfq_vendors FK_0440b98d0d0baaf0c6fc686bbc4; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rfq_vendors
    ADD CONSTRAINT "FK_0440b98d0d0baaf0c6fc686bbc4" FOREIGN KEY (vendor_id) REFERENCES public.vendors(id);


--
-- Name: spare_part_inventories FK_05265de508cc68ebc86184efa31; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.spare_part_inventories
    ADD CONSTRAINT "FK_05265de508cc68ebc86184efa31" FOREIGN KEY (spare_part_id) REFERENCES public.spare_parts(id) ON DELETE CASCADE;


--
-- Name: spare_parts FK_0b43f81b1629b7af70d9c028c19; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.spare_parts
    ADD CONSTRAINT "FK_0b43f81b1629b7af70d9c028c19" FOREIGN KEY (model_id) REFERENCES public.model(id);


--
-- Name: products FK_0e859a83f1dd6b774c20c02885d; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT "FK_0e859a83f1dd6b774c20c02885d" FOREIGN KEY (vendor_id) REFERENCES public.vendors(id);


--
-- Name: vendor_requests FK_14a3f07ce47b9e4f0ecc23ac552; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendor_requests
    ADD CONSTRAINT "FK_14a3f07ce47b9e4f0ecc23ac552" FOREIGN KEY (vendor_id) REFERENCES public.vendors(id);


--
-- Name: rfqs FK_176d2ae5bb7604adc15783c0873; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rfqs
    ADD CONSTRAINT "FK_176d2ae5bb7604adc15783c0873" FOREIGN KEY (awarded_vendor_id) REFERENCES public.vendors(id);


--
-- Name: rfq_vendor_items FK_1af1ef09607d3c899d0d573bb62; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rfq_vendor_items
    ADD CONSTRAINT "FK_1af1ef09607d3c899d0d573bb62" FOREIGN KEY (rfq_vendor_id) REFERENCES public.rfq_vendors(id) ON DELETE CASCADE;


--
-- Name: model FK_1c9fa70a2a9da326c507e3fead5; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.model
    ADD CONSTRAINT "FK_1c9fa70a2a9da326c507e3fead5" FOREIGN KEY (brand_id) REFERENCES public.brands(id);


--
-- Name: rfqs FK_1da75d5bf2f6a33be45ecc585aa; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rfqs
    ADD CONSTRAINT "FK_1da75d5bf2f6a33be45ecc585aa" FOREIGN KEY (branch_id) REFERENCES public.branches(id);


--
-- Name: rfq_vendors FK_215c12c2e823761738e5070c9b9; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rfq_vendors
    ADD CONSTRAINT "FK_215c12c2e823761738e5070c9b9" FOREIGN KEY (rfq_id) REFERENCES public.rfqs(id) ON DELETE CASCADE;


--
-- Name: purchase_costs FK_2280227468e55ef283692723183; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_costs
    ADD CONSTRAINT "FK_2280227468e55ef283692723183" FOREIGN KEY (purchase_id) REFERENCES public.purchases(id) ON DELETE CASCADE;


--
-- Name: spare_parts FK_245465fef3c9b3bdfbece9c556c; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.spare_parts
    ADD CONSTRAINT "FK_245465fef3c9b3bdfbece9c556c" FOREIGN KEY (branch_id) REFERENCES public.branches(id);


--
-- Name: lot_items FK_286fe50df743136cf6efa2719fd; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lot_items
    ADD CONSTRAINT "FK_286fe50df743136cf6efa2719fd" FOREIGN KEY (spare_part_id) REFERENCES public.spare_parts(id) ON DELETE SET NULL;


--
-- Name: lots FK_293d693e389a79d3c1c511eddc9; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lots
    ADD CONSTRAINT "FK_293d693e389a79d3c1c511eddc9" FOREIGN KEY (warehouse_id) REFERENCES public.warehouses(id);


--
-- Name: purchases FK_2b7ac4cff15f6652dd49546efa9; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchases
    ADD CONSTRAINT "FK_2b7ac4cff15f6652dd49546efa9" FOREIGN KEY (lot_id) REFERENCES public.lots(id) ON DELETE CASCADE;


--
-- Name: rfqs FK_30005d74217b9b0449de19362bc; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rfqs
    ADD CONSTRAINT "FK_30005d74217b9b0449de19362bc" FOREIGN KEY (created_by) REFERENCES public.employee_managers(employee_id);


--
-- Name: spare_parts_models FK_32da74acefb3d0dd46c16180ba5; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.spare_parts_models
    ADD CONSTRAINT "FK_32da74acefb3d0dd46c16180ba5" FOREIGN KEY (spare_part_id) REFERENCES public.spare_parts(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: lot_items FK_34d15a7aeed86fc71f927d7f6f7; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lot_items
    ADD CONSTRAINT "FK_34d15a7aeed86fc71f927d7f6f7" FOREIGN KEY (lot_id) REFERENCES public.lots(id) ON DELETE CASCADE;


--
-- Name: spare_parts FK_34d52d8b72e5daf093faa6b6e8f; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.spare_parts
    ADD CONSTRAINT "FK_34d52d8b72e5daf093faa6b6e8f" FOREIGN KEY (lot_id) REFERENCES public.lots(id);


--
-- Name: spare_parts_models FK_3854764df939001979ad9a91e4a; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.spare_parts_models
    ADD CONSTRAINT "FK_3854764df939001979ad9a91e4a" FOREIGN KEY (model_id) REFERENCES public.model(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: spare_parts FK_438e634aefb4f8a9a85621251bb; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.spare_parts
    ADD CONSTRAINT "FK_438e634aefb4f8a9a85621251bb" FOREIGN KEY (warehouse_id) REFERENCES public.warehouses(id);


--
-- Name: purchases FK_6b06d2cb149e7461d298eda9002; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchases
    ADD CONSTRAINT "FK_6b06d2cb149e7461d298eda9002" FOREIGN KEY (branch_id) REFERENCES public.branches(id);


--
-- Name: vendor_requests FK_73c1105f82fe43f7652ea2ea23e; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendor_requests
    ADD CONSTRAINT "FK_73c1105f82fe43f7652ea2ea23e" FOREIGN KEY (requested_by) REFERENCES public.employee_managers(employee_id);


--
-- Name: products FK_76ac0a401091bd373753579c977; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT "FK_76ac0a401091bd373753579c977" FOREIGN KEY (warehouse_id) REFERENCES public.warehouses(id);


--
-- Name: lot_items FK_7c3cc264bf205e444a87c2bb03d; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lot_items
    ADD CONSTRAINT "FK_7c3cc264bf205e444a87c2bb03d" FOREIGN KEY (model_id) REFERENCES public.model(id);


--
-- Name: products FK_9d131b8b8db5708fb71500c57d2; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT "FK_9d131b8b8db5708fb71500c57d2" FOREIGN KEY (model_id) REFERENCES public.model(id);


--
-- Name: purchase_costs FK_ad0b076b1f56f07b309f0368e97; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_costs
    ADD CONSTRAINT "FK_ad0b076b1f56f07b309f0368e97" FOREIGN KEY (branch_id) REFERENCES public.branches(id);


--
-- Name: purchase_payments FK_b0089820b7452d8e84b5d1fda65; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_payments
    ADD CONSTRAINT "FK_b0089820b7452d8e84b5d1fda65" FOREIGN KEY (purchase_id) REFERENCES public.purchases(id);


--
-- Name: spare_parts FK_b53c9e6a07e38c232c41bf55cd0; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.spare_parts
    ADD CONSTRAINT "FK_b53c9e6a07e38c232c41bf55cd0" FOREIGN KEY (vendor_id) REFERENCES public.vendors(id);


--
-- Name: purchases FK_b9a9f16702bc091db7eb5e0d9c7; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchases
    ADD CONSTRAINT "FK_b9a9f16702bc091db7eb5e0d9c7" FOREIGN KEY (vendor_id) REFERENCES public.vendors(id);


--
-- Name: spare_part_inventories FK_baac5f2237b08622d8ecca37938; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.spare_part_inventories
    ADD CONSTRAINT "FK_baac5f2237b08622d8ecca37938" FOREIGN KEY (warehouse_id) REFERENCES public.warehouses(id);


--
-- Name: purchase_payments FK_c50c1920a135ca5da229fcf0985; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_payments
    ADD CONSTRAINT "FK_c50c1920a135ca5da229fcf0985" FOREIGN KEY (branch_id) REFERENCES public.branches(id);


--
-- Name: vendor_requests FK_d04be0602ce2b79b69a2ca5e851; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendor_requests
    ADD CONSTRAINT "FK_d04be0602ce2b79b69a2ca5e851" FOREIGN KEY (branch_id) REFERENCES public.branches(id);


--
-- Name: warehouses FK_d1a87bf9de7503bb1b6fc0cb859; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.warehouses
    ADD CONSTRAINT "FK_d1a87bf9de7503bb1b6fc0cb859" FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE SET NULL;


--
-- Name: spare_part_inventories FK_d5fb61c6773ba726504ada7c837; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.spare_part_inventories
    ADD CONSTRAINT "FK_d5fb61c6773ba726504ada7c837" FOREIGN KEY (vendor_id) REFERENCES public.vendors(id);


--
-- Name: lots FK_d63b22d13f0a03f534c213a13fd; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lots
    ADD CONSTRAINT "FK_d63b22d13f0a03f534c213a13fd" FOREIGN KEY (vendor_id) REFERENCES public.vendors(id);


--
-- Name: rfq_vendor_items FK_e556812c2cbdd7bb4ba9e3b9999; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rfq_vendor_items
    ADD CONSTRAINT "FK_e556812c2cbdd7bb4ba9e3b9999" FOREIGN KEY (rfq_item_id) REFERENCES public.rfq_items(id);


--
-- Name: rfq_items FK_ef8f022c5f4d9e27e47e03a1202; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rfq_items
    ADD CONSTRAINT "FK_ef8f022c5f4d9e27e47e03a1202" FOREIGN KEY (rfq_id) REFERENCES public.rfqs(id) ON DELETE CASCADE;


--
-- Name: products FK_f5741a9400f1296cbf33cd03b82; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT "FK_f5741a9400f1296cbf33cd03b82" FOREIGN KEY (spare_part_id) REFERENCES public.spare_parts(id) ON DELETE SET NULL;


--
-- Name: products FK_fea955aaac39a5cfa75d82d73e3; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT "FK_fea955aaac39a5cfa75d82d73e3" FOREIGN KEY (lot_id) REFERENCES public.lots(id);


--
-- Name: consumable_yield_history consumable_yield_history_ticketId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.consumable_yield_history
    ADD CONSTRAINT "consumable_yield_history_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES public.service_tickets(id) ON DELETE CASCADE;


--
-- Name: contract_meter_readings contract_meter_readings_contractId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contract_meter_readings
    ADD CONSTRAINT "contract_meter_readings_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES public.service_contracts(id) ON DELETE CASCADE;


--
-- Name: lot_documents lot_documents_lot_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lot_documents
    ADD CONSTRAINT lot_documents_lot_id_fkey FOREIGN KEY (lot_id) REFERENCES public.lots(id) ON DELETE CASCADE;


--
-- Name: service_diagnoses service_diagnoses_ticketId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.service_diagnoses
    ADD CONSTRAINT "service_diagnoses_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES public.service_tickets(id) ON DELETE CASCADE;


--
-- Name: service_estimate_items service_estimate_items_estimateId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.service_estimate_items
    ADD CONSTRAINT "service_estimate_items_estimateId_fkey" FOREIGN KEY ("estimateId") REFERENCES public.service_estimates(id) ON DELETE CASCADE;


--
-- Name: service_estimate_revisions service_estimate_revisions_ticket_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.service_estimate_revisions
    ADD CONSTRAINT service_estimate_revisions_ticket_id_fkey FOREIGN KEY ("ticketId") REFERENCES public.service_tickets(id) ON DELETE CASCADE;


--
-- Name: service_estimates service_estimates_ticketId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.service_estimates
    ADD CONSTRAINT "service_estimates_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES public.service_tickets(id) ON DELETE CASCADE;


--
-- Name: service_reports service_reports_ticketId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.service_reports
    ADD CONSTRAINT "service_reports_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES public.service_tickets(id) ON DELETE CASCADE;


--
-- Name: service_ticket_activities service_ticket_activities_ticketId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.service_ticket_activities
    ADD CONSTRAINT "service_ticket_activities_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES public.service_tickets(id) ON DELETE CASCADE;


--
-- Name: service_ticket_items service_ticket_items_ticketId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.service_ticket_items
    ADD CONSTRAINT "service_ticket_items_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES public.service_tickets(id) ON DELETE CASCADE;


--
-- Name: stock_transfer_items stock_transfer_items_transfer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_transfer_items
    ADD CONSTRAINT stock_transfer_items_transfer_id_fkey FOREIGN KEY (transfer_id) REFERENCES public.stock_transfers(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict clzkuLkgMhI1fyR9XOdCUKtbveTtYk5sXyiTBCVmtS56FcFvglCxbjMJlJRhZiH

