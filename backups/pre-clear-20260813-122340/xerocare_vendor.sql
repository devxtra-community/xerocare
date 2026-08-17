--
-- PostgreSQL database dump
--

\restrict WgUefABfDC5MAoAFcf7InDFQgPW58m0JmdRB7w8xYdQiZCUIA97OuYIrKDrPOil

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
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- Name: branches_status_enum; Type: TYPE; Schema: public; Owner: xerouser
--

CREATE TYPE public.branches_status_enum AS ENUM (
    'ACTIVE',
    'INACTIVE',
    'DELETED'
);


ALTER TYPE public.branches_status_enum OWNER TO xerouser;

--
-- Name: brands_status_enum; Type: TYPE; Schema: public; Owner: xerouser
--

CREATE TYPE public.brands_status_enum AS ENUM (
    'ACTIVE',
    'INACTIVE'
);


ALTER TYPE public.brands_status_enum OWNER TO xerouser;

--
-- Name: lot_documents_document_type_enum; Type: TYPE; Schema: public; Owner: xerouser
--

CREATE TYPE public.lot_documents_document_type_enum AS ENUM (
    'BILL_OF_LADING',
    'CUSTOMS_DECLARATION',
    'COMMERCIAL_INVOICE',
    'PACKING_LIST',
    'INSURANCE_CERTIFICATE',
    'OTHER'
);


ALTER TYPE public.lot_documents_document_type_enum OWNER TO xerouser;

--
-- Name: lot_items_item_type_enum; Type: TYPE; Schema: public; Owner: xerouser
--

CREATE TYPE public.lot_items_item_type_enum AS ENUM (
    'MODEL',
    'SPARE_PART'
);


ALTER TYPE public.lot_items_item_type_enum OWNER TO xerouser;

--
-- Name: lots_purchase_origin_enum; Type: TYPE; Schema: public; Owner: xerouser
--

CREATE TYPE public.lots_purchase_origin_enum AS ENUM (
    'DOMESTIC',
    'INTERNATIONAL'
);


ALTER TYPE public.lots_purchase_origin_enum OWNER TO xerouser;

--
-- Name: lots_shipment_status_enum; Type: TYPE; Schema: public; Owner: xerouser
--

CREATE TYPE public.lots_shipment_status_enum AS ENUM (
    'PENDING_DISPATCH',
    'IN_TRANSIT',
    'CUSTOMS_CLEARANCE',
    'ARRIVED',
    'RELEASED'
);


ALTER TYPE public.lots_shipment_status_enum OWNER TO xerouser;

--
-- Name: lots_status_enum; Type: TYPE; Schema: public; Owner: xerouser
--

CREATE TYPE public.lots_status_enum AS ENUM (
    'PENDING',
    'RECEIVING',
    'RECEIVED',
    'COMPLETED',
    'CANCELLED'
);


ALTER TYPE public.lots_status_enum OWNER TO xerouser;

--
-- Name: lots_transport_mode_enum; Type: TYPE; Schema: public; Owner: xerouser
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


ALTER TYPE public.lots_transport_mode_enum OWNER TO xerouser;

--
-- Name: print_colour_enum; Type: TYPE; Schema: public; Owner: xerouser
--

CREATE TYPE public.print_colour_enum AS ENUM (
    'BLACK_WHITE',
    'COLOUR',
    'BOTH'
);


ALTER TYPE public.print_colour_enum OWNER TO xerouser;

--
-- Name: products_ownership_enum; Type: TYPE; Schema: public; Owner: xerouser
--

CREATE TYPE public.products_ownership_enum AS ENUM (
    'RENT',
    'LEASE',
    'SALE',
    'EXTERNAL'
);


ALTER TYPE public.products_ownership_enum OWNER TO xerouser;

--
-- Name: products_product_status_enum; Type: TYPE; Schema: public; Owner: xerouser
--

CREATE TYPE public.products_product_status_enum AS ENUM (
    'AVAILABLE',
    'RENTED',
    'LEASE',
    'SOLD',
    'DAMAGED',
    'RETURNED'
);


ALTER TYPE public.products_product_status_enum OWNER TO xerouser;

--
-- Name: purchases_goodsorservice_enum; Type: TYPE; Schema: public; Owner: xerouser
--

CREATE TYPE public.purchases_goodsorservice_enum AS ENUM (
    'GOODS',
    'SERVICE'
);


ALTER TYPE public.purchases_goodsorservice_enum OWNER TO xerouser;

--
-- Name: purchases_purchase_origin_enum; Type: TYPE; Schema: public; Owner: xerouser
--

CREATE TYPE public.purchases_purchase_origin_enum AS ENUM (
    'DOMESTIC',
    'INTERNATIONAL'
);


ALTER TYPE public.purchases_purchase_origin_enum OWNER TO xerouser;

--
-- Name: purchases_purchasecategory_enum; Type: TYPE; Schema: public; Owner: xerouser
--

CREATE TYPE public.purchases_purchasecategory_enum AS ENUM (
    'PRODUCT',
    'SPARE_PART',
    'SERVICE',
    'OTHER'
);


ALTER TYPE public.purchases_purchasecategory_enum OWNER TO xerouser;

--
-- Name: purchases_taxstatus_enum; Type: TYPE; Schema: public; Owner: xerouser
--

CREATE TYPE public.purchases_taxstatus_enum AS ENUM (
    'PENDING',
    'RECORDED',
    'FILED'
);


ALTER TYPE public.purchases_taxstatus_enum OWNER TO xerouser;

--
-- Name: rfq_items_item_type_enum; Type: TYPE; Schema: public; Owner: xerouser
--

CREATE TYPE public.rfq_items_item_type_enum AS ENUM (
    'PRODUCT',
    'SPARE_PART'
);


ALTER TYPE public.rfq_items_item_type_enum OWNER TO xerouser;

--
-- Name: rfq_vendor_items_stock_status_enum; Type: TYPE; Schema: public; Owner: xerouser
--

CREATE TYPE public.rfq_vendor_items_stock_status_enum AS ENUM (
    'IN_STOCK',
    'OUT_OF_STOCK',
    'ON_PRODUCTION'
);


ALTER TYPE public.rfq_vendor_items_stock_status_enum OWNER TO xerouser;

--
-- Name: rfq_vendors_status_enum; Type: TYPE; Schema: public; Owner: xerouser
--

CREATE TYPE public.rfq_vendors_status_enum AS ENUM (
    'INVITED',
    'QUOTED',
    'REJECTED',
    'AWARDED'
);


ALTER TYPE public.rfq_vendors_status_enum OWNER TO xerouser;

--
-- Name: rfqs_purchase_origin_enum; Type: TYPE; Schema: public; Owner: xerouser
--

CREATE TYPE public.rfqs_purchase_origin_enum AS ENUM (
    'DOMESTIC',
    'INTERNATIONAL'
);


ALTER TYPE public.rfqs_purchase_origin_enum OWNER TO xerouser;

--
-- Name: rfqs_status_enum; Type: TYPE; Schema: public; Owner: xerouser
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


ALTER TYPE public.rfqs_status_enum OWNER TO xerouser;

--
-- Name: service_contracts_contracttype_enum; Type: TYPE; Schema: public; Owner: xerouser
--

CREATE TYPE public.service_contracts_contracttype_enum AS ENUM (
    'FSMA',
    'SMA',
    'AMC'
);


ALTER TYPE public.service_contracts_contracttype_enum OWNER TO xerouser;

--
-- Name: service_ticket_items_itemsource_enum; Type: TYPE; Schema: public; Owner: xerouser
--

CREATE TYPE public.service_ticket_items_itemsource_enum AS ENUM (
    'SPARE_PART',
    'CUSTOM'
);


ALTER TYPE public.service_ticket_items_itemsource_enum OWNER TO xerouser;

--
-- Name: service_tickets_jobtype_enum; Type: TYPE; Schema: public; Owner: xerouser
--

CREATE TYPE public.service_tickets_jobtype_enum AS ENUM (
    'ONSITE',
    'BRING_TO_CENTRE',
    'WARRANTY_ONSITE'
);


ALTER TYPE public.service_tickets_jobtype_enum OWNER TO xerouser;

--
-- Name: service_tickets_servicecontext_enum; Type: TYPE; Schema: public; Owner: xerouser
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


ALTER TYPE public.service_tickets_servicecontext_enum OWNER TO xerouser;

--
-- Name: service_tickets_status_enum; Type: TYPE; Schema: public; Owner: xerouser
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


ALTER TYPE public.service_tickets_status_enum OWNER TO xerouser;

--
-- Name: stock_transfer_items_item_status_enum; Type: TYPE; Schema: public; Owner: xerouser
--

CREATE TYPE public.stock_transfer_items_item_status_enum AS ENUM (
    'PENDING',
    'APPROVED',
    'REJECTED'
);


ALTER TYPE public.stock_transfer_items_item_status_enum OWNER TO xerouser;

--
-- Name: stock_transfer_items_item_type_enum; Type: TYPE; Schema: public; Owner: xerouser
--

CREATE TYPE public.stock_transfer_items_item_type_enum AS ENUM (
    'SPARE_PART',
    'PRODUCT'
);


ALTER TYPE public.stock_transfer_items_item_type_enum OWNER TO xerouser;

--
-- Name: stock_transfers_status_enum; Type: TYPE; Schema: public; Owner: xerouser
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


ALTER TYPE public.stock_transfers_status_enum OWNER TO xerouser;

--
-- Name: stock_transfers_transfer_type_enum; Type: TYPE; Schema: public; Owner: xerouser
--

CREATE TYPE public.stock_transfers_transfer_type_enum AS ENUM (
    'INTRA_BRANCH',
    'INTER_BRANCH'
);


ALTER TYPE public.stock_transfers_transfer_type_enum OWNER TO xerouser;

--
-- Name: vendors_status_enum; Type: TYPE; Schema: public; Owner: xerouser
--

CREATE TYPE public.vendors_status_enum AS ENUM (
    'ACTIVE',
    'INACTIVE',
    'DELETED'
);


ALTER TYPE public.vendors_status_enum OWNER TO xerouser;

--
-- Name: vendors_type_enum; Type: TYPE; Schema: public; Owner: xerouser
--

CREATE TYPE public.vendors_type_enum AS ENUM (
    'Supplier',
    'Distributor',
    'Service'
);


ALTER TYPE public.vendors_type_enum OWNER TO xerouser;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: branches; Type: TABLE; Schema: public; Owner: xerouser
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


ALTER TABLE public.branches OWNER TO xerouser;

--
-- Name: brands; Type: TABLE; Schema: public; Owner: xerouser
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


ALTER TABLE public.brands OWNER TO xerouser;

--
-- Name: consumable_yield_history; Type: TABLE; Schema: public; Owner: xerouser
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


ALTER TABLE public.consumable_yield_history OWNER TO xerouser;

--
-- Name: contract_meter_readings; Type: TABLE; Schema: public; Owner: xerouser
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


ALTER TABLE public.contract_meter_readings OWNER TO xerouser;

--
-- Name: employee_managers; Type: TABLE; Schema: public; Owner: xerouser
--

CREATE TABLE public.employee_managers (
    employee_id character varying NOT NULL,
    email character varying NOT NULL,
    status character varying NOT NULL,
    name character varying,
    synced_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.employee_managers OWNER TO xerouser;

--
-- Name: exchange_rates; Type: TABLE; Schema: public; Owner: xerouser
--

CREATE TABLE public.exchange_rates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    from_currency character varying(3) NOT NULL,
    to_currency character varying(3) NOT NULL,
    rate numeric(18,6) NOT NULL,
    fetched_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.exchange_rates OWNER TO xerouser;

--
-- Name: inventory_reservations; Type: TABLE; Schema: public; Owner: xerouser
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


ALTER TABLE public.inventory_reservations OWNER TO xerouser;

--
-- Name: lot_documents; Type: TABLE; Schema: public; Owner: xerouser
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


ALTER TABLE public.lot_documents OWNER TO xerouser;

--
-- Name: lot_items; Type: TABLE; Schema: public; Owner: xerouser
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


ALTER TABLE public.lot_items OWNER TO xerouser;

--
-- Name: lots; Type: TABLE; Schema: public; Owner: xerouser
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


ALTER TABLE public.lots OWNER TO xerouser;

--
-- Name: machine_service_history; Type: TABLE; Schema: public; Owner: xerouser
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


ALTER TABLE public.machine_service_history OWNER TO xerouser;

--
-- Name: model; Type: TABLE; Schema: public; Owner: xerouser
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


ALTER TABLE public.model OWNER TO xerouser;

--
-- Name: processed_invoice_items; Type: TABLE; Schema: public; Owner: xerouser
--

CREATE TABLE public.processed_invoice_items (
    invoice_item_id uuid NOT NULL,
    processed_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.processed_invoice_items OWNER TO xerouser;

--
-- Name: products; Type: TABLE; Schema: public; Owner: xerouser
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


ALTER TABLE public.products OWNER TO xerouser;

--
-- Name: purchase_costs; Type: TABLE; Schema: public; Owner: xerouser
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


ALTER TABLE public.purchase_costs OWNER TO xerouser;

--
-- Name: purchase_payments; Type: TABLE; Schema: public; Owner: xerouser
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


ALTER TABLE public.purchase_payments OWNER TO xerouser;

--
-- Name: purchases; Type: TABLE; Schema: public; Owner: xerouser
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


ALTER TABLE public.purchases OWNER TO xerouser;

--
-- Name: rfq_items; Type: TABLE; Schema: public; Owner: xerouser
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


ALTER TABLE public.rfq_items OWNER TO xerouser;

--
-- Name: rfq_vendor_items; Type: TABLE; Schema: public; Owner: xerouser
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


ALTER TABLE public.rfq_vendor_items OWNER TO xerouser;

--
-- Name: rfq_vendors; Type: TABLE; Schema: public; Owner: xerouser
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


ALTER TABLE public.rfq_vendors OWNER TO xerouser;

--
-- Name: rfqs; Type: TABLE; Schema: public; Owner: xerouser
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


ALTER TABLE public.rfqs OWNER TO xerouser;

--
-- Name: service_contracts; Type: TABLE; Schema: public; Owner: xerouser
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


ALTER TABLE public.service_contracts OWNER TO xerouser;

--
-- Name: service_diagnoses; Type: TABLE; Schema: public; Owner: xerouser
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


ALTER TABLE public.service_diagnoses OWNER TO xerouser;

--
-- Name: service_estimate_items; Type: TABLE; Schema: public; Owner: xerouser
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


ALTER TABLE public.service_estimate_items OWNER TO xerouser;

--
-- Name: service_estimate_revisions; Type: TABLE; Schema: public; Owner: xerouser
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


ALTER TABLE public.service_estimate_revisions OWNER TO xerouser;

--
-- Name: service_estimates; Type: TABLE; Schema: public; Owner: xerouser
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


ALTER TABLE public.service_estimates OWNER TO xerouser;

--
-- Name: service_part_usage_logs; Type: TABLE; Schema: public; Owner: xerouser
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


ALTER TABLE public.service_part_usage_logs OWNER TO xerouser;

--
-- Name: service_reports; Type: TABLE; Schema: public; Owner: xerouser
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


ALTER TABLE public.service_reports OWNER TO xerouser;

--
-- Name: service_ticket_activities; Type: TABLE; Schema: public; Owner: xerouser
--

CREATE TABLE public.service_ticket_activities (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    "ticketId" uuid NOT NULL,
    "activityType" character varying(50) NOT NULL,
    description text NOT NULL,
    "performedBy" uuid,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.service_ticket_activities OWNER TO xerouser;

--
-- Name: service_ticket_items; Type: TABLE; Schema: public; Owner: xerouser
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


ALTER TABLE public.service_ticket_items OWNER TO xerouser;

--
-- Name: service_tickets; Type: TABLE; Schema: public; Owner: xerouser
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


ALTER TABLE public.service_tickets OWNER TO xerouser;

--
-- Name: spare_part_inventories; Type: TABLE; Schema: public; Owner: xerouser
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


ALTER TABLE public.spare_part_inventories OWNER TO xerouser;

--
-- Name: spare_parts; Type: TABLE; Schema: public; Owner: xerouser
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


ALTER TABLE public.spare_parts OWNER TO xerouser;

--
-- Name: spare_parts_models; Type: TABLE; Schema: public; Owner: xerouser
--

CREATE TABLE public.spare_parts_models (
    spare_part_id uuid NOT NULL,
    model_id uuid NOT NULL
);


ALTER TABLE public.spare_parts_models OWNER TO xerouser;

--
-- Name: stock_transfer_items; Type: TABLE; Schema: public; Owner: xerouser
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


ALTER TABLE public.stock_transfer_items OWNER TO xerouser;

--
-- Name: stock_transfers; Type: TABLE; Schema: public; Owner: xerouser
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


ALTER TABLE public.stock_transfers OWNER TO xerouser;

--
-- Name: vendor_requests; Type: TABLE; Schema: public; Owner: xerouser
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


ALTER TABLE public.vendor_requests OWNER TO xerouser;

--
-- Name: vendors; Type: TABLE; Schema: public; Owner: xerouser
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


ALTER TABLE public.vendors OWNER TO xerouser;

--
-- Name: warehouses; Type: TABLE; Schema: public; Owner: xerouser
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


ALTER TABLE public.warehouses OWNER TO xerouser;

--
-- Data for Name: branches; Type: TABLE DATA; Schema: public; Owner: xerouser
--

COPY public.branches (id, name, address, location, manager_id, started_date, status, created_at, updated_at, country_code, currency_code, currency_symbol, currency_name, has_tax, tax_name, tax_percent, tax_registration_number, city, state, postal_code) FROM stdin;
426625c1-62e8-4e14-952b-457452eb0f28	XEROCARE PRIVET LIMITE QATAR	STREET NO:22 DOHA QATER	DOHA QATAR	019c5b7d-20cf-4ef4-971a-91235dd6c10c	2026-08-10	ACTIVE	2026-08-10 11:30:45.005879	2026-08-10 11:35:53.025455	QA	QAR	QAR	Qatari Riyal	f	\N	\N	\N	DOHA	DOHA	7648839
c24a0a2c-6b0f-4ae5-aaaf-0346a65e6b6e	XEROCARE UAE TAX BRANCH	Sheikh Zayed Rd, Dubai	DUBAI UAE	\N	2026-08-01	ACTIVE	2026-08-13 00:23:31.094768	2026-08-13 00:23:31.094768	AE	AED	AED	UAE Dirham	t	VAT	5.00	TRN100200300	Dubai	Dubai	00000
3d064932-b265-43dd-8ece-9410442db90c	XEROCARE OMAN NOTAX BRANCH	Muscat Rd	MUSCAT OMAN	\N	2026-08-01	ACTIVE	2026-08-13 00:24:03.039166	2026-08-13 00:24:03.039166	OM	OMR	OMR	Omani Rial	f	\N	\N	\N	Muscat	Muscat	00100
\.


--
-- Data for Name: brands; Type: TABLE DATA; Schema: public; Owner: xerouser
--

COPY public.brands (id, name, description, status, branch_id, created_at, updated_at) FROM stdin;
43fdc447-e3c0-4812-b6fc-905bf42868c5	HP		ACTIVE	39d50020-0bbe-4c8e-9c60-5ef4af38c715	2026-07-18 23:09:30.99087	2026-07-18 23:09:30.99087
4458ec9e-1d35-4d69-91cb-4ede8a78e982	Canon		ACTIVE	39d50020-0bbe-4c8e-9c60-5ef4af38c715	2026-07-18 23:09:44.458376	2026-07-18 23:09:44.458376
5032deb1-9ed6-4f5a-bf3d-282efc82defc	KYOSERA		ACTIVE	39d50020-0bbe-4c8e-9c60-5ef4af38c715	2026-07-18 23:09:52.560098	2026-07-18 23:09:52.560098
6f3500db-8f69-46fe-8bea-c2cdf819d810	Epson		ACTIVE	39d50020-0bbe-4c8e-9c60-5ef4af38c715	2026-07-18 23:09:57.664528	2026-07-18 23:09:57.664528
3501f006-d7fd-4ef9-9f3b-3a2918590212	Epson	PRINTER BRAND	ACTIVE	426625c1-62e8-4e14-952b-457452eb0f28	2026-08-10 11:58:56.53084	2026-08-10 11:58:56.53084
f2cf79db-f489-498b-a17c-9cea21ca74c6	BROTHER	PRINTER BRAND	ACTIVE	426625c1-62e8-4e14-952b-457452eb0f28	2026-08-10 11:59:12.32868	2026-08-10 11:59:12.32868
91e7d160-72be-4808-a76b-6c2ecd8dfc45	HP	PRINTER BRAND	ACTIVE	426625c1-62e8-4e14-952b-457452eb0f28	2026-08-10 11:59:33.239265	2026-08-10 11:59:33.239265
a7fe8c6e-6f3d-4478-971e-659e3e6b658c	Canon	Canon imaging	ACTIVE	c24a0a2c-6b0f-4ae5-aaaf-0346a65e6b6e	2026-08-13 00:27:18.123945	2026-08-13 00:27:18.123945
cb9dae72-aa40-469e-a606-878999cc7d7f	Ricoh	Ricoh imaging	ACTIVE	c24a0a2c-6b0f-4ae5-aaaf-0346a65e6b6e	2026-08-13 00:27:18.166042	2026-08-13 00:27:18.166042
74c4de6b-a846-4372-acae-7177acde47be	Kyocera	Kyocera imaging	ACTIVE	c24a0a2c-6b0f-4ae5-aaaf-0346a65e6b6e	2026-08-13 00:27:18.200082	2026-08-13 00:27:18.200082
\.


--
-- Data for Name: consumable_yield_history; Type: TABLE DATA; Schema: public; Owner: xerouser
--

COPY public.consumable_yield_history (id, "productId", "serialNumber", "tonerSku", "installedDate", "installedMeterReading", "replacedDate", "replacedMeterReading", "yieldPages", "ticketId", created_at) FROM stdin;
\.


--
-- Data for Name: contract_meter_readings; Type: TABLE DATA; Schema: public; Owner: xerouser
--

COPY public.contract_meter_readings (id, "contractId", "readingDate", "totalReading", "bwReading", "colorReading", "clicksTotal", "clicksBW", "clicksColor", "amountCharged", "chargeBreakdown", notes, "recordedBy", created_at, "billedAt", "billingInvoiceId") FROM stdin;
\.


--
-- Data for Name: employee_managers; Type: TABLE DATA; Schema: public; Owner: xerouser
--

COPY public.employee_managers (employee_id, email, status, name, synced_at) FROM stdin;
019c5b7d-20cf-4ef4-971a-91235dd6c10c	muhammedriyas9218@gmail.com	ACTIVE	RIYAS BRANCH MANAGER	2026-08-10 11:35:53.010131
\.


--
-- Data for Name: exchange_rates; Type: TABLE DATA; Schema: public; Owner: xerouser
--

COPY public.exchange_rates (id, from_currency, to_currency, rate, fetched_at) FROM stdin;
e75dcadd-decf-44b5-beca-0cd1c5332465	AED	INR	26.250000	2026-07-18 23:35:09.394301
be65422d-66cf-4e15-b2b1-869c4e3a3c81	JPY	AED	0.023100	2026-08-13 00:40:46.755062
\.


--
-- Data for Name: inventory_reservations; Type: TABLE DATA; Schema: public; Owner: xerouser
--

COPY public.inventory_reservations (id, "ticketId", "sparePartId", "reservedQuantity", status, "reservedAt", "consumedAt") FROM stdin;
\.


--
-- Data for Name: lot_documents; Type: TABLE DATA; Schema: public; Owner: xerouser
--

COPY public.lot_documents (id, lot_id, document_type, document_name, notes, file_url, file_name, mime_type, file_size, uploaded_by, created_at) FROM stdin;
\.


--
-- Data for Name: lot_items; Type: TABLE DATA; Schema: public; Owner: xerouser
--

COPY public.lot_items (id, lot_id, item_type, model_id, spare_part_id, quantity, received_quantity, damaged_quantity, returned_quantity, used_quantity, custom_product_name, custom_spare_part_name, unit_price, total_price, created_at, updated_at, mpn, compatible_models, model_ids, selling_price, hs_code) FROM stdin;
0bd17cbd-738b-411b-b766-3cbdc67af078	11a8c61b-2966-45dd-9cce-99869ebeb08d	SPARE_PART	\N	aef9dffa-dc8b-4ffc-91b7-362ad45bbf80	10	10	0	0	10	\N	\N	114.00	1140.00	2026-08-13 00:27:53.518172	2026-08-13 00:36:39.600636	INTL-MPN-014	\N	\N	194.00	8443.99
0b8c33d9-9c5b-471f-8e88-b5f27bb1a3a8	11a8c61b-2966-45dd-9cce-99869ebeb08d	SPARE_PART	\N	cba7c189-9766-4ad2-9d51-f6a41b75ce4d	10	10	0	0	10	\N	\N	113.00	1130.00	2026-08-13 00:27:53.518172	2026-08-13 00:36:39.6721	INTL-MPN-013	\N	\N	193.00	8443.99
a84690c5-f626-4060-ab2a-469977fb1882	11a8c61b-2966-45dd-9cce-99869ebeb08d	SPARE_PART	\N	80af274f-f6ee-4024-ba84-c3f6f3b0e9ae	10	10	0	0	10	\N	\N	112.00	1120.00	2026-08-13 00:27:53.518172	2026-08-13 00:36:39.743684	INTL-MPN-012	\N	\N	192.00	8443.99
ee6a9caf-6cf9-458d-90e5-aa421a3b7c2f	11a8c61b-2966-45dd-9cce-99869ebeb08d	SPARE_PART	\N	e65f2181-0882-44d7-9f8a-5014113336e4	10	10	0	0	10	\N	\N	111.00	1110.00	2026-08-13 00:27:53.518172	2026-08-13 00:36:39.8027	INTL-MPN-011	\N	\N	191.00	8443.99
b6da6a99-c614-4f9c-a817-d270e3ed45bb	11a8c61b-2966-45dd-9cce-99869ebeb08d	SPARE_PART	\N	d413c555-a98b-48b8-a318-a501add85aa6	10	10	0	0	10	\N	\N	110.00	1100.00	2026-08-13 00:27:53.518172	2026-08-13 00:36:39.864927	INTL-MPN-010	\N	\N	190.00	8443.99
1ce2435b-d1f8-4255-a9c5-aef38b9a1ab6	11a8c61b-2966-45dd-9cce-99869ebeb08d	SPARE_PART	\N	a65873ca-e7ec-4dfb-a836-b26264164bc7	10	10	0	0	10	\N	\N	109.00	1090.00	2026-08-13 00:27:53.518172	2026-08-13 00:36:39.928958	INTL-MPN-009	\N	\N	189.00	8443.99
c492f7cc-2383-4fb9-b71b-b03cab6844b7	11a8c61b-2966-45dd-9cce-99869ebeb08d	SPARE_PART	\N	497b0902-fd9a-4ae9-8108-77d798d58d6c	10	10	0	0	10	\N	\N	108.00	1080.00	2026-08-13 00:27:53.518172	2026-08-13 00:36:39.994752	INTL-MPN-008	\N	\N	188.00	8443.99
1541ba79-db49-4e53-b1e3-2e3931c00795	11a8c61b-2966-45dd-9cce-99869ebeb08d	SPARE_PART	\N	151885e0-a03a-48c8-9482-660386552644	10	10	0	0	10	\N	\N	107.00	1070.00	2026-08-13 00:27:53.518172	2026-08-13 00:36:40.066528	INTL-MPN-007	\N	\N	187.00	8443.99
ac11da84-1eb1-44ea-aa37-eba53b372876	11a8c61b-2966-45dd-9cce-99869ebeb08d	SPARE_PART	\N	00689d38-6486-4bad-90e6-dfe22b13f79a	10	10	0	0	10	\N	\N	106.00	1060.00	2026-08-13 00:27:53.518172	2026-08-13 00:36:40.126144	INTL-MPN-006	\N	\N	186.00	8443.99
23876f34-9640-42f0-b901-3ffde986b85f	11a8c61b-2966-45dd-9cce-99869ebeb08d	SPARE_PART	\N	46169ac7-c1b1-40e0-92d0-a665f4f67928	10	10	0	0	10	\N	\N	105.00	1050.00	2026-08-13 00:27:53.518172	2026-08-13 00:36:40.197659	INTL-MPN-005	\N	\N	185.00	8443.99
9781f7a8-f50b-4f9c-aa8f-8b726ac55d91	11a8c61b-2966-45dd-9cce-99869ebeb08d	SPARE_PART	\N	694e4583-e791-42cd-b2c3-2ce5c9d6f0a8	10	10	0	0	10	\N	\N	104.00	1040.00	2026-08-13 00:27:53.518172	2026-08-13 00:36:40.26753	INTL-MPN-004	\N	\N	184.00	8443.99
9f58932a-b6a3-4424-954b-c2bb5c6f9a0a	11a8c61b-2966-45dd-9cce-99869ebeb08d	SPARE_PART	\N	22a38131-d91c-4257-8d63-12dd3c54b5a0	10	10	0	0	10	\N	\N	103.00	1030.00	2026-08-13 00:27:53.518172	2026-08-13 00:36:40.351924	INTL-MPN-003	\N	\N	183.00	8443.99
0e2ab802-2774-413c-be3b-06d053f944c4	11a8c61b-2966-45dd-9cce-99869ebeb08d	MODEL	4e72c048-49ed-4f27-a991-dba112ca653c	\N	4	4	0	0	4	\N	\N	3600.00	14400.00	2026-08-13 00:27:53.518172	2026-08-13 00:29:37.915489	\N	\N	\N	6200.00	\N
a0568527-3a4c-432f-96aa-8c3f7b946ac3	11a8c61b-2966-45dd-9cce-99869ebeb08d	SPARE_PART	\N	0a4226e8-58a1-4050-aa50-db02b5dbeedc	10	10	0	0	10	\N	\N	102.00	1020.00	2026-08-13 00:27:53.518172	2026-08-13 00:36:40.404255	INTL-MPN-002	\N	\N	182.00	8443.99
b0c2abaf-e846-4e53-a017-ec06fbc531cd	11a8c61b-2966-45dd-9cce-99869ebeb08d	SPARE_PART	\N	317a5216-ff0a-4eaf-a792-36e4846dc194	10	10	0	0	10	\N	\N	101.00	1010.00	2026-08-13 00:27:53.518172	2026-08-13 00:36:40.462293	INTL-MPN-001	\N	\N	181.00	8443.99
a630503c-0bf3-485e-a51b-15a4c8c52c0c	11a8c61b-2966-45dd-9cce-99869ebeb08d	MODEL	6387b291-01bb-4dbd-803b-55aed761c0ed	\N	4	4	0	0	4	\N	\N	3600.00	14400.00	2026-08-13 00:27:53.518172	2026-08-13 00:29:38.025964	\N	\N	\N	6200.00	\N
c5baf50e-5add-4b27-a88b-b10e71211254	11a8c61b-2966-45dd-9cce-99869ebeb08d	MODEL	a24b61b0-f02e-48cd-b7af-08d9d600e399	\N	3	3	0	0	3	\N	\N	3600.00	10800.00	2026-08-13 00:27:53.518172	2026-08-13 00:29:38.127981	\N	\N	\N	6200.00	\N
b4e03ec4-6df2-4ffe-97c3-a75838aa42a7	11a8c61b-2966-45dd-9cce-99869ebeb08d	MODEL	73d6d724-7ec6-48a0-8eb6-42544003cfb9	\N	3	3	0	0	3	\N	\N	3600.00	10800.00	2026-08-13 00:27:53.518172	2026-08-13 00:29:38.211416	\N	\N	\N	6200.00	\N
13b72a49-4ec3-4d5c-a294-31372bca5997	11a8c61b-2966-45dd-9cce-99869ebeb08d	MODEL	89e41806-11eb-4599-bfbc-7d50208c5e5f	\N	3	3	0	0	3	\N	\N	3600.00	10800.00	2026-08-13 00:27:53.518172	2026-08-13 00:29:38.291723	\N	\N	\N	6200.00	\N
d79a048b-7141-4509-9bb0-6154fa2b9e6b	11a8c61b-2966-45dd-9cce-99869ebeb08d	MODEL	323212ba-c2f8-4737-b8a2-1d5c0f7b7498	\N	3	3	0	0	3	\N	\N	3600.00	10800.00	2026-08-13 00:27:53.518172	2026-08-13 00:29:38.368403	\N	\N	\N	6200.00	\N
6a99592a-87d1-40b0-8afd-9cf7d54738c5	11a8c61b-2966-45dd-9cce-99869ebeb08d	SPARE_PART	\N	fa90c3a1-f613-411e-8932-efa9812c698e	10	10	0	0	10	\N	\N	117.00	1170.00	2026-08-13 00:27:53.518172	2026-08-13 00:36:39.317708	INTL-MPN-017	\N	\N	197.00	8443.99
667510a6-5fc8-4489-862c-26b22759d867	11a8c61b-2966-45dd-9cce-99869ebeb08d	SPARE_PART	\N	14bc296f-8717-4c16-a9b9-6e8caf810c4f	10	10	0	0	10	\N	\N	116.00	1160.00	2026-08-13 00:27:53.518172	2026-08-13 00:36:39.42299	INTL-MPN-016	\N	\N	196.00	8443.99
65385c5e-bb8e-4dd1-bde8-a229459f2f5e	11a8c61b-2966-45dd-9cce-99869ebeb08d	SPARE_PART	\N	518cace9-5017-4d92-aee8-db742571a610	10	10	0	0	10	\N	\N	115.00	1150.00	2026-08-13 00:27:53.518172	2026-08-13 00:36:39.516802	INTL-MPN-015	\N	\N	195.00	8443.99
dec54aec-c983-449e-80f2-afe38675c328	9d412d65-744a-4c40-a7d2-b6d8e860e5af	SPARE_PART	\N	906e12f5-2ff5-4f4a-830d-59bcf4b2af6c	10	10	0	0	10	\N	\N	110.00	1100.00	2026-08-13 00:27:53.317955	2026-08-13 00:36:41.253935	LOCAL-MPN-010	\N	\N	190.00	8443.99
b7e31fd2-eaab-4026-807c-5ebe1282e2a2	9d412d65-744a-4c40-a7d2-b6d8e860e5af	SPARE_PART	\N	d359789d-4659-43b5-8d4c-a1b67aee874a	10	10	0	0	10	\N	\N	109.00	1090.00	2026-08-13 00:27:53.317955	2026-08-13 00:36:41.3173	LOCAL-MPN-009	\N	\N	189.00	8443.99
e51b137e-7250-4f76-ac98-1643f677070c	9d412d65-744a-4c40-a7d2-b6d8e860e5af	MODEL	89e41806-11eb-4599-bfbc-7d50208c5e5f	\N	3	3	0	0	3	\N	\N	4000.00	12000.00	2026-08-13 00:27:53.317955	2026-08-13 00:29:37.634378	\N	\N	\N	6500.00	\N
6d438ed7-d62e-4de0-82c0-bd61f14d62b7	9d412d65-744a-4c40-a7d2-b6d8e860e5af	MODEL	4e72c048-49ed-4f27-a991-dba112ca653c	\N	4	4	0	0	4	\N	\N	4000.00	16000.00	2026-08-13 00:27:53.317955	2026-08-13 00:29:37.220649	\N	\N	\N	6500.00	\N
87eaf58e-d7f6-4e23-98de-0c1e423faba2	9d412d65-744a-4c40-a7d2-b6d8e860e5af	SPARE_PART	\N	172af344-57e0-4dc8-8b84-a1dfbf231526	10	10	0	0	10	\N	\N	108.00	1080.00	2026-08-13 00:27:53.317955	2026-08-13 00:36:41.466444	LOCAL-MPN-008	\N	\N	188.00	8443.99
493e6b6f-f61f-4136-9f11-bb414f20ef86	9d412d65-744a-4c40-a7d2-b6d8e860e5af	SPARE_PART	\N	6700d45f-061b-4de7-a465-e76cf906c1c7	10	10	0	0	10	\N	\N	107.00	1070.00	2026-08-13 00:27:53.317955	2026-08-13 00:36:41.570645	LOCAL-MPN-007	\N	\N	187.00	8443.99
05abbbf5-4e41-4530-b316-812e91ea7bc4	9d412d65-744a-4c40-a7d2-b6d8e860e5af	MODEL	323212ba-c2f8-4737-b8a2-1d5c0f7b7498	\N	3	3	0	0	3	\N	\N	4000.00	12000.00	2026-08-13 00:27:53.317955	2026-08-13 00:29:37.715801	\N	\N	\N	6500.00	\N
7e168f31-ac93-46cd-975a-082ae1a19819	9d412d65-744a-4c40-a7d2-b6d8e860e5af	MODEL	6387b291-01bb-4dbd-803b-55aed761c0ed	\N	4	4	0	0	4	\N	\N	4000.00	16000.00	2026-08-13 00:27:53.317955	2026-08-13 00:29:37.354552	\N	\N	\N	6500.00	\N
1fec4238-6171-493d-b809-a41af9541f9e	9d412d65-744a-4c40-a7d2-b6d8e860e5af	SPARE_PART	\N	ddcd43e0-0975-4773-aafa-c1ec267569ca	10	10	0	0	10	\N	\N	120.00	1200.00	2026-08-13 00:27:53.317955	2026-08-13 00:36:40.526285	LOCAL-MPN-020	\N	\N	200.00	8443.99
be0fae6f-9967-4090-84be-66f204293d03	9d412d65-744a-4c40-a7d2-b6d8e860e5af	SPARE_PART	\N	eef1c8e7-809a-494b-af1d-1a3a3d815301	10	10	0	0	10	\N	\N	119.00	1190.00	2026-08-13 00:27:53.317955	2026-08-13 00:36:40.592737	LOCAL-MPN-019	\N	\N	199.00	8443.99
72578cd9-f046-4e37-af32-bef40b2ad404	9d412d65-744a-4c40-a7d2-b6d8e860e5af	MODEL	a24b61b0-f02e-48cd-b7af-08d9d600e399	\N	3	3	0	0	3	\N	\N	4000.00	12000.00	2026-08-13 00:27:53.317955	2026-08-13 00:29:37.46066	\N	\N	\N	6500.00	\N
33d6b213-40ab-439a-b955-74a624ffb359	9d412d65-744a-4c40-a7d2-b6d8e860e5af	SPARE_PART	\N	624de18a-3e21-4814-9457-4e69e685e6a4	10	10	0	0	10	\N	\N	118.00	1180.00	2026-08-13 00:27:53.317955	2026-08-13 00:36:40.652794	LOCAL-MPN-018	\N	\N	198.00	8443.99
11ff0b2e-4154-49b7-a0cb-4cf72d1398ed	9d412d65-744a-4c40-a7d2-b6d8e860e5af	SPARE_PART	\N	a8f91be3-8b46-4eb1-990c-499c5c3514cd	10	10	0	0	10	\N	\N	117.00	1170.00	2026-08-13 00:27:53.317955	2026-08-13 00:36:40.73915	LOCAL-MPN-017	\N	\N	197.00	8443.99
61964db2-f277-4017-8655-dde17005d1df	9d412d65-744a-4c40-a7d2-b6d8e860e5af	MODEL	73d6d724-7ec6-48a0-8eb6-42544003cfb9	\N	3	3	0	0	3	\N	\N	4000.00	12000.00	2026-08-13 00:27:53.317955	2026-08-13 00:29:37.545127	\N	\N	\N	6500.00	\N
6fc38546-e9d0-4d5d-8bcf-86b985c8240f	9d412d65-744a-4c40-a7d2-b6d8e860e5af	SPARE_PART	\N	c67c9aaf-2019-4bc3-939b-ffdb7618fab8	10	10	0	0	10	\N	\N	116.00	1160.00	2026-08-13 00:27:53.317955	2026-08-13 00:36:40.82572	LOCAL-MPN-016	\N	\N	196.00	8443.99
0a654737-680c-4116-872d-19735418ba9b	9d412d65-744a-4c40-a7d2-b6d8e860e5af	SPARE_PART	\N	e1df7117-7a0a-44cb-8ea5-32a6f2ab2f98	10	10	0	0	10	\N	\N	115.00	1150.00	2026-08-13 00:27:53.317955	2026-08-13 00:36:40.909523	LOCAL-MPN-015	\N	\N	195.00	8443.99
bce82a92-cd20-400e-9008-72f3769609fa	9d412d65-744a-4c40-a7d2-b6d8e860e5af	SPARE_PART	\N	d2ba072a-46d4-441f-88b1-e4176eac8756	10	10	0	0	10	\N	\N	114.00	1140.00	2026-08-13 00:27:53.317955	2026-08-13 00:36:40.987442	LOCAL-MPN-014	\N	\N	194.00	8443.99
1e444b5a-9cae-478e-8eed-ae4cefec0c17	9d412d65-744a-4c40-a7d2-b6d8e860e5af	SPARE_PART	\N	6bdfa773-6d70-47a8-97f5-40eda234a226	10	10	0	0	10	\N	\N	113.00	1130.00	2026-08-13 00:27:53.317955	2026-08-13 00:36:41.077304	LOCAL-MPN-013	\N	\N	193.00	8443.99
6360c2d7-125f-445d-8c26-412ed85329f7	9d412d65-744a-4c40-a7d2-b6d8e860e5af	SPARE_PART	\N	c9fa8d7b-3e86-458e-af85-0a329216b5e3	10	10	0	0	10	\N	\N	112.00	1120.00	2026-08-13 00:27:53.317955	2026-08-13 00:36:41.137693	LOCAL-MPN-012	\N	\N	192.00	8443.99
42892197-8bb6-4592-a434-9d3c92d1782a	9d412d65-744a-4c40-a7d2-b6d8e860e5af	SPARE_PART	\N	efa21243-5d18-4ef9-9bef-5469a428bc92	10	10	0	0	10	\N	\N	111.00	1110.00	2026-08-13 00:27:53.317955	2026-08-13 00:36:41.196428	LOCAL-MPN-011	\N	\N	191.00	8443.99
f84a5197-5676-44ab-81ce-9f2a63463432	9d412d65-744a-4c40-a7d2-b6d8e860e5af	SPARE_PART	\N	003fe45c-c385-4d4c-a696-7a1c8881f5ec	10	10	0	0	10	\N	\N	106.00	1060.00	2026-08-13 00:27:53.317955	2026-08-13 00:36:41.629439	LOCAL-MPN-006	\N	\N	186.00	8443.99
5e30bbbf-58c4-47d2-adca-8d1e2561a21d	9d412d65-744a-4c40-a7d2-b6d8e860e5af	SPARE_PART	\N	fa088bd9-712f-49a2-8c30-484516420520	10	10	0	0	10	\N	\N	105.00	1050.00	2026-08-13 00:27:53.317955	2026-08-13 00:36:41.688201	LOCAL-MPN-005	\N	\N	185.00	8443.99
4aaa8135-6d69-4745-9fc8-06a2e026773f	9d412d65-744a-4c40-a7d2-b6d8e860e5af	SPARE_PART	\N	b7d213c8-f327-4ca8-85ff-6cab26936b60	10	10	0	0	10	\N	\N	104.00	1040.00	2026-08-13 00:27:53.317955	2026-08-13 00:36:41.746761	LOCAL-MPN-004	\N	\N	184.00	8443.99
a18e11dd-84ed-4dd2-9ffe-85b0d060937d	9d412d65-744a-4c40-a7d2-b6d8e860e5af	SPARE_PART	\N	90b5260f-fb0c-49d0-9224-61dde417ee3d	10	10	0	0	10	\N	\N	103.00	1030.00	2026-08-13 00:27:53.317955	2026-08-13 00:36:41.803901	LOCAL-MPN-003	\N	\N	183.00	8443.99
a137896c-d26d-4c54-908a-c469fc48fbe8	9d412d65-744a-4c40-a7d2-b6d8e860e5af	SPARE_PART	\N	a0fd1296-3bff-4608-9f9a-1aa4516523ce	10	10	0	0	10	\N	\N	102.00	1020.00	2026-08-13 00:27:53.317955	2026-08-13 00:36:41.855768	LOCAL-MPN-002	\N	\N	182.00	8443.99
d1600b0f-8745-485b-a71b-d5abcb2b5ce7	9d412d65-744a-4c40-a7d2-b6d8e860e5af	SPARE_PART	\N	9fab0e23-aa6d-415e-a259-99b4dddd8f6f	10	10	0	0	10	\N	\N	101.00	1010.00	2026-08-13 00:27:53.317955	2026-08-13 00:36:41.915501	LOCAL-MPN-001	\N	\N	181.00	8443.99
b168b7f4-bc28-4e1d-98ae-6169cfb739e4	11a8c61b-2966-45dd-9cce-99869ebeb08d	SPARE_PART	\N	a63e1b1e-313b-4aa7-84fe-ed228c704fc1	10	10	0	0	10	\N	\N	120.00	1200.00	2026-08-13 00:27:53.518172	2026-08-13 00:36:41.975066	INTL-MPN-020	\N	\N	200.00	8443.99
0dec8340-f913-44eb-90d0-f562a4c36ae5	11a8c61b-2966-45dd-9cce-99869ebeb08d	SPARE_PART	\N	df5aa278-9062-4a05-812e-be78c751c025	10	10	0	0	10	\N	\N	119.00	1190.00	2026-08-13 00:27:53.518172	2026-08-13 00:36:42.038724	INTL-MPN-019	\N	\N	199.00	8443.99
a2cf7298-2f45-462f-8116-86ad04733cf3	11a8c61b-2966-45dd-9cce-99869ebeb08d	SPARE_PART	\N	fce729a1-1994-4dc4-a2b5-20e3426c27c0	10	10	0	0	10	\N	\N	118.00	1180.00	2026-08-13 00:27:53.518172	2026-08-13 00:36:42.097726	INTL-MPN-018	\N	\N	198.00	8443.99
\.


--
-- Data for Name: lots; Type: TABLE DATA; Schema: public; Owner: xerouser
--

COPY public.lots (id, lot_number, vendor_id, purchase_date, total_amount, status, branch_id, warehouse_id, created_by, notes, created_at, updated_at, currency_code, exchange_rate_snapshot, purchase_origin, transfer_origin, transfer_id, transport_mode, carrier_name, dispatch_date, estimated_arrival, actual_arrival, shipment_status, shipment_details) FROM stdin;
9d412d65-744a-4c40-a7d2-b6d8e860e5af	LOT-AE-LOCAL-001	a3895b10-f1af-4174-aff6-88b1be2b4e67	2026-08-02	102100.00	RECEIVED	c24a0a2c-6b0f-4ae5-aaaf-0346a65e6b6e	4ec082a2-78bf-444b-ab48-ead04698f72b	\N	LOCAL purchase test lot	2026-08-13 00:27:53.317955	2026-08-13 00:28:40.443063	AED	\N	DOMESTIC	f	\N	\N	\N	\N	\N	\N	\N	\N
11a8c61b-2966-45dd-9cce-99869ebeb08d	LOT-AE-INTL-001	11555e83-e627-404b-8da9-ae775e54f9b5	2026-08-03	94100.00	RECEIVED	c24a0a2c-6b0f-4ae5-aaaf-0346a65e6b6e	4ec082a2-78bf-444b-ab48-ead04698f72b	\N	INTL purchase test lot	2026-08-13 00:27:53.518172	2026-08-13 00:28:40.826704	AED	\N	INTERNATIONAL	f	\N	\N	\N	\N	\N	\N	\N	\N
\.


--
-- Data for Name: machine_service_history; Type: TABLE DATA; Schema: public; Owner: xerouser
--

COPY public.machine_service_history (id, "productId", "serialNumber", "totalServiceVisits", "totalPreventativeVisits", "lastServiceDate", "nextScheduledMaintenanceDate", "totalPartsSpend", "totalLabourSpend", "totalLifetimeCost", "updatedAt") FROM stdin;
\.


--
-- Data for Name: model; Type: TABLE DATA; Schema: public; Owner: xerouser
--

COPY public.model (id, model_no, model_name, hs_code, brand_id, description, quantity, available, rented, leased, sold, branch_id, max_discountable_amount) FROM stdin;
4c217962-0457-4c96-8a1a-75af057dc8bd	T-4500DW	MFC MULTIFUNCTIONAL 	\N	f2cf79db-f489-498b-a17c-9cea21ca74c6	BROTHER MODEL	1	0	1	0	0	426625c1-62e8-4e14-952b-457452eb0f28	0.00
36782f49-6661-4bd9-90fc-d47ec4c265e1	HL-12321D	HL HEVY LASER	\N	f2cf79db-f489-498b-a17c-9cea21ca74c6	BROTHER MODEL	1	0	1	0	0	426625c1-62e8-4e14-952b-457452eb0f28	0.00
a24b61b0-f02e-48cd-b7af-08d9d600e399	MP-C4504	Ricoh MP C4504	\N	cb9dae72-aa40-469e-a606-878999cc7d7f	Ricoh MP C4504	6	6	0	0	0	c24a0a2c-6b0f-4ae5-aaaf-0346a65e6b6e	0.00
73d6d724-7ec6-48a0-8eb6-42544003cfb9	MP-C6004	Ricoh MP C6004	\N	cb9dae72-aa40-469e-a606-878999cc7d7f	Ricoh MP C6004	6	6	0	0	0	c24a0a2c-6b0f-4ae5-aaaf-0346a65e6b6e	0.00
89e41806-11eb-4599-bfbc-7d50208c5e5f	TASKALFA-5053	Kyocera TASKalfa 5053ci	\N	74c4de6b-a846-4372-acae-7177acde47be	Kyocera TASKalfa 5053ci	6	6	0	0	0	c24a0a2c-6b0f-4ae5-aaaf-0346a65e6b6e	0.00
323212ba-c2f8-4737-b8a2-1d5c0f7b7498	TASKALFA-3253	Kyocera TASKalfa 3253ci	\N	74c4de6b-a846-4372-acae-7177acde47be	Kyocera TASKalfa 3253ci	6	6	0	0	0	c24a0a2c-6b0f-4ae5-aaaf-0346a65e6b6e	0.00
4e72c048-49ed-4f27-a991-dba112ca653c	IR-ADV-C5560	Canon imageRUNNER C5560	\N	a7fe8c6e-6f3d-4478-971e-659e3e6b658c	Canon imageRUNNER C5560	8	5	1	0	0	c24a0a2c-6b0f-4ae5-aaaf-0346a65e6b6e	0.00
6387b291-01bb-4dbd-803b-55aed761c0ed	IR-ADV-C3530	Canon imageRUNNER C3530	\N	a7fe8c6e-6f3d-4478-971e-659e3e6b658c	Canon imageRUNNER C3530	8	7	1	0	0	c24a0a2c-6b0f-4ae5-aaaf-0346a65e6b6e	0.00
52ad7358-d803-458c-b7ff-a1f69c3ca428	DJ-2820	DeskJet	\N	91e7d160-72be-4808-a76b-6c2ecd8dfc45	HP MODEL	1	1	0	0	0	426625c1-62e8-4e14-952b-457452eb0f28	0.00
7f17c640-648e-4ddc-949f-98d574b72f82	LJ-1020	LASER-JET	\N	91e7d160-72be-4808-a76b-6c2ecd8dfc45	HP MODEL	1	1	0	0	0	426625c1-62e8-4e14-952b-457452eb0f28	0.00
85e56377-23b9-438a-b25c-f332ebcb2cb3	T820DW	DCP COPIER 	\N	f2cf79db-f489-498b-a17c-9cea21ca74c6	BROTHER MODEL	1	1	0	0	0	426625c1-62e8-4e14-952b-457452eb0f28	0.00
44a967c8-a9e6-48b5-87cd-f351dcbf9904	WF-C5890	WorkForce	\N	3501f006-d7fd-4ef9-9f3b-3a2918590212	EPSON MODEL	1	0	0	0	1	426625c1-62e8-4e14-952b-457452eb0f28	0.00
53e2bd4a-6baa-454c-8610-f93b6e43f27b	ST-520	EcoTank	\N	3501f006-d7fd-4ef9-9f3b-3a2918590212	EPSON MODEL	1	0	0	0	1	426625c1-62e8-4e14-952b-457452eb0f28	0.00
a4469217-ba28-436d-9b8f-9a546df29573	ST-670	SMART TANK	\N	91e7d160-72be-4808-a76b-6c2ecd8dfc45	HP MODEL	1	0	1	0	0	426625c1-62e8-4e14-952b-457452eb0f28	0.00
\.


--
-- Data for Name: processed_invoice_items; Type: TABLE DATA; Schema: public; Owner: xerouser
--

COPY public.processed_invoice_items (invoice_item_id, processed_at) FROM stdin;
\.


--
-- Data for Name: products; Type: TABLE DATA; Schema: public; Owner: xerouser
--

COPY public.products (id, model_id, warehouse_id, spare_part_id, vendor_id, lot_id, serial_no, name, brand, "MFD", tax_rate, sale_price, product_status, print_colour, max_discount_amount, wholesale_price, "imageUrl", created_at, purchase_price, description, hs_code, features, warranty, consumables, barcode_id, ownership, warranty_start_date, warranty_end_date, warranty_max_pages, meter_reading, customer_id, branch_id, contract_id, transfer_status, updated_at, created_by, updated_by, deleted_at) FROM stdin;
94c48ac2-a1b4-4587-b6b9-20e53ddd4065	52ad7358-d803-458c-b7ff-a1f69c3ca428	247a8c42-259f-446c-b293-2ae83b83cb25	\N	96528c5f-d9e1-4be5-a6a3-81f355c397cb	\N	77489200438	HP DESKJET-2820	HP	2026-08-10	0.00	40000.00	AVAILABLE	BOTH	1000.00	37000.00	https://pub-8bbb88e1d79042349d0bc47ad1f3eb23.r2.dev/products/1786346393572-1.jpg	2026-08-10 12:49:55.414556	30000.00	The HP DeskJet 2820 is an all-in-one wireless color inkjet printer designed for home use. It handles printing, scanning, and copying with print speeds up to 7.5 ppm (mono) and 5.5 ppm (color). It connects via Wi-Fi, Bluetooth, and USB, typically costing around ₹5,999.Key SpecificationsFunctions: Print, scan, and copyPrint Technology: Thermal inkjetConnectivity: Dual-band Wi-Fi, USB 2.0, Bluetooth, and mobile printing via the HP app or Apple AirPrintPaper Handling: 60-sheet input tray, 25-sheet output trayMonthly Duty Cycle: Up to 1,000 pagesSetup & SupportInitial setup requires plugging in the device, installing the setup ink cartridges, and pairing it via mobile or PC using the HP app setup guide.Drivers and troubleshooting tools are available directly through HP Support.If you need more help, let me know if you are looking for:Driver installation stepsWi-Fi troubleshooting or resetting the networkInk cartridge compatibility	7838	\N	\N	\N	XC-P-77489200438	SALE	\N	\N	200000	0	\N	\N	\N	NONE	2026-08-10 12:49:55.414556	019c5b7d-20cf-4ef4-971a-91235dd6c10c	\N	\N
db86028c-6863-4575-8964-648aaeaeb073	7f17c640-648e-4ddc-949f-98d574b72f82	247a8c42-259f-446c-b293-2ae83b83cb25	\N	96528c5f-d9e1-4be5-a6a3-81f355c397cb	\N	32454434	HP LASERJET 1020	HP	2026-08-10	0.00	30000.00	AVAILABLE	BOTH	500.00	27000.00	https://pub-8bbb88e1d79042349d0bc47ad1f3eb23.r2.dev/products/1786346552753-2.jpg	2026-08-10 12:52:33.120871	25000.00	The HP LaserJet 1020 is a compact, monochrome single-function laser printer released by HP. Known for high durability and reliability, it prints up to 14 pages per minute at 600x600 dpi resolution via a Hi-Speed USB 2.0 connection. The original model and its "Plus" variant are officially discontinued, though widely used secondhand or via compatible parts.Key Specifications & FeaturesPrint Speed: Up to 14 pages per minute (A4)Resolution: 600 x 600 dpi (1200 dpi effective with FastRes)Paper Capacity: 150-sheet input tray, 1-sheet priority slotToner Cartridge: Uses HP 12A (Q2612A) black cartridgeConnectivity: USB 2.0 port (no built-in Wi-Fi or network port)Monthly Duty Cycle: Up to 5,000 pagesDrivers & SetupThe original hardware lacks native plug-and-play support on modern operating systems, but drivers remain accessible. You can download official software packages from the HP Support Center.Watch this step-by-step tutorial to see how to install and configure the printer software on your computer:	34244	\N	\N	\N	XC-P-32454434	SALE	\N	\N	200000	0	\N	\N	\N	NONE	2026-08-10 12:52:33.120871	019c5b7d-20cf-4ef4-971a-91235dd6c10c	\N	\N
cb65cd5c-5b5d-4560-a47f-552bf0e5aa0c	85e56377-23b9-438a-b25c-f332ebcb2cb3	247a8c42-259f-446c-b293-2ae83b83cb25	\N	96528c5f-d9e1-4be5-a6a3-81f355c397cb	\N	674883893	BROTHER T820W	BROTHER	2026-08-10	0.00	20000.00	AVAILABLE	BLACK_WHITE	1000.00	17000.00	https://pub-8bbb88e1d79042349d0bc47ad1f3eb23.r2.dev/products/1786346960252-4.jpeg	2026-08-10 12:59:20.715565	15000.00	The Brother DCP-T820DW (often searched as T820W) is a color multifunction ink tank printer featuring print, scan, copy, automatic 2-sided (duplex) printing, Wi-Fi, Ethernet, and an Automatic Document Feeder (ADF). It typically sells for around ₹16,500 to ₹23,850 in India.Key SpecificationsFunctions: Print, Scan, CopyPrint Speed: Up to 30 ppm (mono) and 26 ppm (color) / ISO up to 17/16 ipmPaper Handling: Automatic 2-sided printing (Duplex) and a 20-sheet ADFConnectivity: Wi-Fi, Wi-Fi Direct, Ethernet (LAN), USB 2.0Page Yield: Up to 7,500 pages for black ink and 5,000 pages for color ink bottlesSupport and DownloadsYou can get software setup files and drivers from the Brother Support Downloads page.View full technical parameters on the official Brother India DCP-T820DW product page.Watch this video for a visual guide on setting up your Brother ink tank printer:	435673	\N	\N	\N	XC-P-674883893	SALE	\N	\N	200000	0	\N	\N	\N	NONE	2026-08-10 12:59:20.715565	019c5b7d-20cf-4ef4-971a-91235dd6c10c	\N	\N
4f19426e-ebd0-4230-9a72-c077b6b0b0b5	a4469217-ba28-436d-9b8f-9a546df29573	247a8c42-259f-446c-b293-2ae83b83cb25	\N	96528c5f-d9e1-4be5-a6a3-81f355c397cb	\N	45627878967	HP SMART TANK 670	HP	2026-08-10	0.00	25000.00	RENTED	BOTH	200.00	23000.00	https://pub-8bbb88e1d79042349d0bc47ad1f3eb23.r2.dev/products/1786346798057-3.jpg	2026-08-10 12:56:38.648585	20000.00	The HP Smart Tank 670 is a wireless, all-in-one color ink tank printer built for high-volume home and office use. It typically costs around ₹20,275 and features automatic two-sided (duplex) printing, a 150-sheet input tray, dual-band Wi-Fi, and high-capacity spill-free ink tanks yielding up to 6,000 black or 8,000 color pages.Watch this step-by-step tutorial to learn how to prepare, unpack, and initialize your HP Smart Tank printer:\r\n	5672	\N	\N	\N	XC-P-45627878967	RENT	\N	\N	200000	0	f4e495c8-8a12-4805-94bc-05f3b33421b5	\N	\N	NONE	2026-08-10 17:14:13.141069	019c5b7d-20cf-4ef4-971a-91235dd6c10c	\N	\N
6809bc5c-a899-4419-b29c-9056060025c1	36782f49-6661-4bd9-90fc-d47ec4c265e1	247a8c42-259f-446c-b293-2ae83b83cb25	\N	96528c5f-d9e1-4be5-a6a3-81f355c397cb	\N	677874883	BROTHER HL-12321D	BROTHER	2026-08-10	0.00	25000.00	RENTED	BOTH	2000.00	20000.00	https://pub-8bbb88e1d79042349d0bc47ad1f3eb23.r2.dev/products/1786347117192-5.jpg	2026-08-10 13:01:57.706271	15000.00	The Brother HL-L2321D is a single-function monochrome laser printer priced around ₹10,800 to ₹12,200 featuring automatic duplex printing and speeds up to 30 ppm.Key SpecificationsPrint Speed: Up to 30 pages per minute (A4/Letter)Print Resolution: Up to 2400 x 600 dpi (HQ1200 quality)Paper Capacity: 250-sheet standard paper tray and 1-sheet manual feed slotConnectivity: Hi-Speed USB 2.0 (no built-in Wi-Fi or Ethernet)Toner Yield: Uses TN-2365 cartridge yielding up to 2,600 pagesIf you'd like, let me know:Are you looking for driver download links or troubleshooting help?Do you need assistance with setting up duplex printing?	456464	\N	\N	\N	XC-P-677874883	RENT	\N	\N	200000	0	f4e495c8-8a12-4805-94bc-05f3b33421b5	\N	\N	NONE	2026-08-11 12:35:15.915401	019c5b7d-20cf-4ef4-971a-91235dd6c10c	\N	\N
9c1d2c98-8275-4ae3-b8c5-acf20c331a8e	6387b291-01bb-4dbd-803b-55aed761c0ed	4ec082a2-78bf-444b-ab48-ead04698f72b	\N	a3895b10-f1af-4174-aff6-88b1be2b4e67	9d412d65-744a-4c40-a7d2-b6d8e860e5af	AE-SN-0006	IR-ADV-C3530 unit 6	IR	2026-01-15	5.00	6500.00	AVAILABLE	COLOUR	300.00	5800.00	\N	2026-08-13 00:29:37.299585	4000.00	Test unit 6	8443.31	\N	12 months	\N	XC-P-AE-SN-0006	SALE	\N	\N	200000	0	\N	\N	\N	NONE	2026-08-13 00:29:37.299585	531e24ad-e487-47a8-8096-3de80d3e5d8a	\N	\N
95cdd425-4aac-4070-8fe0-ece031cdef3c	6387b291-01bb-4dbd-803b-55aed761c0ed	4ec082a2-78bf-444b-ab48-ead04698f72b	\N	a3895b10-f1af-4174-aff6-88b1be2b4e67	9d412d65-744a-4c40-a7d2-b6d8e860e5af	AE-SN-0007	IR-ADV-C3530 unit 7	IR	2026-01-15	5.00	6500.00	AVAILABLE	COLOUR	300.00	5800.00	\N	2026-08-13 00:29:37.33046	4000.00	Test unit 7	8443.31	\N	12 months	\N	XC-P-AE-SN-0007	SALE	\N	\N	200000	0	\N	\N	\N	NONE	2026-08-13 00:29:37.33046	531e24ad-e487-47a8-8096-3de80d3e5d8a	\N	\N
f09b14d7-1236-4ce5-8572-eed930773447	6387b291-01bb-4dbd-803b-55aed761c0ed	4ec082a2-78bf-444b-ab48-ead04698f72b	\N	a3895b10-f1af-4174-aff6-88b1be2b4e67	9d412d65-744a-4c40-a7d2-b6d8e860e5af	AE-SN-0008	IR-ADV-C3530 unit 8	IR	2026-01-15	5.00	6500.00	AVAILABLE	COLOUR	300.00	5800.00	\N	2026-08-13 00:29:37.367411	4000.00	Test unit 8	8443.31	\N	12 months	\N	XC-P-AE-SN-0008	SALE	\N	\N	200000	0	\N	\N	\N	NONE	2026-08-13 00:29:37.367411	531e24ad-e487-47a8-8096-3de80d3e5d8a	\N	\N
0a1b990b-8127-4e5b-bcc5-b75f2ccaab22	a24b61b0-f02e-48cd-b7af-08d9d600e399	4ec082a2-78bf-444b-ab48-ead04698f72b	\N	a3895b10-f1af-4174-aff6-88b1be2b4e67	9d412d65-744a-4c40-a7d2-b6d8e860e5af	AE-SN-0009	MP-C4504 unit 9	MP	2026-01-15	5.00	6500.00	AVAILABLE	COLOUR	300.00	5800.00	\N	2026-08-13 00:29:37.403913	4000.00	Test unit 9	8443.31	\N	12 months	\N	XC-P-AE-SN-0009	SALE	\N	\N	200000	0	\N	\N	\N	NONE	2026-08-13 00:29:37.403913	531e24ad-e487-47a8-8096-3de80d3e5d8a	\N	\N
585a34c1-21ad-4b78-bf31-b0955e57db66	a24b61b0-f02e-48cd-b7af-08d9d600e399	4ec082a2-78bf-444b-ab48-ead04698f72b	\N	a3895b10-f1af-4174-aff6-88b1be2b4e67	9d412d65-744a-4c40-a7d2-b6d8e860e5af	AE-SN-0010	MP-C4504 unit 10	MP	2026-01-15	5.00	6500.00	AVAILABLE	COLOUR	300.00	5800.00	\N	2026-08-13 00:29:37.437294	4000.00	Test unit 10	8443.31	\N	12 months	\N	XC-P-AE-SN-0010	SALE	\N	\N	200000	0	\N	\N	\N	NONE	2026-08-13 00:29:37.437294	531e24ad-e487-47a8-8096-3de80d3e5d8a	\N	\N
27ee9e9a-bcd7-4ad3-90eb-29ff5c605b2d	44a967c8-a9e6-48b5-87cd-f351dcbf9904	247a8c42-259f-446c-b293-2ae83b83cb25	\N	96528c5f-d9e1-4be5-a6a3-81f355c397cb	\N	5678263	EPSON WORKFORCE-C5890	Epson	2026-08-10	0.00	50000.00	SOLD	BOTH	1000.00	47000.00	https://pub-8bbb88e1d79042349d0bc47ad1f3eb23.r2.dev/products/1786348148562-9.webp	2026-08-10 13:19:09.005293	40000.00	The Epson WorkForce Pro WF-C5890 (often searched as wc5890) is an A4 color 4-in-1 business inkjet multifunction printer designed for workgroups. It features print, copy, scan, and fax capabilities, driven by Epson’s PrecisionCore Heat-Free technology. Prices typically range from ₹31,000 to ₹66,000 depending on the supplier and bundled ink packs.Key Specifications & FeaturesPrint Speed: Up to 25 ISO ppm (mono/color) and up to 34 ppm in draft mode.First Page Out: ~4.8 seconds in black and 5.3 seconds in color with no warmup time.Ink System: Uses high-yield Replaceable Ink Pack System (RIPS) packs rather than standard cartridges, reducing intervention and printing costs.Paper Capacity: 330-sheet standard capacity (expandable up to 1,830 sheets with optional trays).Scanner: 50-sheet Automatic Document Feeder (ADF) with automatic duplex scanning.Connectivity: Wi-Fi, Wi-Fi Direct, Ethernet, and USB 2.0 ports.A full review and speed test of the printer in action:	6537	\N	\N	\N	XC-P-5678263	SALE	\N	\N	200000	0	f4e495c8-8a12-4805-94bc-05f3b33421b5	\N	\N	NONE	2026-08-10 13:58:54.823543	019c5b7d-20cf-4ef4-971a-91235dd6c10c	\N	\N
1e3a8f25-f00f-43a8-928d-cc02f03b4621	53e2bd4a-6baa-454c-8610-f93b6e43f27b	247a8c42-259f-446c-b293-2ae83b83cb25	\N	96528c5f-d9e1-4be5-a6a3-81f355c397cb	\N	56674783	EPSON ECOTANK-ST-520	Epson	2026-08-10	0.00	30000.00	SOLD	BOTH	2000.00	27000.00	https://pub-8bbb88e1d79042349d0bc47ad1f3eb23.r2.dev/products/1786348015083-8.webp	2026-08-10 13:16:55.555466	20000.00	It looks like there is no official product named the Epson EcoTank ST-520. You might be combining the popular portable Epson PictureMate PM-520 Photo Printer or thinking of tank-style options like the HP Smart Tank 520.Clarifying the ModelsEpson PictureMate PM-520: A compact, wireless photo printer built for 4x6 borderless prints up to A5 size. It features a 2.7-inch LCD screen, Wi-Fi Direct, and an optional rechargeable battery for mobile photo labs. It typically sells for around ₹14,800 to ₹17,999.Epson EcoTank Line: Epson's cartridge-free ink tank printers (such as the L-series) focus on high-yield, low-cost document and photo printing, but use a different naming convention.If you meant a specific printer model or need help finding drivers, specifications, or troubleshooting for a device, please reply with the correct model name or brand.	7886	\N	\N	\N	XC-P-56674783	SALE	\N	\N	200000	0	f4e495c8-8a12-4805-94bc-05f3b33421b5	\N	\N	NONE	2026-08-10 16:54:16.818085	019c5b7d-20cf-4ef4-971a-91235dd6c10c	\N	\N
ebea2256-4ff9-438a-bd73-bd61d320fba9	4c217962-0457-4c96-8a1a-75af057dc8bd	247a8c42-259f-446c-b293-2ae83b83cb25	\N	96528c5f-d9e1-4be5-a6a3-81f355c397cb	\N	7456476830	BROTHER T-4500DW	BROTHER	2026-08-10	0.00	40000.00	RENTED	BOTH	2000.00	35000.00	https://pub-8bbb88e1d79042349d0bc47ad1f3eb23.r2.dev/products/1786347289120-6.jpg	2026-08-10 13:04:49.505018	30000.00	The Brother MFC-T4500DW is a versatile A3 color ink tank all-in-one printer designed for business and heavy office use. It supports printing, scanning, copying, and faxing, featuring automatic two-sided (duplex) A4/A3 printing, wireless and Ethernet connectivity, and an Automatic Document Feeder (ADF).Key SpecificationsFunctions: Print, Scan, Copy, FaxMax Paper Size: Up to A3Print Speed: Up to 22 ipm (mono) and 20 ipm (color) / approx. 35 ppm / 27 ppm maxPaper Capacity: Standard tray holds up to 250 sheetsConnectivity: Wi-Fi, Wi-Fi Direct, Ethernet, and USB 2.0Page Yield (Ink Tanks): Approx. 6,500 pages for black and 5,000 pages for color bottlesSoftware and SetupYou can access setup guides, utilities, and software packages via the Brother Support and Downloads page.Compatible with mobile printing applications for iOS and Android devices.If you need specific assistance regarding the Brother MFC-T4500DW, please let me know:Are you looking for driver installation links or troubleshooting help?Do you need help with Wi-Fi setup or error codes?	567849	\N	\N	\N	XC-P-7456476830	RENT	\N	\N	200000	0	f4e495c8-8a12-4805-94bc-05f3b33421b5	\N	\N	NONE	2026-08-11 11:46:52.065379	019c5b7d-20cf-4ef4-971a-91235dd6c10c	\N	\N
ee5e6795-e970-42fd-b03a-091dadb9f502	4e72c048-49ed-4f27-a991-dba112ca653c	4ec082a2-78bf-444b-ab48-ead04698f72b	\N	a3895b10-f1af-4174-aff6-88b1be2b4e67	9d412d65-744a-4c40-a7d2-b6d8e860e5af	AE-SN-0002	IR-ADV-C5560 unit 2	IR	2026-01-15	5.00	6500.00	AVAILABLE	COLOUR	300.00	5800.00	\N	2026-08-13 00:29:37.158358	4000.00	Test unit 2	8443.31	\N	12 months	\N	XC-P-AE-SN-0002	SALE	\N	\N	200000	0	\N	\N	\N	NONE	2026-08-13 00:29:37.158358	531e24ad-e487-47a8-8096-3de80d3e5d8a	\N	\N
261030a9-9484-4d06-90aa-41a97a58e263	4e72c048-49ed-4f27-a991-dba112ca653c	4ec082a2-78bf-444b-ab48-ead04698f72b	\N	a3895b10-f1af-4174-aff6-88b1be2b4e67	9d412d65-744a-4c40-a7d2-b6d8e860e5af	AE-SN-0001	IR-ADV-C5560 unit 1	IR	2026-01-15	5.00	6500.00	RETURNED	COLOUR	300.00	5800.00	\N	2026-08-13 00:29:37.108772	4000.00	Test unit 1	8443.31	\N	12 months	\N	XC-P-AE-SN-0001	SALE	\N	\N	200000	0	\N	\N	\N	NONE	2026-08-13 02:21:13.641814	531e24ad-e487-47a8-8096-3de80d3e5d8a	\N	\N
a231fe92-a5bd-4127-b93e-e626fcb6cae7	4e72c048-49ed-4f27-a991-dba112ca653c	4ec082a2-78bf-444b-ab48-ead04698f72b	\N	a3895b10-f1af-4174-aff6-88b1be2b4e67	9d412d65-744a-4c40-a7d2-b6d8e860e5af	AE-SN-0003	IR-ADV-C5560 unit 3	IR	2026-01-15	5.00	6500.00	RENTED	COLOUR	300.00	5800.00	\N	2026-08-13 00:29:37.1973	4000.00	Test unit 3	8443.31	\N	12 months	\N	XC-P-AE-SN-0003	RENT	\N	\N	200000	0	f889a7bb-8903-4570-bc4d-bdaf7444fe4a	\N	\N	NONE	2026-08-13 03:28:44.592461	531e24ad-e487-47a8-8096-3de80d3e5d8a	\N	\N
3e95e6ce-6832-40b8-b07b-981043b123b8	4e72c048-49ed-4f27-a991-dba112ca653c	4ec082a2-78bf-444b-ab48-ead04698f72b	\N	a3895b10-f1af-4174-aff6-88b1be2b4e67	9d412d65-744a-4c40-a7d2-b6d8e860e5af	AE-SN-0004	IR-ADV-C5560 unit 4	IR	2026-01-15	5.00	6500.00	RETURNED	COLOUR	300.00	5800.00	\N	2026-08-13 00:29:37.232783	4000.00	Test unit 4	8443.31	\N	12 months	\N	XC-P-AE-SN-0004	RENT	\N	\N	200000	0	\N	\N	\N	NONE	2026-08-13 03:37:52.024074	531e24ad-e487-47a8-8096-3de80d3e5d8a	\N	\N
68ee2cc4-82c6-4f79-a2f1-db436bd0b930	6387b291-01bb-4dbd-803b-55aed761c0ed	4ec082a2-78bf-444b-ab48-ead04698f72b	\N	a3895b10-f1af-4174-aff6-88b1be2b4e67	9d412d65-744a-4c40-a7d2-b6d8e860e5af	AE-SN-0005	IR-ADV-C3530 unit 5	IR	2026-01-15	5.00	6500.00	RENTED	COLOUR	300.00	5800.00	\N	2026-08-13 00:29:37.270679	4000.00	Test unit 5	8443.31	\N	12 months	\N	XC-P-AE-SN-0005	RENT	\N	\N	200000	0	f889a7bb-8903-4570-bc4d-bdaf7444fe4a	\N	\N	NONE	2026-08-13 03:37:52.094379	531e24ad-e487-47a8-8096-3de80d3e5d8a	\N	\N
09c009cf-18eb-4a52-a89a-06b0b22752c3	a24b61b0-f02e-48cd-b7af-08d9d600e399	4ec082a2-78bf-444b-ab48-ead04698f72b	\N	a3895b10-f1af-4174-aff6-88b1be2b4e67	9d412d65-744a-4c40-a7d2-b6d8e860e5af	AE-SN-0011	MP-C4504 unit 11	MP	2026-01-15	5.00	6500.00	AVAILABLE	COLOUR	300.00	5800.00	\N	2026-08-13 00:29:37.469415	4000.00	Test unit 11	8443.31	\N	12 months	\N	XC-P-AE-SN-0011	SALE	\N	\N	200000	0	\N	\N	\N	NONE	2026-08-13 00:29:37.469415	531e24ad-e487-47a8-8096-3de80d3e5d8a	\N	\N
cea5794d-0813-4388-a20b-0a7019ca571d	73d6d724-7ec6-48a0-8eb6-42544003cfb9	4ec082a2-78bf-444b-ab48-ead04698f72b	\N	a3895b10-f1af-4174-aff6-88b1be2b4e67	9d412d65-744a-4c40-a7d2-b6d8e860e5af	AE-SN-0012	MP-C6004 unit 12	MP	2026-01-15	5.00	6500.00	AVAILABLE	COLOUR	300.00	5800.00	\N	2026-08-13 00:29:37.498379	4000.00	Test unit 12	8443.31	\N	12 months	\N	XC-P-AE-SN-0012	SALE	\N	\N	200000	0	\N	\N	\N	NONE	2026-08-13 00:29:37.498379	531e24ad-e487-47a8-8096-3de80d3e5d8a	\N	\N
a731d9e9-d0be-4e23-833b-24ae0f32872c	73d6d724-7ec6-48a0-8eb6-42544003cfb9	4ec082a2-78bf-444b-ab48-ead04698f72b	\N	a3895b10-f1af-4174-aff6-88b1be2b4e67	9d412d65-744a-4c40-a7d2-b6d8e860e5af	AE-SN-0013	MP-C6004 unit 13	MP	2026-01-15	5.00	6500.00	AVAILABLE	COLOUR	300.00	5800.00	\N	2026-08-13 00:29:37.527966	4000.00	Test unit 13	8443.31	\N	12 months	\N	XC-P-AE-SN-0013	SALE	\N	\N	200000	0	\N	\N	\N	NONE	2026-08-13 00:29:37.527966	531e24ad-e487-47a8-8096-3de80d3e5d8a	\N	\N
0f6955e5-05ad-4242-8908-44175a7d4018	73d6d724-7ec6-48a0-8eb6-42544003cfb9	4ec082a2-78bf-444b-ab48-ead04698f72b	\N	a3895b10-f1af-4174-aff6-88b1be2b4e67	9d412d65-744a-4c40-a7d2-b6d8e860e5af	AE-SN-0014	MP-C6004 unit 14	MP	2026-01-15	5.00	6500.00	AVAILABLE	COLOUR	300.00	5800.00	\N	2026-08-13 00:29:37.553816	4000.00	Test unit 14	8443.31	\N	12 months	\N	XC-P-AE-SN-0014	SALE	\N	\N	200000	0	\N	\N	\N	NONE	2026-08-13 00:29:37.553816	531e24ad-e487-47a8-8096-3de80d3e5d8a	\N	\N
4203470a-0bd9-4b03-843b-2039e764acbd	89e41806-11eb-4599-bfbc-7d50208c5e5f	4ec082a2-78bf-444b-ab48-ead04698f72b	\N	a3895b10-f1af-4174-aff6-88b1be2b4e67	9d412d65-744a-4c40-a7d2-b6d8e860e5af	AE-SN-0015	TASKALFA-5053 unit 15	TASKALFA	2026-01-15	5.00	6500.00	AVAILABLE	COLOUR	300.00	5800.00	\N	2026-08-13 00:29:37.58375	4000.00	Test unit 15	8443.31	\N	12 months	\N	XC-P-AE-SN-0015	SALE	\N	\N	200000	0	\N	\N	\N	NONE	2026-08-13 00:29:37.58375	531e24ad-e487-47a8-8096-3de80d3e5d8a	\N	\N
d5ea36bd-86b6-4450-92f7-a38f3acbc925	89e41806-11eb-4599-bfbc-7d50208c5e5f	4ec082a2-78bf-444b-ab48-ead04698f72b	\N	a3895b10-f1af-4174-aff6-88b1be2b4e67	9d412d65-744a-4c40-a7d2-b6d8e860e5af	AE-SN-0016	TASKALFA-5053 unit 16	TASKALFA	2026-01-15	5.00	6500.00	AVAILABLE	COLOUR	300.00	5800.00	\N	2026-08-13 00:29:37.613408	4000.00	Test unit 16	8443.31	\N	12 months	\N	XC-P-AE-SN-0016	SALE	\N	\N	200000	0	\N	\N	\N	NONE	2026-08-13 00:29:37.613408	531e24ad-e487-47a8-8096-3de80d3e5d8a	\N	\N
dcffbc87-86be-468d-8c35-7de57f944c6e	89e41806-11eb-4599-bfbc-7d50208c5e5f	4ec082a2-78bf-444b-ab48-ead04698f72b	\N	a3895b10-f1af-4174-aff6-88b1be2b4e67	9d412d65-744a-4c40-a7d2-b6d8e860e5af	AE-SN-0017	TASKALFA-5053 unit 17	TASKALFA	2026-01-15	5.00	6500.00	AVAILABLE	COLOUR	300.00	5800.00	\N	2026-08-13 00:29:37.646107	4000.00	Test unit 17	8443.31	\N	12 months	\N	XC-P-AE-SN-0017	SALE	\N	\N	200000	0	\N	\N	\N	NONE	2026-08-13 00:29:37.646107	531e24ad-e487-47a8-8096-3de80d3e5d8a	\N	\N
1a138dca-888e-4982-bd9b-4f883ed09227	323212ba-c2f8-4737-b8a2-1d5c0f7b7498	4ec082a2-78bf-444b-ab48-ead04698f72b	\N	a3895b10-f1af-4174-aff6-88b1be2b4e67	9d412d65-744a-4c40-a7d2-b6d8e860e5af	AE-SN-0018	TASKALFA-3253 unit 18	TASKALFA	2026-01-15	5.00	6500.00	AVAILABLE	COLOUR	300.00	5800.00	\N	2026-08-13 00:29:37.671339	4000.00	Test unit 18	8443.31	\N	12 months	\N	XC-P-AE-SN-0018	SALE	\N	\N	200000	0	\N	\N	\N	NONE	2026-08-13 00:29:37.671339	531e24ad-e487-47a8-8096-3de80d3e5d8a	\N	\N
0592282d-99c9-46a2-b571-83f11e0f965e	323212ba-c2f8-4737-b8a2-1d5c0f7b7498	4ec082a2-78bf-444b-ab48-ead04698f72b	\N	a3895b10-f1af-4174-aff6-88b1be2b4e67	9d412d65-744a-4c40-a7d2-b6d8e860e5af	AE-SN-0019	TASKALFA-3253 unit 19	TASKALFA	2026-01-15	5.00	6500.00	AVAILABLE	COLOUR	300.00	5800.00	\N	2026-08-13 00:29:37.698757	4000.00	Test unit 19	8443.31	\N	12 months	\N	XC-P-AE-SN-0019	SALE	\N	\N	200000	0	\N	\N	\N	NONE	2026-08-13 00:29:37.698757	531e24ad-e487-47a8-8096-3de80d3e5d8a	\N	\N
2add1841-29b6-4512-b956-f02b238fbc3a	323212ba-c2f8-4737-b8a2-1d5c0f7b7498	4ec082a2-78bf-444b-ab48-ead04698f72b	\N	a3895b10-f1af-4174-aff6-88b1be2b4e67	9d412d65-744a-4c40-a7d2-b6d8e860e5af	AE-SN-0020	TASKALFA-3253 unit 20	TASKALFA	2026-01-15	5.00	6500.00	AVAILABLE	COLOUR	300.00	5800.00	\N	2026-08-13 00:29:37.725297	4000.00	Test unit 20	8443.31	\N	12 months	\N	XC-P-AE-SN-0020	SALE	\N	\N	200000	0	\N	\N	\N	NONE	2026-08-13 00:29:37.725297	531e24ad-e487-47a8-8096-3de80d3e5d8a	\N	\N
80c2fb62-24c9-4d05-89ae-8003fe5626c3	4e72c048-49ed-4f27-a991-dba112ca653c	4ec082a2-78bf-444b-ab48-ead04698f72b	\N	11555e83-e627-404b-8da9-ae775e54f9b5	11a8c61b-2966-45dd-9cce-99869ebeb08d	JP-SN-0001	IR-ADV-C5560 unit 1	IR	2026-01-15	5.00	6200.00	AVAILABLE	COLOUR	300.00	5500.00	\N	2026-08-13 00:29:37.837232	3600.00	Test unit 1	8443.31	\N	12 months	\N	XC-P-JP-SN-0001	SALE	\N	\N	200000	0	\N	\N	\N	NONE	2026-08-13 00:29:37.837232	531e24ad-e487-47a8-8096-3de80d3e5d8a	\N	\N
3dce1b86-7727-462b-8085-9a455d72310e	4e72c048-49ed-4f27-a991-dba112ca653c	4ec082a2-78bf-444b-ab48-ead04698f72b	\N	11555e83-e627-404b-8da9-ae775e54f9b5	11a8c61b-2966-45dd-9cce-99869ebeb08d	JP-SN-0002	IR-ADV-C5560 unit 2	IR	2026-01-15	5.00	6200.00	AVAILABLE	COLOUR	300.00	5500.00	\N	2026-08-13 00:29:37.868837	3600.00	Test unit 2	8443.31	\N	12 months	\N	XC-P-JP-SN-0002	SALE	\N	\N	200000	0	\N	\N	\N	NONE	2026-08-13 00:29:37.868837	531e24ad-e487-47a8-8096-3de80d3e5d8a	\N	\N
e12e7890-51a5-41bd-8895-a543a257fce4	4e72c048-49ed-4f27-a991-dba112ca653c	4ec082a2-78bf-444b-ab48-ead04698f72b	\N	11555e83-e627-404b-8da9-ae775e54f9b5	11a8c61b-2966-45dd-9cce-99869ebeb08d	JP-SN-0003	IR-ADV-C5560 unit 3	IR	2026-01-15	5.00	6200.00	AVAILABLE	COLOUR	300.00	5500.00	\N	2026-08-13 00:29:37.896128	3600.00	Test unit 3	8443.31	\N	12 months	\N	XC-P-JP-SN-0003	SALE	\N	\N	200000	0	\N	\N	\N	NONE	2026-08-13 00:29:37.896128	531e24ad-e487-47a8-8096-3de80d3e5d8a	\N	\N
0eda1cec-f3a8-4614-bd72-205ebdce5f22	4e72c048-49ed-4f27-a991-dba112ca653c	4ec082a2-78bf-444b-ab48-ead04698f72b	\N	11555e83-e627-404b-8da9-ae775e54f9b5	11a8c61b-2966-45dd-9cce-99869ebeb08d	JP-SN-0004	IR-ADV-C5560 unit 4	IR	2026-01-15	5.00	6200.00	AVAILABLE	COLOUR	300.00	5500.00	\N	2026-08-13 00:29:37.923499	3600.00	Test unit 4	8443.31	\N	12 months	\N	XC-P-JP-SN-0004	SALE	\N	\N	200000	0	\N	\N	\N	NONE	2026-08-13 00:29:37.923499	531e24ad-e487-47a8-8096-3de80d3e5d8a	\N	\N
12f1c2e3-cca6-4b1c-91e3-3341c9829b5a	6387b291-01bb-4dbd-803b-55aed761c0ed	4ec082a2-78bf-444b-ab48-ead04698f72b	\N	11555e83-e627-404b-8da9-ae775e54f9b5	11a8c61b-2966-45dd-9cce-99869ebeb08d	JP-SN-0005	IR-ADV-C3530 unit 5	IR	2026-01-15	5.00	6200.00	AVAILABLE	COLOUR	300.00	5500.00	\N	2026-08-13 00:29:37.949394	3600.00	Test unit 5	8443.31	\N	12 months	\N	XC-P-JP-SN-0005	SALE	\N	\N	200000	0	\N	\N	\N	NONE	2026-08-13 00:29:37.949394	531e24ad-e487-47a8-8096-3de80d3e5d8a	\N	\N
46b79041-3c39-48d1-a123-b333f7750987	6387b291-01bb-4dbd-803b-55aed761c0ed	4ec082a2-78bf-444b-ab48-ead04698f72b	\N	11555e83-e627-404b-8da9-ae775e54f9b5	11a8c61b-2966-45dd-9cce-99869ebeb08d	JP-SN-0006	IR-ADV-C3530 unit 6	IR	2026-01-15	5.00	6200.00	AVAILABLE	COLOUR	300.00	5500.00	\N	2026-08-13 00:29:37.979919	3600.00	Test unit 6	8443.31	\N	12 months	\N	XC-P-JP-SN-0006	SALE	\N	\N	200000	0	\N	\N	\N	NONE	2026-08-13 00:29:37.979919	531e24ad-e487-47a8-8096-3de80d3e5d8a	\N	\N
704ca1f2-9ed1-49fa-a8e6-d2118c1ddeb3	6387b291-01bb-4dbd-803b-55aed761c0ed	4ec082a2-78bf-444b-ab48-ead04698f72b	\N	11555e83-e627-404b-8da9-ae775e54f9b5	11a8c61b-2966-45dd-9cce-99869ebeb08d	JP-SN-0007	IR-ADV-C3530 unit 7	IR	2026-01-15	5.00	6200.00	AVAILABLE	COLOUR	300.00	5500.00	\N	2026-08-13 00:29:38.005678	3600.00	Test unit 7	8443.31	\N	12 months	\N	XC-P-JP-SN-0007	SALE	\N	\N	200000	0	\N	\N	\N	NONE	2026-08-13 00:29:38.005678	531e24ad-e487-47a8-8096-3de80d3e5d8a	\N	\N
c6e72d91-ed54-45ce-a568-c1c53db3b66a	6387b291-01bb-4dbd-803b-55aed761c0ed	4ec082a2-78bf-444b-ab48-ead04698f72b	\N	11555e83-e627-404b-8da9-ae775e54f9b5	11a8c61b-2966-45dd-9cce-99869ebeb08d	JP-SN-0008	IR-ADV-C3530 unit 8	IR	2026-01-15	5.00	6200.00	AVAILABLE	COLOUR	300.00	5500.00	\N	2026-08-13 00:29:38.032338	3600.00	Test unit 8	8443.31	\N	12 months	\N	XC-P-JP-SN-0008	SALE	\N	\N	200000	0	\N	\N	\N	NONE	2026-08-13 00:29:38.032338	531e24ad-e487-47a8-8096-3de80d3e5d8a	\N	\N
c3218f0a-404f-46dd-8c96-3abb1c2f9d5e	a24b61b0-f02e-48cd-b7af-08d9d600e399	4ec082a2-78bf-444b-ab48-ead04698f72b	\N	11555e83-e627-404b-8da9-ae775e54f9b5	11a8c61b-2966-45dd-9cce-99869ebeb08d	JP-SN-0009	MP-C4504 unit 9	MP	2026-01-15	5.00	6200.00	AVAILABLE	COLOUR	300.00	5500.00	\N	2026-08-13 00:29:38.060302	3600.00	Test unit 9	8443.31	\N	12 months	\N	XC-P-JP-SN-0009	SALE	\N	\N	200000	0	\N	\N	\N	NONE	2026-08-13 00:29:38.060302	531e24ad-e487-47a8-8096-3de80d3e5d8a	\N	\N
a5993824-c427-4d73-8b2a-bd4704ec1eff	a24b61b0-f02e-48cd-b7af-08d9d600e399	4ec082a2-78bf-444b-ab48-ead04698f72b	\N	11555e83-e627-404b-8da9-ae775e54f9b5	11a8c61b-2966-45dd-9cce-99869ebeb08d	JP-SN-0010	MP-C4504 unit 10	MP	2026-01-15	5.00	6200.00	AVAILABLE	COLOUR	300.00	5500.00	\N	2026-08-13 00:29:38.09631	3600.00	Test unit 10	8443.31	\N	12 months	\N	XC-P-JP-SN-0010	SALE	\N	\N	200000	0	\N	\N	\N	NONE	2026-08-13 00:29:38.09631	531e24ad-e487-47a8-8096-3de80d3e5d8a	\N	\N
13fba353-aafe-4827-9496-f348b3618d43	a24b61b0-f02e-48cd-b7af-08d9d600e399	4ec082a2-78bf-444b-ab48-ead04698f72b	\N	11555e83-e627-404b-8da9-ae775e54f9b5	11a8c61b-2966-45dd-9cce-99869ebeb08d	JP-SN-0011	MP-C4504 unit 11	MP	2026-01-15	5.00	6200.00	AVAILABLE	COLOUR	300.00	5500.00	\N	2026-08-13 00:29:38.138347	3600.00	Test unit 11	8443.31	\N	12 months	\N	XC-P-JP-SN-0011	SALE	\N	\N	200000	0	\N	\N	\N	NONE	2026-08-13 00:29:38.138347	531e24ad-e487-47a8-8096-3de80d3e5d8a	\N	\N
f2b2b2bc-a37c-4573-a2cf-5cebb3877686	73d6d724-7ec6-48a0-8eb6-42544003cfb9	4ec082a2-78bf-444b-ab48-ead04698f72b	\N	11555e83-e627-404b-8da9-ae775e54f9b5	11a8c61b-2966-45dd-9cce-99869ebeb08d	JP-SN-0012	MP-C6004 unit 12	MP	2026-01-15	5.00	6200.00	AVAILABLE	COLOUR	300.00	5500.00	\N	2026-08-13 00:29:38.165361	3600.00	Test unit 12	8443.31	\N	12 months	\N	XC-P-JP-SN-0012	SALE	\N	\N	200000	0	\N	\N	\N	NONE	2026-08-13 00:29:38.165361	531e24ad-e487-47a8-8096-3de80d3e5d8a	\N	\N
f4abaeed-b780-4930-bb3b-4f4ca7d48e3e	73d6d724-7ec6-48a0-8eb6-42544003cfb9	4ec082a2-78bf-444b-ab48-ead04698f72b	\N	11555e83-e627-404b-8da9-ae775e54f9b5	11a8c61b-2966-45dd-9cce-99869ebeb08d	JP-SN-0013	MP-C6004 unit 13	MP	2026-01-15	5.00	6200.00	AVAILABLE	COLOUR	300.00	5500.00	\N	2026-08-13 00:29:38.193592	3600.00	Test unit 13	8443.31	\N	12 months	\N	XC-P-JP-SN-0013	SALE	\N	\N	200000	0	\N	\N	\N	NONE	2026-08-13 00:29:38.193592	531e24ad-e487-47a8-8096-3de80d3e5d8a	\N	\N
4acf2a79-40fc-4524-a040-9334a20e0e9c	73d6d724-7ec6-48a0-8eb6-42544003cfb9	4ec082a2-78bf-444b-ab48-ead04698f72b	\N	11555e83-e627-404b-8da9-ae775e54f9b5	11a8c61b-2966-45dd-9cce-99869ebeb08d	JP-SN-0014	MP-C6004 unit 14	MP	2026-01-15	5.00	6200.00	AVAILABLE	COLOUR	300.00	5500.00	\N	2026-08-13 00:29:38.217878	3600.00	Test unit 14	8443.31	\N	12 months	\N	XC-P-JP-SN-0014	SALE	\N	\N	200000	0	\N	\N	\N	NONE	2026-08-13 00:29:38.217878	531e24ad-e487-47a8-8096-3de80d3e5d8a	\N	\N
9f3aec43-6d73-4cba-9aa3-053f51f9eaf5	89e41806-11eb-4599-bfbc-7d50208c5e5f	4ec082a2-78bf-444b-ab48-ead04698f72b	\N	11555e83-e627-404b-8da9-ae775e54f9b5	11a8c61b-2966-45dd-9cce-99869ebeb08d	JP-SN-0015	TASKALFA-5053 unit 15	TASKALFA	2026-01-15	5.00	6200.00	AVAILABLE	COLOUR	300.00	5500.00	\N	2026-08-13 00:29:38.246968	3600.00	Test unit 15	8443.31	\N	12 months	\N	XC-P-JP-SN-0015	SALE	\N	\N	200000	0	\N	\N	\N	NONE	2026-08-13 00:29:38.246968	531e24ad-e487-47a8-8096-3de80d3e5d8a	\N	\N
def41235-5af0-48bd-9eea-c85d7d84867d	89e41806-11eb-4599-bfbc-7d50208c5e5f	4ec082a2-78bf-444b-ab48-ead04698f72b	\N	11555e83-e627-404b-8da9-ae775e54f9b5	11a8c61b-2966-45dd-9cce-99869ebeb08d	JP-SN-0016	TASKALFA-5053 unit 16	TASKALFA	2026-01-15	5.00	6200.00	AVAILABLE	COLOUR	300.00	5500.00	\N	2026-08-13 00:29:38.270991	3600.00	Test unit 16	8443.31	\N	12 months	\N	XC-P-JP-SN-0016	SALE	\N	\N	200000	0	\N	\N	\N	NONE	2026-08-13 00:29:38.270991	531e24ad-e487-47a8-8096-3de80d3e5d8a	\N	\N
e5b052f9-02f5-4d6b-90f1-9ffedf4075a6	89e41806-11eb-4599-bfbc-7d50208c5e5f	4ec082a2-78bf-444b-ab48-ead04698f72b	\N	11555e83-e627-404b-8da9-ae775e54f9b5	11a8c61b-2966-45dd-9cce-99869ebeb08d	JP-SN-0017	TASKALFA-5053 unit 17	TASKALFA	2026-01-15	5.00	6200.00	AVAILABLE	COLOUR	300.00	5500.00	\N	2026-08-13 00:29:38.298358	3600.00	Test unit 17	8443.31	\N	12 months	\N	XC-P-JP-SN-0017	SALE	\N	\N	200000	0	\N	\N	\N	NONE	2026-08-13 00:29:38.298358	531e24ad-e487-47a8-8096-3de80d3e5d8a	\N	\N
e9434d60-60a8-450d-89f1-17314cde5f36	323212ba-c2f8-4737-b8a2-1d5c0f7b7498	4ec082a2-78bf-444b-ab48-ead04698f72b	\N	11555e83-e627-404b-8da9-ae775e54f9b5	11a8c61b-2966-45dd-9cce-99869ebeb08d	JP-SN-0018	TASKALFA-3253 unit 18	TASKALFA	2026-01-15	5.00	6200.00	AVAILABLE	COLOUR	300.00	5500.00	\N	2026-08-13 00:29:38.327492	3600.00	Test unit 18	8443.31	\N	12 months	\N	XC-P-JP-SN-0018	SALE	\N	\N	200000	0	\N	\N	\N	NONE	2026-08-13 00:29:38.327492	531e24ad-e487-47a8-8096-3de80d3e5d8a	\N	\N
381c5043-e9b6-41a3-8d78-0177aa8374ae	323212ba-c2f8-4737-b8a2-1d5c0f7b7498	4ec082a2-78bf-444b-ab48-ead04698f72b	\N	11555e83-e627-404b-8da9-ae775e54f9b5	11a8c61b-2966-45dd-9cce-99869ebeb08d	JP-SN-0019	TASKALFA-3253 unit 19	TASKALFA	2026-01-15	5.00	6200.00	AVAILABLE	COLOUR	300.00	5500.00	\N	2026-08-13 00:29:38.352209	3600.00	Test unit 19	8443.31	\N	12 months	\N	XC-P-JP-SN-0019	SALE	\N	\N	200000	0	\N	\N	\N	NONE	2026-08-13 00:29:38.352209	531e24ad-e487-47a8-8096-3de80d3e5d8a	\N	\N
1681a02a-47d7-4c3e-8383-e24ae64824bd	323212ba-c2f8-4737-b8a2-1d5c0f7b7498	4ec082a2-78bf-444b-ab48-ead04698f72b	\N	11555e83-e627-404b-8da9-ae775e54f9b5	11a8c61b-2966-45dd-9cce-99869ebeb08d	JP-SN-0020	TASKALFA-3253 unit 20	TASKALFA	2026-01-15	5.00	6200.00	AVAILABLE	COLOUR	300.00	5500.00	\N	2026-08-13 00:29:38.378702	3600.00	Test unit 20	8443.31	\N	12 months	\N	XC-P-JP-SN-0020	SALE	\N	\N	200000	0	\N	\N	\N	NONE	2026-08-13 00:29:38.378702	531e24ad-e487-47a8-8096-3de80d3e5d8a	\N	\N
\.


--
-- Data for Name: purchase_costs; Type: TABLE DATA; Schema: public; Owner: xerouser
--

COPY public.purchase_costs (id, purchase_id, branch_id, amount, cost_type, cost_date, description, created_by, created_at, attachment_url) FROM stdin;
\.


--
-- Data for Name: purchase_payments; Type: TABLE DATA; Schema: public; Owner: xerouser
--

COPY public.purchase_payments (id, purchase_id, branch_id, amount, payment_date, description, payment_method, reference_number, created_by, created_at, attachment_url) FROM stdin;
4b838113-019a-48c0-9f5e-67c817786bcf	6308c95f-78e2-40bf-85f8-01a7fb4f4ad6	c24a0a2c-6b0f-4ae5-aaaf-0346a65e6b6e	20000.00	2026-08-12 00:00:00	partial 1	BANK_TRANSFER	VP-20000	019c5b7d-20cf-4ef4-971a-91235dd6c10c	2026-08-13 02:16:10.145314	\N
451fb98b-c343-4f50-9150-cdeffa1d5e50	6308c95f-78e2-40bf-85f8-01a7fb4f4ad6	c24a0a2c-6b0f-4ae5-aaaf-0346a65e6b6e	30000.00	2026-08-12 00:00:00	partial 2	BANK_TRANSFER	VP-30000	019c5b7d-20cf-4ef4-971a-91235dd6c10c	2026-08-13 02:16:10.352374	\N
aab130bf-9d92-44fc-9546-03214a2711c7	6308c95f-78e2-40bf-85f8-01a7fb4f4ad6	c24a0a2c-6b0f-4ae5-aaaf-0346a65e6b6e	5000.00	2026-08-12 00:00:00	vendor cheque test	CHEQUE	CHQ-VEND-1	019c5b7d-20cf-4ef4-971a-91235dd6c10c	2026-08-13 03:57:51.098799	\N
8a791a91-e142-4814-a812-b86bf7125c29	6308c95f-78e2-40bf-85f8-01a7fb4f4ad6	c24a0a2c-6b0f-4ae5-aaaf-0346a65e6b6e	3000.00	2026-08-12 00:00:00	vendor cheque retest	CHEQUE	\N	019c5b7d-20cf-4ef4-971a-91235dd6c10c	2026-08-13 04:20:41.690154	\N
\.


--
-- Data for Name: purchases; Type: TABLE DATA; Schema: public; Owner: xerouser
--

COPY public.purchases (id, lot_id, vendor_id, branch_id, purchase_amount, documentation_fee, labour_cost, handling_fee, transportation_cost, shipping_cost, groundfield_cost, total_amount, created_by, created_at, updated_at, purchase_origin, vendor_vat_number, vendor_country, currency_code, exchange_rate, purchase_category, taxable_amount, tax_percent, tax_name, input_vat_amount, reverse_charge_vat_amount, import_invoice_no, customs_entry_no, customs_duty, goods_or_service, vat_claimable, tax_status, vendor_state_province, vendor_city) FROM stdin;
6308c95f-78e2-40bf-85f8-01a7fb4f4ad6	9d412d65-744a-4c40-a7d2-b6d8e860e5af	a3895b10-f1af-4174-aff6-88b1be2b4e67	c24a0a2c-6b0f-4ae5-aaaf-0346a65e6b6e	102100.00	0.00	0.00	0.00	0.00	0.00	0.00	102100.00	\N	2026-08-13 00:27:53.317955	2026-08-13 00:27:53.317955	DOMESTIC	TRN900900900	AE	AED	\N	\N	102100.00	5.00	VAT	5105.00	\N	\N	\N	\N	\N	t	PENDING	Dubai	Dubai
8c8e1957-e60e-4983-9887-325393e11f9f	11a8c61b-2966-45dd-9cce-99869ebeb08d	11555e83-e627-404b-8da9-ae775e54f9b5	c24a0a2c-6b0f-4ae5-aaaf-0346a65e6b6e	94100.00	800.00	3000.00	1200.00	0.00	8000.00	0.00	107100.00	\N	2026-08-13 00:27:53.518172	2026-08-13 01:35:02.59813	INTERNATIONAL	JP1234567	JP	AED	\N	\N	111300.00	5.00	VAT	\N	5565.00	IMP-JP-2026-001	CE-AE-778899	5000.00	GOODS	t	PENDING	Tokyo	Tokyo
\.


--
-- Data for Name: rfq_items; Type: TABLE DATA; Schema: public; Owner: xerouser
--

COPY public.rfq_items (id, rfq_id, branch_id, item_type, model_id, product_id, custom_product_name, brand_id, spare_part_id, custom_brand_name, custom_spare_part_name, hs_code, description, quantity, expected_delivery_date, created_by, created_at, mpn, compatible_models, model_ids) FROM stdin;
d240301c-44db-4473-97f4-8897b228a79c	47b1ea7a-b714-456c-a625-345a616a7585	c24a0a2c-6b0f-4ae5-aaaf-0346a65e6b6e	PRODUCT	4e72c048-49ed-4f27-a991-dba112ca653c	\N	IR-ADV-C5560	\N	\N	\N	\N	\N	\N	5	\N	019c5b7d-20cf-4ef4-971a-91235dd6c10c	2026-08-13 00:39:56.38034	\N	\N	\N
39e333cb-9385-4c13-ab11-afb75188ac9e	47b1ea7a-b714-456c-a625-345a616a7585	c24a0a2c-6b0f-4ae5-aaaf-0346a65e6b6e	PRODUCT	6387b291-01bb-4dbd-803b-55aed761c0ed	\N	IR-ADV-C3530	\N	\N	\N	\N	\N	\N	3	\N	019c5b7d-20cf-4ef4-971a-91235dd6c10c	2026-08-13 00:39:56.38034	\N	\N	\N
\.


--
-- Data for Name: rfq_vendor_items; Type: TABLE DATA; Schema: public; Owner: xerouser
--

COPY public.rfq_vendor_items (id, rfq_vendor_id, rfq_item_id, unit_price, total_price, stock_status, available_quantity, estimated_shipment_date, vendor_note, remarks) FROM stdin;
1b1d7ef0-eea2-4326-a421-53cb566a3e54	f549d80d-b565-4257-a7ab-9ccc9c0b8c57	d240301c-44db-4473-97f4-8897b228a79c	4200.00	42000.00	IN_STOCK	10	\N	quote	\N
d2c618b0-ca01-42a8-a925-d8f54371f700	f549d80d-b565-4257-a7ab-9ccc9c0b8c57	39e333cb-9385-4c13-ab11-afb75188ac9e	4200.00	42000.00	IN_STOCK	10	\N	quote	\N
884f86b3-8116-4b6e-8296-89e10ceb4ff5	77da46a4-9a6f-418f-8045-4bf7bb37b825	d240301c-44db-4473-97f4-8897b228a79c	3900.00	39000.00	IN_STOCK	10	\N	quote	\N
e7a7b00e-f449-4d19-bd74-0a4f2231fa01	77da46a4-9a6f-418f-8045-4bf7bb37b825	39e333cb-9385-4c13-ab11-afb75188ac9e	3900.00	39000.00	IN_STOCK	10	\N	quote	\N
\.


--
-- Data for Name: rfq_vendors; Type: TABLE DATA; Schema: public; Owner: xerouser
--

COPY public.rfq_vendors (id, rfq_id, vendor_id, status, total_quoted_amount, quoted_at, created_at, vendor_currency_code, vendor_amount, branch_currency_code, branch_converted_amount, exchange_rate_snapshot, exchange_rate_fetched_at) FROM stdin;
f549d80d-b565-4257-a7ab-9ccc9c0b8c57	47b1ea7a-b714-456c-a625-345a616a7585	a3895b10-f1af-4174-aff6-88b1be2b4e67	REJECTED	84000.00	2026-08-13 00:40:46.675	2026-08-13 00:39:56.38034	AED	84000.00	AED	84000.00	1.000000	2026-08-13 00:40:46.676
77da46a4-9a6f-418f-8045-4bf7bb37b825	47b1ea7a-b714-456c-a625-345a616a7585	11555e83-e627-404b-8da9-ae775e54f9b5	AWARDED	78000.00	2026-08-13 00:40:46.773	2026-08-13 00:39:56.38034	JPY	78000.00	AED	1801.80	0.023100	2026-08-13 00:40:46.755
\.


--
-- Data for Name: rfqs; Type: TABLE DATA; Schema: public; Owner: xerouser
--

COPY public.rfqs (id, rfq_number, branch_id, created_by, status, awarded_vendor_id, created_at, updated_at, purchase_origin) FROM stdin;
47b1ea7a-b714-456c-a625-345a616a7585	RFQ-202608-1789	c24a0a2c-6b0f-4ae5-aaaf-0346a65e6b6e	019c5b7d-20cf-4ef4-971a-91235dd6c10c	AWARDED	11555e83-e627-404b-8da9-ae775e54f9b5	2026-08-13 00:39:56.38034	2026-08-13 00:40:47.705565	INTERNATIONAL
\.


--
-- Data for Name: service_contracts; Type: TABLE DATA; Schema: public; Owner: xerouser
--

COPY public.service_contracts (id, "productId", "customerId", "contractType", "startDate", "endDate", "contractValue", "coverageRules", status, created_at, updated_at, "monthlyCharge", "copyLimit", "overagePerCopyRate", "startMeterReading", "fsmaBillingMode", "ratePerClickBW", "ratePerClickColor", "ratePerClickCombined", "startMeterBW", "startMeterColor", notes, "invoiceId", "branchId", "nextBillingDate") FROM stdin;
\.


--
-- Data for Name: service_diagnoses; Type: TABLE DATA; Schema: public; Owner: xerouser
--

COPY public.service_diagnoses (id, "ticketId", "problemFound", "rootCause", "technicianNotes", "meterReading", created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: service_estimate_items; Type: TABLE DATA; Schema: public; Owner: xerouser
--

COPY public.service_estimate_items (id, "estimateId", "revisionId", "itemSource", "sparePartId", sku, "partName", quantity, "unitPrice", "totalPrice", "isFree", "isApproved", created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: service_estimate_revisions; Type: TABLE DATA; Schema: public; Owner: xerouser
--

COPY public.service_estimate_revisions (id, invoice_id, "ticketId", revision_number, revision_type, items_snapshot, total_amount, discount_applied, visit_charge_amount, technician_note_to_finance, submitted_by, finance_decision, finance_decision_by, finance_decision_note, finance_decision_at, valid_until, submitted_at, "labourCost", "totalCost", created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: service_estimates; Type: TABLE DATA; Schema: public; Owner: xerouser
--

COPY public.service_estimates (id, "ticketId", "labourCost", "totalCost", status, version, created_at, updated_at, currency_code, exchange_rate_snapshot, parts_cost, visit_charge_amount, transport_charge_amount, discount_amount) FROM stdin;
\.


--
-- Data for Name: service_part_usage_logs; Type: TABLE DATA; Schema: public; Owner: xerouser
--

COPY public.service_part_usage_logs (id, "productId", "ticketId", "sparePartId", "partName", sku, "quantityUsed", "unitCost", "totalCost", "isFree", "isConsumable", "meterReadingAtReplacement", "previousMeterReading", "calculatedYield", "linkedInvoiceId", "replacedAt") FROM stdin;
\.


--
-- Data for Name: service_reports; Type: TABLE DATA; Schema: public; Owner: xerouser
--

COPY public.service_reports (id, "ticketId", "workPerformed", "resolutionDetails", "meterReading", "startTime", "endTime", "totalTimeSpent", "customerRemarks", "technicianRemarks", "customerSignature", "technicianSignature", created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: service_ticket_activities; Type: TABLE DATA; Schema: public; Owner: xerouser
--

COPY public.service_ticket_activities (id, "ticketId", "activityType", description, "performedBy", created_at) FROM stdin;
\.


--
-- Data for Name: service_ticket_items; Type: TABLE DATA; Schema: public; Owner: xerouser
--

COPY public.service_ticket_items (id, "ticketId", "itemSource", "sparePartId", sku, "barcodeId", "customPartName", "customPartBrand", "customPartDescription", "partName", quantity, "unitPrice", "totalPrice", "isFree", created_at, updated_at, "partBrand", mpn) FROM stdin;
\.


--
-- Data for Name: service_tickets; Type: TABLE DATA; Schema: public; Owner: xerouser
--

COPY public.service_tickets (id, "ticketNumber", "customerId", "leadId", "productId", "productBrand", "productModel", "productName", "serialNumber", "serviceContext", "contractReferenceId", "issueDescription", "jobType", status, "assignedTechnicianId", "createdBy", "branchId", "serviceQuotationId", "diagnosisNotes", "scheduledVisitDate", "completedAt", "completionNotes", created_at, updated_at, "diagnosisStartedAt", "diagnosisCompletedAt", "repairStartedAt", "repairCompletedAt", "diagnosisDuration", "repairDuration", track, ticket_type, estimate_sent_to_finance, repair_started_at, problem_found, root_cause, work_performed, resolution_details, additional_estimate_count, linked_invoice_id, meter_reading_at_service, report_url, completion_bill_number, visit_charge_amount, visit_charge_method, visit_charge_collected, visit_charge_collected_at, visit_charge_informed, discount_amount, technician_note_to_finance, meter_reading_at_creation, "diagnosisStartedBy", repair_paused_at, repair_paused_duration_minutes, transport_charge_amount, service_location) FROM stdin;
\.


--
-- Data for Name: spare_part_inventories; Type: TABLE DATA; Schema: public; Owner: xerouser
--

COPY public.spare_part_inventories (id, spare_part_id, warehouse_id, vendor_id, quantity, created_at, updated_at, transfer_reserved_qty) FROM stdin;
\.


--
-- Data for Name: spare_parts; Type: TABLE DATA; Schema: public; Owner: xerouser
--

COPY public.spare_parts (id, item_code, part_name, brand, description, model_id, branch_id, lot_id, base_price, purchase_price, wholesale_price, quantity, image_url, created_at, updated_at, mpn, compatible_models, warehouse_id, vendor_id, yield, tax_rate, max_discount_amount, barcode_id, reserved_quantity, consumed_quantity, damaged_quantity, max_discountable_amount, part_category, created_by, updated_by, deleted_at) FROM stdin;
80af274f-f6ee-4024-ba84-c3f6f3b0e9ae	WCA8APUG	INTL Toner/Drum Part 12	Canon	\N	\N	c24a0a2c-6b0f-4ae5-aaaf-0346a65e6b6e	11a8c61b-2966-45dd-9cce-99869ebeb08d	192.00	112.00	0.00	10	\N	2026-08-13 00:27:53.518172	2026-08-13 00:36:39.736233	INTL-MPN-012	\N	\N	\N	\N	0.00	0.00	XC-S-WCA8APUG	0	0	0	0.00	TONER	\N	\N	\N
e65f2181-0882-44d7-9f8a-5014113336e4	LXLK4OCC	INTL Toner/Drum Part 11	Kyocera	\N	\N	c24a0a2c-6b0f-4ae5-aaaf-0346a65e6b6e	11a8c61b-2966-45dd-9cce-99869ebeb08d	191.00	111.00	0.00	10	\N	2026-08-13 00:27:53.518172	2026-08-13 00:36:39.796369	INTL-MPN-011	\N	\N	\N	\N	0.00	0.00	XC-S-LXLK4OCC	0	0	0	0.00	TONER	\N	\N	\N
d413c555-a98b-48b8-a318-a501add85aa6	FUX3XGXY	INTL Toner/Drum Part 10	Ricoh	\N	\N	c24a0a2c-6b0f-4ae5-aaaf-0346a65e6b6e	11a8c61b-2966-45dd-9cce-99869ebeb08d	190.00	110.00	0.00	10	\N	2026-08-13 00:27:53.518172	2026-08-13 00:36:39.854164	INTL-MPN-010	\N	\N	\N	\N	0.00	0.00	XC-S-FUX3XGXY	0	0	0	0.00	TONER	\N	\N	\N
a65873ca-e7ec-4dfb-a836-b26264164bc7	2QQY7CAN	INTL Toner/Drum Part 9	Canon	\N	\N	c24a0a2c-6b0f-4ae5-aaaf-0346a65e6b6e	11a8c61b-2966-45dd-9cce-99869ebeb08d	189.00	109.00	0.00	10	\N	2026-08-13 00:27:53.518172	2026-08-13 00:36:39.920276	INTL-MPN-009	\N	\N	\N	\N	0.00	0.00	XC-S-2QQY7CAN	0	0	0	0.00	TONER	\N	\N	\N
497b0902-fd9a-4ae9-8108-77d798d58d6c	0CFBZFXI	INTL Toner/Drum Part 8	Kyocera	\N	\N	c24a0a2c-6b0f-4ae5-aaaf-0346a65e6b6e	11a8c61b-2966-45dd-9cce-99869ebeb08d	188.00	108.00	0.00	10	\N	2026-08-13 00:27:53.518172	2026-08-13 00:36:39.985987	INTL-MPN-008	\N	\N	\N	\N	0.00	0.00	XC-S-0CFBZFXI	0	0	0	0.00	TONER	\N	\N	\N
151885e0-a03a-48c8-9482-660386552644	CX9M6XZ1	INTL Toner/Drum Part 7	Ricoh	\N	\N	c24a0a2c-6b0f-4ae5-aaaf-0346a65e6b6e	11a8c61b-2966-45dd-9cce-99869ebeb08d	187.00	107.00	0.00	10	\N	2026-08-13 00:27:53.518172	2026-08-13 00:36:40.056399	INTL-MPN-007	\N	\N	\N	\N	0.00	0.00	XC-S-CX9M6XZ1	0	0	0	0.00	TONER	\N	\N	\N
00689d38-6486-4bad-90e6-dfe22b13f79a	ZLMMPEO6	INTL Toner/Drum Part 6	Canon	\N	\N	c24a0a2c-6b0f-4ae5-aaaf-0346a65e6b6e	11a8c61b-2966-45dd-9cce-99869ebeb08d	186.00	106.00	0.00	10	\N	2026-08-13 00:27:53.518172	2026-08-13 00:36:40.119106	INTL-MPN-006	\N	\N	\N	\N	0.00	0.00	XC-S-ZLMMPEO6	0	0	0	0.00	TONER	\N	\N	\N
46169ac7-c1b1-40e0-92d0-a665f4f67928	60CEV2C4	INTL Toner/Drum Part 5	Kyocera	\N	\N	c24a0a2c-6b0f-4ae5-aaaf-0346a65e6b6e	11a8c61b-2966-45dd-9cce-99869ebeb08d	185.00	105.00	0.00	10	\N	2026-08-13 00:27:53.518172	2026-08-13 00:36:40.18741	INTL-MPN-005	\N	\N	\N	\N	0.00	0.00	XC-S-60CEV2C4	0	0	0	0.00	TONER	\N	\N	\N
694e4583-e791-42cd-b2c3-2ce5c9d6f0a8	ETRDE5IR	INTL Toner/Drum Part 4	Ricoh	\N	\N	c24a0a2c-6b0f-4ae5-aaaf-0346a65e6b6e	11a8c61b-2966-45dd-9cce-99869ebeb08d	184.00	104.00	0.00	10	\N	2026-08-13 00:27:53.518172	2026-08-13 00:36:40.25512	INTL-MPN-004	\N	\N	\N	\N	0.00	0.00	XC-S-ETRDE5IR	0	0	0	0.00	TONER	\N	\N	\N
22a38131-d91c-4257-8d63-12dd3c54b5a0	VFN9ZWXP	INTL Toner/Drum Part 3	Canon	\N	\N	c24a0a2c-6b0f-4ae5-aaaf-0346a65e6b6e	11a8c61b-2966-45dd-9cce-99869ebeb08d	183.00	103.00	0.00	10	\N	2026-08-13 00:27:53.518172	2026-08-13 00:36:40.344491	INTL-MPN-003	\N	\N	\N	\N	0.00	0.00	XC-S-VFN9ZWXP	0	0	0	0.00	TONER	\N	\N	\N
0a4226e8-58a1-4050-aa50-db02b5dbeedc	97A3QWI0	INTL Toner/Drum Part 2	Kyocera	\N	\N	c24a0a2c-6b0f-4ae5-aaaf-0346a65e6b6e	11a8c61b-2966-45dd-9cce-99869ebeb08d	182.00	102.00	0.00	10	\N	2026-08-13 00:27:53.518172	2026-08-13 00:36:40.39867	INTL-MPN-002	\N	\N	\N	\N	0.00	0.00	XC-S-97A3QWI0	0	0	0	0.00	TONER	\N	\N	\N
317a5216-ff0a-4eaf-a792-36e4846dc194	0D8NB0FS	INTL Toner/Drum Part 1	Ricoh	\N	\N	c24a0a2c-6b0f-4ae5-aaaf-0346a65e6b6e	11a8c61b-2966-45dd-9cce-99869ebeb08d	181.00	101.00	0.00	10	\N	2026-08-13 00:27:53.518172	2026-08-13 00:36:40.455423	INTL-MPN-001	\N	\N	\N	\N	0.00	0.00	XC-S-0D8NB0FS	0	0	0	0.00	TONER	\N	\N	\N
ddcd43e0-0975-4773-aafa-c1ec267569ca	I3HJLGUS	LOCAL Toner/Drum Part 20	Kyocera	\N	\N	c24a0a2c-6b0f-4ae5-aaaf-0346a65e6b6e	9d412d65-744a-4c40-a7d2-b6d8e860e5af	200.00	120.00	0.00	10	\N	2026-08-13 00:27:53.317955	2026-08-13 00:36:40.518042	LOCAL-MPN-020	\N	\N	\N	\N	0.00	0.00	XC-S-I3HJLGUS	0	0	0	0.00	TONER	\N	\N	\N
eef1c8e7-809a-494b-af1d-1a3a3d815301	1UN2CPE0	LOCAL Toner/Drum Part 19	Ricoh	\N	\N	c24a0a2c-6b0f-4ae5-aaaf-0346a65e6b6e	9d412d65-744a-4c40-a7d2-b6d8e860e5af	199.00	119.00	0.00	10	\N	2026-08-13 00:27:53.317955	2026-08-13 00:36:40.576743	LOCAL-MPN-019	\N	\N	\N	\N	0.00	0.00	XC-S-1UN2CPE0	0	0	0	0.00	TONER	\N	\N	\N
624de18a-3e21-4814-9457-4e69e685e6a4	N2OOWK83	LOCAL Toner/Drum Part 18	Canon	\N	\N	c24a0a2c-6b0f-4ae5-aaaf-0346a65e6b6e	9d412d65-744a-4c40-a7d2-b6d8e860e5af	198.00	118.00	0.00	10	\N	2026-08-13 00:27:53.317955	2026-08-13 00:36:40.642662	LOCAL-MPN-018	\N	\N	\N	\N	0.00	0.00	XC-S-N2OOWK83	0	0	0	0.00	TONER	\N	\N	\N
a8f91be3-8b46-4eb1-990c-499c5c3514cd	ITJBNUZ6	LOCAL Toner/Drum Part 17	Kyocera	\N	\N	c24a0a2c-6b0f-4ae5-aaaf-0346a65e6b6e	9d412d65-744a-4c40-a7d2-b6d8e860e5af	197.00	117.00	0.00	10	\N	2026-08-13 00:27:53.317955	2026-08-13 00:36:40.726092	LOCAL-MPN-017	\N	\N	\N	\N	0.00	0.00	XC-S-ITJBNUZ6	0	0	0	0.00	TONER	\N	\N	\N
c67c9aaf-2019-4bc3-939b-ffdb7618fab8	W21T2WLQ	LOCAL Toner/Drum Part 16	Ricoh	\N	\N	c24a0a2c-6b0f-4ae5-aaaf-0346a65e6b6e	9d412d65-744a-4c40-a7d2-b6d8e860e5af	196.00	116.00	0.00	10	\N	2026-08-13 00:27:53.317955	2026-08-13 00:36:40.818428	LOCAL-MPN-016	\N	\N	\N	\N	0.00	0.00	XC-S-W21T2WLQ	0	0	0	0.00	TONER	\N	\N	\N
e1df7117-7a0a-44cb-8ea5-32a6f2ab2f98	85FBCWUC	LOCAL Toner/Drum Part 15	Canon	\N	\N	c24a0a2c-6b0f-4ae5-aaaf-0346a65e6b6e	9d412d65-744a-4c40-a7d2-b6d8e860e5af	195.00	115.00	0.00	10	\N	2026-08-13 00:27:53.317955	2026-08-13 00:36:40.90207	LOCAL-MPN-015	\N	\N	\N	\N	0.00	0.00	XC-S-85FBCWUC	0	0	0	0.00	TONER	\N	\N	\N
d2ba072a-46d4-441f-88b1-e4176eac8756	J5MAGR0O	LOCAL Toner/Drum Part 14	Kyocera	\N	\N	c24a0a2c-6b0f-4ae5-aaaf-0346a65e6b6e	9d412d65-744a-4c40-a7d2-b6d8e860e5af	194.00	114.00	0.00	10	\N	2026-08-13 00:27:53.317955	2026-08-13 00:36:40.979695	LOCAL-MPN-014	\N	\N	\N	\N	0.00	0.00	XC-S-J5MAGR0O	0	0	0	0.00	TONER	\N	\N	\N
6bdfa773-6d70-47a8-97f5-40eda234a226	MHBBWEN7	LOCAL Toner/Drum Part 13	Ricoh	\N	\N	c24a0a2c-6b0f-4ae5-aaaf-0346a65e6b6e	9d412d65-744a-4c40-a7d2-b6d8e860e5af	193.00	113.00	0.00	10	\N	2026-08-13 00:27:53.317955	2026-08-13 00:36:41.060627	LOCAL-MPN-013	\N	\N	\N	\N	0.00	0.00	XC-S-MHBBWEN7	0	0	0	0.00	TONER	\N	\N	\N
c9fa8d7b-3e86-458e-af85-0a329216b5e3	AZDQXJ79	LOCAL Toner/Drum Part 12	Canon	\N	\N	c24a0a2c-6b0f-4ae5-aaaf-0346a65e6b6e	9d412d65-744a-4c40-a7d2-b6d8e860e5af	192.00	112.00	0.00	10	\N	2026-08-13 00:27:53.317955	2026-08-13 00:36:41.132206	LOCAL-MPN-012	\N	\N	\N	\N	0.00	0.00	XC-S-AZDQXJ79	0	0	0	0.00	TONER	\N	\N	\N
efa21243-5d18-4ef9-9bef-5469a428bc92	0U2OLY98	LOCAL Toner/Drum Part 11	Kyocera	\N	\N	c24a0a2c-6b0f-4ae5-aaaf-0346a65e6b6e	9d412d65-744a-4c40-a7d2-b6d8e860e5af	191.00	111.00	0.00	10	\N	2026-08-13 00:27:53.317955	2026-08-13 00:36:41.189307	LOCAL-MPN-011	\N	\N	\N	\N	0.00	0.00	XC-S-0U2OLY98	0	0	0	0.00	TONER	\N	\N	\N
906e12f5-2ff5-4f4a-830d-59bcf4b2af6c	7T8G8WDV	LOCAL Toner/Drum Part 10	Ricoh	\N	\N	c24a0a2c-6b0f-4ae5-aaaf-0346a65e6b6e	9d412d65-744a-4c40-a7d2-b6d8e860e5af	190.00	110.00	0.00	10	\N	2026-08-13 00:27:53.317955	2026-08-13 00:36:41.24777	LOCAL-MPN-010	\N	\N	\N	\N	0.00	0.00	XC-S-7T8G8WDV	0	0	0	0.00	TONER	\N	\N	\N
d359789d-4659-43b5-8d4c-a1b67aee874a	1HKTI71U	LOCAL Toner/Drum Part 9	Canon	\N	\N	c24a0a2c-6b0f-4ae5-aaaf-0346a65e6b6e	9d412d65-744a-4c40-a7d2-b6d8e860e5af	189.00	109.00	0.00	10	\N	2026-08-13 00:27:53.317955	2026-08-13 00:36:41.305922	LOCAL-MPN-009	\N	\N	\N	\N	0.00	0.00	XC-S-1HKTI71U	0	0	0	0.00	TONER	\N	\N	\N
172af344-57e0-4dc8-8b84-a1dfbf231526	G1NZAL8A	LOCAL Toner/Drum Part 8	Kyocera	\N	\N	c24a0a2c-6b0f-4ae5-aaaf-0346a65e6b6e	9d412d65-744a-4c40-a7d2-b6d8e860e5af	188.00	108.00	0.00	10	\N	2026-08-13 00:27:53.317955	2026-08-13 00:36:41.451896	LOCAL-MPN-008	\N	\N	\N	\N	0.00	0.00	XC-S-G1NZAL8A	0	0	0	0.00	TONER	\N	\N	\N
6700d45f-061b-4de7-a465-e76cf906c1c7	A0GXKFMA	LOCAL Toner/Drum Part 7	Ricoh	\N	\N	c24a0a2c-6b0f-4ae5-aaaf-0346a65e6b6e	9d412d65-744a-4c40-a7d2-b6d8e860e5af	187.00	107.00	0.00	10	\N	2026-08-13 00:27:53.317955	2026-08-13 00:36:41.564342	LOCAL-MPN-007	\N	\N	\N	\N	0.00	0.00	XC-S-A0GXKFMA	0	0	0	0.00	TONER	\N	\N	\N
003fe45c-c385-4d4c-a696-7a1c8881f5ec	009BHTIU	LOCAL Toner/Drum Part 6	Canon	\N	\N	c24a0a2c-6b0f-4ae5-aaaf-0346a65e6b6e	9d412d65-744a-4c40-a7d2-b6d8e860e5af	186.00	106.00	0.00	10	\N	2026-08-13 00:27:53.317955	2026-08-13 00:36:41.622006	LOCAL-MPN-006	\N	\N	\N	\N	0.00	0.00	XC-S-009BHTIU	0	0	0	0.00	TONER	\N	\N	\N
fa088bd9-712f-49a2-8c30-484516420520	ZSR9GHJX	LOCAL Toner/Drum Part 5	Kyocera	\N	\N	c24a0a2c-6b0f-4ae5-aaaf-0346a65e6b6e	9d412d65-744a-4c40-a7d2-b6d8e860e5af	185.00	105.00	0.00	10	\N	2026-08-13 00:27:53.317955	2026-08-13 00:36:41.683228	LOCAL-MPN-005	\N	\N	\N	\N	0.00	0.00	XC-S-ZSR9GHJX	0	0	0	0.00	TONER	\N	\N	\N
b7d213c8-f327-4ca8-85ff-6cab26936b60	GEKUBXT2	LOCAL Toner/Drum Part 4	Ricoh	\N	\N	c24a0a2c-6b0f-4ae5-aaaf-0346a65e6b6e	9d412d65-744a-4c40-a7d2-b6d8e860e5af	184.00	104.00	0.00	10	\N	2026-08-13 00:27:53.317955	2026-08-13 00:36:41.739015	LOCAL-MPN-004	\N	\N	\N	\N	0.00	0.00	XC-S-GEKUBXT2	0	0	0	0.00	TONER	\N	\N	\N
90b5260f-fb0c-49d0-9224-61dde417ee3d	T0Z5SA8S	LOCAL Toner/Drum Part 3	Canon	\N	\N	c24a0a2c-6b0f-4ae5-aaaf-0346a65e6b6e	9d412d65-744a-4c40-a7d2-b6d8e860e5af	183.00	103.00	0.00	10	\N	2026-08-13 00:27:53.317955	2026-08-13 00:36:41.799378	LOCAL-MPN-003	\N	\N	\N	\N	0.00	0.00	XC-S-T0Z5SA8S	0	0	0	0.00	TONER	\N	\N	\N
a0fd1296-3bff-4608-9f9a-1aa4516523ce	M7XPXARQ	LOCAL Toner/Drum Part 2	Kyocera	\N	\N	c24a0a2c-6b0f-4ae5-aaaf-0346a65e6b6e	9d412d65-744a-4c40-a7d2-b6d8e860e5af	182.00	102.00	0.00	10	\N	2026-08-13 00:27:53.317955	2026-08-13 00:36:41.849368	LOCAL-MPN-002	\N	\N	\N	\N	0.00	0.00	XC-S-M7XPXARQ	0	0	0	0.00	TONER	\N	\N	\N
9fab0e23-aa6d-415e-a259-99b4dddd8f6f	6S0BS1UH	LOCAL Toner/Drum Part 1	Ricoh	\N	\N	c24a0a2c-6b0f-4ae5-aaaf-0346a65e6b6e	9d412d65-744a-4c40-a7d2-b6d8e860e5af	181.00	101.00	0.00	10	\N	2026-08-13 00:27:53.317955	2026-08-13 00:36:41.906534	LOCAL-MPN-001	\N	\N	\N	\N	0.00	0.00	XC-S-6S0BS1UH	0	0	0	0.00	TONER	\N	\N	\N
fa90c3a1-f613-411e-8932-efa9812c698e	NTAQ8ER8	INTL Toner/Drum Part 17	Kyocera	\N	\N	c24a0a2c-6b0f-4ae5-aaaf-0346a65e6b6e	11a8c61b-2966-45dd-9cce-99869ebeb08d	197.00	117.00	0.00	10	\N	2026-08-13 00:27:53.518172	2026-08-13 00:36:39.302704	INTL-MPN-017	\N	\N	\N	\N	0.00	0.00	XC-S-NTAQ8ER8	0	0	0	0.00	TONER	\N	\N	\N
14bc296f-8717-4c16-a9b9-6e8caf810c4f	EQ9ZUXK8	INTL Toner/Drum Part 16	Ricoh	\N	\N	c24a0a2c-6b0f-4ae5-aaaf-0346a65e6b6e	11a8c61b-2966-45dd-9cce-99869ebeb08d	196.00	116.00	0.00	10	\N	2026-08-13 00:27:53.518172	2026-08-13 00:36:39.413716	INTL-MPN-016	\N	\N	\N	\N	0.00	0.00	XC-S-EQ9ZUXK8	0	0	0	0.00	TONER	\N	\N	\N
518cace9-5017-4d92-aee8-db742571a610	SJ94NJPH	INTL Toner/Drum Part 15	Canon	\N	\N	c24a0a2c-6b0f-4ae5-aaaf-0346a65e6b6e	11a8c61b-2966-45dd-9cce-99869ebeb08d	195.00	115.00	0.00	10	\N	2026-08-13 00:27:53.518172	2026-08-13 00:36:39.506745	INTL-MPN-015	\N	\N	\N	\N	0.00	0.00	XC-S-SJ94NJPH	0	0	0	0.00	TONER	\N	\N	\N
aef9dffa-dc8b-4ffc-91b7-362ad45bbf80	72BHTRMG	INTL Toner/Drum Part 14	Kyocera	\N	\N	c24a0a2c-6b0f-4ae5-aaaf-0346a65e6b6e	11a8c61b-2966-45dd-9cce-99869ebeb08d	194.00	114.00	0.00	10	\N	2026-08-13 00:27:53.518172	2026-08-13 00:36:39.589592	INTL-MPN-014	\N	\N	\N	\N	0.00	0.00	XC-S-72BHTRMG	0	0	0	0.00	TONER	\N	\N	\N
cba7c189-9766-4ad2-9d51-f6a41b75ce4d	YORE7NUG	INTL Toner/Drum Part 13	Ricoh	\N	\N	c24a0a2c-6b0f-4ae5-aaaf-0346a65e6b6e	11a8c61b-2966-45dd-9cce-99869ebeb08d	193.00	113.00	0.00	10	\N	2026-08-13 00:27:53.518172	2026-08-13 00:36:39.66618	INTL-MPN-013	\N	\N	\N	\N	0.00	0.00	XC-S-YORE7NUG	0	0	0	0.00	TONER	\N	\N	\N
a63e1b1e-313b-4aa7-84fe-ed228c704fc1	1LLDESMM	INTL Toner/Drum Part 20	Kyocera	\N	\N	c24a0a2c-6b0f-4ae5-aaaf-0346a65e6b6e	11a8c61b-2966-45dd-9cce-99869ebeb08d	200.00	120.00	0.00	10	\N	2026-08-13 00:27:53.518172	2026-08-13 00:36:41.968425	INTL-MPN-020	\N	\N	\N	\N	0.00	0.00	XC-S-1LLDESMM	0	0	0	0.00	TONER	\N	\N	\N
df5aa278-9062-4a05-812e-be78c751c025	P85DBGWQ	INTL Toner/Drum Part 19	Ricoh	\N	\N	c24a0a2c-6b0f-4ae5-aaaf-0346a65e6b6e	11a8c61b-2966-45dd-9cce-99869ebeb08d	199.00	119.00	0.00	10	\N	2026-08-13 00:27:53.518172	2026-08-13 00:36:42.032819	INTL-MPN-019	\N	\N	\N	\N	0.00	0.00	XC-S-P85DBGWQ	0	0	0	0.00	TONER	\N	\N	\N
fce729a1-1994-4dc4-a2b5-20e3426c27c0	7NEUMG68	INTL Toner/Drum Part 18	Canon	\N	\N	c24a0a2c-6b0f-4ae5-aaaf-0346a65e6b6e	11a8c61b-2966-45dd-9cce-99869ebeb08d	198.00	118.00	0.00	10	\N	2026-08-13 00:27:53.518172	2026-08-13 00:36:42.088906	INTL-MPN-018	\N	\N	\N	\N	0.00	0.00	XC-S-7NEUMG68	0	0	0	0.00	TONER	\N	\N	\N
\.


--
-- Data for Name: spare_parts_models; Type: TABLE DATA; Schema: public; Owner: xerouser
--

COPY public.spare_parts_models (spare_part_id, model_id) FROM stdin;
\.


--
-- Data for Name: stock_transfer_items; Type: TABLE DATA; Schema: public; Owner: xerouser
--

COPY public.stock_transfer_items (id, transfer_id, item_type, spare_part_id, model_id, product_id, requested_qty, approved_qty, item_status, assigned_product_ids, source_warehouse_id, dispatched_qty, received_qty, unit_cost, created_at) FROM stdin;
\.


--
-- Data for Name: stock_transfers; Type: TABLE DATA; Schema: public; Owner: xerouser
--

COPY public.stock_transfers (id, transfer_number, transfer_type, status, source_branch_id, source_warehouse_id, destination_branch_id, destination_warehouse_id, requested_by_id, approved_by_id, reason, notes, rejection_reason, lot_id, dispatched_at, received_at, created_at) FROM stdin;
\.


--
-- Data for Name: vendor_requests; Type: TABLE DATA; Schema: public; Owner: xerouser
--

COPY public.vendor_requests (id, vendor_id, requested_by, branch_id, products, message, total_amount, created_at) FROM stdin;
\.


--
-- Data for Name: vendors; Type: TABLE DATA; Schema: public; Owner: xerouser
--

COPY public.vendors (id, name, email, phone, type, "contactPerson", "totalOrders", "purchaseValue", "outstandingAmount", status, currency, "createdAt", "updatedAt", country_code, country_name, bank_accounts, vat_number, branch_id, state_province, city, created_by, updated_by) FROM stdin;
78823b69-b82e-4682-8a02-7afadbec7b3a	xerocare  supplayers	riyasdevxtra@gmail.com	+91 9233554123	Supplier	nadhi kn	0	0.00	0.00	ACTIVE	INR	2026-07-18 23:09:03.172404	2026-07-18 23:09:03.172404	IN	India	[{"iban": "CNRB0000706", "branch": "wadakkanchery", "address": "WADAKKANCHRY KERALA", "bankName": "sbi wadakkanchry ", "currency": "INR", "isPrimary": true, "swiftCode": "EWRTDWXQ", "accountType": "Current Account", "bankCountry": "IN", "accountNumber": "566477642234", "routingNumber": "", "accountHolderName": "nadhil"}]	545437284733	39d50020-0bbe-4c8e-9c60-5ef4af38c715	Kerala	Kalamassery	\N	\N
8c7a66f2-ec57-4cc2-8bdc-531b4b6bc151	xerocare international	riyasantigravity@gmail.com	+971 98654432	Supplier	nadhil kn	0	0.00	0.00	ACTIVE	AED	2026-07-18 23:32:29.561745	2026-07-18 23:32:29.561745	AE	United Arab Emirates (the)	[{"iban": "AE060260001015781736501", "branch": "DUBAI", "address": "fab dubai branch", "bankName": "FAB ABUDABI", "currency": "AED", "isPrimary": true, "swiftCode": "qnbauu774", "accountType": "Current Account", "bankCountry": "AE", "accountNumber": "647836448374", "routingNumber": "", "accountHolderName": "nadhil"}]	TXQ664783	39d50020-0bbe-4c8e-9c60-5ef4af38c715	Dubai	Dubai	\N	\N
96528c5f-d9e1-4be5-a6a3-81f355c397cb	NADHIL DEVXTRA	nadhildevxtra@gmail.com	+974 893333442	Supplier	NADHIL KN 	0	0.00	0.00	ACTIVE	QAR	2026-08-10 12:17:57.82251	2026-08-10 12:17:57.82251	QA	Qatar	[{"iban": "QA893704004405320130006765435", "branch": "doha branch", "address": "DOHA QATAR STREET 213", "bankName": "Qatar National Bank (QNB)", "currency": "QAR", "isPrimary": true, "swiftCode": "QWERWQE", "accountType": "Current Account", "bankCountry": "QA", "accountNumber": "123499030434", "routingNumber": "", "accountHolderName": "NADHIL KN "}]	356635677534564	426625c1-62e8-4e14-952b-457452eb0f28	Doha	Doha	019c5b7d-20cf-4ef4-971a-91235dd6c10c	\N
a3895b10-f1af-4174-aff6-88b1be2b4e67	Gulf Office Systems LLC	sales@gulfoffice.ae	+971501110001	Supplier	Ahmed Q	1	102100.00	0.00	ACTIVE	AED	2026-08-13 00:26:40.162086	2026-08-13 00:27:53.317955	AE	United Arab Emirates	[]	TRN900900900	c24a0a2c-6b0f-4ae5-aaaf-0346a65e6b6e	Dubai	Dubai	531e24ad-e487-47a8-8096-3de80d3e5d8a	\N
11555e83-e627-404b-8da9-ae775e54f9b5	Tokyo Imaging Corp	export@tokyoimaging.jp	+81301110002	Distributor	K Tanaka	1	94100.00	0.00	ACTIVE	JPY	2026-08-13 00:26:40.212867	2026-08-13 00:27:53.518172	JP	Japan	[]	JP1234567	c24a0a2c-6b0f-4ae5-aaaf-0346a65e6b6e	Tokyo	Tokyo	531e24ad-e487-47a8-8096-3de80d3e5d8a	\N
\.


--
-- Data for Name: warehouses; Type: TABLE DATA; Schema: public; Owner: xerouser
--

COPY public.warehouses (id, warehouse_name, warehouse_code, location, address, capacity, status, branch_id, created_at, updated_at) FROM stdin;
247a8c42-259f-446c-b293-2ae83b83cb25	XEROCARE PRIVETLIMITED DOHA WAREHOUSE	WH-001	DOHA	STREET 321 DOHA	75000	ACTIVE	426625c1-62e8-4e14-952b-457452eb0f28	2026-08-10 12:46:37.073624	2026-08-10 12:46:37.073624
4ec082a2-78bf-444b-ab48-ead04698f72b	DUBAI MAIN WAREHOUSE	DXB-WH-01	Dubai	Al Quoz Ind. 3	5000	ACTIVE	c24a0a2c-6b0f-4ae5-aaaf-0346a65e6b6e	2026-08-13 00:26:40.096946	2026-08-13 00:26:40.096946
\.


--
-- Name: products PK_0806c755e0aca124e67c0cf6d7d; Type: CONSTRAINT; Schema: public; Owner: xerouser
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT "PK_0806c755e0aca124e67c0cf6d7d" PRIMARY KEY (id);


--
-- Name: purchases PK_1d55032f37a34c6eceacbbca6b8; Type: CONSTRAINT; Schema: public; Owner: xerouser
--

ALTER TABLE ONLY public.purchases
    ADD CONSTRAINT "PK_1d55032f37a34c6eceacbbca6b8" PRIMARY KEY (id);


--
-- Name: rfq_items PK_2694c253e3966a3a8d5e9dc3d60; Type: CONSTRAINT; Schema: public; Owner: xerouser
--

ALTER TABLE ONLY public.rfq_items
    ADD CONSTRAINT "PK_2694c253e3966a3a8d5e9dc3d60" PRIMARY KEY (id);


--
-- Name: lots PK_2bb990a4015865cb1daa1d22fd9; Type: CONSTRAINT; Schema: public; Owner: xerouser
--

ALTER TABLE ONLY public.lots
    ADD CONSTRAINT "PK_2bb990a4015865cb1daa1d22fd9" PRIMARY KEY (id);


--
-- Name: spare_parts_models PK_47b3647e703f7ce2af2acaeb44a; Type: CONSTRAINT; Schema: public; Owner: xerouser
--

ALTER TABLE ONLY public.spare_parts_models
    ADD CONSTRAINT "PK_47b3647e703f7ce2af2acaeb44a" PRIMARY KEY (spare_part_id, model_id);


--
-- Name: warehouses PK_56ae21ee2432b2270b48867e4be; Type: CONSTRAINT; Schema: public; Owner: xerouser
--

ALTER TABLE ONLY public.warehouses
    ADD CONSTRAINT "PK_56ae21ee2432b2270b48867e4be" PRIMARY KEY (id);


--
-- Name: spare_parts PK_6fe9b0bb96e021d248731580f1b; Type: CONSTRAINT; Schema: public; Owner: xerouser
--

ALTER TABLE ONLY public.spare_parts
    ADD CONSTRAINT "PK_6fe9b0bb96e021d248731580f1b" PRIMARY KEY (id);


--
-- Name: branches PK_7f37d3b42defea97f1df0d19535; Type: CONSTRAINT; Schema: public; Owner: xerouser
--

ALTER TABLE ONLY public.branches
    ADD CONSTRAINT "PK_7f37d3b42defea97f1df0d19535" PRIMARY KEY (id);


--
-- Name: spare_part_inventories PK_879e85e7fed7afb946d8ecd456f; Type: CONSTRAINT; Schema: public; Owner: xerouser
--

ALTER TABLE ONLY public.spare_part_inventories
    ADD CONSTRAINT "PK_879e85e7fed7afb946d8ecd456f" PRIMARY KEY (id);


--
-- Name: purchase_payments PK_9765d702e073d3cdf9b1600792d; Type: CONSTRAINT; Schema: public; Owner: xerouser
--

ALTER TABLE ONLY public.purchase_payments
    ADD CONSTRAINT "PK_9765d702e073d3cdf9b1600792d" PRIMARY KEY (id);


--
-- Name: vendors PK_9c956c9797edfae5c6ddacc4e6e; Type: CONSTRAINT; Schema: public; Owner: xerouser
--

ALTER TABLE ONLY public.vendors
    ADD CONSTRAINT "PK_9c956c9797edfae5c6ddacc4e6e" PRIMARY KEY (id);


--
-- Name: vendor_requests PK_9eabd13d4d98baadad81c73d7c8; Type: CONSTRAINT; Schema: public; Owner: xerouser
--

ALTER TABLE ONLY public.vendor_requests
    ADD CONSTRAINT "PK_9eabd13d4d98baadad81c73d7c8" PRIMARY KEY (id);


--
-- Name: brands PK_b0c437120b624da1034a81fc561; Type: CONSTRAINT; Schema: public; Owner: xerouser
--

ALTER TABLE ONLY public.brands
    ADD CONSTRAINT "PK_b0c437120b624da1034a81fc561" PRIMARY KEY (id);


--
-- Name: rfq_vendor_items PK_b9eab4b7df0524ceaf746222e00; Type: CONSTRAINT; Schema: public; Owner: xerouser
--

ALTER TABLE ONLY public.rfq_vendor_items
    ADD CONSTRAINT "PK_b9eab4b7df0524ceaf746222e00" PRIMARY KEY (id);


--
-- Name: rfqs PK_c8b7481584218bdee534e5fc436; Type: CONSTRAINT; Schema: public; Owner: xerouser
--

ALTER TABLE ONLY public.rfqs
    ADD CONSTRAINT "PK_c8b7481584218bdee534e5fc436" PRIMARY KEY (id);


--
-- Name: employee_managers PK_c987dcb5277b78f2fc219948c1c; Type: CONSTRAINT; Schema: public; Owner: xerouser
--

ALTER TABLE ONLY public.employee_managers
    ADD CONSTRAINT "PK_c987dcb5277b78f2fc219948c1c" PRIMARY KEY (employee_id);


--
-- Name: model PK_d6df271bba301d5cc79462912a4; Type: CONSTRAINT; Schema: public; Owner: xerouser
--

ALTER TABLE ONLY public.model
    ADD CONSTRAINT "PK_d6df271bba301d5cc79462912a4" PRIMARY KEY (id);


--
-- Name: rfq_vendors PK_ead00c4131c7ac9eaadf6e14f9e; Type: CONSTRAINT; Schema: public; Owner: xerouser
--

ALTER TABLE ONLY public.rfq_vendors
    ADD CONSTRAINT "PK_ead00c4131c7ac9eaadf6e14f9e" PRIMARY KEY (id);


--
-- Name: lot_items PK_fbec0c48d40f6c6cf8267c814cb; Type: CONSTRAINT; Schema: public; Owner: xerouser
--

ALTER TABLE ONLY public.lot_items
    ADD CONSTRAINT "PK_fbec0c48d40f6c6cf8267c814cb" PRIMARY KEY (id);


--
-- Name: purchase_costs PK_ffc0ba1f58c046e6d50f73511a4; Type: CONSTRAINT; Schema: public; Owner: xerouser
--

ALTER TABLE ONLY public.purchase_costs
    ADD CONSTRAINT "PK_ffc0ba1f58c046e6d50f73511a4" PRIMARY KEY (id);


--
-- Name: warehouses UQ_182bbb8c4c53a982923d40f2bdc; Type: CONSTRAINT; Schema: public; Owner: xerouser
--

ALTER TABLE ONLY public.warehouses
    ADD CONSTRAINT "UQ_182bbb8c4c53a982923d40f2bdc" UNIQUE (warehouse_code);


--
-- Name: purchases UQ_2b7ac4cff15f6652dd49546efa9; Type: CONSTRAINT; Schema: public; Owner: xerouser
--

ALTER TABLE ONLY public.purchases
    ADD CONSTRAINT "UQ_2b7ac4cff15f6652dd49546efa9" UNIQUE (lot_id);


--
-- Name: lots UQ_44d1ab9ec40107245961ef52453; Type: CONSTRAINT; Schema: public; Owner: xerouser
--

ALTER TABLE ONLY public.lots
    ADD CONSTRAINT "UQ_44d1ab9ec40107245961ef52453" UNIQUE (lot_number);


--
-- Name: rfqs UQ_b19e346f96ffd54c4d436a95869; Type: CONSTRAINT; Schema: public; Owner: xerouser
--

ALTER TABLE ONLY public.rfqs
    ADD CONSTRAINT "UQ_b19e346f96ffd54c4d436a95869" UNIQUE (rfq_number);


--
-- Name: consumable_yield_history consumable_yield_history_pkey; Type: CONSTRAINT; Schema: public; Owner: xerouser
--

ALTER TABLE ONLY public.consumable_yield_history
    ADD CONSTRAINT consumable_yield_history_pkey PRIMARY KEY (id);


--
-- Name: contract_meter_readings contract_meter_readings_pkey; Type: CONSTRAINT; Schema: public; Owner: xerouser
--

ALTER TABLE ONLY public.contract_meter_readings
    ADD CONSTRAINT contract_meter_readings_pkey PRIMARY KEY (id);


--
-- Name: exchange_rates exchange_rates_from_currency_to_currency_key; Type: CONSTRAINT; Schema: public; Owner: xerouser
--

ALTER TABLE ONLY public.exchange_rates
    ADD CONSTRAINT exchange_rates_from_currency_to_currency_key UNIQUE (from_currency, to_currency);


--
-- Name: exchange_rates exchange_rates_pkey; Type: CONSTRAINT; Schema: public; Owner: xerouser
--

ALTER TABLE ONLY public.exchange_rates
    ADD CONSTRAINT exchange_rates_pkey PRIMARY KEY (id);


--
-- Name: inventory_reservations inventory_reservations_pkey; Type: CONSTRAINT; Schema: public; Owner: xerouser
--

ALTER TABLE ONLY public.inventory_reservations
    ADD CONSTRAINT inventory_reservations_pkey PRIMARY KEY (id);


--
-- Name: lot_documents lot_documents_pkey; Type: CONSTRAINT; Schema: public; Owner: xerouser
--

ALTER TABLE ONLY public.lot_documents
    ADD CONSTRAINT lot_documents_pkey PRIMARY KEY (id);


--
-- Name: machine_service_history machine_service_history_pkey; Type: CONSTRAINT; Schema: public; Owner: xerouser
--

ALTER TABLE ONLY public.machine_service_history
    ADD CONSTRAINT machine_service_history_pkey PRIMARY KEY (id);


--
-- Name: machine_service_history machine_service_history_productId_key; Type: CONSTRAINT; Schema: public; Owner: xerouser
--

ALTER TABLE ONLY public.machine_service_history
    ADD CONSTRAINT "machine_service_history_productId_key" UNIQUE ("productId");


--
-- Name: processed_invoice_items processed_invoice_items_pkey; Type: CONSTRAINT; Schema: public; Owner: xerouser
--

ALTER TABLE ONLY public.processed_invoice_items
    ADD CONSTRAINT processed_invoice_items_pkey PRIMARY KEY (invoice_item_id);


--
-- Name: service_contracts service_contracts_pkey; Type: CONSTRAINT; Schema: public; Owner: xerouser
--

ALTER TABLE ONLY public.service_contracts
    ADD CONSTRAINT service_contracts_pkey PRIMARY KEY (id);


--
-- Name: service_diagnoses service_diagnoses_pkey; Type: CONSTRAINT; Schema: public; Owner: xerouser
--

ALTER TABLE ONLY public.service_diagnoses
    ADD CONSTRAINT service_diagnoses_pkey PRIMARY KEY (id);


--
-- Name: service_estimate_items service_estimate_items_pkey; Type: CONSTRAINT; Schema: public; Owner: xerouser
--

ALTER TABLE ONLY public.service_estimate_items
    ADD CONSTRAINT service_estimate_items_pkey PRIMARY KEY (id);


--
-- Name: service_estimate_revisions service_estimate_revisions_pkey; Type: CONSTRAINT; Schema: public; Owner: xerouser
--

ALTER TABLE ONLY public.service_estimate_revisions
    ADD CONSTRAINT service_estimate_revisions_pkey PRIMARY KEY (id);


--
-- Name: service_estimates service_estimates_pkey; Type: CONSTRAINT; Schema: public; Owner: xerouser
--

ALTER TABLE ONLY public.service_estimates
    ADD CONSTRAINT service_estimates_pkey PRIMARY KEY (id);


--
-- Name: service_part_usage_logs service_part_usage_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: xerouser
--

ALTER TABLE ONLY public.service_part_usage_logs
    ADD CONSTRAINT service_part_usage_logs_pkey PRIMARY KEY (id);


--
-- Name: service_reports service_reports_pkey; Type: CONSTRAINT; Schema: public; Owner: xerouser
--

ALTER TABLE ONLY public.service_reports
    ADD CONSTRAINT service_reports_pkey PRIMARY KEY (id);


--
-- Name: service_ticket_activities service_ticket_activities_pkey; Type: CONSTRAINT; Schema: public; Owner: xerouser
--

ALTER TABLE ONLY public.service_ticket_activities
    ADD CONSTRAINT service_ticket_activities_pkey PRIMARY KEY (id);


--
-- Name: service_ticket_items service_ticket_items_pkey; Type: CONSTRAINT; Schema: public; Owner: xerouser
--

ALTER TABLE ONLY public.service_ticket_items
    ADD CONSTRAINT service_ticket_items_pkey PRIMARY KEY (id);


--
-- Name: service_tickets service_tickets_pkey; Type: CONSTRAINT; Schema: public; Owner: xerouser
--

ALTER TABLE ONLY public.service_tickets
    ADD CONSTRAINT service_tickets_pkey PRIMARY KEY (id);


--
-- Name: service_tickets service_tickets_ticketNumber_key; Type: CONSTRAINT; Schema: public; Owner: xerouser
--

ALTER TABLE ONLY public.service_tickets
    ADD CONSTRAINT "service_tickets_ticketNumber_key" UNIQUE ("ticketNumber");


--
-- Name: stock_transfer_items stock_transfer_items_pkey; Type: CONSTRAINT; Schema: public; Owner: xerouser
--

ALTER TABLE ONLY public.stock_transfer_items
    ADD CONSTRAINT stock_transfer_items_pkey PRIMARY KEY (id);


--
-- Name: stock_transfers stock_transfers_pkey; Type: CONSTRAINT; Schema: public; Owner: xerouser
--

ALTER TABLE ONLY public.stock_transfers
    ADD CONSTRAINT stock_transfers_pkey PRIMARY KEY (id);


--
-- Name: stock_transfers stock_transfers_transfer_number_key; Type: CONSTRAINT; Schema: public; Owner: xerouser
--

ALTER TABLE ONLY public.stock_transfers
    ADD CONSTRAINT stock_transfers_transfer_number_key UNIQUE (transfer_number);


--
-- Name: IDX_0ce77ddd703c1c07bc8fdcf414; Type: INDEX; Schema: public; Owner: xerouser
--

CREATE INDEX "IDX_0ce77ddd703c1c07bc8fdcf414" ON public.spare_parts USING btree (item_code);


--
-- Name: IDX_0e859a83f1dd6b774c20c02885; Type: INDEX; Schema: public; Owner: xerouser
--

CREATE INDEX "IDX_0e859a83f1dd6b774c20c02885" ON public.products USING btree (vendor_id);


--
-- Name: IDX_20c984fa6b83cfba4b4a1e5211; Type: INDEX; Schema: public; Owner: xerouser
--

CREATE INDEX "IDX_20c984fa6b83cfba4b4a1e5211" ON public.products USING btree (product_status);


--
-- Name: IDX_245465fef3c9b3bdfbece9c556; Type: INDEX; Schema: public; Owner: xerouser
--

CREATE INDEX "IDX_245465fef3c9b3bdfbece9c556" ON public.spare_parts USING btree (branch_id);


--
-- Name: IDX_32da74acefb3d0dd46c16180ba; Type: INDEX; Schema: public; Owner: xerouser
--

CREATE INDEX "IDX_32da74acefb3d0dd46c16180ba" ON public.spare_parts_models USING btree (spare_part_id);


--
-- Name: IDX_3854764df939001979ad9a91e4; Type: INDEX; Schema: public; Owner: xerouser
--

CREATE INDEX "IDX_3854764df939001979ad9a91e4" ON public.spare_parts_models USING btree (model_id);


--
-- Name: IDX_38ec60656c643d659309227f6d; Type: INDEX; Schema: public; Owner: xerouser
--

CREATE UNIQUE INDEX "IDX_38ec60656c643d659309227f6d" ON public.model USING btree (model_no, branch_id);


--
-- Name: IDX_44d1ab9ec40107245961ef5245; Type: INDEX; Schema: public; Owner: xerouser
--

CREATE INDEX "IDX_44d1ab9ec40107245961ef5245" ON public.lots USING btree (lot_number);


--
-- Name: IDX_46ff1216d04be03e1f2b005c50; Type: INDEX; Schema: public; Owner: xerouser
--

CREATE INDEX "IDX_46ff1216d04be03e1f2b005c50" ON public.spare_parts USING btree (mpn);


--
-- Name: IDX_673223dde0a5416c6d8daa6bfb; Type: INDEX; Schema: public; Owner: xerouser
--

CREATE UNIQUE INDEX "IDX_673223dde0a5416c6d8daa6bfb" ON public.rfq_vendors USING btree (rfq_id, vendor_id);


--
-- Name: IDX_6fe9b0bb96e021d248731580f1; Type: INDEX; Schema: public; Owner: xerouser
--

CREATE INDEX "IDX_6fe9b0bb96e021d248731580f1" ON public.spare_parts USING btree (id);


--
-- Name: IDX_73b2794977984b8694203f4f40; Type: INDEX; Schema: public; Owner: xerouser
--

CREATE UNIQUE INDEX "IDX_73b2794977984b8694203f4f40" ON public.rfq_items USING btree (rfq_id, model_id) WHERE (model_id IS NOT NULL);


--
-- Name: IDX_76ac0a401091bd373753579c97; Type: INDEX; Schema: public; Owner: xerouser
--

CREATE INDEX "IDX_76ac0a401091bd373753579c97" ON public.products USING btree (warehouse_id);


--
-- Name: IDX_76b02d9aaedb7ddacf6dcf2c94; Type: INDEX; Schema: public; Owner: xerouser
--

CREATE UNIQUE INDEX "IDX_76b02d9aaedb7ddacf6dcf2c94" ON public.spare_part_inventories USING btree (spare_part_id, warehouse_id);


--
-- Name: IDX_9708b19a4817823e782ac398be; Type: INDEX; Schema: public; Owner: xerouser
--

CREATE UNIQUE INDEX "IDX_9708b19a4817823e782ac398be" ON public.brands USING btree (name, branch_id);


--
-- Name: IDX_9d131b8b8db5708fb71500c57d; Type: INDEX; Schema: public; Owner: xerouser
--

CREATE INDEX "IDX_9d131b8b8db5708fb71500c57d" ON public.products USING btree (model_id);


--
-- Name: IDX_RFQ_VENDOR_AWARDED; Type: INDEX; Schema: public; Owner: xerouser
--

CREATE UNIQUE INDEX "IDX_RFQ_VENDOR_AWARDED" ON public.rfq_vendors USING btree (rfq_id) WHERE (status = 'AWARDED'::public.rfq_vendors_status_enum);


--
-- Name: IDX_d1a87bf9de7503bb1b6fc0cb85; Type: INDEX; Schema: public; Owner: xerouser
--

CREATE INDEX "IDX_d1a87bf9de7503bb1b6fc0cb85" ON public.warehouses USING btree (branch_id);


--
-- Name: IDX_fe403886915578889ba661ce00; Type: INDEX; Schema: public; Owner: xerouser
--

CREATE UNIQUE INDEX "IDX_fe403886915578889ba661ce00" ON public.rfq_vendor_items USING btree (rfq_vendor_id, rfq_item_id);


--
-- Name: idx_contract_meter_readings_contract; Type: INDEX; Schema: public; Owner: xerouser
--

CREATE INDEX idx_contract_meter_readings_contract ON public.contract_meter_readings USING btree ("contractId");


--
-- Name: idx_lot_documents_lot_id; Type: INDEX; Schema: public; Owner: xerouser
--

CREATE INDEX idx_lot_documents_lot_id ON public.lot_documents USING btree (lot_id);


--
-- Name: idx_lots_purchase_origin; Type: INDEX; Schema: public; Owner: xerouser
--

CREATE INDEX idx_lots_purchase_origin ON public.lots USING btree (purchase_origin);


--
-- Name: idx_purchases_purchase_origin; Type: INDEX; Schema: public; Owner: xerouser
--

CREATE INDEX idx_purchases_purchase_origin ON public.purchases USING btree (purchase_origin);


--
-- Name: idx_vendors_branch_id; Type: INDEX; Schema: public; Owner: xerouser
--

CREATE INDEX idx_vendors_branch_id ON public.vendors USING btree (branch_id);


--
-- Name: uq_products_barcode_id_active; Type: INDEX; Schema: public; Owner: xerouser
--

CREATE UNIQUE INDEX uq_products_barcode_id_active ON public.products USING btree (barcode_id) WHERE ((deleted_at IS NULL) AND (barcode_id IS NOT NULL));


--
-- Name: uq_products_serial_no_active; Type: INDEX; Schema: public; Owner: xerouser
--

CREATE UNIQUE INDEX uq_products_serial_no_active ON public.products USING btree (serial_no) WHERE (deleted_at IS NULL);


--
-- Name: uq_spare_parts_barcode_id_active; Type: INDEX; Schema: public; Owner: xerouser
--

CREATE UNIQUE INDEX uq_spare_parts_barcode_id_active ON public.spare_parts USING btree (barcode_id) WHERE ((deleted_at IS NULL) AND (barcode_id IS NOT NULL));


--
-- Name: uq_spare_parts_item_code_active; Type: INDEX; Schema: public; Owner: xerouser
--

CREATE UNIQUE INDEX uq_spare_parts_item_code_active ON public.spare_parts USING btree (item_code) WHERE (deleted_at IS NULL);


--
-- Name: uq_vendors_branch_email; Type: INDEX; Schema: public; Owner: xerouser
--

CREATE UNIQUE INDEX uq_vendors_branch_email ON public.vendors USING btree (COALESCE((branch_id)::text, 'GLOBAL'::text), email);


--
-- Name: uq_vendors_branch_name; Type: INDEX; Schema: public; Owner: xerouser
--

CREATE UNIQUE INDEX uq_vendors_branch_name ON public.vendors USING btree (COALESCE((branch_id)::text, 'GLOBAL'::text), name);


--
-- Name: rfq_vendors FK_0440b98d0d0baaf0c6fc686bbc4; Type: FK CONSTRAINT; Schema: public; Owner: xerouser
--

ALTER TABLE ONLY public.rfq_vendors
    ADD CONSTRAINT "FK_0440b98d0d0baaf0c6fc686bbc4" FOREIGN KEY (vendor_id) REFERENCES public.vendors(id);


--
-- Name: spare_part_inventories FK_05265de508cc68ebc86184efa31; Type: FK CONSTRAINT; Schema: public; Owner: xerouser
--

ALTER TABLE ONLY public.spare_part_inventories
    ADD CONSTRAINT "FK_05265de508cc68ebc86184efa31" FOREIGN KEY (spare_part_id) REFERENCES public.spare_parts(id) ON DELETE CASCADE;


--
-- Name: spare_parts FK_0b43f81b1629b7af70d9c028c19; Type: FK CONSTRAINT; Schema: public; Owner: xerouser
--

ALTER TABLE ONLY public.spare_parts
    ADD CONSTRAINT "FK_0b43f81b1629b7af70d9c028c19" FOREIGN KEY (model_id) REFERENCES public.model(id);


--
-- Name: products FK_0e859a83f1dd6b774c20c02885d; Type: FK CONSTRAINT; Schema: public; Owner: xerouser
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT "FK_0e859a83f1dd6b774c20c02885d" FOREIGN KEY (vendor_id) REFERENCES public.vendors(id);


--
-- Name: vendor_requests FK_14a3f07ce47b9e4f0ecc23ac552; Type: FK CONSTRAINT; Schema: public; Owner: xerouser
--

ALTER TABLE ONLY public.vendor_requests
    ADD CONSTRAINT "FK_14a3f07ce47b9e4f0ecc23ac552" FOREIGN KEY (vendor_id) REFERENCES public.vendors(id);


--
-- Name: rfqs FK_176d2ae5bb7604adc15783c0873; Type: FK CONSTRAINT; Schema: public; Owner: xerouser
--

ALTER TABLE ONLY public.rfqs
    ADD CONSTRAINT "FK_176d2ae5bb7604adc15783c0873" FOREIGN KEY (awarded_vendor_id) REFERENCES public.vendors(id);


--
-- Name: rfq_vendor_items FK_1af1ef09607d3c899d0d573bb62; Type: FK CONSTRAINT; Schema: public; Owner: xerouser
--

ALTER TABLE ONLY public.rfq_vendor_items
    ADD CONSTRAINT "FK_1af1ef09607d3c899d0d573bb62" FOREIGN KEY (rfq_vendor_id) REFERENCES public.rfq_vendors(id) ON DELETE CASCADE;


--
-- Name: model FK_1c9fa70a2a9da326c507e3fead5; Type: FK CONSTRAINT; Schema: public; Owner: xerouser
--

ALTER TABLE ONLY public.model
    ADD CONSTRAINT "FK_1c9fa70a2a9da326c507e3fead5" FOREIGN KEY (brand_id) REFERENCES public.brands(id);


--
-- Name: rfqs FK_1da75d5bf2f6a33be45ecc585aa; Type: FK CONSTRAINT; Schema: public; Owner: xerouser
--

ALTER TABLE ONLY public.rfqs
    ADD CONSTRAINT "FK_1da75d5bf2f6a33be45ecc585aa" FOREIGN KEY (branch_id) REFERENCES public.branches(id);


--
-- Name: rfq_vendors FK_215c12c2e823761738e5070c9b9; Type: FK CONSTRAINT; Schema: public; Owner: xerouser
--

ALTER TABLE ONLY public.rfq_vendors
    ADD CONSTRAINT "FK_215c12c2e823761738e5070c9b9" FOREIGN KEY (rfq_id) REFERENCES public.rfqs(id) ON DELETE CASCADE;


--
-- Name: purchase_costs FK_2280227468e55ef283692723183; Type: FK CONSTRAINT; Schema: public; Owner: xerouser
--

ALTER TABLE ONLY public.purchase_costs
    ADD CONSTRAINT "FK_2280227468e55ef283692723183" FOREIGN KEY (purchase_id) REFERENCES public.purchases(id) ON DELETE CASCADE;


--
-- Name: spare_parts FK_245465fef3c9b3bdfbece9c556c; Type: FK CONSTRAINT; Schema: public; Owner: xerouser
--

ALTER TABLE ONLY public.spare_parts
    ADD CONSTRAINT "FK_245465fef3c9b3bdfbece9c556c" FOREIGN KEY (branch_id) REFERENCES public.branches(id);


--
-- Name: lot_items FK_286fe50df743136cf6efa2719fd; Type: FK CONSTRAINT; Schema: public; Owner: xerouser
--

ALTER TABLE ONLY public.lot_items
    ADD CONSTRAINT "FK_286fe50df743136cf6efa2719fd" FOREIGN KEY (spare_part_id) REFERENCES public.spare_parts(id) ON DELETE SET NULL;


--
-- Name: lots FK_293d693e389a79d3c1c511eddc9; Type: FK CONSTRAINT; Schema: public; Owner: xerouser
--

ALTER TABLE ONLY public.lots
    ADD CONSTRAINT "FK_293d693e389a79d3c1c511eddc9" FOREIGN KEY (warehouse_id) REFERENCES public.warehouses(id);


--
-- Name: purchases FK_2b7ac4cff15f6652dd49546efa9; Type: FK CONSTRAINT; Schema: public; Owner: xerouser
--

ALTER TABLE ONLY public.purchases
    ADD CONSTRAINT "FK_2b7ac4cff15f6652dd49546efa9" FOREIGN KEY (lot_id) REFERENCES public.lots(id) ON DELETE CASCADE;


--
-- Name: rfqs FK_30005d74217b9b0449de19362bc; Type: FK CONSTRAINT; Schema: public; Owner: xerouser
--

ALTER TABLE ONLY public.rfqs
    ADD CONSTRAINT "FK_30005d74217b9b0449de19362bc" FOREIGN KEY (created_by) REFERENCES public.employee_managers(employee_id);


--
-- Name: spare_parts_models FK_32da74acefb3d0dd46c16180ba5; Type: FK CONSTRAINT; Schema: public; Owner: xerouser
--

ALTER TABLE ONLY public.spare_parts_models
    ADD CONSTRAINT "FK_32da74acefb3d0dd46c16180ba5" FOREIGN KEY (spare_part_id) REFERENCES public.spare_parts(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: lot_items FK_34d15a7aeed86fc71f927d7f6f7; Type: FK CONSTRAINT; Schema: public; Owner: xerouser
--

ALTER TABLE ONLY public.lot_items
    ADD CONSTRAINT "FK_34d15a7aeed86fc71f927d7f6f7" FOREIGN KEY (lot_id) REFERENCES public.lots(id) ON DELETE CASCADE;


--
-- Name: spare_parts FK_34d52d8b72e5daf093faa6b6e8f; Type: FK CONSTRAINT; Schema: public; Owner: xerouser
--

ALTER TABLE ONLY public.spare_parts
    ADD CONSTRAINT "FK_34d52d8b72e5daf093faa6b6e8f" FOREIGN KEY (lot_id) REFERENCES public.lots(id);


--
-- Name: spare_parts_models FK_3854764df939001979ad9a91e4a; Type: FK CONSTRAINT; Schema: public; Owner: xerouser
--

ALTER TABLE ONLY public.spare_parts_models
    ADD CONSTRAINT "FK_3854764df939001979ad9a91e4a" FOREIGN KEY (model_id) REFERENCES public.model(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: spare_parts FK_438e634aefb4f8a9a85621251bb; Type: FK CONSTRAINT; Schema: public; Owner: xerouser
--

ALTER TABLE ONLY public.spare_parts
    ADD CONSTRAINT "FK_438e634aefb4f8a9a85621251bb" FOREIGN KEY (warehouse_id) REFERENCES public.warehouses(id);


--
-- Name: purchases FK_6b06d2cb149e7461d298eda9002; Type: FK CONSTRAINT; Schema: public; Owner: xerouser
--

ALTER TABLE ONLY public.purchases
    ADD CONSTRAINT "FK_6b06d2cb149e7461d298eda9002" FOREIGN KEY (branch_id) REFERENCES public.branches(id);


--
-- Name: vendor_requests FK_73c1105f82fe43f7652ea2ea23e; Type: FK CONSTRAINT; Schema: public; Owner: xerouser
--

ALTER TABLE ONLY public.vendor_requests
    ADD CONSTRAINT "FK_73c1105f82fe43f7652ea2ea23e" FOREIGN KEY (requested_by) REFERENCES public.employee_managers(employee_id);


--
-- Name: products FK_76ac0a401091bd373753579c977; Type: FK CONSTRAINT; Schema: public; Owner: xerouser
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT "FK_76ac0a401091bd373753579c977" FOREIGN KEY (warehouse_id) REFERENCES public.warehouses(id);


--
-- Name: lot_items FK_7c3cc264bf205e444a87c2bb03d; Type: FK CONSTRAINT; Schema: public; Owner: xerouser
--

ALTER TABLE ONLY public.lot_items
    ADD CONSTRAINT "FK_7c3cc264bf205e444a87c2bb03d" FOREIGN KEY (model_id) REFERENCES public.model(id);


--
-- Name: products FK_9d131b8b8db5708fb71500c57d2; Type: FK CONSTRAINT; Schema: public; Owner: xerouser
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT "FK_9d131b8b8db5708fb71500c57d2" FOREIGN KEY (model_id) REFERENCES public.model(id);


--
-- Name: purchase_costs FK_ad0b076b1f56f07b309f0368e97; Type: FK CONSTRAINT; Schema: public; Owner: xerouser
--

ALTER TABLE ONLY public.purchase_costs
    ADD CONSTRAINT "FK_ad0b076b1f56f07b309f0368e97" FOREIGN KEY (branch_id) REFERENCES public.branches(id);


--
-- Name: purchase_payments FK_b0089820b7452d8e84b5d1fda65; Type: FK CONSTRAINT; Schema: public; Owner: xerouser
--

ALTER TABLE ONLY public.purchase_payments
    ADD CONSTRAINT "FK_b0089820b7452d8e84b5d1fda65" FOREIGN KEY (purchase_id) REFERENCES public.purchases(id);


--
-- Name: spare_parts FK_b53c9e6a07e38c232c41bf55cd0; Type: FK CONSTRAINT; Schema: public; Owner: xerouser
--

ALTER TABLE ONLY public.spare_parts
    ADD CONSTRAINT "FK_b53c9e6a07e38c232c41bf55cd0" FOREIGN KEY (vendor_id) REFERENCES public.vendors(id);


--
-- Name: purchases FK_b9a9f16702bc091db7eb5e0d9c7; Type: FK CONSTRAINT; Schema: public; Owner: xerouser
--

ALTER TABLE ONLY public.purchases
    ADD CONSTRAINT "FK_b9a9f16702bc091db7eb5e0d9c7" FOREIGN KEY (vendor_id) REFERENCES public.vendors(id);


--
-- Name: spare_part_inventories FK_baac5f2237b08622d8ecca37938; Type: FK CONSTRAINT; Schema: public; Owner: xerouser
--

ALTER TABLE ONLY public.spare_part_inventories
    ADD CONSTRAINT "FK_baac5f2237b08622d8ecca37938" FOREIGN KEY (warehouse_id) REFERENCES public.warehouses(id);


--
-- Name: purchase_payments FK_c50c1920a135ca5da229fcf0985; Type: FK CONSTRAINT; Schema: public; Owner: xerouser
--

ALTER TABLE ONLY public.purchase_payments
    ADD CONSTRAINT "FK_c50c1920a135ca5da229fcf0985" FOREIGN KEY (branch_id) REFERENCES public.branches(id);


--
-- Name: vendor_requests FK_d04be0602ce2b79b69a2ca5e851; Type: FK CONSTRAINT; Schema: public; Owner: xerouser
--

ALTER TABLE ONLY public.vendor_requests
    ADD CONSTRAINT "FK_d04be0602ce2b79b69a2ca5e851" FOREIGN KEY (branch_id) REFERENCES public.branches(id);


--
-- Name: warehouses FK_d1a87bf9de7503bb1b6fc0cb859; Type: FK CONSTRAINT; Schema: public; Owner: xerouser
--

ALTER TABLE ONLY public.warehouses
    ADD CONSTRAINT "FK_d1a87bf9de7503bb1b6fc0cb859" FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE SET NULL;


--
-- Name: spare_part_inventories FK_d5fb61c6773ba726504ada7c837; Type: FK CONSTRAINT; Schema: public; Owner: xerouser
--

ALTER TABLE ONLY public.spare_part_inventories
    ADD CONSTRAINT "FK_d5fb61c6773ba726504ada7c837" FOREIGN KEY (vendor_id) REFERENCES public.vendors(id);


--
-- Name: lots FK_d63b22d13f0a03f534c213a13fd; Type: FK CONSTRAINT; Schema: public; Owner: xerouser
--

ALTER TABLE ONLY public.lots
    ADD CONSTRAINT "FK_d63b22d13f0a03f534c213a13fd" FOREIGN KEY (vendor_id) REFERENCES public.vendors(id);


--
-- Name: rfq_vendor_items FK_e556812c2cbdd7bb4ba9e3b9999; Type: FK CONSTRAINT; Schema: public; Owner: xerouser
--

ALTER TABLE ONLY public.rfq_vendor_items
    ADD CONSTRAINT "FK_e556812c2cbdd7bb4ba9e3b9999" FOREIGN KEY (rfq_item_id) REFERENCES public.rfq_items(id);


--
-- Name: rfq_items FK_ef8f022c5f4d9e27e47e03a1202; Type: FK CONSTRAINT; Schema: public; Owner: xerouser
--

ALTER TABLE ONLY public.rfq_items
    ADD CONSTRAINT "FK_ef8f022c5f4d9e27e47e03a1202" FOREIGN KEY (rfq_id) REFERENCES public.rfqs(id) ON DELETE CASCADE;


--
-- Name: products FK_f5741a9400f1296cbf33cd03b82; Type: FK CONSTRAINT; Schema: public; Owner: xerouser
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT "FK_f5741a9400f1296cbf33cd03b82" FOREIGN KEY (spare_part_id) REFERENCES public.spare_parts(id) ON DELETE SET NULL;


--
-- Name: products FK_fea955aaac39a5cfa75d82d73e3; Type: FK CONSTRAINT; Schema: public; Owner: xerouser
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT "FK_fea955aaac39a5cfa75d82d73e3" FOREIGN KEY (lot_id) REFERENCES public.lots(id);


--
-- Name: consumable_yield_history consumable_yield_history_ticketId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: xerouser
--

ALTER TABLE ONLY public.consumable_yield_history
    ADD CONSTRAINT "consumable_yield_history_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES public.service_tickets(id) ON DELETE CASCADE;


--
-- Name: contract_meter_readings contract_meter_readings_contractId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: xerouser
--

ALTER TABLE ONLY public.contract_meter_readings
    ADD CONSTRAINT "contract_meter_readings_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES public.service_contracts(id) ON DELETE CASCADE;


--
-- Name: lot_documents lot_documents_lot_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: xerouser
--

ALTER TABLE ONLY public.lot_documents
    ADD CONSTRAINT lot_documents_lot_id_fkey FOREIGN KEY (lot_id) REFERENCES public.lots(id) ON DELETE CASCADE;


--
-- Name: service_diagnoses service_diagnoses_ticketId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: xerouser
--

ALTER TABLE ONLY public.service_diagnoses
    ADD CONSTRAINT "service_diagnoses_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES public.service_tickets(id) ON DELETE CASCADE;


--
-- Name: service_estimate_items service_estimate_items_estimateId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: xerouser
--

ALTER TABLE ONLY public.service_estimate_items
    ADD CONSTRAINT "service_estimate_items_estimateId_fkey" FOREIGN KEY ("estimateId") REFERENCES public.service_estimates(id) ON DELETE CASCADE;


--
-- Name: service_estimate_revisions service_estimate_revisions_ticket_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: xerouser
--

ALTER TABLE ONLY public.service_estimate_revisions
    ADD CONSTRAINT service_estimate_revisions_ticket_id_fkey FOREIGN KEY ("ticketId") REFERENCES public.service_tickets(id) ON DELETE CASCADE;


--
-- Name: service_estimates service_estimates_ticketId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: xerouser
--

ALTER TABLE ONLY public.service_estimates
    ADD CONSTRAINT "service_estimates_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES public.service_tickets(id) ON DELETE CASCADE;


--
-- Name: service_reports service_reports_ticketId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: xerouser
--

ALTER TABLE ONLY public.service_reports
    ADD CONSTRAINT "service_reports_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES public.service_tickets(id) ON DELETE CASCADE;


--
-- Name: service_ticket_activities service_ticket_activities_ticketId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: xerouser
--

ALTER TABLE ONLY public.service_ticket_activities
    ADD CONSTRAINT "service_ticket_activities_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES public.service_tickets(id) ON DELETE CASCADE;


--
-- Name: service_ticket_items service_ticket_items_ticketId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: xerouser
--

ALTER TABLE ONLY public.service_ticket_items
    ADD CONSTRAINT "service_ticket_items_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES public.service_tickets(id) ON DELETE CASCADE;


--
-- Name: stock_transfer_items stock_transfer_items_transfer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: xerouser
--

ALTER TABLE ONLY public.stock_transfer_items
    ADD CONSTRAINT stock_transfer_items_transfer_id_fkey FOREIGN KEY (transfer_id) REFERENCES public.stock_transfers(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict WgUefABfDC5MAoAFcf7InDFQgPW58m0JmdRB7w8xYdQiZCUIA97OuYIrKDrPOil

