--
-- PostgreSQL database dump
--

\restrict ibOukVJJj6M1d8RbtIjYLg35t5Dnfn93eMkQOSqdLMWywCSnSKBwxdfnkVKGaEg

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
-- Name: credit_note_status_enum; Type: TYPE; Schema: public; Owner: xerouser
--

CREATE TYPE public.credit_note_status_enum AS ENUM (
    'DRAFT',
    'PENDING_APPROVAL',
    'APPROVED',
    'REJECTED',
    'COMPLETED',
    'PRODUCT_REPLACED'
);


ALTER TYPE public.credit_note_status_enum OWNER TO xerouser;

--
-- Name: credit_note_type_enum; Type: TYPE; Schema: public; Owner: xerouser
--

CREATE TYPE public.credit_note_type_enum AS ENUM (
    'DIRECT_REFUND',
    'REPLACEMENT',
    'CREDIT_EXCHANGE'
);


ALTER TYPE public.credit_note_type_enum OWNER TO xerouser;

--
-- Name: damage_reason_enum; Type: TYPE; Schema: public; Owner: xerouser
--

CREATE TYPE public.damage_reason_enum AS ENUM (
    'Damaged Product',
    'Incomplete Parts',
    'Defective',
    'Wrong Item Delivered',
    'Other'
);


ALTER TYPE public.damage_reason_enum OWNER TO xerouser;

--
-- Name: device_meter_readings_source_enum; Type: TYPE; Schema: public; Owner: xerouser
--

CREATE TYPE public.device_meter_readings_source_enum AS ENUM (
    'MANUAL',
    'SYSTEM',
    'OCR'
);


ALTER TYPE public.device_meter_readings_source_enum OWNER TO xerouser;

--
-- Name: guarantee_cheques_purpose_enum; Type: TYPE; Schema: public; Owner: xerouser
--

CREATE TYPE public.guarantee_cheques_purpose_enum AS ENUM (
    'PERFORMANCE_SECURITY',
    'OTHER'
);


ALTER TYPE public.guarantee_cheques_purpose_enum OWNER TO xerouser;

--
-- Name: guarantee_cheques_status_enum; Type: TYPE; Schema: public; Owner: xerouser
--

CREATE TYPE public.guarantee_cheques_status_enum AS ENUM (
    'RECEIVED',
    'RETURNED',
    'DEPOSITED'
);


ALTER TYPE public.guarantee_cheques_status_enum OWNER TO xerouser;

--
-- Name: invoice_items_itemtype_enum; Type: TYPE; Schema: public; Owner: xerouser
--

CREATE TYPE public.invoice_items_itemtype_enum AS ENUM (
    'PRICING_RULE',
    'PRODUCT',
    'SPARE_PART'
);


ALTER TYPE public.invoice_items_itemtype_enum OWNER TO xerouser;

--
-- Name: invoices_billtype_enum; Type: TYPE; Schema: public; Owner: xerouser
--

CREATE TYPE public.invoices_billtype_enum AS ENUM (
    'SERVICE',
    'AMC',
    'FSMA',
    'SMA',
    'SALE',
    'RENT',
    'LEASE'
);


ALTER TYPE public.invoices_billtype_enum OWNER TO xerouser;

--
-- Name: invoices_contractstatus_enum; Type: TYPE; Schema: public; Owner: xerouser
--

CREATE TYPE public.invoices_contractstatus_enum AS ENUM (
    'PENDING_CONFIRMATION',
    'ACTIVE',
    'COMPLETED',
    'CANCELLED'
);


ALTER TYPE public.invoices_contractstatus_enum OWNER TO xerouser;

--
-- Name: invoices_leasetype_enum; Type: TYPE; Schema: public; Owner: xerouser
--

CREATE TYPE public.invoices_leasetype_enum AS ENUM (
    'EMI',
    'FSM'
);


ALTER TYPE public.invoices_leasetype_enum OWNER TO xerouser;

--
-- Name: invoices_rentperiod_enum; Type: TYPE; Schema: public; Owner: xerouser
--

CREATE TYPE public.invoices_rentperiod_enum AS ENUM (
    'MONTHLY',
    'QUARTERLY',
    'HALF_YEARLY',
    'YEARLY',
    'CUSTOM'
);


ALTER TYPE public.invoices_rentperiod_enum OWNER TO xerouser;

--
-- Name: invoices_renttype_enum; Type: TYPE; Schema: public; Owner: xerouser
--

CREATE TYPE public.invoices_renttype_enum AS ENUM (
    'FIXED_LIMIT',
    'FIXED_COMBO',
    'FIXED_FLAT',
    'CPC',
    'CPC_COMBO'
);


ALTER TYPE public.invoices_renttype_enum OWNER TO xerouser;

--
-- Name: invoices_saletype_enum; Type: TYPE; Schema: public; Owner: xerouser
--

CREATE TYPE public.invoices_saletype_enum AS ENUM (
    'SALE',
    'RENT',
    'LEASE',
    'PRODUCT_SALE',
    'SPAREPART_SALE',
    'SERVICE'
);


ALTER TYPE public.invoices_saletype_enum OWNER TO xerouser;

--
-- Name: invoices_securitydepositmode_enum; Type: TYPE; Schema: public; Owner: xerouser
--

CREATE TYPE public.invoices_securitydepositmode_enum AS ENUM (
    'CASH',
    'CHEQUE',
    'BANK_TRANSFER',
    'CREDIT_CARD',
    'UPI'
);


ALTER TYPE public.invoices_securitydepositmode_enum OWNER TO xerouser;

--
-- Name: invoices_status_enum; Type: TYPE; Schema: public; Owner: xerouser
--

CREATE TYPE public.invoices_status_enum AS ENUM (
    'DRAFT',
    'SENT',
    'PAID',
    'CANCELLED',
    'TEMPLATE',
    'ASSIGNED',
    'CUSTOMER_ACCEPTED',
    'CUSTOMER_REJECTED',
    'EMPLOYEE_APPROVED',
    'WAITING_FINANCE_APPROVAL',
    'FINANCE_APPROVED',
    'FINANCE_REJECTED',
    'ACTIVE_CONTRACT',
    'INVOICED',
    'EXPIRED',
    'RETAKEN',
    'SUPERSEDED'
);


ALTER TYPE public.invoices_status_enum OWNER TO xerouser;

--
-- Name: invoices_type_enum; Type: TYPE; Schema: public; Owner: xerouser
--

CREATE TYPE public.invoices_type_enum AS ENUM (
    'QUOTATION',
    'PROFORMA',
    'FINAL',
    'OPENING'
);


ALTER TYPE public.invoices_type_enum OWNER TO xerouser;

--
-- Name: invoices_warrantydurationunit_enum; Type: TYPE; Schema: public; Owner: xerouser
--

CREATE TYPE public.invoices_warrantydurationunit_enum AS ENUM (
    'months',
    'years'
);


ALTER TYPE public.invoices_warrantydurationunit_enum OWNER TO xerouser;

--
-- Name: invoices_warrantytype_enum; Type: TYPE; Schema: public; Owner: xerouser
--

CREATE TYPE public.invoices_warrantytype_enum AS ENUM (
    'none',
    'duration',
    'copies',
    'both'
);


ALTER TYPE public.invoices_warrantytype_enum OWNER TO xerouser;

--
-- Name: opening_balance_entries_balance_type_enum; Type: TYPE; Schema: public; Owner: xerouser
--

CREATE TYPE public.opening_balance_entries_balance_type_enum AS ENUM (
    'SALE_OUTSTANDING',
    'RENT_CONTRACT',
    'LEASE_CONTRACT',
    'SERVICE_DEBT',
    'OTHER_DEBT'
);


ALTER TYPE public.opening_balance_entries_balance_type_enum OWNER TO xerouser;

--
-- Name: payment_ledgers_paymentmode_enum; Type: TYPE; Schema: public; Owner: xerouser
--

CREATE TYPE public.payment_ledgers_paymentmode_enum AS ENUM (
    'CASH',
    'BANK_TRANSFER',
    'CHEQUE',
    'CREDIT_CARD'
);


ALTER TYPE public.payment_ledgers_paymentmode_enum OWNER TO xerouser;

--
-- Name: product_allocations_status_enum; Type: TYPE; Schema: public; Owner: xerouser
--

CREATE TYPE public.product_allocations_status_enum AS ENUM (
    'ALLOCATED',
    'RETURNED',
    'REPLACED'
);


ALTER TYPE public.product_allocations_status_enum OWNER TO xerouser;

--
-- Name: swap_request_status_enum; Type: TYPE; Schema: public; Owner: xerouser
--

CREATE TYPE public.swap_request_status_enum AS ENUM (
    'PENDING',
    'APPROVED',
    'REJECTED'
);


ALTER TYPE public.swap_request_status_enum OWNER TO xerouser;

--
-- Name: usage_records_reportedby_enum; Type: TYPE; Schema: public; Owner: xerouser
--

CREATE TYPE public.usage_records_reportedby_enum AS ENUM (
    'CUSTOMER',
    'EMPLOYEE'
);


ALTER TYPE public.usage_records_reportedby_enum OWNER TO xerouser;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: account_reconciliations; Type: TABLE; Schema: public; Owner: xerouser
--

CREATE TABLE public.account_reconciliations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    "accountId" uuid NOT NULL,
    "reconciliationDate" date NOT NULL,
    "statementDate" date NOT NULL,
    "bookBalance" numeric(12,2) NOT NULL,
    "statementBalance" numeric(12,2) NOT NULL,
    difference numeric(12,2) NOT NULL,
    "isBalanced" boolean DEFAULT false NOT NULL,
    notes text,
    "createdBy" uuid NOT NULL,
    "createdAt" timestamp without time zone DEFAULT now()
);


ALTER TABLE public.account_reconciliations OWNER TO xerouser;

--
-- Name: asset_depreciation_register; Type: TABLE; Schema: public; Owner: xerouser
--

CREATE TABLE public.asset_depreciation_register (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    "productId" uuid,
    "brandId" uuid NOT NULL,
    "modelId" uuid NOT NULL,
    "branchId" uuid NOT NULL,
    "purchaseDate" date NOT NULL,
    "purchasePrice" numeric(12,2) NOT NULL,
    "annualDepreciationPct" numeric(5,2) NOT NULL,
    "usefulLifeMonths" integer NOT NULL,
    "salvageValuePct" numeric(5,2) NOT NULL,
    "salvageValue" numeric(12,2) NOT NULL,
    method character varying DEFAULT 'STRAIGHT_LINE'::character varying NOT NULL,
    status character varying DEFAULT 'ACTIVE'::character varying NOT NULL,
    "disposalDate" date,
    "disposalValue" numeric(12,2),
    notes text,
    "createdBy" uuid NOT NULL,
    "createdAt" timestamp without time zone DEFAULT now(),
    "updatedAt" timestamp without time zone DEFAULT now(),
    "assetType" character varying DEFAULT 'PRINTER_PRODUCT'::character varying,
    "assetCategory" character varying DEFAULT 'PRINTER_EQUIPMENT'::character varying,
    "assetName" character varying
);


ALTER TABLE public.asset_depreciation_register OWNER TO xerouser;

--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: xerouser
--

CREATE TABLE public.audit_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    "entityId" character varying NOT NULL,
    action character varying NOT NULL,
    "performedBy" character varying NOT NULL,
    "oldValue" text,
    "newValue" text,
    details text,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.audit_logs OWNER TO xerouser;

--
-- Name: cash_bank_accounts; Type: TABLE; Schema: public; Owner: xerouser
--

CREATE TABLE public.cash_bank_accounts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying NOT NULL,
    type character varying NOT NULL,
    "bankName" character varying,
    "accountNumber" character varying,
    "branchId" uuid NOT NULL,
    currency character varying(3) DEFAULT 'AED'::character varying NOT NULL,
    "openingBalance" numeric(12,2) DEFAULT 0,
    "currentBalance" numeric(12,2) DEFAULT 0,
    notes text,
    "isActive" boolean DEFAULT true,
    "createdAt" timestamp without time zone DEFAULT now(),
    "updatedAt" timestamp without time zone DEFAULT now(),
    iban character varying,
    "accountType" character varying DEFAULT 'CURRENT'::character varying,
    "openingDate" date,
    "responsiblePersonId" uuid,
    "contactPerson" character varying,
    "isDefault" boolean DEFAULT false
);


ALTER TABLE public.cash_bank_accounts OWNER TO xerouser;

--
-- Name: cashbook_entries; Type: TABLE; Schema: public; Owner: xerouser
--

CREATE TABLE public.cashbook_entries (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    "referenceNo" character varying NOT NULL,
    date date NOT NULL,
    "accountId" uuid,
    "entryType" character varying NOT NULL,
    amount numeric(12,2) NOT NULL,
    category character varying NOT NULL,
    description text,
    "linkedInvoiceId" uuid,
    "linkedPoId" uuid,
    "linkedExpenseId" uuid,
    "paymentMode" character varying,
    "chequeNo" character varying,
    notes text,
    "createdBy" uuid NOT NULL,
    "branchId" uuid NOT NULL,
    "createdAt" timestamp without time zone DEFAULT now(),
    "sourceType" character varying,
    "sourceId" uuid,
    "isReversed" boolean DEFAULT false NOT NULL,
    "reversedById" uuid,
    "isPoOrphaned" boolean
);


ALTER TABLE public.cashbook_entries OWNER TO xerouser;

--
-- Name: chart_of_accounts; Type: TABLE; Schema: public; Owner: xerouser
--

CREATE TABLE public.chart_of_accounts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    "accountNumber" character varying NOT NULL,
    "accountName" character varying NOT NULL,
    category character varying NOT NULL,
    "accountGroup" character varying NOT NULL,
    "parentAccountId" uuid,
    "sourceType" character varying NOT NULL,
    "isSystemDefault" boolean DEFAULT false NOT NULL,
    "linkedCashBankAccountId" uuid,
    "categoryKey" character varying,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdBy" uuid,
    "createdAt" timestamp without time zone DEFAULT now(),
    "updatedAt" timestamp without time zone DEFAULT now()
);


ALTER TABLE public.chart_of_accounts OWNER TO xerouser;

--
-- Name: cheque_status_history; Type: TABLE; Schema: public; Owner: xerouser
--

CREATE TABLE public.cheque_status_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    cheque_id uuid NOT NULL,
    from_status character varying,
    to_status character varying NOT NULL,
    notes text,
    changed_by character varying NOT NULL,
    changed_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.cheque_status_history OWNER TO xerouser;

--
-- Name: cheques; Type: TABLE; Schema: public; Owner: xerouser
--

CREATE TABLE public.cheques (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    cheque_no character varying NOT NULL,
    bank_name character varying,
    party_name character varying NOT NULL,
    amount numeric(12,2) NOT NULL,
    due_date date NOT NULL,
    issue_date date,
    type character varying DEFAULT 'RECEIVED'::character varying NOT NULL,
    status character varying DEFAULT 'PENDING'::character varying NOT NULL,
    description text,
    branch_id uuid NOT NULL,
    account_id uuid,
    cashbook_entry_id uuid,
    created_by character varying NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    source_type character varying,
    source_reference_id uuid,
    source_label character varying(500),
    invoice_no character varying(100),
    cheque_date date,
    deposit_date date,
    cleared_date date
);


ALTER TABLE public.cheques OWNER TO xerouser;

--
-- Name: cn_seq_2026; Type: SEQUENCE; Schema: public; Owner: xerouser
--

CREATE SEQUENCE public.cn_seq_2026
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.cn_seq_2026 OWNER TO xerouser;

--
-- Name: contract_agreements; Type: TABLE; Schema: public; Owner: xerouser
--

CREATE TABLE public.contract_agreements (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    "agreementNumber" character varying NOT NULL,
    "invoiceId" uuid NOT NULL,
    "branchId" uuid NOT NULL,
    "contractDate" date NOT NULL,
    "customerName" character varying NOT NULL,
    "customerAddress" character varying,
    "customerPhone" character varying,
    "customerEmail" character varying,
    "customerVatNumber" character varying,
    "createdByEmployeeId" uuid NOT NULL,
    "createdByEmployeeName" character varying NOT NULL,
    "dealerName" character varying NOT NULL,
    "dealerAddress" character varying,
    "dealerPhone" character varying,
    "employeeSignatureData" text,
    "employeeSignedById" uuid,
    "employeeSignedByName" character varying,
    "employeeSignedAt" timestamp without time zone,
    "customerSignatureData" text,
    "customerSignedMethod" character varying DEFAULT 'IN_PERSON'::character varying,
    "customerSignedByName" character varying,
    "customerSignedAt" timestamp without time zone,
    "signingToken" character varying,
    "signingTokenExpiresAt" timestamp without time zone,
    "signingTokenUsed" boolean DEFAULT false NOT NULL,
    "signatureStatus" character varying DEFAULT 'PENDING_SIGNATURES'::character varying NOT NULL,
    "termsAndConditions" text,
    "createdAt" timestamp without time zone DEFAULT now(),
    "updatedAt" timestamp without time zone DEFAULT now(),
    "customerSignedDocumentUrl" character varying,
    "customerSignedDocumentNote" text
);


ALTER TABLE public.contract_agreements OWNER TO xerouser;

--
-- Name: country_tax_rules; Type: TABLE; Schema: public; Owner: xerouser
--

CREATE TABLE public.country_tax_rules (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    country character varying(2) NOT NULL,
    tax_name character varying(50) NOT NULL,
    default_tax_percent numeric(5,2),
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.country_tax_rules OWNER TO xerouser;

--
-- Name: credit_notes; Type: TABLE; Schema: public; Owner: xerouser
--

CREATE TABLE public.credit_notes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    "creditNoteNo" character varying(255) NOT NULL,
    invoice_id uuid NOT NULL,
    "customerId" uuid NOT NULL,
    "branchId" uuid NOT NULL,
    "productId" uuid,
    "productName" character varying(255),
    "modelName" character varying(255),
    brand character varying(255),
    "serialNumber" character varying(255),
    "productAmount" numeric(12,2) NOT NULL,
    type public.credit_note_type_enum NOT NULL,
    status public.credit_note_status_enum DEFAULT 'DRAFT'::public.credit_note_status_enum NOT NULL,
    "sellerEmployeeId" uuid NOT NULL,
    notes text,
    "financeNote" text,
    "damageReason" public.damage_reason_enum,
    "rejectionReason" text,
    "replacementProductId" uuid,
    "replacementSerialNumber" character varying(255),
    "replacementAmount" numeric(12,2),
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL,
    "customerName" character varying(255),
    "invoiceNumber" character varying(255),
    "replacementDiscount" numeric(12,2) DEFAULT 0,
    "replacementProductName" character varying(255),
    "paymentMode" character varying(255),
    "replacementInvoiceId" uuid,
    "replacementInvoiceNumber" character varying(255),
    "productImage" text,
    "replacementProductImage" text,
    item_category character varying(20) DEFAULT 'PRODUCT'::character varying NOT NULL,
    "sparePartId" uuid,
    sku character varying(255),
    quantity integer,
    "taxName" character varying(50),
    "taxPercent" numeric(5,2),
    "taxAmount" numeric(12,2),
    "replacementSparePartId" uuid,
    "replacementSparePartName" character varying(255),
    "replacementSparePartSku" character varying(255),
    "replacementQuantity" integer,
    tax_name character varying(50),
    tax_percent numeric(5,2),
    tax_amount numeric(12,2)
);


ALTER TABLE public.credit_notes OWNER TO xerouser;

--
-- Name: depreciation_brand_rules; Type: TABLE; Schema: public; Owner: xerouser
--

CREATE TABLE public.depreciation_brand_rules (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    "brandId" uuid NOT NULL,
    "annualDepreciationPct" numeric(5,2) NOT NULL,
    "usefulLifeMonths" integer DEFAULT 60 NOT NULL,
    "salvageValuePct" numeric(5,2) DEFAULT 10 NOT NULL,
    method character varying DEFAULT 'STRAIGHT_LINE'::character varying NOT NULL,
    notes text,
    "createdBy" uuid NOT NULL,
    "createdAt" timestamp without time zone DEFAULT now(),
    "updatedAt" timestamp without time zone DEFAULT now()
);


ALTER TABLE public.depreciation_brand_rules OWNER TO xerouser;

--
-- Name: depreciation_journal_entries; Type: TABLE; Schema: public; Owner: xerouser
--

CREATE TABLE public.depreciation_journal_entries (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    "periodYear" integer NOT NULL,
    "periodMonth" integer NOT NULL,
    "totalAmount" numeric(12,2) NOT NULL,
    "branchId" uuid NOT NULL,
    status character varying DEFAULT 'PENDING'::character varying NOT NULL,
    "postedBy" uuid,
    "postedAt" timestamp without time zone,
    "expenseEntryId" uuid,
    "createdAt" timestamp without time zone DEFAULT now()
);


ALTER TABLE public.depreciation_journal_entries OWNER TO xerouser;

--
-- Name: depreciation_model_rules; Type: TABLE; Schema: public; Owner: xerouser
--

CREATE TABLE public.depreciation_model_rules (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    "brandId" uuid NOT NULL,
    "modelId" uuid NOT NULL,
    "annualDepreciationPct" numeric(5,2) NOT NULL,
    "usefulLifeMonths" integer DEFAULT 60 NOT NULL,
    "salvageValuePct" numeric(5,2) DEFAULT 10 NOT NULL,
    method character varying DEFAULT 'STRAIGHT_LINE'::character varying NOT NULL,
    notes text,
    "createdBy" uuid NOT NULL,
    "createdAt" timestamp without time zone DEFAULT now(),
    "updatedAt" timestamp without time zone DEFAULT now()
);


ALTER TABLE public.depreciation_model_rules OWNER TO xerouser;

--
-- Name: device_meter_readings; Type: TABLE; Schema: public; Owner: xerouser
--

CREATE TABLE public.device_meter_readings (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "serialNumber" character varying NOT NULL,
    "timestamp" timestamp without time zone NOT NULL,
    "bwA4" integer DEFAULT 0 NOT NULL,
    "bwA3" integer DEFAULT 0 NOT NULL,
    "colorA4" integer DEFAULT 0 NOT NULL,
    "colorA3" integer DEFAULT 0 NOT NULL,
    source public.device_meter_readings_source_enum DEFAULT 'MANUAL'::public.device_meter_readings_source_enum NOT NULL,
    "invoiceId" uuid,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.device_meter_readings OWNER TO xerouser;

--
-- Name: employee_expense_requests; Type: TABLE; Schema: public; Owner: xerouser
--

CREATE TABLE public.employee_expense_requests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    "requestNo" character varying NOT NULL,
    "employeeId" uuid NOT NULL,
    "employeeName" character varying NOT NULL,
    "employeeRole" character varying NOT NULL,
    "branchId" uuid NOT NULL,
    "branchName" character varying NOT NULL,
    date date NOT NULL,
    category character varying NOT NULL,
    "subCategory" character varying,
    description text NOT NULL,
    amount numeric(12,2) NOT NULL,
    currency character varying(3) DEFAULT 'AED'::character varying NOT NULL,
    "receiptUrl" character varying,
    status character varying DEFAULT 'PENDING'::character varying NOT NULL,
    "submittedAt" timestamp without time zone,
    "reviewedBy" uuid,
    "reviewedByName" character varying,
    "reviewedAt" timestamp without time zone,
    "rejectionReason" text,
    "paidAt" timestamp without time zone,
    "paidFromAccount" uuid,
    "paymentReference" character varying,
    "expenseEntryId" uuid,
    notes text,
    "createdAt" timestamp without time zone DEFAULT now(),
    "updatedAt" timestamp without time zone DEFAULT now(),
    "requestSource" character varying DEFAULT 'EMPLOYEE_EXPENSE'::character varying NOT NULL,
    "purchaseId" character varying,
    "purchaseRef" character varying,
    "vendorName" character varying,
    "paymentMode" character varying,
    "paidFromAccountId" uuid,
    "purchasePaymentId" uuid,
    "chequeNumber" character varying,
    "chequeBankName" character varying,
    "chequeDueDate" date,
    "purchaseOrigin" character varying
);


ALTER TABLE public.employee_expense_requests OWNER TO xerouser;

--
-- Name: employee_target_achievements; Type: TABLE; Schema: public; Owner: xerouser
--

CREATE TABLE public.employee_target_achievements (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    "targetId" character varying NOT NULL,
    "employeeId" character varying NOT NULL,
    "branchId" character varying NOT NULL,
    "targetMonth" character varying(7) NOT NULL,
    "targetAmount" numeric(12,2) NOT NULL,
    "achievedAmount" numeric(12,2) DEFAULT 0 NOT NULL,
    "achievementPercent" numeric(6,2) DEFAULT 0 NOT NULL,
    "appliedTierPercent" numeric(6,2) DEFAULT 0 NOT NULL,
    "incentiveAmount" numeric(12,2) DEFAULT 0 NOT NULL,
    "dealCount" integer DEFAULT 0 NOT NULL,
    "calculatedAt" timestamp without time zone DEFAULT now() NOT NULL,
    "isFinalized" boolean DEFAULT false NOT NULL
);


ALTER TABLE public.employee_target_achievements OWNER TO xerouser;

--
-- Name: employee_targets; Type: TABLE; Schema: public; Owner: xerouser
--

CREATE TABLE public.employee_targets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    "employeeId" character varying NOT NULL,
    "branchId" character varying NOT NULL,
    "assignedBy" character varying NOT NULL,
    "targetMonth" character varying(7) NOT NULL,
    "targetAmount" numeric(12,2) NOT NULL,
    "targetType" character varying(255) NOT NULL,
    "currencyCode" character varying(3) NOT NULL,
    tiers jsonb DEFAULT '[]'::jsonb NOT NULL,
    status character varying(255) DEFAULT 'ACTIVE'::character varying NOT NULL,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.employee_targets OWNER TO xerouser;

--
-- Name: equity_entries; Type: TABLE; Schema: public; Owner: xerouser
--

CREATE TABLE public.equity_entries (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    "entryNo" character varying NOT NULL,
    date date NOT NULL,
    type character varying NOT NULL,
    description text NOT NULL,
    amount numeric(14,2) NOT NULL,
    currency character varying DEFAULT 'AED'::character varying,
    "branchId" uuid NOT NULL,
    "referenceNo" character varying,
    "linkedCashAccountId" uuid,
    "documentUrl" character varying,
    notes text,
    "createdBy" uuid NOT NULL,
    "createdAt" timestamp without time zone DEFAULT now(),
    "updatedAt" timestamp without time zone DEFAULT now(),
    "ownerId" uuid,
    "paymentMode" character varying,
    "numberOfShares" integer,
    "pricePerShare" numeric(14,4),
    "reserveType" character varying,
    "reserveSource" character varying,
    "paymentDate" date
);


ALTER TABLE public.equity_entries OWNER TO xerouser;

--
-- Name: exchange_rates; Type: TABLE; Schema: public; Owner: xerouser
--

CREATE TABLE public.exchange_rates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    "fromCurrency" character varying(3) NOT NULL,
    "toCurrency" character varying(3) NOT NULL,
    rate numeric(12,6) NOT NULL,
    "setBy" uuid NOT NULL,
    "createdAt" timestamp without time zone DEFAULT now()
);


ALTER TABLE public.exchange_rates OWNER TO xerouser;

--
-- Name: expense_entries; Type: TABLE; Schema: public; Owner: xerouser
--

CREATE TABLE public.expense_entries (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    "expenseNo" character varying NOT NULL,
    date date NOT NULL,
    category character varying NOT NULL,
    "subCategory" character varying,
    description text NOT NULL,
    "branchId" uuid NOT NULL,
    amount numeric(12,2) NOT NULL,
    "vatAmount" numeric(12,2) DEFAULT 0,
    "netAmount" numeric(12,2) NOT NULL,
    currency character varying(3) DEFAULT 'AED'::character varying NOT NULL,
    status character varying DEFAULT 'PENDING'::character varying,
    "paidFrom" uuid,
    "paymentDate" date,
    "paymentMode" character varying,
    "referenceNo" character varying,
    "approvedBy" uuid,
    "receiptUrl" character varying,
    notes text,
    "createdBy" uuid NOT NULL,
    "createdAt" timestamp without time zone DEFAULT now(),
    "updatedAt" timestamp without time zone DEFAULT now(),
    "isPrepayment" boolean DEFAULT false NOT NULL,
    "coveredPeriodStart" date,
    "coveredPeriodEnd" date
);


ALTER TABLE public.expense_entries OWNER TO xerouser;

--
-- Name: guarantee_cheques; Type: TABLE; Schema: public; Owner: xerouser
--

CREATE TABLE public.guarantee_cheques (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    customer_id uuid NOT NULL,
    customer_name character varying(255) NOT NULL,
    contract_invoice_id uuid,
    contract_reference character varying(255),
    cheque_number character varying(100) NOT NULL,
    amount numeric(12,2) NOT NULL,
    currency_code character varying(3) DEFAULT 'AED'::character varying NOT NULL,
    bank_name character varying(150) NOT NULL,
    received_date date NOT NULL,
    purpose public.guarantee_cheques_purpose_enum DEFAULT 'PERFORMANCE_SECURITY'::public.guarantee_cheques_purpose_enum NOT NULL,
    status public.guarantee_cheques_status_enum DEFAULT 'RECEIVED'::public.guarantee_cheques_status_enum NOT NULL,
    returned_date date,
    branch_id uuid NOT NULL,
    created_by uuid NOT NULL,
    notes text,
    deleted_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    deposited_date date,
    deposited_to_account_id uuid
);


ALTER TABLE public.guarantee_cheques OWNER TO xerouser;

--
-- Name: income_entries; Type: TABLE; Schema: public; Owner: xerouser
--

CREATE TABLE public.income_entries (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    "incomeNo" character varying NOT NULL,
    date date NOT NULL,
    category character varying NOT NULL,
    "subCategory" character varying,
    description text NOT NULL,
    "branchId" uuid NOT NULL,
    amount numeric(12,2) NOT NULL,
    "vatAmount" numeric(12,2) DEFAULT 0,
    "netAmount" numeric(12,2) NOT NULL,
    currency character varying(3) DEFAULT 'AED'::character varying NOT NULL,
    status character varying DEFAULT 'PENDING'::character varying,
    "receivedTo" uuid,
    "receivedDate" date,
    "receivedMode" character varying,
    "referenceNo" character varying,
    "approvedBy" uuid,
    "receiptUrl" character varying,
    notes text,
    "createdBy" uuid NOT NULL,
    "createdAt" timestamp without time zone DEFAULT now(),
    "updatedAt" timestamp without time zone DEFAULT now()
);


ALTER TABLE public.income_entries OWNER TO xerouser;

--
-- Name: installation_requests; Type: TABLE; Schema: public; Owner: xerouser
--

CREATE TABLE public.installation_requests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    "invoiceId" uuid NOT NULL,
    "branchId" uuid NOT NULL,
    "assignedByEmployeeId" uuid NOT NULL,
    "assignedByEmployeeName" character varying NOT NULL,
    "technicianId" uuid,
    "technicianName" character varying,
    "customerName" character varying NOT NULL,
    "customerAddress" character varying,
    "invoiceNumber" character varying NOT NULL,
    notes text,
    "startTime" timestamp without time zone,
    "endTime" timestamp without time zone,
    "durationSeconds" integer,
    status character varying DEFAULT 'PENDING'::character varying NOT NULL,
    "createdAt" timestamp without time zone DEFAULT now(),
    "updatedAt" timestamp without time zone DEFAULT now(),
    "saleType" character varying,
    "initialReadingEnteredAt" timestamp without time zone,
    "initialReadingEnteredByName" character varying,
    "initialReadingPhotoUrl" character varying,
    "initialReadingTakenDate" date
);


ALTER TABLE public.installation_requests OWNER TO xerouser;

--
-- Name: invoice_items; Type: TABLE; Schema: public; Owner: xerouser
--

CREATE TABLE public.invoice_items (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "itemType" public.invoice_items_itemtype_enum DEFAULT 'PRICING_RULE'::public.invoice_items_itemtype_enum NOT NULL,
    "bwIncludedLimit" integer,
    "colorIncludedLimit" integer,
    "combinedIncludedLimit" integer,
    "bwExcessRate" numeric(10,4),
    "colorExcessRate" numeric(10,4),
    "combinedExcessRate" numeric(10,4),
    "bwSlabRanges" json,
    "colorSlabRanges" json,
    "comboSlabRanges" json,
    quantity integer DEFAULT 0,
    "unitPrice" numeric(12,2) DEFAULT '0'::numeric,
    "initialBwCount" integer,
    "initialBwA3Count" integer,
    "initialColorCount" integer,
    "initialColorA3Count" integer,
    "productId" uuid,
    "invoiceId" uuid,
    description text DEFAULT ''::text,
    "sparePartId" uuid,
    "serialNumber" character varying,
    warranty character varying,
    "modelId" character varying,
    "deletedAt" timestamp without time zone,
    "discountAmount" numeric(12,2) DEFAULT 0
);


ALTER TABLE public.invoice_items OWNER TO xerouser;

--
-- Name: invoice_ledger; Type: TABLE; Schema: public; Owner: xerouser
--

CREATE TABLE public.invoice_ledger (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    invoice_id uuid,
    total_amount numeric(12,2) DEFAULT 0 NOT NULL,
    paid_amount numeric(12,2) DEFAULT 0 NOT NULL,
    balance_amount numeric(12,2) DEFAULT 0 NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    deleted_at timestamp without time zone
);


ALTER TABLE public.invoice_ledger OWNER TO xerouser;

--
-- Name: invoices; Type: TABLE; Schema: public; Owner: xerouser
--

CREATE TABLE public.invoices (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "invoiceNumber" character varying NOT NULL,
    "securityDepositAmount" numeric(10,2),
    "securityDepositMode" public.invoices_securitydepositmode_enum,
    "securityDepositReference" character varying,
    "securityDepositDate" date,
    "securityDepositBank" character varying,
    "securityDepositReceivedDate" date,
    "branchId" character varying NOT NULL,
    "createdBy" character varying NOT NULL,
    "customerId" character varying,
    "totalAmount" numeric(12,2),
    "contractStatus" public.invoices_contractstatus_enum,
    "contractConfirmationUrl" character varying,
    "employeeApprovedBy" character varying,
    "employeeApprovedAt" timestamp without time zone,
    "financeApprovedBy" character varying,
    "financeApprovedAt" timestamp without time zone,
    "financeRemarks" text,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL,
    "saleType" public.invoices_saletype_enum NOT NULL,
    type public.invoices_type_enum DEFAULT 'QUOTATION'::public.invoices_type_enum NOT NULL,
    "rentType" public.invoices_renttype_enum,
    "rentPeriod" public.invoices_rentperiod_enum,
    "monthlyRent" numeric(12,2),
    "advanceAmount" numeric(12,2),
    "discountPercent" numeric(5,2),
    "effectiveFrom" date,
    "effectiveTo" date,
    "billingCycleInDays" integer,
    "billingPeriodStart" date,
    "billingPeriodEnd" date,
    "emailSentAt" timestamp without time zone,
    "whatsappSentAt" timestamp without time zone,
    "isFinalMonth" boolean DEFAULT false NOT NULL,
    "isSummaryInvoice" boolean DEFAULT false NOT NULL,
    "completedAt" timestamp without time zone,
    "leaseType" public.invoices_leasetype_enum,
    "leaseTenureMonths" integer,
    "totalLeaseAmount" numeric(12,2),
    "monthlyEmiAmount" numeric(12,2),
    "monthlyLeaseAmount" numeric(12,2),
    "referenceContractId" character varying,
    "usageRecordId" character varying,
    "grossAmount" numeric(12,2),
    "discountAmount" numeric(12,2),
    "advanceAdjusted" numeric(12,2),
    "bwA4Count" integer,
    "bwA3Count" integer,
    "colorA4Count" integer,
    "colorA3Count" integer,
    "extraBwA4Count" integer,
    "extraColorA4Count" integer,
    "additionalCharges" numeric(12,2),
    "additionalChargesRemarks" text,
    "layoutId" character varying,
    notes text,
    "isDirectSale" boolean DEFAULT false NOT NULL,
    "isTemplate" boolean DEFAULT false NOT NULL,
    "templateId" uuid,
    "assignedEmployeeId" character varying,
    "maxDiscountAllowed" numeric(10,2),
    "assignedAt" timestamp without time zone,
    "assignedBy" character varying,
    "retakenAt" timestamp without time zone,
    "retakenBy" character varying,
    "deletedAt" timestamp without time zone,
    status character varying DEFAULT 'DRAFT'::character varying NOT NULL,
    "billType" public.invoices_billtype_enum,
    "serviceTicketId" uuid,
    "maxCopyLimit" integer,
    "isReplacement" boolean DEFAULT false,
    "warrantyType" character varying(20),
    "warrantyLimit" integer,
    "isWarrantyAlertSent" boolean DEFAULT false NOT NULL,
    "warrantyDurationValue" integer,
    "warrantyDurationUnit" public.invoices_warrantydurationunit_enum,
    "warrantyCopyLimit" integer,
    "warrantyEmailSent" boolean DEFAULT false NOT NULL,
    "warrantyExpiryEmailSent" boolean DEFAULT false NOT NULL,
    is_opening_entry boolean DEFAULT false,
    deleted_at timestamp without time zone,
    currency_code character varying(3),
    exchange_rate_snapshot numeric(18,6),
    tax_name character varying(50),
    tax_percent numeric(5,2),
    tax_amount numeric(12,2),
    tax_registration_number character varying(50),
    "validityDays" integer,
    "expiryDate" timestamp without time zone,
    "isConverted" boolean DEFAULT false NOT NULL,
    "estimateValidUntil" timestamp without time zone,
    "estimateExpired" boolean,
    "visitChargeAmount" numeric(12,2),
    "visitChargeMethod" character varying(100),
    "totalDiscountAmount" numeric(12,2),
    "technicianNoteToFinance" text,
    "revisionCount" integer DEFAULT 0,
    "validityExtensionDays" integer,
    "validityExtensionFee" numeric(12,2),
    "validityExtensionFeeAdded" boolean DEFAULT false NOT NULL,
    validity_days integer DEFAULT 30 NOT NULL,
    expiry_date timestamp without time zone,
    is_converted boolean DEFAULT false NOT NULL,
    estimate_valid_until timestamp without time zone,
    estimate_expired boolean DEFAULT false NOT NULL,
    visit_charge_amount numeric(10,2) DEFAULT 0 NOT NULL,
    visit_charge_method character varying(30),
    total_discount_amount numeric(10,2) DEFAULT 0 NOT NULL,
    technician_note_to_finance text,
    revision_count integer DEFAULT 0 NOT NULL,
    validity_extension_days integer,
    validity_extension_fee numeric(10,2) DEFAULT 0 NOT NULL,
    validity_extension_fee_added boolean DEFAULT false NOT NULL,
    customer_name character varying(255),
    customer_vat_number character varying(50),
    customer_country character varying(2),
    customer_state_province character varying(100),
    customer_city character varying(100),
    "preferredPaymentMode" character varying(20),
    "preferredChequeBankName" character varying(150),
    "serviceContractId" uuid,
    customer_vat_status character varying(30),
    a3_multiplier numeric(4,2) DEFAULT 2.00 NOT NULL
);


ALTER TABLE public.invoices OWNER TO xerouser;

--
-- Name: machine_swap_requests; Type: TABLE; Schema: public; Owner: xerouser
--

CREATE TABLE public.machine_swap_requests (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    branch_id uuid NOT NULL,
    contract_id uuid NOT NULL,
    invoice_number character varying(100) NOT NULL,
    contract_type character varying(50) NOT NULL,
    customer_name character varying(255),
    model_id uuid,
    model_name character varying(255),
    current_product_id uuid,
    current_serial_number character varying(255) NOT NULL,
    requested_product_id uuid NOT NULL,
    requested_serial_number character varying(255) NOT NULL,
    reason text,
    requested_by_id uuid NOT NULL,
    requested_by_name character varying(255) NOT NULL,
    status public.swap_request_status_enum DEFAULT 'PENDING'::public.swap_request_status_enum NOT NULL,
    reviewed_by_id uuid,
    reviewed_by_name character varying(255),
    reviewed_at timestamp with time zone,
    rejection_reason text,
    swap_executed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.machine_swap_requests OWNER TO xerouser;

--
-- Name: manual_journal_entries; Type: TABLE; Schema: public; Owner: xerouser
--

CREATE TABLE public.manual_journal_entries (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    "entryNo" character varying NOT NULL,
    date date NOT NULL,
    "chartOfAccountId" uuid NOT NULL,
    amount numeric(14,2) NOT NULL,
    description text NOT NULL,
    "branchId" uuid NOT NULL,
    "referenceNo" character varying,
    notes text,
    "createdBy" uuid NOT NULL,
    "createdAt" timestamp without time zone DEFAULT now()
);


ALTER TABLE public.manual_journal_entries OWNER TO xerouser;

--
-- Name: manual_payables; Type: TABLE; Schema: public; Owner: xerouser
--

CREATE TABLE public.manual_payables (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    "referenceNo" character varying NOT NULL,
    type character varying NOT NULL,
    "payableTo" character varying NOT NULL,
    "vendorId" uuid,
    "employeeId" uuid,
    description text,
    amount numeric(12,2) NOT NULL,
    currency character varying(3) DEFAULT 'AED'::character varying,
    "issueDate" date NOT NULL,
    "dueDate" date NOT NULL,
    "amountPaid" numeric(12,2) DEFAULT 0,
    outstanding numeric(12,2),
    status character varying DEFAULT 'PENDING'::character varying,
    "branchId" uuid NOT NULL,
    notes text,
    "createdBy" uuid NOT NULL,
    "createdAt" timestamp without time zone DEFAULT now(),
    "linkedPurchaseId" uuid
);


ALTER TABLE public.manual_payables OWNER TO xerouser;

--
-- Name: manual_receivables; Type: TABLE; Schema: public; Owner: xerouser
--

CREATE TABLE public.manual_receivables (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    "referenceNo" character varying NOT NULL,
    type character varying NOT NULL,
    "customerId" uuid,
    "customerName" character varying,
    description text,
    amount numeric(12,2) NOT NULL,
    currency character varying(3) DEFAULT 'AED'::character varying,
    "issueDate" date NOT NULL,
    "dueDate" date NOT NULL,
    "amountPaid" numeric(12,2) DEFAULT 0,
    outstanding numeric(12,2),
    status character varying DEFAULT 'PENDING'::character varying,
    "linkedInvoiceId" uuid,
    "branchId" uuid NOT NULL,
    notes text,
    "createdBy" uuid NOT NULL,
    "createdAt" timestamp without time zone DEFAULT now()
);


ALTER TABLE public.manual_receivables OWNER TO xerouser;

--
-- Name: opening_balance_entries; Type: TABLE; Schema: public; Owner: xerouser
--

CREATE TABLE public.opening_balance_entries (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    entry_number character varying(255) NOT NULL,
    customer_id character varying(255) NOT NULL,
    branch_id uuid NOT NULL,
    balance_type public.opening_balance_entries_balance_type_enum NOT NULL,
    opening_balance numeric(12,2) DEFAULT 0 NOT NULL,
    remaining_balance numeric(12,2) DEFAULT 0 NOT NULL,
    original_total_amount numeric(12,2) DEFAULT 0 NOT NULL,
    already_paid_amount numeric(12,2) DEFAULT 0 NOT NULL,
    invoice_id uuid,
    is_fully_settled boolean DEFAULT false NOT NULL,
    migrated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    monthly_billing_amount numeric(12,2),
    billing_cycle_in_days integer DEFAULT 30,
    next_payment_due_date date,
    total_contract_months integer,
    months_completed integer,
    months_remaining integer,
    remaining_contract_value numeric(12,2),
    contract_start_date date,
    product_brand character varying(255),
    product_model character varying(255),
    serial_number character varying(255),
    product_id character varying(255),
    notes text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    deleted_at timestamp without time zone,
    branch_name character varying(255)
);


ALTER TABLE public.opening_balance_entries OWNER TO xerouser;

--
-- Name: owners; Type: TABLE; Schema: public; Owner: xerouser
--

CREATE TABLE public.owners (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying NOT NULL,
    email character varying,
    phone character varying,
    "ownershipPercent" numeric(5,2),
    "isActive" boolean DEFAULT true,
    notes text,
    "createdAt" timestamp without time zone DEFAULT now(),
    "updatedAt" timestamp without time zone DEFAULT now()
);


ALTER TABLE public.owners OWNER TO xerouser;

--
-- Name: payable_payments; Type: TABLE; Schema: public; Owner: xerouser
--

CREATE TABLE public.payable_payments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    "payableId" uuid,
    "paymentDate" date NOT NULL,
    amount numeric(12,2) NOT NULL,
    "paidFromAccount" uuid,
    "paymentMode" character varying,
    "referenceNo" character varying,
    notes text,
    "createdBy" uuid NOT NULL,
    "createdAt" timestamp without time zone DEFAULT now()
);


ALTER TABLE public.payable_payments OWNER TO xerouser;

--
-- Name: payment_ledgers; Type: TABLE; Schema: public; Owner: xerouser
--

CREATE TABLE public.payment_ledgers (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "invoiceId" uuid NOT NULL,
    "amountPaid" numeric(12,2) NOT NULL,
    "paymentMode" public.payment_ledgers_paymentmode_enum NOT NULL,
    "paymentDate" date NOT NULL,
    "referenceNumber" character varying,
    remarks text,
    "recordedBy" character varying NOT NULL,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "receiptUrl" character varying(255)
);


ALTER TABLE public.payment_ledgers OWNER TO xerouser;

--
-- Name: payment_transactions; Type: TABLE; Schema: public; Owner: xerouser
--

CREATE TABLE public.payment_transactions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    invoice_id uuid,
    transaction_date timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    payment_mode character varying(50) NOT NULL,
    reference_number character varying(100),
    amount numeric(12,2) NOT NULL,
    recorded_by uuid,
    remarks text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    currency_code character varying(3),
    receipt_url character varying,
    exchange_rate_snapshot numeric(18,6)
);


ALTER TABLE public.payment_transactions OWNER TO xerouser;

--
-- Name: product_allocations; Type: TABLE; Schema: public; Owner: xerouser
--

CREATE TABLE public.product_allocations (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "contractId" uuid NOT NULL,
    "modelId" uuid,
    "productId" uuid,
    "serialNumber" character varying NOT NULL,
    status public.product_allocations_status_enum DEFAULT 'ALLOCATED'::public.product_allocations_status_enum NOT NULL,
    "startTimestamp" timestamp without time zone DEFAULT now() NOT NULL,
    "endTimestamp" timestamp without time zone,
    "replacementOfAllocationId" uuid,
    "replacementReason" text,
    "initialBwA4" integer DEFAULT 0 NOT NULL,
    "initialBwA3" integer DEFAULT 0 NOT NULL,
    "initialColorA4" integer DEFAULT 0 NOT NULL,
    "initialColorA3" integer DEFAULT 0 NOT NULL,
    "currentBwA4" integer DEFAULT 0 NOT NULL,
    "currentBwA3" integer DEFAULT 0 NOT NULL,
    "currentColorA4" integer DEFAULT 0 NOT NULL,
    "currentColorA3" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.product_allocations OWNER TO xerouser;

--
-- Name: quotation_template_assignments; Type: TABLE; Schema: public; Owner: xerouser
--

CREATE TABLE public.quotation_template_assignments (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "templateId" uuid NOT NULL,
    "employeeId" character varying NOT NULL,
    "assignedAt" timestamp without time zone DEFAULT now() NOT NULL,
    "assignedBy" character varying NOT NULL
);


ALTER TABLE public.quotation_template_assignments OWNER TO xerouser;

--
-- Name: receivable_payments; Type: TABLE; Schema: public; Owner: xerouser
--

CREATE TABLE public.receivable_payments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    "receivableId" uuid,
    "paymentDate" date NOT NULL,
    amount numeric(12,2) NOT NULL,
    "paidToAccount" uuid,
    "paymentMode" character varying,
    "referenceNo" character varying,
    notes text,
    "createdBy" uuid NOT NULL,
    "createdAt" timestamp without time zone DEFAULT now()
);


ALTER TABLE public.receivable_payments OWNER TO xerouser;

--
-- Name: return_credits; Type: TABLE; Schema: public; Owner: xerouser
--

CREATE TABLE public.return_credits (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    invoice_id uuid NOT NULL,
    "branchId" character varying NOT NULL,
    "createdBy" character varying NOT NULL,
    amount numeric(12,2) NOT NULL,
    note text,
    "returnedItemId" uuid,
    "returnedItemType" character varying(50),
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.return_credits OWNER TO xerouser;

--
-- Name: sale_payment_requests; Type: TABLE; Schema: public; Owner: xerouser
--

CREATE TABLE public.sale_payment_requests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    "requestNo" character varying NOT NULL,
    "invoiceId" uuid NOT NULL,
    "invoiceNumber" character varying NOT NULL,
    "branchId" uuid NOT NULL,
    "recordedByEmployeeId" uuid NOT NULL,
    "recordedByEmployeeName" character varying NOT NULL,
    "customerName" character varying NOT NULL,
    amount numeric(12,2) NOT NULL,
    currency character varying(3) DEFAULT 'AED'::character varying NOT NULL,
    "paymentMode" character varying NOT NULL,
    "paymentDate" date NOT NULL,
    "referenceNumber" character varying,
    remarks text,
    "cashAccountId" uuid,
    "chequeNumber" character varying,
    "chequeBankName" character varying,
    "chequeDueDate" date,
    "chequeDate" date,
    "receiptUrl" character varying,
    status character varying DEFAULT 'PENDING'::character varying NOT NULL,
    "reviewedById" uuid,
    "reviewedByName" character varying,
    "reviewedAt" timestamp without time zone,
    "rejectionReason" text,
    "paymentTransactionId" uuid,
    "createdAt" timestamp without time zone DEFAULT now(),
    "updatedAt" timestamp without time zone DEFAULT now(),
    "collectLater" boolean DEFAULT false NOT NULL,
    "paymentContext" character varying
);


ALTER TABLE public.sale_payment_requests OWNER TO xerouser;

--
-- Name: spare_part_credit_notes; Type: TABLE; Schema: public; Owner: xerouser
--

CREATE TABLE public.spare_part_credit_notes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    "creditNoteNo" character varying(255) NOT NULL,
    "sparePartId" uuid NOT NULL,
    "partName" character varying(255) NOT NULL,
    sku character varying(255),
    brand character varying(255),
    quantity integer DEFAULT 1 NOT NULL,
    "unitPrice" numeric(12,2) NOT NULL,
    "totalAmount" numeric(12,2) NOT NULL,
    "branchId" uuid NOT NULL,
    "customerId" uuid,
    "customerName" character varying(255),
    "invoiceReference" character varying(255),
    type character varying(30) NOT NULL,
    status character varying(30) DEFAULT 'DRAFT'::character varying NOT NULL,
    "sellerEmployeeId" uuid NOT NULL,
    notes text,
    "financeNote" text,
    "damageReason" character varying(100),
    "rejectionReason" text,
    "createdAt" timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.spare_part_credit_notes OWNER TO xerouser;

--
-- Name: usage_record_items; Type: TABLE; Schema: public; Owner: xerouser
--

CREATE TABLE public.usage_record_items (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "usageRecordId" uuid NOT NULL,
    "allocationId" uuid NOT NULL,
    "periodStart" timestamp without time zone NOT NULL,
    "periodEnd" timestamp without time zone NOT NULL,
    "startBwA4" integer DEFAULT 0 NOT NULL,
    "endBwA4" integer DEFAULT 0 NOT NULL,
    "deltaBwA4" integer DEFAULT 0 NOT NULL,
    "startBwA3" integer DEFAULT 0 NOT NULL,
    "endBwA3" integer DEFAULT 0 NOT NULL,
    "deltaBwA3" integer DEFAULT 0 NOT NULL,
    "startColorA4" integer DEFAULT 0 NOT NULL,
    "endColorA4" integer DEFAULT 0 NOT NULL,
    "deltaColorA4" integer DEFAULT 0 NOT NULL,
    "startColorA3" integer DEFAULT 0 NOT NULL,
    "endColorA3" integer DEFAULT 0 NOT NULL,
    "deltaColorA3" integer DEFAULT 0 NOT NULL
);


ALTER TABLE public.usage_record_items OWNER TO xerouser;

--
-- Name: usage_records; Type: TABLE; Schema: public; Owner: xerouser
--

CREATE TABLE public.usage_records (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "contractId" uuid NOT NULL,
    "billingPeriodStart" date NOT NULL,
    "billingPeriodEnd" date NOT NULL,
    "bwA4Count" integer DEFAULT 0 NOT NULL,
    "bwA3Count" integer DEFAULT 0 NOT NULL,
    "colorA4Count" integer DEFAULT 0 NOT NULL,
    "colorA3Count" integer DEFAULT 0 NOT NULL,
    "bwA4Delta" integer DEFAULT 0 NOT NULL,
    "bwA3Delta" integer DEFAULT 0 NOT NULL,
    "colorA4Delta" integer DEFAULT 0 NOT NULL,
    "colorA3Delta" integer DEFAULT 0 NOT NULL,
    "exceededTotal" integer DEFAULT 0 NOT NULL,
    "exceededCharge" numeric(10,2) DEFAULT '0'::numeric NOT NULL,
    "monthlyRent" numeric(10,2) DEFAULT '0'::numeric NOT NULL,
    "advanceAdjusted" numeric(10,2) DEFAULT '0'::numeric NOT NULL,
    "totalCharge" numeric(10,2) DEFAULT '0'::numeric NOT NULL,
    "discountBwCopies" integer DEFAULT 0 NOT NULL,
    "discountColorCopies" integer DEFAULT 0 NOT NULL,
    "discountAmount" numeric(10,2) DEFAULT '0'::numeric NOT NULL,
    "reportedBy" public.usage_records_reportedby_enum DEFAULT 'EMPLOYEE'::public.usage_records_reportedby_enum NOT NULL,
    remarks text,
    "meterImageUrl" text,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL,
    "emailSentAt" timestamp without time zone,
    "whatsappSentAt" timestamp without time zone
);


ALTER TABLE public.usage_records OWNER TO xerouser;

--
-- Name: vat_remittances; Type: TABLE; Schema: public; Owner: xerouser
--

CREATE TABLE public.vat_remittances (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    "branchId" uuid NOT NULL,
    "periodFrom" date NOT NULL,
    "periodTo" date NOT NULL,
    "amountRemitted" numeric(14,2) NOT NULL,
    "remittedDate" date NOT NULL,
    "referenceNo" character varying(100),
    notes text,
    "createdBy" uuid NOT NULL,
    "createdAt" timestamp without time zone DEFAULT now()
);


ALTER TABLE public.vat_remittances OWNER TO xerouser;

--
-- Data for Name: account_reconciliations; Type: TABLE DATA; Schema: public; Owner: xerouser
--

COPY public.account_reconciliations (id, "accountId", "reconciliationDate", "statementDate", "bookBalance", "statementBalance", difference, "isBalanced", notes, "createdBy", "createdAt") FROM stdin;
\.


--
-- Data for Name: asset_depreciation_register; Type: TABLE DATA; Schema: public; Owner: xerouser
--

COPY public.asset_depreciation_register (id, "productId", "brandId", "modelId", "branchId", "purchaseDate", "purchasePrice", "annualDepreciationPct", "usefulLifeMonths", "salvageValuePct", "salvageValue", method, status, "disposalDate", "disposalValue", notes, "createdBy", "createdAt", "updatedAt", "assetType", "assetCategory", "assetName") FROM stdin;
\.


--
-- Data for Name: audit_logs; Type: TABLE DATA; Schema: public; Owner: xerouser
--

COPY public.audit_logs (id, "entityId", action, "performedBy", "oldValue", "newValue", details, "createdAt") FROM stdin;
92532586-2ea4-4a2b-b1f4-9a86b2698f56	6762b9fc-74f2-433e-8ac4-1513d1b51195	CREATION	eb75c7ec-441c-48b4-acea-295f64cfc332	\N	\N	Created quotation QTN-2026-0001	2026-08-10 13:55:01.597887
69372c1a-46e6-4700-8d48-040fa3e2722e	6762b9fc-74f2-433e-8ac4-1513d1b51195	STATUS_CHANGE	eb75c7ec-441c-48b4-acea-295f64cfc332	DRAFT	EMPLOYEE_APPROVED	Employee approved the quotation for Finance review.	2026-08-10 13:55:28.528923
f3d1d0c0-7ec8-4ead-82d9-7550e3dac50a	6762b9fc-74f2-433e-8ac4-1513d1b51195	STATUS_CHANGE	1bb9ca55-954b-44b1-8866-6d86c21dd038	EMPLOYEE_APPROVED	FINANCE_APPROVED	Finance approved quotation pricing.	2026-08-10 13:57:16.700843
94feb840-405c-4271-a22f-49231e82bf90	6762b9fc-74f2-433e-8ac4-1513d1b51195	STATUS_CHANGE	eb75c7ec-441c-48b4-acea-295f64cfc332	FINANCE_APPROVED	DRAFT	Converted approved quotation into transaction (Proforma draft).	2026-08-10 13:58:54.645948
24d4b4df-f3dd-442c-83f3-53aaa489ddc2	6762b9fc-74f2-433e-8ac4-1513d1b51195	ALLOCATION	eb75c7ec-441c-48b4-acea-295f64cfc332	\N	\N	Finance allocated inventory machines to Proforma. Status: FINANCE_APPROVED, Contract Status: PENDING_CONFIRMATION.	2026-08-10 13:58:54.778049
f1976e0a-e204-4f0f-aab6-166e70020c17	6762b9fc-74f2-433e-8ac4-1513d1b51195	ACTIVATION	eb75c7ec-441c-48b4-acea-295f64cfc332	\N	\N	Activated contract/invoice. Status: INVOICED, Contract Status: ACTIVE.	2026-08-10 13:58:54.867268
7e14a0f6-224b-4270-889c-c7da9470e8f6	70a76578-6e64-402a-ac65-4ad08237b2c1	CREATION	eb75c7ec-441c-48b4-acea-295f64cfc332	\N	\N	Created quotation QTN-2026-0002	2026-08-10 16:48:50.649547
95516f92-64ff-44d8-a868-1ed7511552de	37d3fa40-18f7-46c1-8660-bf7fe1407947	CREATION	eb75c7ec-441c-48b4-acea-295f64cfc332	\N	\N	Created quotation QTN-2026-0003	2026-08-10 16:49:55.982843
36c3f5d7-181b-4a5d-88f0-0c2d5b6121ef	10c05f34-13d0-49f4-a910-245788fed9ea	CREATION	eb75c7ec-441c-48b4-acea-295f64cfc332	\N	\N	Created quotation QTN-2026-0004	2026-08-10 16:50:53.255495
d4556948-a166-4ec8-a873-3bd76b58169d	10c05f34-13d0-49f4-a910-245788fed9ea	STATUS_CHANGE	eb75c7ec-441c-48b4-acea-295f64cfc332	DRAFT	EMPLOYEE_APPROVED	Employee approved the quotation for Finance review.	2026-08-10 16:50:56.96871
739cfd99-c7d3-4724-8102-b790727f56e0	37d3fa40-18f7-46c1-8660-bf7fe1407947	STATUS_CHANGE	eb75c7ec-441c-48b4-acea-295f64cfc332	DRAFT	EMPLOYEE_APPROVED	Employee approved the quotation for Finance review.	2026-08-10 16:51:01.051313
b4743c6a-b1bc-4c9d-b543-19e68205b992	70a76578-6e64-402a-ac65-4ad08237b2c1	STATUS_CHANGE	eb75c7ec-441c-48b4-acea-295f64cfc332	DRAFT	EMPLOYEE_APPROVED	Employee approved the quotation for Finance review.	2026-08-10 16:51:04.692515
e99844f7-c70d-4142-bcb4-aabbc086572b	10c05f34-13d0-49f4-a910-245788fed9ea	STATUS_CHANGE	1bb9ca55-954b-44b1-8866-6d86c21dd038	EMPLOYEE_APPROVED	FINANCE_APPROVED	Finance approved quotation pricing.	2026-08-10 16:52:17.048901
e704dae9-5911-476b-837e-79a92e96700c	37d3fa40-18f7-46c1-8660-bf7fe1407947	STATUS_CHANGE	1bb9ca55-954b-44b1-8866-6d86c21dd038	EMPLOYEE_APPROVED	FINANCE_APPROVED	Finance approved quotation pricing.	2026-08-10 16:52:20.886366
16f0abec-57c8-4814-87f1-f89edb618c63	70a76578-6e64-402a-ac65-4ad08237b2c1	STATUS_CHANGE	1bb9ca55-954b-44b1-8866-6d86c21dd038	EMPLOYEE_APPROVED	FINANCE_APPROVED	Finance approved quotation pricing.	2026-08-10 16:52:24.698787
10823e04-c7b8-407e-887a-a5899b991167	70a76578-6e64-402a-ac65-4ad08237b2c1	STATUS_CHANGE	eb75c7ec-441c-48b4-acea-295f64cfc332	FINANCE_APPROVED	DRAFT	Converted approved quotation into transaction (Proforma draft).	2026-08-10 16:54:16.523529
21db5d10-2369-41d5-9108-30f4619437e3	70a76578-6e64-402a-ac65-4ad08237b2c1	ALLOCATION	eb75c7ec-441c-48b4-acea-295f64cfc332	\N	\N	Finance allocated inventory machines to Proforma. Status: FINANCE_APPROVED, Contract Status: PENDING_CONFIRMATION.	2026-08-10 16:54:16.736117
68204fe2-1eb1-48a4-9508-048ee2ec5549	70a76578-6e64-402a-ac65-4ad08237b2c1	ACTIVATION	eb75c7ec-441c-48b4-acea-295f64cfc332	\N	\N	Activated contract/invoice. Status: INVOICED, Contract Status: ACTIVE.	2026-08-10 16:54:16.840956
d3b3f8bb-ae71-4578-b14d-84194ed892d5	70a76578-6e64-402a-ac65-4ad08237b2c1	PAYMENT_RECORDED	eb75c7ec-441c-48b4-acea-295f64cfc332	\N	\N	Payment transaction of QAR 2000 recorded via CASH.	2026-08-10 16:54:17.223429
09fad7db-1627-4bd9-8e68-2edbe6d6dd1e	37d3fa40-18f7-46c1-8660-bf7fe1407947	STATUS_CHANGE	eb75c7ec-441c-48b4-acea-295f64cfc332	FINANCE_APPROVED	DRAFT	Converted approved quotation into transaction (Proforma draft).	2026-08-10 17:14:12.790489
cb4a8950-f05e-4a38-83df-f5c42a963fe6	37d3fa40-18f7-46c1-8660-bf7fe1407947	ALLOCATION	eb75c7ec-441c-48b4-acea-295f64cfc332	\N	\N	Finance allocated inventory machines to Proforma. Status: FINANCE_APPROVED, Contract Status: PENDING_CONFIRMATION.	2026-08-10 17:14:13.084666
0a194f75-7283-478b-b22b-fb32d59fa61a	37d3fa40-18f7-46c1-8660-bf7fe1407947	PAYMENT_RECORDED	eb75c7ec-441c-48b4-acea-295f64cfc332	\N	\N	Payment transaction of QAR 400 recorded via CASH.	2026-08-10 17:14:13.249253
20518468-013d-47e5-aca5-0660d80cfdd8	37d3fa40-18f7-46c1-8660-bf7fe1407947	ACTIVATION	eb75c7ec-441c-48b4-acea-295f64cfc332	\N	\N	Activated contract/invoice. Status: FINANCE_APPROVED, Contract Status: ACTIVE.	2026-08-10 17:15:42.173263
e47d3aae-ff5c-4fa4-97b0-b79a73ad2636	44acfc22-4317-4484-a546-79b545c4c2c2	CREATION	eb75c7ec-441c-48b4-acea-295f64cfc332	\N	\N	Created quotation QTN-2026-0005	2026-08-11 11:43:22.402262
303c4350-d9b6-46e9-b6db-3b451f9b60c2	44acfc22-4317-4484-a546-79b545c4c2c2	STATUS_CHANGE	eb75c7ec-441c-48b4-acea-295f64cfc332	DRAFT	EMPLOYEE_APPROVED	Employee approved the quotation for Finance review.	2026-08-11 11:43:31.396601
805e5ad3-7d06-458e-ae4b-87c8ea975495	44acfc22-4317-4484-a546-79b545c4c2c2	STATUS_CHANGE	1bb9ca55-954b-44b1-8866-6d86c21dd038	EMPLOYEE_APPROVED	FINANCE_APPROVED	Finance approved quotation pricing.	2026-08-11 11:44:53.614227
163c5876-7069-4852-adac-c67fef915622	44acfc22-4317-4484-a546-79b545c4c2c2	STATUS_CHANGE	eb75c7ec-441c-48b4-acea-295f64cfc332	FINANCE_APPROVED	DRAFT	Converted approved quotation into transaction (Proforma draft).	2026-08-11 11:46:51.609342
8df1db4a-a7fd-49fe-bc53-cd6886621327	44acfc22-4317-4484-a546-79b545c4c2c2	ALLOCATION	eb75c7ec-441c-48b4-acea-295f64cfc332	\N	\N	Finance allocated inventory machines to Proforma. Status: FINANCE_APPROVED, Contract Status: PENDING_CONFIRMATION.	2026-08-11 11:46:51.918987
6010d162-07f3-42e2-a8e5-12782104d671	44acfc22-4317-4484-a546-79b545c4c2c2	ACTIVATION	eb75c7ec-441c-48b4-acea-295f64cfc332	\N	\N	Activated contract/invoice. Status: FINANCE_APPROVED, Contract Status: ACTIVE.	2026-08-11 12:28:06.804851
7d0cdac4-42da-4104-b8ed-2a20c1960980	4c6872cb-12c0-4e6a-bc6d-8b85c044122e	CREATION	eb75c7ec-441c-48b4-acea-295f64cfc332	\N	\N	Created quotation QTN-2026-0006	2026-08-11 12:32:09.547968
acb718e8-63d4-4e84-8806-cd8c72294e0d	4c6872cb-12c0-4e6a-bc6d-8b85c044122e	STATUS_CHANGE	eb75c7ec-441c-48b4-acea-295f64cfc332	DRAFT	EMPLOYEE_APPROVED	Employee approved the quotation for Finance review.	2026-08-11 12:32:54.711483
b0980e2a-4ea7-46a5-becb-79616a6b057f	4c6872cb-12c0-4e6a-bc6d-8b85c044122e	STATUS_CHANGE	1bb9ca55-954b-44b1-8866-6d86c21dd038	EMPLOYEE_APPROVED	FINANCE_APPROVED	Finance approved quotation pricing.	2026-08-11 12:33:51.644673
53319a7f-b4c8-4d93-abaa-0021977fe5f5	4c6872cb-12c0-4e6a-bc6d-8b85c044122e	STATUS_CHANGE	eb75c7ec-441c-48b4-acea-295f64cfc332	FINANCE_APPROVED	DRAFT	Converted approved quotation into transaction (Proforma draft).	2026-08-11 12:35:15.402353
2be0a467-ce49-4e53-b32a-07e10edf7692	4c6872cb-12c0-4e6a-bc6d-8b85c044122e	ALLOCATION	eb75c7ec-441c-48b4-acea-295f64cfc332	\N	\N	Finance allocated inventory machines to Proforma. Status: FINANCE_APPROVED, Contract Status: PENDING_CONFIRMATION.	2026-08-11 12:35:15.797702
05da6940-f024-482f-8c95-fb18effef6f6	4c6872cb-12c0-4e6a-bc6d-8b85c044122e	ACTIVATION	eb75c7ec-441c-48b4-acea-295f64cfc332	\N	\N	Activated contract/invoice. Status: FINANCE_APPROVED, Contract Status: ACTIVE.	2026-08-11 12:37:29.42152
04ba964d-fc66-476a-814a-853eec580cb4	4c6872cb-12c0-4e6a-bc6d-8b85c044122e	PAYMENT_RECORDED	1bb9ca55-954b-44b1-8866-6d86c21dd038	\N	\N	Payment transaction of QAR 47750 recorded via CASH.	2026-08-11 12:49:56.663528
55d48511-fd14-4d05-bacb-3ec5e62e1a99	6bcb4f5e-c673-482c-9b1a-bef9c7ad8674	CREATION	eb75c7ec-441c-48b4-acea-295f64cfc332	\N	\N	Created quotation QTN-2026-0007	2026-08-13 00:46:43.931915
d415635f-19e0-46c5-b3e9-ab3e7dd368b5	d8aa42fa-17ee-481a-9788-35fde4cccf88	CREATION	eb75c7ec-441c-48b4-acea-295f64cfc332	\N	\N	Created quotation QTN-2026-0008	2026-08-13 00:48:05.359684
27fe6abb-3821-4a0a-818f-9a64b458178a	d4705e5b-c0a3-4238-82f0-6cab570bcb68	CREATION	eb75c7ec-441c-48b4-acea-295f64cfc332	\N	\N	Created quotation QTN-2026-0009	2026-08-13 00:48:05.493102
9446a0c0-33bc-44fd-99fb-ce6cb623e34e	0567341b-d688-4c35-8007-0be7e8ad9adf	CREATION	eb75c7ec-441c-48b4-acea-295f64cfc332	\N	\N	Created quotation QTN-2026-0010	2026-08-13 00:48:05.616324
17eebcc7-3c8d-4500-8550-86ea460b0507	115dee6f-bd46-4442-94af-143649e4d86b	CREATION	eb75c7ec-441c-48b4-acea-295f64cfc332	\N	\N	Created quotation QTN-2026-0011	2026-08-13 00:48:05.727349
ed40f3e8-f1ac-44aa-bc69-101d945a30ef	fdb6a1cc-d555-4dff-83b0-0304acb465b5	CREATION	eb75c7ec-441c-48b4-acea-295f64cfc332	\N	\N	Created quotation QTN-2026-0012	2026-08-13 00:50:17.462561
fe5651ca-7dd8-4787-b063-edf30156fd38	585cb801-9a2f-4a51-bdbb-af34d3f216df	CREATION	eb75c7ec-441c-48b4-acea-295f64cfc332	\N	\N	Created quotation QTN-2026-0013	2026-08-13 00:50:17.601535
25cacc5e-3b1f-4e71-bf9a-f7afe7197b73	6bcb4f5e-c673-482c-9b1a-bef9c7ad8674	STATUS_CHANGE	019c5b7d-20cf-4ef4-971a-91235dd6c10c	DRAFT	FINANCE_APPROVED	Approved quotation and converted to Proforma. Deposit: QAR 0.	2026-08-13 00:51:01.449312
d67f303c-6c92-432e-9c7f-336c89c5da7f	d5a0393c-bd11-4db4-a001-229959275ade	CREATION	eb75c7ec-441c-48b4-acea-295f64cfc332	\N	\N	Created quotation QTN-2026-0014	2026-08-13 02:09:41.273736
70dc2ab1-e5ac-4042-afdd-ca5a079f1c54	73956fae-12f5-4c8c-a040-39ee4078a5a3	CREATION	eb75c7ec-441c-48b4-acea-295f64cfc332	\N	\N	Created quotation QTN-2026-0015	2026-08-13 02:09:41.453641
8b94fbd1-65e5-4d56-8f6c-6884cd579cfe	6da2a1de-70a5-431a-ae5f-94858ad1f926	CREATION	eb75c7ec-441c-48b4-acea-295f64cfc332	\N	\N	Created quotation QTN-2026-0016	2026-08-13 02:52:22.969142
d1ac578e-8d85-4c86-a91f-6c2000381aa4	c0205994-c852-4de5-927b-a77686031e6e	CREATION	eb75c7ec-441c-48b4-acea-295f64cfc332	\N	\N	Created quotation QTN-2026-0017	2026-08-13 02:52:23.125798
f9feab6c-311e-4d57-9717-b1eedb5a4c22	953799cf-1f22-42eb-98a6-01b482bccb92	CREATION	eb75c7ec-441c-48b4-acea-295f64cfc332	\N	\N	Created quotation QTN-2026-0018	2026-08-13 02:52:23.232753
d6362bda-4dde-471e-80a5-25a184c78eac	99f3c366-43a6-498d-a03a-dd3dd9fab53b	CREATION	eb75c7ec-441c-48b4-acea-295f64cfc332	\N	\N	Created quotation QTN-2026-0019	2026-08-13 02:53:38.206222
456a1bff-c440-445a-848e-14bbc33bdf28	465cfaff-1fec-4856-9603-58c8fee5fa51	CREATION	eb75c7ec-441c-48b4-acea-295f64cfc332	\N	\N	Created quotation QTN-2026-0018	2026-08-13 03:00:31.154827
03297e31-02d0-419c-8734-f122860fe237	85e56219-54bb-4cac-a5b1-28d8c35409f5	CREATION	eb75c7ec-441c-48b4-acea-295f64cfc332	\N	\N	Created quotation QTN-2026-0019	2026-08-13 03:00:31.602242
769eaf7b-335a-402f-9d2c-fe2860409278	ead434c2-1f97-4e57-9e4d-479cfa04eed1	CREATION	eb75c7ec-441c-48b4-acea-295f64cfc332	\N	\N	Created quotation QTN-2026-0021	2026-08-13 03:28:31.110072
3784049b-5cf4-48d5-b248-df0faec59177	ead434c2-1f97-4e57-9e4d-479cfa04eed1	STATUS_CHANGE	019c5b7d-20cf-4ef4-971a-91235dd6c10c	DRAFT	FINANCE_APPROVED	Approved quotation and converted to Proforma. Deposit: QAR 0.	2026-08-13 03:28:44.366085
a28fd93b-2674-4cda-a10b-dddfc3d01445	ead434c2-1f97-4e57-9e4d-479cfa04eed1	ALLOCATION	1bb9ca55-954b-44b1-8866-6d86c21dd038	\N	\N	Finance allocated inventory machines to Proforma. Status: FINANCE_APPROVED, Contract Status: PENDING_CONFIRMATION.	2026-08-13 03:28:44.513807
6a98befd-6c78-45cd-9545-c0d3368c1aa0	ead434c2-1f97-4e57-9e4d-479cfa04eed1	ACTIVATION	1bb9ca55-954b-44b1-8866-6d86c21dd038	\N	\N	Activated contract/invoice. Status: ACTIVE_CONTRACT, Contract Status: ACTIVE.	2026-08-13 03:28:44.657624
dc40aa5c-e504-438d-bfad-c6ae8e1ee9c4	29989874-0588-4213-9a2b-27b97835a8f7	CREATION	eb75c7ec-441c-48b4-acea-295f64cfc332	\N	\N	Created quotation QTN-2026-0023	2026-08-13 03:37:18.382981
f80486f0-ff4d-41a1-a4b7-6812f67bd44c	29989874-0588-4213-9a2b-27b97835a8f7	STATUS_CHANGE	019c5b7d-20cf-4ef4-971a-91235dd6c10c	DRAFT	FINANCE_APPROVED	Approved quotation and converted to Proforma. Deposit: QAR 0.	2026-08-13 03:37:18.509736
8bfbfa57-6c82-49d7-81a3-df28c4f1bd4e	29989874-0588-4213-9a2b-27b97835a8f7	ALLOCATION	1bb9ca55-954b-44b1-8866-6d86c21dd038	\N	\N	Finance allocated inventory machines to Proforma. Status: FINANCE_APPROVED, Contract Status: PENDING_CONFIRMATION.	2026-08-13 03:37:37.716397
e041a12f-4254-40ec-a78a-9a37d630218c	29989874-0588-4213-9a2b-27b97835a8f7	ACTIVATION	1bb9ca55-954b-44b1-8866-6d86c21dd038	\N	\N	Activated contract/invoice. Status: ACTIVE_CONTRACT, Contract Status: ACTIVE.	2026-08-13 03:37:37.880289
\.


--
-- Data for Name: cash_bank_accounts; Type: TABLE DATA; Schema: public; Owner: xerouser
--

COPY public.cash_bank_accounts (id, name, type, "bankName", "accountNumber", "branchId", currency, "openingBalance", "currentBalance", notes, "isActive", "createdAt", "updatedAt", iban, "accountType", "openingDate", "responsiblePersonId", "contactPerson", "isDefault") FROM stdin;
0ed94224-5e30-4b2e-87c5-687c77c0b0f2	XEROCARE QATAR  BANK ACCOUNT	BANK	QNB	67836459385307	426625c1-62e8-4e14-952b-457452eb0f28	QAR	20000.00	20300.00	\N	t	2026-08-10 16:45:25.290359	2026-08-11 16:30:11.399513	FGGRFRD	CURRENT	2026-08-10	\N	RASHEED	f
f3e2dcc2-6702-4016-9196-9d7d67a2cb77	Dubai Petty Cash	CASH	\N	\N	c24a0a2c-6b0f-4ae5-aaaf-0346a65e6b6e	AED	50000.00	52000.00	\N	t	2026-08-13 00:44:29.353591	2026-08-13 00:52:14.651447	\N	CASH	2026-08-01	\N	\N	t
8fc6c38c-8dc3-4a25-b7f6-dd435feb8af5	XEROCARE QATAR CASH ACCOUNT	CASH	\N	\N	426625c1-62e8-4e14-952b-457452eb0f28	QAR	250000.00	311850.00	\N	t	2026-08-10 16:44:37.311986	2026-08-13 03:09:56.318108	\N	CURRENT	2026-08-10	\N	\N	f
92923eac-fa5a-4739-bf7c-99ece684098e	Emirates NBD Current	BANK	Emirates NBD	0123456789	c24a0a2c-6b0f-4ae5-aaaf-0346a65e6b6e	AED	250000.00	280000.00	\N	t	2026-08-13 00:44:29.413286	2026-08-13 04:20:41.821593	AE070331234567890123456	CURRENT	2026-08-01	\N	\N	f
\.


--
-- Data for Name: cashbook_entries; Type: TABLE DATA; Schema: public; Owner: xerouser
--

COPY public.cashbook_entries (id, "referenceNo", date, "accountId", "entryType", amount, category, description, "linkedInvoiceId", "linkedPoId", "linkedExpenseId", "paymentMode", "chequeNo", notes, "createdBy", "branchId", "createdAt", "sourceType", "sourceId", "isReversed", "reversedById", "isPoOrphaned") FROM stdin;
2d3d2ae6-6991-4680-acd9-4b3e49bafdcc	RCPT-09f88ad0-d167-4cdc-b442-90eb3440aba2	2026-08-10	8fc6c38c-8dc3-4a25-b7f6-dd435feb8af5	RECEIPT	2000.00	Customer Payment	Receipt for invoice QTN-2026-0002	70a76578-6e64-402a-ac65-4ad08237b2c1	\N	\N	CASH	cash nadhil1232	\N	eb75c7ec-441c-48b4-acea-295f64cfc332	426625c1-62e8-4e14-952b-457452eb0f28	2026-08-10 16:54:17.19957	INVOICE_PAYMENT	09f88ad0-d167-4cdc-b442-90eb3440aba2	f	\N	\N
ac9457ee-5ce2-41f9-95d8-0918b9c8d167	RCPT-19d6d0b7-b939-4190-8e85-339c85df8b51	2026-08-10	8fc6c38c-8dc3-4a25-b7f6-dd435feb8af5	RECEIPT	400.00	Customer Payment	Receipt for invoice QTN-2026-0003	37d3fa40-18f7-46c1-8660-bf7fe1407947	\N	\N	CASH	nadhil rent cash123	\N	eb75c7ec-441c-48b4-acea-295f64cfc332	426625c1-62e8-4e14-952b-457452eb0f28	2026-08-10 17:14:13.221795	INVOICE_PAYMENT	19d6d0b7-b939-4190-8e85-339c85df8b51	f	\N	\N
e15bd817-6448-4509-9dff-1c26639a620f	RCPT-a88b087f-939d-43a6-8658-6fd61fac408f	2026-08-11	8fc6c38c-8dc3-4a25-b7f6-dd435feb8af5	RECEIPT	47750.00	Customer Payment	Receipt for invoice QTN-2026-0006	4c6872cb-12c0-4e6a-bc6d-8b85c044122e	\N	\N	CASH	TXVBVDHHVD	\N	1bb9ca55-954b-44b1-8866-6d86c21dd038	426625c1-62e8-4e14-952b-457452eb0f28	2026-08-11 12:49:56.60309	INVOICE_PAYMENT	a88b087f-939d-43a6-8658-6fd61fac408f	f	\N	\N
19041999-5e08-428b-b5c0-cac444ab8449	CE-SPAY-2026-0004	2026-08-11	8fc6c38c-8dc3-4a25-b7f6-dd435feb8af5	RECEIPT	500.00	SALE_COLLECTION	Sale payment — QTN-2026-0006 (NADHIL CUSTOMER)	4c6872cb-12c0-4e6a-bc6d-8b85c044122e	\N	\N	CASH	\N	\N	1bb9ca55-954b-44b1-8866-6d86c21dd038	426625c1-62e8-4e14-952b-457452eb0f28	2026-08-11 12:51:33.789728	SALE_PAYMENT	421669e3-8c11-433d-8500-c880b8200cc7	f	\N	\N
b1776aba-44e3-4e88-8964-4845869f0960	CE-SPAY-2026-0002	2026-08-11	0ed94224-5e30-4b2e-87c5-687c77c0b0f2	RECEIPT	300.00	SALE_COLLECTION	Sale payment — QTN-2026-0005 (NADHIL CUSTOMER)	44acfc22-4317-4484-a546-79b545c4c2c2	\N	\N	CASH	\N	\N	1bb9ca55-954b-44b1-8866-6d86c21dd038	426625c1-62e8-4e14-952b-457452eb0f28	2026-08-11 16:30:11.399513	SALE_PAYMENT	07f11796-a097-4f74-8fb5-f34b79ec12d4	f	\N	\N
90141de8-bf5a-4f17-bc52-8c9fb84ba565	CE-SPAY-2026-0005	2026-08-12	f3e2dcc2-6702-4016-9196-9d7d67a2cb77	RECEIPT	2000.00	SALE_COLLECTION	Sale payment — QTN-2026-0007 (Omar Al Nuaimi)	6bcb4f5e-c673-482c-9b1a-bef9c7ad8674	\N	\N	CASH	\N	\N	1bb9ca55-954b-44b1-8866-6d86c21dd038	c24a0a2c-6b0f-4ae5-aaaf-0346a65e6b6e	2026-08-13 00:52:14.651447	SALE_PAYMENT	4ab85187-b10c-42d8-8ce6-42376c9cbff0	f	\N	\N
dde7d0b2-791b-4cc0-905c-6891bbdbcc0c	CB-a5760d6c-1c00-4680-a65d-02a1a7c809a9	2026-08-06	92923eac-fa5a-4739-bf7c-99ece684098e	RECEIPT	100000.00	EQUITY	Owner Contribution: Owner injects cash (linked)	\N	\N	\N	BANK_TRANSFER	\N	\N	1bb9ca55-954b-44b1-8866-6d86c21dd038	c24a0a2c-6b0f-4ae5-aaaf-0346a65e6b6e	2026-08-13 01:25:46.102276	EQUITY	a5760d6c-1c00-4680-a65d-02a1a7c809a9	f	\N	\N
e5d414f5-6dc6-4f18-a650-c7f8ffabaac5	CBK-2026-00008	2026-08-12	92923eac-fa5a-4739-bf7c-99ece684098e	PAYMENT	20000.00	Vendor Purchase	Vendor payment: Gulf Office Systems LLC (PUR-6308C95F)	\N	\N	\N	BANK_TRANSFER	\N	Auto-deducted from purchase payment. Ref: PUR-6308C95F.	019c5b7d-20cf-4ef4-971a-91235dd6c10c	c24a0a2c-6b0f-4ae5-aaaf-0346a65e6b6e	2026-08-13 02:16:10.267177	\N	\N	f	\N	\N
ba0c3339-ec1b-45bc-8b58-58d7f3e50ddf	CBK-2026-00009	2026-08-12	92923eac-fa5a-4739-bf7c-99ece684098e	PAYMENT	30000.00	Vendor Purchase	Vendor payment: Gulf Office Systems LLC (PUR-6308C95F)	\N	\N	\N	BANK_TRANSFER	\N	Auto-deducted from purchase payment. Ref: PUR-6308C95F.	019c5b7d-20cf-4ef4-971a-91235dd6c10c	c24a0a2c-6b0f-4ae5-aaaf-0346a65e6b6e	2026-08-13 02:16:10.432414	\N	\N	f	\N	\N
626c2005-7cc4-43ac-887b-89b1a732b9c8	CBK-2026-00010	2026-08-12	92923eac-fa5a-4739-bf7c-99ece684098e	PAYMENT	12000.00	SALARY	SALARY test expense	\N	\N	5d0742e1-5561-4f44-94b4-33b2ed77f37a	BANK_TRANSFER	\N	\N	1bb9ca55-954b-44b1-8866-6d86c21dd038	c24a0a2c-6b0f-4ae5-aaaf-0346a65e6b6e	2026-08-13 02:18:12.879697	EXPENSE	5d0742e1-5561-4f44-94b4-33b2ed77f37a	f	\N	\N
d1563268-c7f9-4ea0-95dd-55fa3d590dd1	OPEN-SECDEP	2026-08-01	8fc6c38c-8dc3-4a25-b7f6-dd435feb8af5	RECEIPT	11200.00	DEPOSIT	Opening balance: security deposits already collected in cash (10,000+400+300+500)	\N	\N	\N	\N	\N	\N	1bb9ca55-954b-44b1-8866-6d86c21dd038	426625c1-62e8-4e14-952b-457452eb0f28	2026-08-13 03:09:56.318108	\N	\N	f	\N	\N
477f36b5-f9ba-4c1c-b440-48db6c7804fe	CHQ-CLR-CHQ-AUDIT-001-1786571028521	2026-08-13	92923eac-fa5a-4739-bf7c-99ece684098e	RECEIPT	5000.00	Cheque Deposit	Cheque cleared — Omar Al Nuaimi #CHQ-AUDIT-001	\N	\N	\N	Cheque	CHQ-AUDIT-001	\N	1bb9ca55-954b-44b1-8866-6d86c21dd038	c24a0a2c-6b0f-4ae5-aaaf-0346a65e6b6e	2026-08-13 03:13:48.520072	CHEQUE_CLEAR	3d8b495d-f3a8-4a05-99eb-7290692c98e2	f	\N	\N
e0e8475a-4fa3-407b-8334-9ac114eaadec	AUDIT-REV	2026-08-13	92923eac-fa5a-4739-bf7c-99ece684098e	PAYMENT	5000.00	WITHDRAWAL	Reversal of audit test cheque CHQ-AUDIT-001 (standalone, no source document)	\N	\N	\N	\N	\N	\N	1bb9ca55-954b-44b1-8866-6d86c21dd038	c24a0a2c-6b0f-4ae5-aaaf-0346a65e6b6e	2026-08-13 03:15:10.367545	\N	\N	f	\N	\N
c3dfef82-3a6d-43c1-b390-f6870f1992aa	CBK-2026-00014	2026-08-12	92923eac-fa5a-4739-bf7c-99ece684098e	PAYMENT	5000.00	Vendor Purchase	Vendor payment: Gulf Office Systems LLC (PUR-6308C95F)	\N	\N	\N	CHEQUE	\N	Auto-deducted from purchase payment. Ref: PUR-6308C95F.	019c5b7d-20cf-4ef4-971a-91235dd6c10c	c24a0a2c-6b0f-4ae5-aaaf-0346a65e6b6e	2026-08-13 03:57:51.216312	\N	\N	f	\N	\N
4d740768-d90b-492f-8f27-6269a25b4581	CBK-2026-00015	2026-08-12	92923eac-fa5a-4739-bf7c-99ece684098e	PAYMENT	3000.00	Vendor Purchase	Vendor payment: Gulf Office Systems LLC (PUR-6308C95F)	\N	\N	\N	CHEQUE	\N	Auto-deducted from purchase payment. Ref: PUR-6308C95F.	019c5b7d-20cf-4ef4-971a-91235dd6c10c	c24a0a2c-6b0f-4ae5-aaaf-0346a65e6b6e	2026-08-13 04:20:41.821593	\N	\N	f	\N	\N
\.


--
-- Data for Name: chart_of_accounts; Type: TABLE DATA; Schema: public; Owner: xerouser
--

COPY public.chart_of_accounts (id, "accountNumber", "accountName", category, "accountGroup", "parentAccountId", "sourceType", "isSystemDefault", "linkedCashBankAccountId", "categoryKey", "isActive", "createdBy", "createdAt", "updatedAt") FROM stdin;
a9ff01cb-8287-41f3-b7ef-1f4e956af221	1001	Cash in Hand	ASSET	CURRENT_ASSET	\N	SYSTEM	t	\N	\N	t	\N	2026-08-10 10:35:08.342132	2026-08-10 10:35:08.342132
0b7d5f30-063a-42b4-b2a6-2697a3d10fbe	1002	Cash at Bank	ASSET	CURRENT_ASSET	\N	SYSTEM	t	\N	\N	t	\N	2026-08-10 10:35:08.342132	2026-08-10 10:35:08.342132
821de55d-0d3d-4539-8f1b-64e2a2d7d0a0	1003	Accounts Receivable	ASSET	CURRENT_ASSET	\N	SYSTEM	t	\N	\N	t	\N	2026-08-10 10:35:08.342132	2026-08-10 10:35:08.342132
5dbe70af-8240-4112-a783-a039def2c8f3	1004	Security Deposits Receivable	ASSET	CURRENT_ASSET	\N	SYSTEM	t	\N	\N	t	\N	2026-08-10 10:35:08.342132	2026-08-10 10:35:08.342132
0501cf0a-e06c-475c-9ea8-b9358d0e9ae6	1005	Prepaid Expenses	ASSET	CURRENT_ASSET	\N	SYSTEM	t	\N	\N	t	\N	2026-08-10 10:35:08.342132	2026-08-10 10:35:08.342132
813cf9ba-6846-44d7-9598-d1c22f084cb7	1006	Spare Parts Inventory	ASSET	CURRENT_ASSET	\N	SYSTEM	t	\N	\N	t	\N	2026-08-10 10:35:08.342132	2026-08-10 10:35:08.342132
7cf44834-9a74-4a8e-a6ef-13c09a463eb5	1007	Equipment Gross Cost	ASSET	NON_CURRENT_ASSET	\N	SYSTEM	t	\N	\N	t	\N	2026-08-10 10:35:08.342132	2026-08-10 10:35:08.342132
0d1eb0f0-0604-4adb-b40b-692015c86587	1008	Accumulated Depreciation	ASSET	NON_CURRENT_ASSET	\N	SYSTEM	t	\N	\N	t	\N	2026-08-10 10:35:08.342132	2026-08-10 10:35:08.342132
34c1fc91-9163-431e-9339-c4f715aeef64	1009	Product Inventory	ASSET	CURRENT_ASSET	\N	SYSTEM	t	\N	\N	t	\N	2026-08-10 10:35:08.342132	2026-08-10 10:35:08.342132
86eb6039-4e56-474d-beb5-ade9150b242e	2001	Accounts Payable	LIABILITY	CURRENT_LIABILITY	\N	SYSTEM	t	\N	\N	t	\N	2026-08-10 10:35:08.342132	2026-08-10 10:35:08.342132
43a29b7f-f10f-4edc-b45e-201477a85716	2002	Accrued Expenses	LIABILITY	CURRENT_LIABILITY	\N	SYSTEM	t	\N	\N	t	\N	2026-08-10 10:35:08.342132	2026-08-10 10:35:08.342132
5d276659-aea1-4d4c-93e4-02e0b911504d	2003	VAT Payable	LIABILITY	CURRENT_LIABILITY	\N	SYSTEM	t	\N	\N	t	\N	2026-08-10 10:35:08.342132	2026-08-10 10:35:08.342132
c990d56c-33e8-4098-aae3-99ec4c4330b0	2004	Security Deposits Received	LIABILITY	CURRENT_LIABILITY	\N	SYSTEM	t	\N	\N	t	\N	2026-08-10 10:35:08.342132	2026-08-10 10:35:08.342132
278101f9-c0a6-4416-bdda-9e353cca2053	2005	Deferred Revenue	LIABILITY	CURRENT_LIABILITY	\N	SYSTEM	t	\N	\N	t	\N	2026-08-10 10:35:08.342132	2026-08-10 10:35:08.342132
5702016e-f6f1-4887-85e4-ae5ec5b79cae	2006	Salary Payable	LIABILITY	CURRENT_LIABILITY	\N	SYSTEM	t	\N	\N	t	\N	2026-08-10 10:35:08.342132	2026-08-10 10:35:08.342132
555543df-e55d-47d2-8949-b7b8c1eec8e2	3001	Owner's Capital	EQUITY	EQUITY	\N	SYSTEM	t	\N	\N	t	\N	2026-08-10 10:35:08.342132	2026-08-10 10:35:08.342132
a46139eb-7165-4dcc-b5a4-8067e2a7e69c	3002	Retained Earnings	EQUITY	EQUITY	\N	SYSTEM	t	\N	\N	t	\N	2026-08-10 10:35:08.342132	2026-08-10 10:35:08.342132
31315a55-53e2-402d-b689-b65443260f8c	3003	Reserves	EQUITY	EQUITY	\N	SYSTEM	t	\N	\N	t	\N	2026-08-10 10:35:08.342132	2026-08-10 10:35:08.342132
c9178566-46d2-4e61-90f7-291423fc45b6	3004	Less: Withdrawals	EQUITY	EQUITY	\N	SYSTEM	t	\N	\N	t	\N	2026-08-10 10:35:08.342132	2026-08-10 10:35:08.342132
727a1ece-5ff9-4267-9287-668c00e73c9c	3005	Less: Dividends	EQUITY	EQUITY	\N	SYSTEM	t	\N	\N	t	\N	2026-08-10 10:35:08.342132	2026-08-10 10:35:08.342132
6e30f9d4-f1c3-409b-a379-b651ba642b9d	4001	Rental Revenue	INCOME	INCOME	\N	SYSTEM	t	\N	\N	t	\N	2026-08-10 10:35:08.342132	2026-08-10 10:35:08.342132
97fc047a-f4ff-4276-91a3-094d639cb4a5	4002	Lease Revenue	INCOME	INCOME	\N	SYSTEM	t	\N	\N	t	\N	2026-08-10 10:35:08.342132	2026-08-10 10:35:08.342132
87d01aff-9609-442a-94f2-48b3199e1122	4003	Sales Revenue	INCOME	INCOME	\N	SYSTEM	t	\N	\N	t	\N	2026-08-10 10:35:08.342132	2026-08-10 10:35:08.342132
4ad0f495-2a19-4a8b-9542-325f4c7db645	4004	Service Revenue	INCOME	INCOME	\N	SYSTEM	t	\N	\N	t	\N	2026-08-10 10:35:08.342132	2026-08-10 10:35:08.342132
349f6218-7164-41cd-8cd1-447eaa289949	4005	Usage / Copy Revenue	INCOME	INCOME	\N	SYSTEM	t	\N	\N	t	\N	2026-08-10 10:35:08.342132	2026-08-10 10:35:08.342132
64528797-f8ec-4536-9a03-b0a177beaab0	4006	AMC / SMA Revenue	INCOME	INCOME	\N	SYSTEM	t	\N	\N	t	\N	2026-08-10 10:35:08.342132	2026-08-10 10:35:08.342132
12d8d4da-79f4-4cdd-9a02-7229655a9fbb	4007	Spare Part Sales	INCOME	INCOME	\N	SYSTEM	t	\N	\N	t	\N	2026-08-10 10:35:08.342132	2026-08-10 10:35:08.342132
018426ba-de19-4cc9-97b4-8d57b0b69496	4008	Other Income	INCOME	INCOME	\N	SYSTEM	t	\N	\N	t	\N	2026-08-10 10:35:08.342132	2026-08-10 10:35:08.342132
23c95c06-b99d-4a8c-9686-0376264c80f6	5001	Cost of Parts	EXPENSE	EXPENSE	\N	SYSTEM	t	\N	\N	t	\N	2026-08-10 10:35:08.342132	2026-08-10 10:35:08.342132
4c716508-fe18-4d10-b6b6-79cdb1791e76	5002	Labour Cost	EXPENSE	EXPENSE	\N	SYSTEM	t	\N	\N	t	\N	2026-08-10 10:35:08.342132	2026-08-10 10:35:08.342132
893cbcd9-8aaf-41b0-9d2e-c5c57d949522	5003	Depreciation Expense	EXPENSE	EXPENSE	\N	SYSTEM	t	\N	\N	t	\N	2026-08-10 10:35:08.342132	2026-08-10 10:35:08.342132
3cfc8f23-f7da-4b9b-be93-092bc9e28c15	5004	Vendor Purchases	EXPENSE	EXPENSE	\N	SYSTEM	t	\N	\N	t	\N	2026-08-10 10:35:08.342132	2026-08-10 10:35:08.342132
312314bf-4db7-4a05-a8ad-655ba30119ee	5005	Shipping & Handling	EXPENSE	EXPENSE	\N	SYSTEM	t	\N	\N	t	\N	2026-08-10 10:35:08.342132	2026-08-10 10:35:08.342132
dc3037be-ebcc-40ec-bcef-7f0b8a7c71de	5006	Salary Expense	EXPENSE	EXPENSE	\N	SYSTEM	t	\N	\N	t	\N	2026-08-10 10:35:08.342132	2026-08-10 10:35:08.342132
35cb1d42-8b25-4f55-ad9b-cc03101c7200	5007	Travel Expense	EXPENSE	EXPENSE	\N	SYSTEM	t	\N	\N	t	\N	2026-08-10 10:35:08.342132	2026-08-10 10:35:08.342132
defe2632-ae16-462f-9032-bea2d9fc6904	5008	Rent Expense	EXPENSE	EXPENSE	\N	SYSTEM	t	\N	\N	t	\N	2026-08-10 10:35:08.342132	2026-08-10 10:35:08.342132
d920fede-ca5b-45c5-ae88-d8b3ef395487	5009	Utilities Expense	EXPENSE	EXPENSE	\N	SYSTEM	t	\N	\N	t	\N	2026-08-10 10:35:08.342132	2026-08-10 10:35:08.342132
5bb68724-23b9-4406-bc9c-18056313e5f8	5010	Marketing Expense	EXPENSE	EXPENSE	\N	SYSTEM	t	\N	\N	t	\N	2026-08-10 10:35:08.342132	2026-08-10 10:35:08.342132
a0ab3dea-6376-4edb-802b-a43eaf22b309	5011	Maintenance Expense	EXPENSE	EXPENSE	\N	SYSTEM	t	\N	\N	t	\N	2026-08-10 10:35:08.342132	2026-08-10 10:35:08.342132
2b123d75-0ba1-4437-8b1d-b4f9836ba710	5012	Insurance Expense	EXPENSE	EXPENSE	\N	SYSTEM	t	\N	\N	t	\N	2026-08-10 10:35:08.342132	2026-08-10 10:35:08.342132
95342f42-f8ef-4ab9-ada0-0757e4ea521c	5013	Other Expenses	EXPENSE	EXPENSE	\N	SYSTEM	t	\N	\N	t	\N	2026-08-10 10:35:08.342132	2026-08-10 10:35:08.342132
8710eed4-450e-432b-9392-a0aa6f372e4f	5014	Import / Purchase Labour Cost	EXPENSE	EXPENSE	\N	SYSTEM	t	\N	\N	t	\N	2026-08-10 10:35:08.342132	2026-08-10 10:35:08.342132
339c68b2-dacc-4676-978e-5be6a07402db	5015	Customs Duty	EXPENSE	EXPENSE	\N	SYSTEM	t	\N	\N	t	\N	2026-08-10 10:35:08.342132	2026-08-10 10:35:08.342132
\.


--
-- Data for Name: cheque_status_history; Type: TABLE DATA; Schema: public; Owner: xerouser
--

COPY public.cheque_status_history (id, cheque_id, from_status, to_status, notes, changed_by, changed_at) FROM stdin;
\.


--
-- Data for Name: cheques; Type: TABLE DATA; Schema: public; Owner: xerouser
--

COPY public.cheques (id, cheque_no, bank_name, party_name, amount, due_date, issue_date, type, status, description, branch_id, account_id, cashbook_entry_id, created_by, created_at, updated_at, source_type, source_reference_id, source_label, invoice_no, cheque_date, deposit_date, cleared_date) FROM stdin;
fdca615a-3771-4e04-917a-d1a500e3dd2d	CHQ-SALEFLOW-1	Emirates NBD	Omar Al Nuaimi	2500.00	2026-08-25	2026-08-12	RECEIVED	PENDING	Sale payment — QTN-2026-0007 (Omar Al Nuaimi)	c24a0a2c-6b0f-4ae5-aaaf-0346a65e6b6e	\N	\N	1bb9ca55-954b-44b1-8866-6d86c21dd038	2026-08-13 03:54:32.984379	2026-08-13 03:54:32.984379	SALE	6bcb4f5e-c673-482c-9b1a-bef9c7ad8674	Invoice QTN-2026-0007	QTN-2026-0007	2026-08-14	\N	\N
da6699ce-2d88-4385-94fc-9b54b5aed051	CHQ-RENT-1	ENBD	Omar Al Nuaimi	1100.00	2026-08-28	2026-08-12	RECEIVED	PENDING	Sale payment — QTN-2026-0023 (Omar Al Nuaimi)	c24a0a2c-6b0f-4ae5-aaaf-0346a65e6b6e	\N	\N	1bb9ca55-954b-44b1-8866-6d86c21dd038	2026-08-13 03:57:51.000489	2026-08-13 03:57:51.000489	SALE	29989874-0588-4213-9a2b-27b97835a8f7	Invoice QTN-2026-0023	QTN-2026-0023	2026-08-14	\N	\N
1ca63c48-d671-4753-a6cd-89871bab0b02	CHQ-RENT-2	ENBD	Omar Al Nuaimi	1050.00	2026-08-29	2026-08-12	RECEIVED	PENDING	Rent payment — QTN-2026-0023 (Omar Al Nuaimi)	c24a0a2c-6b0f-4ae5-aaaf-0346a65e6b6e	\N	\N	1bb9ca55-954b-44b1-8866-6d86c21dd038	2026-08-13 03:59:56.13883	2026-08-13 03:59:56.13883	RENT	29989874-0588-4213-9a2b-27b97835a8f7	Invoice QTN-2026-0023	QTN-2026-0023	2026-08-15	\N	\N
\.


--
-- Data for Name: contract_agreements; Type: TABLE DATA; Schema: public; Owner: xerouser
--

COPY public.contract_agreements (id, "agreementNumber", "invoiceId", "branchId", "contractDate", "customerName", "customerAddress", "customerPhone", "customerEmail", "customerVatNumber", "createdByEmployeeId", "createdByEmployeeName", "dealerName", "dealerAddress", "dealerPhone", "employeeSignatureData", "employeeSignedById", "employeeSignedByName", "employeeSignedAt", "customerSignatureData", "customerSignedMethod", "customerSignedByName", "customerSignedAt", "signingToken", "signingTokenExpiresAt", "signingTokenUsed", "signatureStatus", "termsAndConditions", "createdAt", "updatedAt", "customerSignedDocumentUrl", "customerSignedDocumentNote") FROM stdin;
915cbd4e-97f7-4f78-94c1-83266b68a38a	CA-2026-001	6762b9fc-74f2-433e-8ac4-1513d1b51195	426625c1-62e8-4e14-952b-457452eb0f28	2026-08-10	NADHIL CUSTOMER	\N	\N	\N	\N	eb75c7ec-441c-48b4-acea-295f64cfc332	RIYAS EMPLOYEE MANAGER	Xerocare	\N	\N	data:image/png;base64,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	eb75c7ec-441c-48b4-acea-295f64cfc332	RIYAS EMPLOYEE MANAGER	2026-08-10 15:53:22.854	data:image/png;base64,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	IN_PERSON	NADHIL CUSTOMER	2026-08-10 15:53:40.824	\N	\N	f	FULLY_SIGNED	1. This agreement is binding upon acceptance by both parties.\n2. Payments are due as per the invoice terms.\n3. The seller warrants that the goods are free from defects at the time of delivery.\n4. Returns and exchanges are subject to the company return policy.\n5. Disputes shall be resolved through mutually agreed arbitration.\n6. This contract is governed by applicable local laws.	2026-08-10 15:51:13.811106	2026-08-10 15:53:40.828473	\N	\N
92f089ba-a7f2-4f16-8aa5-987dfa28b07b	CA-2026-002	70a76578-6e64-402a-ac65-4ad08237b2c1	426625c1-62e8-4e14-952b-457452eb0f28	2026-08-10	NADHIL CUSTOMER	\N	\N	\N	\N	eb75c7ec-441c-48b4-acea-295f64cfc332	RIYAS EMPLOYEE MANAGER	Xerocare	\N	\N	data:image/png;base64,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	eb75c7ec-441c-48b4-acea-295f64cfc332	RIYAS EMPLOYEE MANAGER	2026-08-10 16:55:27.778	data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAZAAAACgCAYAAAAisjrVAAAQAElEQVR4AexdB3wV1dOdJCAqVfhLhyBdQEPvRboCUgRCLyGETijSiRCKdAVCUbqAdAggPUhvIvgJCCgoEJr0JkVKAt+eCYskee/l1by3u8PPvdtumTk37nn3zp253i/knyAgCAgCgoAgYAcC3iT/BAFBQBAQBAQBOxAQArEDNCkiCDgFAalEENA4AkIgGu9AEV8QEAQEAXchIATiLuSlXUFAEBAENI6AhglE48iL+IKAICAIaBwBIRCNd6CI7zgCR46coL59h9Hdu/ccr0xqEAQMhIAQiIE6W1Q1jcDKleto8eJw6ty5P7148cJ0JnkaCwG5EQSAgBAIUJDD0Ah07NiaUqRITrt3H6CpU+caGgtRXhCwBQEhEFvQkry6RCBbtswUFvYl6zZu3FQ6dOgIX0siCAgClhEQArGMj2veSq0eh0DNmpUpMLA5PX/+nIKCetOdO3c9TkYRSBDwNASEQDytR0QetyEwZMjnVKBAPrpx4xZ16NBH7CFu6wlpWCsICIFopadETpcjkCRJEpo7dxLbQ/bvP0RTpsxxeZvSQKIjIA06EQEhECeCKVVpH4HX7SHjx08Te4j2u1Q0cCECQiAuBFeq1iYCsIcEBbUUe4g2u0+kTkQEhEASEWw9NGUUHUJCelPhwgXFHmKUDhc97UJACMQu2KSQ3hFIksSH5syZRKlSpSTYQ8LCZuldZdFPELAZASEQmyGTAkZBIGPG9DR9+lhWd/z46bR370G+lkQQcA8CnteqEIjn9YlI5EEIVK5cjlq1asRLegMCeniQZCKKIOB+BIRA3N8HIoGHIxAa2o+SJXuDHj36l44dO+nh0op4gkDiISAEknhYS0vuRcDu1t98Mxk1blyXy69evZHPkggCggCREIj8FQgCViBQv/4nnCs8fANPZ/GNJIKAwREQAjH4H4Cobx0CpUsXo0yZMtDNm7fpwIHD1hWSXIKAzhGwmkB0joOoJwhYRMDLy4vq1fuY88g0FsMgiSAgU1jyNyAIWItAgwa1OOvatZspKiqKryURBIyMgIxAjNz7ortNCBQqlJ98fbPRw4ePKCJip01lHcsspQUBz0RACMQz+0Wk8lAEypYtzpJNniye6QyEJIZGQAjE0N0vytuKgL9/PS7y6NEjPksiCBgZASMQiJH7V3R3MgLFi/sR/EIiIy/R48dPnFy7VCcIaAsBIRBt9ZdI62YEvL29yc+vIId6//XX39wsjTQvCLgXASEQ9+IvrWsQgcKFC7HUQiAMg+VE3uoaASEQXXevKOcKBIoU+YCrPXLkOJ8lEQSMioAQiFF7XvS2G4H/RiBCIHaDKAV1gYAQiEd3owjniQhky5aZ0qRJTX//fZVDm3iijCKTIJAYCAiBJAbK0obuEHj77bdYJwRX5AtJBAEDIiAEYsBOF5UdRyBFiuRcSYECefksif4QEI0SRkAIJGGMJIcgEA8BTF/hYeGXK7JwLYcgYDQEhECM1uOir8MI3Lhxix48eEipU6ckdSTicKVSgSCgQQSEQDTYaZoQWcdCbt++l7Xz8pL/fRgISQyLgPwfYNiuF8XtRWDBguVctH79mP1B+EYSQcCACAiBGLDTRWX7Edi372eCA2HatGkoNLSv/RVJSUHAdQgkWs1CIIkGtTSkBwRGjw5jNbp2bUdJkybla0kEAaMiIARi1J4XvW1GYO/eg4T4V6lSpaS2bZvaXF4KCAJ6Q0AIRG89Kvo4jIC5CsaMmcKvOnVqzSHd+UYSQcDACAiBGLjzRXXrEVi2bC2PPpInf5vat29pfUHJKQjoGAEhEB13rqjmHAQuXLhMgweP4sqqVatIIBG+kUQQMDgCzicQgwMq6usLgTt37lLTph3p338fU968uWjMmBB9KSjaCAIOICAE4gB4UlTfCDx69C+Tx/nzF6lkySIUEbGMYEDXt9ainSBgPQJCINZjJTkNhEBUVDS1bRtMx4//Qfnz56aFC6dpYdmugXpIVPUEBIRAPKEXRAaPQuDFixfUtesAgtNgliyZaOnSmRLzyqN6SITxFASEQDylJ0QOj0EgJGQMrV8fQe+8k4ZWrJhF776bzqJsP/30C+XIUZwGDBhpMZ+8FAT0hoAQyGs9KpfaRgAjBgQ6jI6OtluRb775jr77bilhw6ilS2eQr282i3U9f/6cWrToTM+ePSMs9X348JHF/PJSENATAkIgeupNg+py+fIVatmyC/n7B1GrVl0pd+5SvN2srXCsWrWBRo6cSEmS+CgkEkaFCuVPsIp16yLo8eMn5OPjTU+fPqVevb5IsIxkEAT0goAQiF560oB6nDr1FzVp0oHKlq1NO3bsIy8vL/L2xof8GQUE9CRb/mH00qtXCNcxbdoYKleuZILFYSsZN24a5wsMbMHnzZu3EwzwfCOJDQhIVi0iIASixV4TmSk6+jnVq9eGEJ8KH/I2bZrQ4cMRtGXLUh4NHD/+O02bNtcqpLDSCiuuUGdISC+qU6eGVeWmTJlNkZEXKFOmDDR4cC9Kly4tywWZrKpAMgkCGkdACETjHWhU8WfNWkj37z+gNGlS0c6da2jUqEGUMWN6KlAgH9WsWZlhCQ/fyGdLCXw8mjbtSPD5QIDETp3aWMr+6h1sH+q+IP7+dXnaq3HjT/n96tUb+CyJIKB3BIRA9NHDhtLi+vWbNGHCdNZ5xowJlDOnL1+ryYQJoeyzgSmuS5euqI/jnW/cuEWNGwcRvM0x6hg5ckC8POYerFy5jq5cuU65cuWgfv26cbbatavxec2azXyWRBDQOwJCIHrv4Tj6YZXQoUNHKDR0PDVr1pnatevJRuA42Tz6dtiwCRxapHbt6lS+fKl4sqZOnYrq1q1BmNpavDg83ns8uHbtBlWp0pBggK9UqYwy3TWG7R94l9Dx5MkTGjt2KmcLDe3DZyRFi36oTJ/5KDaQKM1hCvnlEARsRUAIxFbENJofy0xBFnnzlqH69dvQrFnf0+7d+xWbwQ6qWLEeYUpGC6qB/Nas2URvvfUmWRoxNGv2GauzZEl4PN2w2uqjjxrQ7dt3ODAijOZYecUFrEhmz15EV69e5/AmVapUiFXivfey8z1sI3whif4RMLCGQiAG6PwjR05Q9er+TBZQN2vWTFS8eGEqVaoo/+rGr/CaNZvglUcfMHL36RPKMvbo0YHSp/8fX5tKypQpTtAT012bN+/gLHfv3qOAgB4UHDyI7Sft27egEyd2s8MgZ7AiQR0wniNraGhfnGIdWbJk5PvLl6/yObGTXbsOkJ9fZZoyZU5iNy3tGRABIRCdd3r79r2oTp0W9OefZ+l//0tL8+dPoYMHN9PatfMpPHwerV49j7y9vejkydP0/fcrPRqNuXMX0V9/nSNf36zUuXPCxu66dT9mfYYMGUtwMMRIKyJiJxvbV66cQ8OG9WNbCWeyMpk0aZZCPg+V6a8Kyoe6YLxSWbNm5mcgZb5IxOT//u8YtW7djW7evE3jx0/jab5EbF6aMiACQiA67nRM9WzatJ1tAY0afUp79vxA2M/idZVLlChCc+ZM5rn7kJDR9PPPv77+OhGurWvi9u27iuH8G848btwQSpIkCV9bStRVUbB3wMHw1q07VK/ex7xqq3TpYpaKmnx37twFAonh5eDBPXCKd/w3AjFvvI9XyAkPsCqtvjI1GRUVpfwg8CZ44y9btsYJNUsVgoB5BIRAzGOj6TeYg1ene1q0aEiTJ480G4q8Ro1K1KFDS3r2LIo9urE81tOUBwE8ePBQmYqraNJwbkpeEAYcC2HfSZ78LZo+fSwfKVMmN5U9wWcIsIhptA8+eJ/y589jMn+WLJn4uaXVX5zBScnjx0+UvutDoaETeDryiy96U6tWjbh2kC5fSCIIuAgBIRAXAevOarFKCHP92AQJPhH4xZ6QPCEhvenDDwsQVmm1b987nuE5ofKufA/igGMg2ujZsyNOFg/oHxIyhho3bv9Kj759u/How2JBCy9//fU3Onr0BI/ULG0qpRJIYkxhQZ4iRarShg1bKW3aNLRs2SyCH0uxYn6syebN2/ksiSBgDgFHnwuBOIqgB5YfNGgUnT59lrJly0xhYV9aLeHy5bO5DDyp8fG1uqCLM65Zs4mioqIJ006FCxey2NqxYycV+0QjmjdvCb3xxhuvpuzOnj1vsVxCL/v3H8FZunZtR5Zk+I9AXGtEnzt3CdWt25r++ec+e8Jv27aK8YGQ8E3BGX8DOMshCLgKASEQVyHrpnoXLlxBS5eu4XnwWbO+tmkfC0ztoAxER4jyixf/xqXbj0WLVrEMmIrjCxNJlDL3P2ZMGC8YwPQdppgQ1iQoqCXnPnLkOJ/tSeA0eOLEKV71FRzc3mIVmTNn5KmkK1euMelZzGzHSxjIETjyiy/GKKVfUGBgc9q3bwPLpjzg/0BwGTK8q0xJPiPIzQ8lEQRcgIAQiAtAdWeVq1at5+YbNapDHyhz9XxjQ4IyVaqU5xIgI75wY/LHH38SRhUpU6ZQyKG6SUlOnTpDNWr489LVFy+IuncPJJBHnjw5yc8vZsSCVWYgGZMVWHiIacAvv5zEORDvCv4nfIPExAF/EhxwYty//5CJHPY/QsDIjz5qwIEjsRJtw4bFNHx4f0qWLGm8StU+3LPnp3jv5IEg4CwEhECchaQH1PP776fp0KEjBE/s0aND7JaoV68YOwMc5p48eWp3Pc4oOG/eUq6madP6PCXFNy8TGMfh7wAfFpAI/D6wLHnAgOBXq7Qwqsqd+z1lNBDFRPSyqNWnsLDZBF+SggXzEUjZmoIIi4J806fPw8nhAyTWr99wXuCAsCsYiWHKqpCFcPMVKpTmdoVAGAZJXISAEIiLgHVHtdgMCe22aeNPb76ZDJd2HUWLfsgbKsEYvfmlE55dFTlYCAEOw8NjAhO2adMkVm2RkReodu0WhGkreNmDYLZvD2cHyVgZlRvYQpQTzZmzCCerDxjCv/12PucfO/YLPluTjBjRn/HDx/v48T+sKWI2D8pXrdqQMI2HHRK//346jRs3hD3xzRZSXlSuXE5JifbvP6yQZzRfOzsB7qVKfULYQ8XZdUt92kDAjQSiDYC0IiVCa6xdu5kd4wJf7k3hiOzBwUFcPDx8PZ/dkaxevZGj5JYsWYTUECGQAwbyatUa84gCH9Xvvgujr74axmFJ8D7uUahQPn6UJUtmPlubDB/+NW8S9dlntalIkQ+sLcae7UFBrTj/2LFT+GxrguXCkybNVEiyOZ0/f4lACDt3ruazNXWlSpWS3n8/L8t/6JBrfHsWLQqnS5f+JvxwgazWyCV59IWAEIhO+hPTTVFR0YSPHTzOHVWrefPPFEO8F/344246evSkQ9Uh8CA84W2tBL+6UaZFixi/hjNnIqlSpfoUEjKGvayrVKlA+KhWr14J2cweKh5p0qQ2myfuCyzbXb8+gn/pw7ci7vuE7uEpD7sNPOAxikgov/oeRnJEGs6duyR7k3t7+3Coeow8VD3UvAmdK1SIFNnHLAAAEABJREFUCTS5Z8/BhLLa9R5Erhb8+utv1Us5GwgBIRAddDb8JFSDd9euAU7RKF26dyht2ne4rosXL/PZnuTTT1tRWNgsatgw0KbiMJ7DzwEfYUypDRz4JcGAjFAmb7yRVJm6CqGFC6dyeBabKrYiMwzg6rLdbt0CY61wsqI4Z4HcnTq15ut27XpyNAC+MZOcPn2WPv98KBUrVp0mTpyhjByeKTafpLR9+yqKO31npop4j1U7CEgs7ktH74HRhQuXuBosGoDn+/37D/leEuMg4G0cVfWrKcKbg0QwzaH6ADhD2y+/HEjt2jU3u/opoTZWrdpAiM+EfLdu3Sb8qse1Ncd33y3jbO++m44qVqxL6uZN2bNnoS1bllGrVo35vSuSJUtW8/JXBGvs0qWt3U0EBDTjJb2wpUybZtqgjo97s2adlKmpBrz8Oioqivc3GT16MP3++75YU3e2CgK/GZT57beTdOGC/T8CUEfc47fffmeSw2qwvHlz82vYpfhCEsMgIASi8a7GL0HYCqCGGjwQ1844sJpohGIQtqcu/KLu3384F/3kkypUpUp5yp07J98nlMBwv3jxKs4GB8Dkyd+mjh1bE7asPXBgI+XNm4vfWZuoU0gYvSRUBkQMwzzyDRvWTxkFvIFLuw6shoNtBoVR56hRkynGv+YyB6786KMGChF2pd27DyALlStXkoNd7t69llq3dmwhBCp8++23OLoArhFcEWdnHeoSZUQ99vXNwtVid0e+kMQwCAiB2NPVHlRmz56f2B4AY7IaPNDd4mHZaa1azViuBg1q0ezZE5XppmmEJbXmZIPRODx8A8E4HhjYk3CfNGlSGjiwh0IcW2nIkM8JznHmypt7/uTJE2Xkc5xfw6jMFxaSSYrh+tatO2w0r1u3poWc1r1q0qQewUYDop82ba4yldeOSpeuRf37j+AIyQgK2ajRp7Rt20pavnyWon9FHrVYV3vCuWbO/IqXNAPb35RRQ8IlrMuxZcsOzli2bEny9c3G1zD284UkhkFACETjXQ2vc6gQENDUqR8e1GnvMWrUJCaPFCmSK4bgoRarAdlgAUCZMrWoe/dByrTNaUqWLGYJMmJOdevWziLxWKxceYmpr/v3H/DeJ0FBLZQn5v/bsWMvqct2MYVkPqdtb7DtLnZP/PjjKuTnV5D7ydvbm3r27ECHDm3hQJfwnLetVutyI5xNgDKVhtxYfICzowem5OBvhHpKly6qEEhWXPJqMb6QxDAICIFouKvxYdyw4Uf+ILnSJmALRPiVO2/eUuVXrw9t2rSEVzGZKg+HuHHjplHx4jVo6NBxvLUsjOWhof0IowYYoT/7rJapolY/Qz2TJ8/m/N27t+ezuQTOgt26DWJjt5/ykYdHvrm8tj5PluwNmjlzAs2ZM5E2blxMly4doYsXf6W+fbvaZaC3tf3PP+/MJHz48BFlpLPH1uLx8vftO4xxKlu2BCH2VyKPQOLJIw/ch4AQiPuwd7jlFSvWEYyuWG0Dg6/DFTpYAaadevQYzB8X7BiYM6dvvBovXbpCAwaMpGLFaii/vGfSvXv/8LQNNrdat24hnT0byWUwHac6APIDO5Lx46cTiCpfvtyKkTrGsc5UNQiJ3rx5Z7p79x7bDJYsmWEqm2afYeqwZ8+Y6AKhoeNfRSi2R6EffthC2PUQfiYYWaEOsYEABWMeQiAa7vfFi8NZenhh84Wbk5kzF9CpU2d4FZHqiKiKBEN2x459qYwyVYUlx1j26e9fT/kYrWHDMbbXffr0KSFwIcpg9RfO9h4Yfcye/T0Xb9myIZ9NJbBNdOzYh6fO4KyIiMSpU6c0lVXTz7B9b8aM6RWCPk9YZWaPMhjxDho0iosOGtSD0qZNw9fZssVMYSH4Jn5E8ENJDIGAEIhGuxlTRb//flqZmkhBtWtXs1oLV2XEMlE4wKF+bF4F3wBc79ixj/flQLwqOOZhZRBWVGHuf+LE4fT6smPEtUL4koIF8zu0fBXtzp+/nLBBFhYXWPKjGDduKjtLYsUURh74tY7yejtgrA8J6cVqQWfgzDc2JMOHf8UjOkzxtWwZ49yJ4j4+3gRbC64vXryEkxwGQUAIRKMdrf6KxFQPPg7uVqNZs46EqaBWrRophuJCBB8QrKhC6HEs+cQU2+srqnAfV+aff44JueHnVyDuK5vuMfpAEEQUgi+Lj48PLuMdWP6MfMAPTonqRzBeRp08wIo42Hbg7a4uFrBWNfQhRrxeXl709dfD2O72elnVDhIZKQTyOi56vxYC0WAP4wOJZZkQHSFHcHbngeWbkZEXyUf5JZo1axYqU6YWBQcP4mkhjDDGjx9KP/+8mRJaUaWGSq9SpYJD6sCID9sHwrljD3RTlf3yy1Hq2fMLfjVp0gjFJuPH13pPRo4cwCoifhWIhG8SSDDSba7YiJAN04H5TWznmyNHzFLeCy+905FXjrgI6O9eCESDfTp79iLCfDR+TVrj2+BqFdet28JNeHv70OjRk1+tqIL/x65dawgkB58OzmQhuXbtBr/NlCk9n+1JQK5Tp87lolh9xBdxEmz21KpVN16A0KVLAOGXeZwsur0tXrwwlS9fkoNUVqpUn2bMWMC7GppTeN++n6levTbKdOAzdqocOLCnyazqlOW2bY6v8jLZgDz0SASEQDyyWywLhe1MkaNYsQ9xcsuBZa+YpmrQoK1CGmEsA8J7V61aQZm+mktYUQUPdC8vL35nTYKIwsgHYy/O9hzARh19fPppjXhVYO4foUPU1V8wBsfLpPMHvXt3Zg2x6gx2jQ8++IhHjAcOHObnaoJRLkYeDx8+IkQl+PPPA2RugUHal3HTsBBCLS9n/SMgBKLBPvb1zcpSly8fE22Vb1yc4GOzceM2UoMaFilSlT86qt0CzW/atIQWLJhKpUsXw61NB1ZD3bhxi+fWzXicJ1jfjRs3SQ3Z0bdvl3j5sQFVYGAv9gDHyA3LUL28rCe4eBVq9AFWvB07tpMGD+5JOXJk55EYfgw0ahRIefKUpvr123DUYzh2Ypk4VtTNmDGeYCsypzLqwTvELsNZDmMgIASiwX5Wdwm0ZlrIXvXwqxOh3BGosUYNfypUqBIFBfVWCGI5nTt3nuD0Fxzcnvr0ifk1W6JEYfahsLc9jD5AIjCue3nZ/lHHlJ6/fwcCNoidVbt29XiiDB06juNOoY3Fi79xaNOteJVr7AGiLWP6bt++dRxCBXh5e3vx1Ba8zNW4YZgG7N+/W4LaqdvqPn78NMG8kkE/CAiBaLAv4YwHsRHuHGdnHI8fPyHE1ULQvzp1WtL775ejNm2608yZC+nkydNUoEBe6tChlUIgU5X7vTxF1b9/d7p27SY3X7VqRT7bm4BAUNYe+wfIo3Hj9nT69BkO77506UxUFetYtmwNYXoLOzWCPEAisTIY+AZBHOEpf/ToTho6tA8Bv2+/HU/Tpo2m3r07WYVMspfhZ2QKyyq4tJfJjMRCIGaA8eTHefPmZPH8/Ary2Z4EUxOYfsLeE5i6eP/98tS0aUeCLwbCrufMmYPatm2qEMhXdPz4LoqIWM4fF9g48AtfbXPr1l18WbVqeT7bm1y9eoOLZsyYgc/WJhgpgTzgF5MxY3rasGGxMjr6IFZxzO0j/IaXl5diNJ6gkGPeWO/lJgaBtGnT8I8EbEQF+1H9+taHklGjBgiBxGBplFQIRIM9fffuPZYaocf5wooE8/9Hj56g6dPnUYsWnZWPaHmCAXzChOmED2zGjO9Ss2YNaOrU0fTrr9to587VBB+K2rWrURozO/nB6/zq1euE6ZACBfJZIYX5LFevXuOXIAG+sCIBeTRp0oFU8li7dgFlzZopVslz5y5QQEAwR/ft168rh02JlUFunIIANvlCRZhCxFkOYyAgBKLBflaJA57d5sS/oRiksc9Enz6hVLFiPWUKqgLVqtVcIYVJCjnsJ0TKxfJV1UcD+2xMmBCqkEotqwP8bdu2m5uvWbMynx1JQEQoby2BqOSB0RLKmCIPrLSCg+P9+w/ZWz/45T7vaCdxD/23lixZzL4pQiD67+vXNRQCeR0NjVxPmTKaJY2I2EUIPnjkyAll3noNweDt7x/EZFG4cBVlRNGJ4x6dORNJ3t7e/BHFqGLHjtU8ysBoAz4aiKjKFdqYzJixkEuUL1+Sz44kV19OYVljA0EIeIw8LJEHCAbG/4sX/yZM9UFXR+STspYRkCksy/jo9a0QiAZ7tnhxP8LWrghIWKFCPYUYmtPnnw9V7BULCY5fDx48UEgkHzvwBQQ05TDiJ07sVt5/xXYN1YbiqOqYFkMd6dKlxcmh46oyFYYKMJrA2dwB8mjevJNCgL8R8poaeYA06tZtRVhsgKWnMBCrHzhz9cpzxxBQRyBPnz5zrCIprSkEtEAgmgI0sYSdNGmE8gF9l5vDh/Szz2pTaGgf+uGHBfTXXwdp69blhOmpkSMHEjYy8vKyfWksV24hqVixNL9VP/58Y2ei1gFdzFUBL3OQB4z/yGeKPGDPQeDGP/74i/Lnz63YdzYodpHM5qqU505CQCVo9JGTqpRqNICAEIgGOsmUiKVKFaNffvmRfvppk3LeSlOmjKKgoFYc00n9n9lUOWc+y549K1eHWFh84UBy7dp1Lg1i4Is4CT5MCD9iiTyw+2DTph14jxHYZdavX0SZM2eMU5PcugIBdQTy5In4gbgCX0+tUwjEU3vGSrncGUFW9Yh3NIAepqVg6EYwRRj346qOECkgD0zPYZVV3JFHVFQ09e49lL3ko6OfE1ZbzZ07yexuiHHrl3sLCFj5Sv3RIlNYVgKmk2xCIDrpSHeo8R+BXHao+b//vsrlTRnzQR4BAT3YtmOKPBD3qmHDdgRHQRDQnDkTCbshcoWSJBoC/y3jfZJobUpD7kdACMT9faBZCWDIh/COTmFdexmFN+70FUYWIA9sSqWSx+t5YOeoUaMJHT58hKeqMGWFqSvIJEfiIgAPf7T49KlMYQEHoxxCIC7taX1XjhGDj483gQBgo7BX2ytX4ts/nj59RtiMyhx5bNmyg+rUaUEYvSBEeUTEMjaa2yuDlHMMAax2Qw0gfZzlMAYCQiDG6GeXaakaqR0Zhahe6KoPCGwdxYpV49hcIKk1a+bT6yOPSZNmEqLqwnbSpEl9Dh+PrWtdpqRUbBUCyV7Gw0JcNasKSCbNIyAEovkudK8C2HccEuzbdwgnuw6MYFAQHyBMWcEZ8vbtu4R5dRjDM2XKgNcEwmjXrichZDtGPqNHD+btVdXNjDiTJG5DAP2Fxh0ZjaK8sw6px/UICIG4HmNdt1CxYhnWD8ZsvrAjiYy8yKUwsoiI2Elvv/0W9e/fjU6d2k+FCuUn/MNUFaasMHWVOnUqQsTY1q398UoOD0EgmYQz8ZCeSDwxhEASD2tdtlSpUgyBIKChrQpi/48VK36g7dv3clF41jdsWJv27VtPiFulLg2FkRzGchjNc+d+j7ZsWUZlyhTnMpJ4Dh7+AvgAAAgsSURBVALJXk5hwX7lOVKJJK5EQAjElehquW4rZUecKWS1lUCOHTvJwR179vyCQCSoY/LkkRQWNipWMEfsT9KgQQBhhFOjxke0ceNicqfvC+SUwzQC//xzn1/cu3ePz5LoHwFv/asoGroSgffey04pU6agK1eu0f37DxJs6vr1m8roYhCTB0gEGzuphJAnT85X5S9fvkKwd2B/EsTcwogE9pDX9yJ5lVkuPAKBx48fsxwZbdzThQtJokkEhEA02W2eJbS6EmvbtpipKFPSPX36VBldzKJy5eoQ9t/GdrzduwfydFWqVClfFYHjIGwh5cvXVaaqdlCGDO9SSEhvtol4eXm9yicXnoXAzZu3CQsqEEkA+8N4lnSak0YzAguBaKarPFdQjEIg3VdfTScs571w4TLt3XuQFi1aRWPHTiF///ZUoEAF5XoqPXr0L33ySRXas+cHGjAgmA3mqhEdBvJKlRrwKqvo6Cjq3Lkt/fTTRuXcBtXL4cEInD17nqV7fRTJDyTRNQJCILru3sRRDrYL/PLER6Rs2dqKgbsWYb+Ofv2GU1jYbGWUcYiX4Pr6ZqOVK+fQ7NkTCZ7lqnSqDQQjj/PnL7JDILzKQ0J6kWpIV/PK2TMRQN9Dsly5fHGSwyAICIEYpKNdqSbIIyioJTfh5eXFux2WKFGYsKKqV6+OhE2sxo8fooxKflDIJf7qqWzZsnBZb29vGjiwB0VErKAPPyzAz+xJpEziI6ASSM6cQiCJj777WhQCcR/2umq5T58udPnyUbp06Qj7b8B7HCuq8Lxt26bUvHlD3hXRlNI//riCatSoxBtedevWjuAkaCqfPPNcBM6ejWThcubMwWdJjIGAEIgx+tmjtcTIY968MLaNeLSgIpxZBM6+tIHICMQsRLp8EZ9AdKmmKCUICAKuRODcuZhoAnnyvOfKZqRuD0NACMTDOkTEEQS0hsDFi38TlmlnzJheFj1orfMclFcIxEEApbgg4EQENFmVTF9pstucIrQQiFNglEoEAeMicO5cjA+ILOE13t+AEIjx+lw0FgScisB/IxBZgeVUYDVQma4IRAN4i4iCgO4Q+I9AxAdEd52bgEJCIAkAJK8FAUHAMgJCIJbx0fNbIRA9967oJgi4GIHo6Occ/8zHx5sQqsbFzUn1HoaAEIiHdYiIIwhoCYGzLz3Qs2fPKhEEtNRxTpJVCMRJQEo1goARETgrHuhG7PZXOguBvILCrRfSuCCgSQT+IxBZgaXJDnRQaCEQBwGU4oKAkRFQCUR8QIz5VyAEYsx+F60FAacgoBKIpoMoOgUJY1YiBGLMfhetBQGnICAE4hQYNVuJEIhmu04EFwTci8CDBw/p+vWbHEAxU6YM7hVGWncLAkIgboFdT42KLkZFQB195MolBnSj/g0IgRi150VvQcBBBFQCEfuHg0BquLgQiIY7T0QXBNyJgEogsgLLfb3g7paFQNzdA9K+IKBRBFQCkRGIRjvQCWILgTgBRKlCEDAiAkIgRuz12DoLgcTGQ+6MhIDo6hACZ85EcnkZgTAMhkyEQAzZ7aK0IOAYAjdu3CIs402RIjm9804axyqT0ppFQAhEs10nggsC7kNAnb7KmzeX+4SQlt2OgAME4nbZRQBBQBBwEwIqgcj0lZs6wEOaFQLxkI4QMQQBLSGgEogs4dVSrzlfViEQ52MqNQoCLkfA3Q2cO3eeRZARCMNg2EQIxLBdL4oLAvYjsH//IS7s65uVz5IYEwEhEGP2u2gtCNiNwOnTZ+nevfvk5eVF+fLltrseKah9BIxJINrvN9FAEHAbAtOnz+O2u3QJ4Ei8fCOJIREQAjFkt4vSgoB9CFy7doNWr95ASZMmpY4dW9tXiZTSDQJCILrpSlFEEHA9AjNmLKCoqGhq1KgOpUv3jj0NShkdISAEoqPOFFUEAVciAM/zRYtWse0D01eubEvq1gYCQiDa6CeRUhBwOwLz5y/j8CXVq1ciWb7r9u7wCAGEQDyiG6wXQnIKAu5A4NmzZ4TpK7Qtow+gIAcQEAIBCnIIAoKARQRWrlxPt27dIT+/glSiRGGLeeWlcRAQAjFOX4umgoBdCLx48YLUpbvBwe3tqkMfhUSLuAgIgcRFRO4FAUEgFgJbt+4ixL6C3aNmzcqx3smNsREQAjF2/4v2gkCCCKijj06d2vAKrAQLSAbDICAEYpiudruiIoAGETh69AQdOnSEfT78/etqUAMR2ZUICIG4El2pWxDQOAJhYbNZg6CgVux9zjeSCAIvERACeQmEnAQBQSA2An/+eZa2bNlBb76ZjAICmsZ+KXfaQsBF0gqBuAhYqVYQ0DICly5doYYNAwkrsOrUqUEpUiTXsjoiu4sQEAJxEbBSrSCgVQR27TpA1ao1olu3bvO0VffugVpVReR2MQJCIC4GWKrXAwLG0SEsbBa1bNmF7t9/wAETT5/eT7lzv2ccAERTmxAQArEJLsksCOgTgfv3H1KbNt1p7Nip5OPjQ6NHD6bJk7+U/T702d1O00oIxGlQSkWCgDYROHMmkmrWbEI//rib0qf/H4WHz6XWrf21qYxInagIJAaBJKpC0pggIAhYj8DGjdvo44+b0vnzF6lUqaIKiaykokU/tL4CyWloBIRADN39orxREYiOfk4jRnxNQUG96dGjf6l9+xa0YsUcdhg0Kiait+0ICIHYjpmUEAS0g4AJSe/cuUuNGwfSt9/OZx+Pb74ZR8OG9VNsH/I5MAGXPLKAgPzFWABHXgkCekQgOHgwHTz4f5Q9exbasGEx1a1bU49qik6JgMD/AwAA///mht57AAAABklEQVQDAMa2x+F3IctxAAAAAElFTkSuQmCC	IN_PERSON	NADHIL CUSTOMER	2026-08-10 16:55:52.784	\N	\N	f	FULLY_SIGNED	1. This agreement is binding upon acceptance by both parties.\n2. Payments are due as per the invoice terms.\n3. The seller warrants that the goods are free from defects at the time of delivery.\n4. Returns and exchanges are subject to the company return policy.\n5. Disputes shall be resolved through mutually agreed arbitration.\n6. This contract is governed by applicable local laws.	2026-08-10 16:54:25.476979	2026-08-10 16:55:52.788696	\N	\N
d08cc422-5163-42dd-8129-206be833f579	CA-2026-003	37d3fa40-18f7-46c1-8660-bf7fe1407947	426625c1-62e8-4e14-952b-457452eb0f28	2026-08-10	NADHIL CUSTOMER	\N	\N	\N	\N	eb75c7ec-441c-48b4-acea-295f64cfc332	RIYAS EMPLOYEE MANAGER	Xerocare	\N	\N	data:image/png;base64,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	eb75c7ec-441c-48b4-acea-295f64cfc332	RIYAS EMPLOYEE MANAGER	2026-08-10 17:14:52.643	data:image/png;base64,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	IN_PERSON	NADHIL CUSTOMER	2026-08-10 17:15:02.316	\N	\N	f	FULLY_SIGNED	1. This agreement is binding upon acceptance by both parties.\n2. Payments are due as per the invoice terms.\n3. The seller warrants that the goods are free from defects at the time of delivery.\n4. Returns and exchanges are subject to the company return policy.\n5. Disputes shall be resolved through mutually agreed arbitration.\n6. This contract is governed by applicable local laws.	2026-08-10 17:14:26.788686	2026-08-10 17:15:02.318712	\N	\N
988c2163-02ca-48af-9a1a-a8e29d929f9f	CA-2026-004	44acfc22-4317-4484-a546-79b545c4c2c2	426625c1-62e8-4e14-952b-457452eb0f28	2026-08-11	NADHIL CUSTOMER	\N	\N	\N	\N	eb75c7ec-441c-48b4-acea-295f64cfc332	RIYAS EMPLOYEE MANAGER	Xerocare	\N	\N	data:image/png;base64,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	eb75c7ec-441c-48b4-acea-295f64cfc332	RIYAS EMPLOYEE MANAGER	2026-08-11 12:24:45.364	data:image/png;base64,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	IN_PERSON	NADHIL CUSTOMER	2026-08-11 12:25:17.496	\N	\N	f	FULLY_SIGNED	1. This agreement sets out the terms for rental of the above-described equipment.\n2. The equipment remains the sole property of the Seller throughout the rental period.\n3. The Buyer is responsible for the proper use, care, and safe custody of the equipment.\n4. Monthly rental charges and excess copy rates are as specified in the Rental Terms section.\n5. Excess usage beyond the agreed free limits will be billed at the applicable excess rates.\n6. Either party may terminate this agreement with 30 days' written notice.\n7. Upon termination, the Buyer must return the equipment in good working condition, fair wear and tear excepted.\n8. Security deposit, if any, will be refunded upon equipment return and final account settlement.\n9. The Seller shall provide maintenance services as agreed; the Buyer shall not tamper with the equipment.\n10. Disputes shall be resolved through mutually agreed arbitration under applicable local laws.	2026-08-11 11:46:59.931572	2026-08-11 12:25:17.505125	\N	\N
9aed5b97-ecf3-4afd-bc1d-693867b17620	CA-2026-005	4c6872cb-12c0-4e6a-bc6d-8b85c044122e	426625c1-62e8-4e14-952b-457452eb0f28	2026-08-11	NADHIL CUSTOMER	\N	\N	\N	\N	eb75c7ec-441c-48b4-acea-295f64cfc332	RIYAS EMPLOYEE MANAGER	Xerocare	\N	\N	data:image/png;base64,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	eb75c7ec-441c-48b4-acea-295f64cfc332	RIYAS EMPLOYEE MANAGER	2026-08-11 12:36:18.34	data:image/png;base64,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	IN_PERSON	NADHIL CUSTOMER	2026-08-11 12:36:07.815	\N	\N	f	FULLY_SIGNED	1. This agreement sets out the terms for rental of the above-described equipment.\n2. The equipment remains the sole property of the Seller throughout the rental period.\n3. The Buyer is responsible for the proper use, care, and safe custody of the equipment.\n4. Monthly rental charges and excess copy rates are as specified in the Rental Terms section.\n5. Excess usage beyond the agreed free limits will be billed at the applicable excess rates.\n6. Either party may terminate this agreement with 30 days' written notice.\n7. Upon termination, the Buyer must return the equipment in good working condition, fair wear and tear excepted.\n8. Security deposit, if any, will be refunded upon equipment return and final account settlement.\n9. The Seller shall provide maintenance services as agreed; the Buyer shall not tamper with the equipment.\n10. Disputes shall be resolved through mutually agreed arbitration under applicable local laws.	2026-08-11 12:35:27.462314	2026-08-11 12:36:18.34633	\N	\N
a9fca9e9-8297-4397-8f14-761bd2dded32	CA-2026-006	73956fae-12f5-4c8c-a040-39ee4078a5a3	c24a0a2c-6b0f-4ae5-aaaf-0346a65e6b6e	2026-08-13	Customer	\N	\N	\N	\N	1bb9ca55-954b-44b1-8866-6d86c21dd038	RIYAS FINANCE MANAGER	Branch	\N	\N	data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==	1bb9ca55-954b-44b1-8866-6d86c21dd038	RIYAS FINANCE MANAGER	2026-08-13 03:23:52.715	data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==	REMOTE	Omar Al Nuaimi	2026-08-13 03:23:52.791	8a1a769653da026799adf75b4bbb647f848f00ff1bd9c94b3ca548e912d822f9	2026-08-16 03:23:52.766	t	FULLY_SIGNED	\N	2026-08-13 03:22:03.294464	2026-08-13 03:23:52.79722	\N	\N
\.


--
-- Data for Name: country_tax_rules; Type: TABLE DATA; Schema: public; Owner: xerouser
--

COPY public.country_tax_rules (id, country, tax_name, default_tax_percent, is_active, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: credit_notes; Type: TABLE DATA; Schema: public; Owner: xerouser
--

COPY public.credit_notes (id, "creditNoteNo", invoice_id, "customerId", "branchId", "productId", "productName", "modelName", brand, "serialNumber", "productAmount", type, status, "sellerEmployeeId", notes, "financeNote", "damageReason", "rejectionReason", "replacementProductId", "replacementSerialNumber", "replacementAmount", "createdAt", "updatedAt", "customerName", "invoiceNumber", "replacementDiscount", "replacementProductName", "paymentMode", "replacementInvoiceId", "replacementInvoiceNumber", "productImage", "replacementProductImage", item_category, "sparePartId", sku, quantity, "taxName", "taxPercent", "taxAmount", "replacementSparePartId", "replacementSparePartName", "replacementSparePartSku", "replacementQuantity", tax_name, tax_percent, tax_amount) FROM stdin;
302df2bc-2d9b-417a-b1d6-9c476be4665b	CN-2026-00014	6bcb4f5e-c673-482c-9b1a-bef9c7ad8674	f889a7bb-8903-4570-bc4d-bdaf7444fe4a	c24a0a2c-6b0f-4ae5-aaaf-0346a65e6b6e	261030a9-9484-4d06-90aa-41a97a58e263	Canon C5560	\N	\N	AE-SN-0001	6500.00	DIRECT_REFUND	COMPLETED	eb75c7ec-441c-48b4-acea-295f64cfc332	Audit test direct refund	approved for refund	Defective	\N	\N	\N	\N	2026-08-13 02:20:26.877258	2026-08-13 02:21:13.567778	Omar Al Nuaimi	QTN-2026-0007	0.00	\N	\N	\N	\N	\N	\N	PRODUCT	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	VAT	5.00	325.00
\.


--
-- Data for Name: depreciation_brand_rules; Type: TABLE DATA; Schema: public; Owner: xerouser
--

COPY public.depreciation_brand_rules (id, "brandId", "annualDepreciationPct", "usefulLifeMonths", "salvageValuePct", method, notes, "createdBy", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: depreciation_journal_entries; Type: TABLE DATA; Schema: public; Owner: xerouser
--

COPY public.depreciation_journal_entries (id, "periodYear", "periodMonth", "totalAmount", "branchId", status, "postedBy", "postedAt", "expenseEntryId", "createdAt") FROM stdin;
\.


--
-- Data for Name: depreciation_model_rules; Type: TABLE DATA; Schema: public; Owner: xerouser
--

COPY public.depreciation_model_rules (id, "brandId", "modelId", "annualDepreciationPct", "usefulLifeMonths", "salvageValuePct", method, notes, "createdBy", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: device_meter_readings; Type: TABLE DATA; Schema: public; Owner: xerouser
--

COPY public.device_meter_readings (id, "serialNumber", "timestamp", "bwA4", "bwA3", "colorA4", "colorA3", source, "invoiceId", "createdAt") FROM stdin;
ecbed7b5-f83c-422b-8bb1-1613a7cfa552	AE-SN-0004	2026-07-15 15:30:00	8500	0	1800	0	MANUAL	29989874-0588-4213-9a2b-27b97835a8f7	2026-08-13 03:37:51.965535
9af16508-c96d-4b9b-befc-96b35f6eef34	AE-SN-0005	2026-07-15 15:30:00	0	0	0	0	MANUAL	29989874-0588-4213-9a2b-27b97835a8f7	2026-08-13 03:37:51.965535
\.


--
-- Data for Name: employee_expense_requests; Type: TABLE DATA; Schema: public; Owner: xerouser
--

COPY public.employee_expense_requests (id, "requestNo", "employeeId", "employeeName", "employeeRole", "branchId", "branchName", date, category, "subCategory", description, amount, currency, "receiptUrl", status, "submittedAt", "reviewedBy", "reviewedByName", "reviewedAt", "rejectionReason", "paidAt", "paidFromAccount", "paymentReference", "expenseEntryId", notes, "createdAt", "updatedAt", "requestSource", "purchaseId", "purchaseRef", "vendorName", "paymentMode", "paidFromAccountId", "purchasePaymentId", "chequeNumber", "chequeBankName", "chequeDueDate", "purchaseOrigin") FROM stdin;
e3d3ebeb-cc08-4a91-8179-8fe62c92423e	EXP-REQ-2026-0001	019c5b7d-20cf-4ef4-971a-91235dd6c10c	RIYAS BRANCH MANAGER	MANAGER	c24a0a2c-6b0f-4ae5-aaaf-0346a65e6b6e	XEROCARE PRIVET LIMITE QATAR	2026-08-12	Vendor Purchase	BANK_TRANSFER	Vendor Purchase Payment — Gulf Office Systems LLC (PUR-6308C95F)	20000.00	AED	\N	SUBMITTED	2026-08-13 02:16:10.255	\N	\N	\N	\N	\N	\N	\N	\N	Auto-created from purchase payment. Ref: PUR-6308C95F. Method: BANK_TRANSFER.	2026-08-13 02:16:10.25695	2026-08-13 02:16:10.25695	EMPLOYEE_EXPENSE	6308c95f-78e2-40bf-85f8-01a7fb4f4ad6	PUR-6308C95F	Gulf Office Systems LLC	BANK_TRANSFER	\N	\N	\N	\N	\N	DOMESTIC
701acb07-d795-43e0-9878-49eb85821982	EXP-REQ-2026-0002	019c5b7d-20cf-4ef4-971a-91235dd6c10c	RIYAS BRANCH MANAGER	MANAGER	c24a0a2c-6b0f-4ae5-aaaf-0346a65e6b6e	XEROCARE PRIVET LIMITE QATAR	2026-08-12	Vendor Purchase	BANK_TRANSFER	Vendor Purchase Payment — Gulf Office Systems LLC (PUR-6308C95F)	30000.00	AED	\N	SUBMITTED	2026-08-13 02:16:10.417	\N	\N	\N	\N	\N	\N	\N	\N	Auto-created from purchase payment. Ref: PUR-6308C95F. Method: BANK_TRANSFER.	2026-08-13 02:16:10.418441	2026-08-13 02:16:10.418441	EMPLOYEE_EXPENSE	6308c95f-78e2-40bf-85f8-01a7fb4f4ad6	PUR-6308C95F	Gulf Office Systems LLC	BANK_TRANSFER	\N	\N	\N	\N	\N	DOMESTIC
c9fc9766-54c6-4e26-896f-c78186452a94	EXP-REQ-2026-0003	019c5b7d-20cf-4ef4-971a-91235dd6c10c	RIYAS BRANCH MANAGER	MANAGER	c24a0a2c-6b0f-4ae5-aaaf-0346a65e6b6e	XEROCARE PRIVET LIMITE QATAR	2026-08-12	Vendor Purchase	CHEQUE	Vendor Purchase Payment — Gulf Office Systems LLC (PUR-6308C95F)	5000.00	AED	\N	SUBMITTED	2026-08-13 03:57:51.205	\N	\N	\N	\N	\N	\N	\N	\N	Auto-created from purchase payment. Ref: PUR-6308C95F. Method: CHEQUE.	2026-08-13 03:57:51.206045	2026-08-13 03:57:51.206045	EMPLOYEE_EXPENSE	6308c95f-78e2-40bf-85f8-01a7fb4f4ad6	PUR-6308C95F	Gulf Office Systems LLC	CHEQUE	\N	\N	\N	\N	\N	DOMESTIC
c4eb3360-5e9f-47a5-86e0-7e163a01bb20	EXP-REQ-2026-0004	019c5b7d-20cf-4ef4-971a-91235dd6c10c	RIYAS BRANCH MANAGER	MANAGER	c24a0a2c-6b0f-4ae5-aaaf-0346a65e6b6e	XEROCARE PRIVET LIMITE QATAR	2026-08-12	Vendor Purchase	CHEQUE	Vendor Purchase Payment — Gulf Office Systems LLC (PUR-6308C95F)	3000.00	AED	\N	SUBMITTED	2026-08-13 04:20:41.802	\N	\N	\N	\N	\N	\N	\N	\N	Auto-created from purchase payment. Ref: PUR-6308C95F. Method: CHEQUE.	2026-08-13 04:20:41.806608	2026-08-13 04:20:41.806608	EMPLOYEE_EXPENSE	6308c95f-78e2-40bf-85f8-01a7fb4f4ad6	PUR-6308C95F	Gulf Office Systems LLC	CHEQUE	\N	\N	\N	\N	\N	DOMESTIC
f31d66fd-0ac3-4474-8baa-1923ad0a341f	EXP-REQ-2026-0005	019c5b7d-20cf-4ef4-971a-91235dd6c10c	RIYAS BRANCH MANAGER	MANAGER	c24a0a2c-6b0f-4ae5-aaaf-0346a65e6b6e	XEROCARE PRIVET LIMITE QATAR	2026-08-12	Vendor Purchase	CHEQUE	Vendor Purchase Payment — Gulf Office Systems LLC (PUR-6308C95F)	2000.00	AED	\N	SUBMITTED	2026-08-13 04:25:29.382	\N	\N	\N	\N	\N	\N	\N	\N	Auto-created from purchase payment. Ref: PUR-6308C95F. Method: CHEQUE.	2026-08-13 04:25:29.388842	2026-08-13 04:25:29.388842	EMPLOYEE_EXPENSE	6308c95f-78e2-40bf-85f8-01a7fb4f4ad6	PUR-6308C95F	Gulf Office Systems LLC	CHEQUE	\N	\N	\N	\N	\N	DOMESTIC
\.


--
-- Data for Name: employee_target_achievements; Type: TABLE DATA; Schema: public; Owner: xerouser
--

COPY public.employee_target_achievements (id, "targetId", "employeeId", "branchId", "targetMonth", "targetAmount", "achievedAmount", "achievementPercent", "appliedTierPercent", "incentiveAmount", "dealCount", "calculatedAt", "isFinalized") FROM stdin;
\.


--
-- Data for Name: employee_targets; Type: TABLE DATA; Schema: public; Owner: xerouser
--

COPY public.employee_targets (id, "employeeId", "branchId", "assignedBy", "targetMonth", "targetAmount", "targetType", "currencyCode", tiers, status, "createdAt") FROM stdin;
\.


--
-- Data for Name: equity_entries; Type: TABLE DATA; Schema: public; Owner: xerouser
--

COPY public.equity_entries (id, "entryNo", date, type, description, amount, currency, "branchId", "referenceNo", "linkedCashAccountId", "documentUrl", notes, "createdBy", "createdAt", "updatedAt", "ownerId", "paymentMode", "numberOfShares", "pricePerShare", "reserveType", "reserveSource", "paymentDate") FROM stdin;
b4eed118-3221-4abe-864b-71e57375daae	EQ-2026-0001	2026-08-10	OPENING_BALANCE_EQUITY	Opening balance — XEROCARE QATAR CASH ACCOUNT	250000.00	QAR	426625c1-62e8-4e14-952b-457452eb0f28	\N	8fc6c38c-8dc3-4a25-b7f6-dd435feb8af5	\N	Auto-created at account creation to give the opening balance a documented origin.	1bb9ca55-954b-44b1-8866-6d86c21dd038	2026-08-10 16:44:37.335714	2026-08-10 16:44:37.335714	\N	\N	\N	\N	\N	\N	\N
becd2b1d-13f5-43c3-9695-cedc0105f724	EQ-2026-0002	2026-08-10	OPENING_BALANCE_EQUITY	Opening balance — XEROCARE QATAR  BANK ACCOUNT	20000.00	QAR	426625c1-62e8-4e14-952b-457452eb0f28	\N	0ed94224-5e30-4b2e-87c5-687c77c0b0f2	\N	Auto-created at account creation to give the opening balance a documented origin.	1bb9ca55-954b-44b1-8866-6d86c21dd038	2026-08-10 16:45:25.300893	2026-08-10 16:45:25.300893	\N	\N	\N	\N	\N	\N	\N
507b1584-2080-492a-b8c3-939bda3b2ce4	EQ-2026-0003	2026-08-12	OPENING_BALANCE_EQUITY	Opening balance — Dubai Petty Cash	50000.00	AED	c24a0a2c-6b0f-4ae5-aaaf-0346a65e6b6e	\N	f3e2dcc2-6702-4016-9196-9d7d67a2cb77	\N	Auto-created at account creation to give the opening balance a documented origin.	1bb9ca55-954b-44b1-8866-6d86c21dd038	2026-08-13 00:44:29.375725	2026-08-13 00:44:29.375725	\N	\N	\N	\N	\N	\N	\N
2eccac60-533c-42b6-8bbf-09a4a98b7cfc	EQ-2026-0004	2026-08-12	OPENING_BALANCE_EQUITY	Opening balance — Emirates NBD Current	250000.00	AED	c24a0a2c-6b0f-4ae5-aaaf-0346a65e6b6e	\N	92923eac-fa5a-4739-bf7c-99ece684098e	\N	Auto-created at account creation to give the opening balance a documented origin.	1bb9ca55-954b-44b1-8866-6d86c21dd038	2026-08-13 00:44:29.424753	2026-08-13 00:44:29.424753	\N	\N	\N	\N	\N	\N	\N
a5760d6c-1c00-4680-a65d-02a1a7c809a9	EQ-2026-0011	2026-08-06	OWNER_CONTRIBUTION	Owner injects cash (linked)	100000.00	AED	c24a0a2c-6b0f-4ae5-aaaf-0346a65e6b6e	\N	92923eac-fa5a-4739-bf7c-99ece684098e	\N	\N	1bb9ca55-954b-44b1-8866-6d86c21dd038	2026-08-13 01:25:46.086543	2026-08-13 01:25:46.086543	\N	BANK_TRANSFER	\N	\N	\N	\N	\N
828acc80-3a0a-41d1-ae28-85c89c470a77	EQ-2026-0006	2026-08-01	OPENING_BALANCE_EQUITY	Opening balance: inventory on hand at go-live (8 units, no purchase record)	70000.00	QAR	426625c1-62e8-4e14-952b-457452eb0f28	\N	\N	\N	\N	1bb9ca55-954b-44b1-8866-6d86c21dd038	2026-08-13 03:05:15.438329	2026-08-13 03:05:15.438329	\N	\N	\N	\N	\N	\N	\N
810a50d7-a7bd-4e19-a6b7-36e4f071cf60	EQ-2026-0007	2026-08-01	OPENING_BALANCE_EQUITY	Opening balance: machines already deployed on rent at go-live (3 units)	65000.00	QAR	426625c1-62e8-4e14-952b-457452eb0f28	\N	\N	\N	\N	1bb9ca55-954b-44b1-8866-6d86c21dd038	2026-08-13 03:49:32.674911	2026-08-13 03:49:32.674911	\N	\N	\N	\N	\N	\N	\N
\.


--
-- Data for Name: exchange_rates; Type: TABLE DATA; Schema: public; Owner: xerouser
--

COPY public.exchange_rates (id, "fromCurrency", "toCurrency", rate, "setBy", "createdAt") FROM stdin;
\.


--
-- Data for Name: expense_entries; Type: TABLE DATA; Schema: public; Owner: xerouser
--

COPY public.expense_entries (id, "expenseNo", date, category, "subCategory", description, "branchId", amount, "vatAmount", "netAmount", currency, status, "paidFrom", "paymentDate", "paymentMode", "referenceNo", "approvedBy", "receiptUrl", notes, "createdBy", "createdAt", "updatedAt", "isPrepayment", "coveredPeriodStart", "coveredPeriodEnd") FROM stdin;
5924aa61-58cb-43ff-8d11-54642c16519a	EXP-2026-0002	2026-08-12	TRAVEL	\N	TRAVEL test expense	c24a0a2c-6b0f-4ae5-aaaf-0346a65e6b6e	1800.00	0.00	1800.00	AED	APPROVED	\N	\N	\N	\N	1bb9ca55-954b-44b1-8866-6d86c21dd038	\N	\N	1bb9ca55-954b-44b1-8866-6d86c21dd038	2026-08-13 02:17:24.17412	2026-08-13 02:17:44.735469	f	\N	\N
40a174db-075e-4710-9705-170625cf58f0	EXP-2026-0003	2026-08-12	RENT	\N	RENT test expense	c24a0a2c-6b0f-4ae5-aaaf-0346a65e6b6e	9000.00	0.00	9000.00	AED	APPROVED	\N	\N	\N	\N	1bb9ca55-954b-44b1-8866-6d86c21dd038	\N	\N	1bb9ca55-954b-44b1-8866-6d86c21dd038	2026-08-13 02:17:24.208322	2026-08-13 02:17:44.777231	f	\N	\N
421e5e2e-5ece-40bc-9da2-f5dbdef93037	EXP-2026-0004	2026-08-12	UTILITIES	\N	UTILITIES test expense	c24a0a2c-6b0f-4ae5-aaaf-0346a65e6b6e	2400.00	0.00	2400.00	AED	APPROVED	\N	\N	\N	\N	1bb9ca55-954b-44b1-8866-6d86c21dd038	\N	\N	1bb9ca55-954b-44b1-8866-6d86c21dd038	2026-08-13 02:17:24.235007	2026-08-13 02:17:44.810767	f	\N	\N
325579b4-edc4-466b-b90f-afacfd6e81aa	EXP-2026-0005	2026-08-12	MARKETING	\N	MARKETING test expense	c24a0a2c-6b0f-4ae5-aaaf-0346a65e6b6e	3500.00	0.00	3500.00	AED	APPROVED	\N	\N	\N	\N	1bb9ca55-954b-44b1-8866-6d86c21dd038	\N	\N	1bb9ca55-954b-44b1-8866-6d86c21dd038	2026-08-13 02:17:24.269979	2026-08-13 02:17:44.847227	f	\N	\N
b9dc3984-13b9-412c-ba94-c42a3d934d90	EXP-2026-0006	2026-08-12	MAINTENANCE	\N	MAINTENANCE test expense	c24a0a2c-6b0f-4ae5-aaaf-0346a65e6b6e	2700.00	0.00	2700.00	AED	APPROVED	\N	\N	\N	\N	1bb9ca55-954b-44b1-8866-6d86c21dd038	\N	\N	1bb9ca55-954b-44b1-8866-6d86c21dd038	2026-08-13 02:17:24.303893	2026-08-13 02:17:44.877443	f	\N	\N
6d28cfeb-bc1f-4da9-a764-29fb269ad7e6	EXP-2026-0007	2026-08-12	INSURANCE	\N	INSURANCE test expense	c24a0a2c-6b0f-4ae5-aaaf-0346a65e6b6e	4100.00	0.00	4100.00	AED	APPROVED	\N	\N	\N	\N	1bb9ca55-954b-44b1-8866-6d86c21dd038	\N	\N	1bb9ca55-954b-44b1-8866-6d86c21dd038	2026-08-13 02:17:24.329496	2026-08-13 02:17:44.90733	f	\N	\N
3fa55a85-c1f8-4a7e-8c10-8cb33d312b0e	EXP-2026-0008	2026-08-12	OFFICE	\N	OFFICE test expense	c24a0a2c-6b0f-4ae5-aaaf-0346a65e6b6e	1500.00	0.00	1500.00	AED	APPROVED	\N	\N	\N	\N	1bb9ca55-954b-44b1-8866-6d86c21dd038	\N	\N	1bb9ca55-954b-44b1-8866-6d86c21dd038	2026-08-13 02:17:24.355017	2026-08-13 02:17:44.934624	f	\N	\N
5d0742e1-5561-4f44-94b4-33b2ed77f37a	EXP-2026-0001	2026-08-12	SALARY	\N	SALARY test expense	c24a0a2c-6b0f-4ae5-aaaf-0346a65e6b6e	12000.00	0.00	12000.00	AED	PAID	92923eac-fa5a-4739-bf7c-99ece684098e	2026-08-12	BANK_TRANSFER	SAL-AUG	1bb9ca55-954b-44b1-8866-6d86c21dd038	\N	\N	1bb9ca55-954b-44b1-8866-6d86c21dd038	2026-08-13 02:17:24.130445	2026-08-13 02:18:12.872888	f	\N	\N
\.


--
-- Data for Name: guarantee_cheques; Type: TABLE DATA; Schema: public; Owner: xerouser
--

COPY public.guarantee_cheques (id, customer_id, customer_name, contract_invoice_id, contract_reference, cheque_number, amount, currency_code, bank_name, received_date, purpose, status, returned_date, branch_id, created_by, notes, deleted_at, created_at, updated_at, deposited_date, deposited_to_account_id) FROM stdin;
\.


--
-- Data for Name: income_entries; Type: TABLE DATA; Schema: public; Owner: xerouser
--

COPY public.income_entries (id, "incomeNo", date, category, "subCategory", description, "branchId", amount, "vatAmount", "netAmount", currency, status, "receivedTo", "receivedDate", "receivedMode", "referenceNo", "approvedBy", "receiptUrl", notes, "createdBy", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: installation_requests; Type: TABLE DATA; Schema: public; Owner: xerouser
--

COPY public.installation_requests (id, "invoiceId", "branchId", "assignedByEmployeeId", "assignedByEmployeeName", "technicianId", "technicianName", "customerName", "customerAddress", "invoiceNumber", notes, "startTime", "endTime", "durationSeconds", status, "createdAt", "updatedAt", "saleType", "initialReadingEnteredAt", "initialReadingEnteredByName", "initialReadingPhotoUrl", "initialReadingTakenDate") FROM stdin;
b14da5b8-3aa6-4cc9-b40d-bc44d8c10d7a	6762b9fc-74f2-433e-8ac4-1513d1b51195	426625c1-62e8-4e14-952b-457452eb0f28	4f20097e-a1b3-461a-91e5-6933659c4b6c	RIYAS SERVICE  HELP DESK	071616fc-1f6c-44e2-9037-317453bf7809	RIYAS TECHNICIAN	Customer	\N	QTN-2026-0001	\N	2026-08-10 16:35:16.937	2026-08-10 16:36:18.124	61	COMPLETED	2026-08-10 16:33:45.029964	2026-08-10 16:36:18.126125	PRODUCT_SALE	\N	\N	\N	\N
787f853d-475a-436a-b1a8-36b67e87dde7	70a76578-6e64-402a-ac65-4ad08237b2c1	426625c1-62e8-4e14-952b-457452eb0f28	4f20097e-a1b3-461a-91e5-6933659c4b6c	RIYAS SERVICE  HELP DESK	071616fc-1f6c-44e2-9037-317453bf7809	RIYAS TECHNICIAN	NADHIL CUSTOMER	\N	QTN-2026-0002	\N	2026-08-10 17:45:27.514	2026-08-10 17:45:40.337	12	COMPLETED	2026-08-10 17:30:09.731327	2026-08-10 17:45:40.340656	PRODUCT_SALE	\N	\N	\N	\N
728ee481-a591-4e44-a9d8-409e1b6fea4a	37d3fa40-18f7-46c1-8660-bf7fe1407947	426625c1-62e8-4e14-952b-457452eb0f28	4f20097e-a1b3-461a-91e5-6933659c4b6c	RIYAS SERVICE  HELP DESK	071616fc-1f6c-44e2-9037-317453bf7809	RIYAS TECHNICIAN	NADHIL CUSTOMER	\N	QTN-2026-0003	\N	2026-08-10 17:45:47.516	2026-08-10 17:46:31.343	43	COMPLETED	2026-08-10 17:30:22.109642	2026-08-10 17:46:31.347673	RENT	2026-08-10 17:46:31.343	RIYAS TECHNICIAN	\N	2026-08-10
1ea32832-6d4d-432c-b171-ace4a85a09cd	4c6872cb-12c0-4e6a-bc6d-8b85c044122e	426625c1-62e8-4e14-952b-457452eb0f28	4f20097e-a1b3-461a-91e5-6933659c4b6c	RIYAS SERVICE  HELP DESK	071616fc-1f6c-44e2-9037-317453bf7809	RIYAS TECHNICIAN	NADHIL CUSTOMER	\N	QTN-2026-0006	deliverd 	2026-08-11 12:42:28.042	2026-08-11 12:44:29.187	121	COMPLETED	2026-08-11 12:39:53.922834	2026-08-11 12:44:29.200615	RENT	2026-08-11 12:44:29.187	RIYAS TECHNICIAN	\N	2026-08-11
\.


--
-- Data for Name: invoice_items; Type: TABLE DATA; Schema: public; Owner: xerouser
--

COPY public.invoice_items (id, "itemType", "bwIncludedLimit", "colorIncludedLimit", "combinedIncludedLimit", "bwExcessRate", "colorExcessRate", "combinedExcessRate", "bwSlabRanges", "colorSlabRanges", "comboSlabRanges", quantity, "unitPrice", "initialBwCount", "initialBwA3Count", "initialColorCount", "initialColorA3Count", "productId", "invoiceId", description, "sparePartId", "serialNumber", warranty, "modelId", "deletedAt", "discountAmount") FROM stdin;
34e04f43-b644-44fe-82ef-369ed6d52fae	PRODUCT	\N	\N	\N	\N	\N	\N	\N	\N	\N	1	47000.00	\N	\N	\N	\N	27ee9e9a-bcd7-4ad3-90eb-29ff5c605b2d	6762b9fc-74f2-433e-8ac4-1513d1b51195	EPSON WORKFORCE-C5890	\N	\N	\N	44a967c8-a9e6-48b5-87cd-f351dcbf9904	\N	0.00
dc8fe6e4-c3f7-43de-acf2-1c459fec87ec	PRODUCT	\N	\N	\N	\N	\N	\N	\N	\N	\N	1	30000.00	\N	\N	\N	\N	1e3a8f25-f00f-43a8-928d-cc02f03b4621	70a76578-6e64-402a-ac65-4ad08237b2c1	EPSON ECOTANK-ST-520	\N	\N	\N	53e2bd4a-6baa-454c-8610-f93b6e43f27b	\N	0.00
2915a97a-6d4f-4d8d-806b-c57aaa9f2b8f	PRODUCT	\N	\N	\N	\N	\N	\N	\N	\N	\N	1	0.00	\N	\N	\N	\N	\N	10c05f34-13d0-49f4-a910-245788fed9ea	HP LASERJET 1020	\N	\N	\N	7f17c640-648e-4ddc-949f-98d574b72f82	\N	0.00
048b0fae-868d-413a-bad7-be4f15f52527	PRODUCT	2000	2000	\N	1.5000	2.0000	\N	[]	[]	[]	1	0.00	100	100	100	100	4f19426e-ebd0-4230-9a72-c077b6b0b0b5	37d3fa40-18f7-46c1-8660-bf7fe1407947	HP SMART TANK 670	\N	\N	\N	a4469217-ba28-436d-9b8f-9a546df29573	\N	0.00
8c9232e9-2d96-4a2b-a4cf-2070c351eda5	PRODUCT	1500	1500	\N	1.5000	2.5000	\N	[]	[]	[]	1	0.00	\N	\N	\N	\N	ebea2256-4ff9-438a-bd73-bd61d320fba9	44acfc22-4317-4484-a546-79b545c4c2c2	BROTHER T-4500DW	\N	\N	\N	4c217962-0457-4c96-8a1a-75af057dc8bd	\N	0.00
dde85ef4-da90-4e89-8df7-cb07409ea440	PRODUCT	3000	3000	\N	1.5000	3.0000	\N	[]	[]	[]	1	0.00	100	100	100	100	6809bc5c-a899-4419-b29c-9056060025c1	4c6872cb-12c0-4e6a-bc6d-8b85c044122e	BROTHER HL-12321D	\N	\N	\N	36782f49-6661-4bd9-90fc-d47ec4c265e1	\N	0.00
ddc86337-e22f-481a-9cb8-9b55578d3bb3	PRODUCT	\N	\N	\N	\N	\N	\N	\N	\N	\N	1	6500.00	\N	\N	\N	\N	261030a9-9484-4d06-90aa-41a97a58e263	6bcb4f5e-c673-482c-9b1a-bef9c7ad8674	Canon imageRUNNER C5560	\N	\N	\N	4e72c048-49ed-4f27-a991-dba112ca653c	\N	0.00
c4afe0fd-ea5c-45f8-a39d-6e75295de218	PRODUCT	\N	\N	\N	\N	\N	\N	\N	\N	\N	1	6500.00	\N	\N	\N	\N	\N	585cb801-9a2f-4a51-bdbb-af34d3f216df	Copier notax branch	\N	\N	\N	\N	\N	0.00
3420aa88-68e3-4bb4-be55-a242d22849da	PRODUCT	\N	\N	\N	\N	\N	\N	\N	\N	\N	1	0.00	\N	\N	\N	\N	a231fe92-a5bd-4127-b93e-e626fcb6cae7	c9b1e2ae-9739-4192-906d-5fbe088058b4	Canon C5560 rental unit	\N	\N	\N	4e72c048-49ed-4f27-a991-dba112ca653c	\N	0.00
74f1b984-e33d-46af-b9ef-ba98a782deef	PRICING_RULE	5000	1000	\N	0.0500	0.2500	\N	\N	\N	\N	0	0.00	\N	\N	\N	\N	\N	c9b1e2ae-9739-4192-906d-5fbe088058b4	Fixed Limit plan	\N	\N	\N	\N	\N	0.00
a19cd66f-c1cf-4595-ad6e-1af36f4db2cc	PRODUCT	\N	\N	\N	\N	\N	\N	\N	\N	\N	1	0.00	\N	\N	\N	\N	a231fe92-a5bd-4127-b93e-e626fcb6cae7	ead434c2-1f97-4e57-9e4d-479cfa04eed1	Canon C5560 rental unit	\N	\N	\N	4e72c048-49ed-4f27-a991-dba112ca653c	\N	0.00
94d8dd18-e94a-457c-ad81-44a2b9f92d53	PRICING_RULE	5000	1000	\N	0.0500	0.2500	\N	\N	\N	\N	0	0.00	\N	\N	\N	\N	\N	ead434c2-1f97-4e57-9e4d-479cfa04eed1	Fixed Limit plan	\N	\N	\N	\N	\N	0.00
9d540813-a0fa-4354-83cd-24397ce4a646	PRODUCT	\N	\N	\N	\N	\N	\N	\N	\N	\N	1	1.00	\N	\N	\N	\N	a231fe92-a5bd-4127-b93e-e626fcb6cae7	b471632e-0503-439b-bc58-8cb4c72356d5	sale floor check	\N	\N	\N	4e72c048-49ed-4f27-a991-dba112ca653c	\N	0.00
5b4754f1-f0c9-4b2b-88c0-eb0c1102def2	PRICING_RULE	5000	1000	\N	0.0500	0.2500	\N	\N	\N	\N	0	0.00	\N	\N	\N	\N	\N	29989874-0588-4213-9a2b-27b97835a8f7	Fixed Limit plan	\N	\N	\N	\N	\N	0.00
d0407f81-44be-4af8-8ed4-c613191ac69a	PRODUCT	\N	\N	\N	\N	\N	\N	\N	\N	\N	1	0.00	\N	\N	\N	\N	68ee2cc4-82c6-4f79-a2f1-db436bd0b930	29989874-0588-4213-9a2b-27b97835a8f7	Canon C5560 rental	\N	\N	\N	4e72c048-49ed-4f27-a991-dba112ca653c	\N	0.00
\.


--
-- Data for Name: invoice_ledger; Type: TABLE DATA; Schema: public; Owner: xerouser
--

COPY public.invoice_ledger (id, invoice_id, total_amount, paid_amount, balance_amount, created_at, updated_at, deleted_at) FROM stdin;
aa6c8565-28ec-4323-afa2-2c16443f44d9	70a76578-6e64-402a-ac65-4ad08237b2c1	30000.00	2000.00	28000.00	2026-08-10 16:54:17.173377	2026-08-10 16:54:17.173377	\N
1922deae-32d8-454d-b8f8-a3811c2dc5a7	37d3fa40-18f7-46c1-8660-bf7fe1407947	400.00	400.00	0.00	2026-08-10 17:25:25.731607	2026-08-10 17:25:25.731607	\N
9e220757-aa81-40ca-9adc-f438559c2a69	4c6872cb-12c0-4e6a-bc6d-8b85c044122e	48250.00	48250.00	0.00	2026-08-11 16:17:52.722768	2026-08-11 16:17:52.722768	\N
13c97700-ed9d-4566-ab7b-1729aa4e34af	44acfc22-4317-4484-a546-79b545c4c2c2	300.00	300.00	0.00	2026-08-11 16:30:11.399513	2026-08-11 16:30:11.399513	\N
108dafe3-e321-47f6-a63d-f08f96595127	6bcb4f5e-c673-482c-9b1a-bef9c7ad8674	6825.00	4500.00	2325.00	2026-08-13 00:52:14.651447	2026-08-13 03:54:32.984379	\N
f9be8e94-4851-4070-a9ca-460dd0ab7935	29989874-0588-4213-9a2b-27b97835a8f7	2150.00	2150.00	0.00	2026-08-13 03:57:51.000489	2026-08-13 03:59:56.13883	\N
\.


--
-- Data for Name: invoices; Type: TABLE DATA; Schema: public; Owner: xerouser
--

COPY public.invoices (id, "invoiceNumber", "securityDepositAmount", "securityDepositMode", "securityDepositReference", "securityDepositDate", "securityDepositBank", "securityDepositReceivedDate", "branchId", "createdBy", "customerId", "totalAmount", "contractStatus", "contractConfirmationUrl", "employeeApprovedBy", "employeeApprovedAt", "financeApprovedBy", "financeApprovedAt", "financeRemarks", "createdAt", "updatedAt", "saleType", type, "rentType", "rentPeriod", "monthlyRent", "advanceAmount", "discountPercent", "effectiveFrom", "effectiveTo", "billingCycleInDays", "billingPeriodStart", "billingPeriodEnd", "emailSentAt", "whatsappSentAt", "isFinalMonth", "isSummaryInvoice", "completedAt", "leaseType", "leaseTenureMonths", "totalLeaseAmount", "monthlyEmiAmount", "monthlyLeaseAmount", "referenceContractId", "usageRecordId", "grossAmount", "discountAmount", "advanceAdjusted", "bwA4Count", "bwA3Count", "colorA4Count", "colorA3Count", "extraBwA4Count", "extraColorA4Count", "additionalCharges", "additionalChargesRemarks", "layoutId", notes, "isDirectSale", "isTemplate", "templateId", "assignedEmployeeId", "maxDiscountAllowed", "assignedAt", "assignedBy", "retakenAt", "retakenBy", "deletedAt", status, "billType", "serviceTicketId", "maxCopyLimit", "isReplacement", "warrantyType", "warrantyLimit", "isWarrantyAlertSent", "warrantyDurationValue", "warrantyDurationUnit", "warrantyCopyLimit", "warrantyEmailSent", "warrantyExpiryEmailSent", is_opening_entry, deleted_at, currency_code, exchange_rate_snapshot, tax_name, tax_percent, tax_amount, tax_registration_number, "validityDays", "expiryDate", "isConverted", "estimateValidUntil", "estimateExpired", "visitChargeAmount", "visitChargeMethod", "totalDiscountAmount", "technicianNoteToFinance", "revisionCount", "validityExtensionDays", "validityExtensionFee", "validityExtensionFeeAdded", validity_days, expiry_date, is_converted, estimate_valid_until, estimate_expired, visit_charge_amount, visit_charge_method, total_discount_amount, technician_note_to_finance, revision_count, validity_extension_days, validity_extension_fee, validity_extension_fee_added, customer_name, customer_vat_number, customer_country, customer_state_province, customer_city, "preferredPaymentMode", "preferredChequeBankName", "serviceContractId", customer_vat_status, a3_multiplier) FROM stdin;
6762b9fc-74f2-433e-8ac4-1513d1b51195	QTN-2026-0001	\N	\N	\N	\N	\N	\N	426625c1-62e8-4e14-952b-457452eb0f28	eb75c7ec-441c-48b4-acea-295f64cfc332	f4e495c8-8a12-4805-94bc-05f3b33421b5	47000.00	ACTIVE		eb75c7ec-441c-48b4-acea-295f64cfc332	2026-08-10 13:55:28.483	eb75c7ec-441c-48b4-acea-295f64cfc332	2026-08-10 13:58:54.854	\N	2026-08-10 13:55:01.451972	2026-08-10 13:58:54.846879	PRODUCT_SALE	FINAL	\N	\N	\N	0.00	\N	2026-08-10	2026-09-09	\N	\N	\N	\N	\N	f	f	\N	\N	\N	\N	\N	\N	\N	\N	47000.00	0.00	\N	\N	\N	\N	\N	\N	\N	\N	\N	product:normal	[STYLE:normal]	f	f	\N	\N	\N	\N	\N	\N	\N	\N	INVOICED	\N	\N	\N	f	none	\N	f	\N	\N	\N	f	f	f	\N	QAR	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	0	\N	\N	f	30	2026-09-09 13:55:01.446	f	\N	f	0.00	\N	0.00	\N	0	\N	0.00	f	NADHIL CUSTOMER	\N	QA	Doha	Doha	\N	\N	\N	UNREGISTERED_STANDARD	2.00
10c05f34-13d0-49f4-a910-245788fed9ea	QTN-2026-0004	10000.00	CASH		\N		\N	426625c1-62e8-4e14-952b-457452eb0f28	eb75c7ec-441c-48b4-acea-295f64cfc332	f4e495c8-8a12-4805-94bc-05f3b33421b5	10000.00	\N	\N	eb75c7ec-441c-48b4-acea-295f64cfc332	2026-08-10 16:50:56.93	1bb9ca55-954b-44b1-8866-6d86c21dd038	2026-08-10 16:52:17.028	\N	2026-08-10 16:50:53.053811	2026-08-10 16:52:17.038733	LEASE	QUOTATION	\N	\N	\N	10000.00	\N	2026-08-10	2026-11-09	\N	\N	\N	\N	\N	f	f	\N	EMI	3	30000.00	10000.00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	lease:normal	[STYLE:normal]	f	f	\N	\N	\N	\N	\N	\N	\N	\N	FINANCE_APPROVED	\N	\N	\N	f	none	\N	f	\N	\N	\N	f	f	f	\N	QAR	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	0	\N	\N	f	30	2026-09-09 16:50:53.051	f	\N	f	0.00	\N	0.00	\N	0	\N	0.00	f	NADHIL CUSTOMER	\N	QA	Doha	Doha	\N	\N	\N	UNREGISTERED_STANDARD	2.00
70a76578-6e64-402a-ac65-4ad08237b2c1	QTN-2026-0002	\N	\N	\N	\N	\N	\N	426625c1-62e8-4e14-952b-457452eb0f28	eb75c7ec-441c-48b4-acea-295f64cfc332	f4e495c8-8a12-4805-94bc-05f3b33421b5	30000.00	ACTIVE		eb75c7ec-441c-48b4-acea-295f64cfc332	2026-08-10 16:51:04.663	eb75c7ec-441c-48b4-acea-295f64cfc332	2026-08-10 16:54:16.821	\N	2026-08-10 16:48:50.567981	2026-08-10 16:54:17.165291	PRODUCT_SALE	FINAL	\N	\N	\N	0.00	\N	2026-08-10	2026-09-09	\N	\N	\N	\N	\N	f	f	\N	\N	\N	\N	\N	\N	\N	\N	30000.00	0.00	\N	\N	\N	\N	\N	\N	\N	\N	\N	product:normal	[STYLE:normal]	f	f	\N	\N	\N	\N	\N	\N	\N	\N	INVOICED	\N	\N	\N	f	copies	\N	f	\N	\N	200000	f	f	f	\N	QAR	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	0	\N	\N	f	30	2026-09-09 16:48:50.558	f	\N	f	0.00	\N	0.00	\N	0	\N	0.00	f	NADHIL CUSTOMER	\N	QA	Doha	Doha	CASH	\N	\N	UNREGISTERED_STANDARD	2.00
d4705e5b-c0a3-4238-82f0-6cab570bcb68	QTN-2026-0009	\N	\N	\N	\N	\N	\N	c24a0a2c-6b0f-4ae5-aaaf-0346a65e6b6e	eb75c7ec-441c-48b4-acea-295f64cfc332	511213d3-3b9b-4a84-b0c0-0ae1f9eb0c18	6825.00	\N	\N	\N	\N	\N	\N	\N	2026-08-13 00:48:05.454453	2026-08-13 00:48:05.486802	SALE	QUOTATION	\N	\N	\N	0.00	\N	2026-08-13	\N	\N	\N	\N	\N	\N	f	f	\N	\N	\N	\N	\N	\N	\N	\N	6500.00	0.00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	f	\N	\N	\N	\N	\N	\N	\N	\N	DRAFT	\N	\N	\N	f	\N	\N	f	\N	\N	\N	f	f	f	\N	AED	\N	VAT	5.00	325.00	TRN100200300	\N	\N	f	\N	\N	\N	\N	\N	\N	0	\N	\N	f	30	2026-09-12 00:48:05.453	f	\N	f	0.00	\N	0.00	\N	0	\N	0.00	f	Dubai Charity Foundation	\N	AE	\N	Dubai	\N	\N	\N	UNREGISTERED_STANDARD	2.00
37d3fa40-18f7-46c1-8660-bf7fe1407947	QTN-2026-0003	400.00	CASH		\N		\N	426625c1-62e8-4e14-952b-457452eb0f28	eb75c7ec-441c-48b4-acea-295f64cfc332	f4e495c8-8a12-4805-94bc-05f3b33421b5	400.00	ACTIVE		eb75c7ec-441c-48b4-acea-295f64cfc332	2026-08-10 16:51:01.011	eb75c7ec-441c-48b4-acea-295f64cfc332	2026-08-10 17:15:42.152	\N	2026-08-10 16:49:55.804501	2026-08-10 17:15:42.147505	RENT	PROFORMA	FIXED_LIMIT	MONTHLY	400.00	400.00	\N	2026-08-10	2026-11-09	\N	\N	\N	\N	\N	f	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	rental:normal	[STYLE:normal]	f	f	\N	\N	\N	\N	\N	\N	\N	\N	ACTIVE_CONTRACT	\N	\N	\N	f	\N	\N	f	\N	\N	\N	f	f	f	\N	QAR	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	0	\N	\N	f	30	2026-09-09 16:49:55.788	f	\N	f	0.00	\N	0.00	\N	0	\N	0.00	f	NADHIL CUSTOMER	\N	QA	Doha	Doha	CASH	\N	\N	UNREGISTERED_STANDARD	2.00
44acfc22-4317-4484-a546-79b545c4c2c2	QTN-2026-0005	300.00	CASH		\N		\N	426625c1-62e8-4e14-952b-457452eb0f28	eb75c7ec-441c-48b4-acea-295f64cfc332	f4e495c8-8a12-4805-94bc-05f3b33421b5	300.00	ACTIVE		eb75c7ec-441c-48b4-acea-295f64cfc332	2026-08-11 11:43:31.361	eb75c7ec-441c-48b4-acea-295f64cfc332	2026-08-11 12:28:06.77	\N	2026-08-11 11:43:21.52517	2026-08-11 12:28:06.76297	RENT	PROFORMA	FIXED_LIMIT	MONTHLY	300.00	300.00	\N	2026-08-11	2026-11-10	\N	\N	\N	\N	\N	f	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	rental:normal	[STYLE:normal]	f	f	\N	\N	\N	\N	\N	\N	\N	\N	ACTIVE_CONTRACT	\N	\N	\N	f	\N	\N	f	\N	\N	\N	f	f	f	\N	QAR	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	0	\N	\N	f	30	2026-09-10 11:43:21.432	f	\N	f	0.00	\N	0.00	\N	0	\N	0.00	f	NADHIL CUSTOMER	\N	QA	Doha	Doha	\N	\N	\N	UNREGISTERED_STANDARD	2.00
4c6872cb-12c0-4e6a-bc6d-8b85c044122e	QTN-2026-0006	500.00	CASH		\N		\N	426625c1-62e8-4e14-952b-457452eb0f28	eb75c7ec-441c-48b4-acea-295f64cfc332	f4e495c8-8a12-4805-94bc-05f3b33421b5	48250.00	ACTIVE		eb75c7ec-441c-48b4-acea-295f64cfc332	2026-08-11 12:32:54.592	eb75c7ec-441c-48b4-acea-295f64cfc332	2026-08-11 12:37:29.405	\N	2026-08-11 12:32:09.004245	2026-08-11 12:49:56.565922	RENT	PROFORMA	FIXED_LIMIT	MONTHLY	500.00	500.00	\N	2026-08-11	2026-11-10	\N	\N	\N	\N	\N	f	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	rental:normal	[STYLE:normal]	f	f	\N	\N	\N	\N	\N	\N	\N	\N	ACTIVE_CONTRACT	\N	\N	\N	f	\N	\N	f	\N	\N	\N	f	f	f	\N	QAR	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	0	\N	\N	f	30	2026-09-10 12:32:09.002	f	\N	f	0.00	\N	0.00	\N	0	\N	0.00	f	NADHIL CUSTOMER	\N	QA	Doha	Doha	CASH	\N	\N	UNREGISTERED_STANDARD	2.00
d8aa42fa-17ee-481a-9788-35fde4cccf88	QTN-2026-0008	\N	\N	\N	\N	\N	\N	c24a0a2c-6b0f-4ae5-aaaf-0346a65e6b6e	eb75c7ec-441c-48b4-acea-295f64cfc332	5cc2aed0-cefe-46bc-9244-c2b7becefa73	6090.00	\N	\N	\N	\N	\N	\N	\N	2026-08-13 00:48:05.295125	2026-08-13 00:48:05.348967	SALE	QUOTATION	\N	\N	\N	0.00	\N	2026-08-13	\N	\N	\N	\N	\N	\N	f	f	\N	\N	\N	\N	\N	\N	\N	\N	5800.00	0.00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	f	\N	\N	\N	\N	\N	\N	\N	\N	DRAFT	\N	\N	\N	f	\N	\N	f	\N	\N	\N	f	f	f	\N	AED	\N	VAT	5.00	290.00	TRN100200300	\N	\N	f	\N	\N	\N	\N	\N	\N	0	\N	\N	f	30	2026-09-12 00:48:05.293	f	\N	f	0.00	\N	0.00	\N	0	\N	0.00	f	Falcon Trading FZ-LLC	\N	AE	\N	Dubai	\N	\N	\N	UNREGISTERED_STANDARD	2.00
0567341b-d688-4c35-8007-0be7e8ad9adf	QTN-2026-0010	\N	\N	\N	\N	\N	\N	c24a0a2c-6b0f-4ae5-aaaf-0346a65e6b6e	eb75c7ec-441c-48b4-acea-295f64cfc332	f889a7bb-8903-4570-bc4d-bdaf7444fe4a	6825.00	\N	\N	\N	\N	\N	\N	\N	2026-08-13 00:48:05.561608	2026-08-13 00:48:05.610196	SALE	QUOTATION	\N	\N	\N	0.00	\N	2026-08-13	\N	\N	\N	\N	\N	\N	f	f	\N	\N	\N	\N	\N	\N	\N	\N	6500.00	0.00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	f	\N	\N	\N	\N	\N	\N	\N	\N	DRAFT	\N	\N	\N	f	\N	\N	f	\N	\N	\N	f	f	f	\N	AED	\N	VAT	5.00	325.00	TRN100200300	\N	\N	f	\N	\N	\N	\N	\N	\N	0	\N	\N	f	30	2026-09-12 00:48:05.56	f	\N	f	0.00	\N	0.00	\N	0	\N	0.00	f	Omar Al Nuaimi	\N	AE	\N	Dubai	\N	\N	\N	UNREGISTERED_STANDARD	2.00
115dee6f-bd46-4442-94af-143649e4d86b	QTN-2026-0011	\N	\N	\N	\N	\N	\N	c24a0a2c-6b0f-4ae5-aaaf-0346a65e6b6e	eb75c7ec-441c-48b4-acea-295f64cfc332	5cc2aed0-cefe-46bc-9244-c2b7becefa73	6090.00	\N	\N	\N	\N	\N	\N	\N	2026-08-13 00:48:05.675913	2026-08-13 00:48:05.720416	SALE	QUOTATION	\N	\N	\N	0.00	\N	2026-08-13	\N	\N	\N	\N	\N	\N	f	f	\N	\N	\N	\N	\N	\N	\N	\N	5800.00	0.00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	f	\N	\N	\N	\N	\N	\N	\N	\N	DRAFT	\N	\N	\N	f	\N	\N	f	\N	\N	\N	f	f	f	\N	AED	\N	VAT	5.00	290.00	TRN100200300	\N	\N	f	\N	\N	\N	\N	\N	\N	0	\N	\N	f	30	2026-09-12 00:48:05.674	f	\N	f	0.00	\N	0.00	\N	0	\N	0.00	f	Falcon Trading FZ-LLC	\N	AE	\N	Dubai	\N	\N	\N	UNREGISTERED_STANDARD	2.00
fdb6a1cc-d555-4dff-83b0-0304acb465b5	QTN-2026-0012	\N	\N	\N	\N	\N	\N	c24a0a2c-6b0f-4ae5-aaaf-0346a65e6b6e	eb75c7ec-441c-48b4-acea-295f64cfc332	511213d3-3b9b-4a84-b0c0-0ae1f9eb0c18	6500.00	\N	\N	\N	\N	\N	\N	\N	2026-08-13 00:50:17.423094	2026-08-13 00:50:17.455194	SALE	QUOTATION	\N	\N	\N	0.00	\N	2026-08-13	\N	\N	\N	\N	\N	\N	f	f	\N	\N	\N	\N	\N	\N	\N	\N	6500.00	0.00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	f	\N	\N	\N	\N	\N	\N	\N	\N	DRAFT	\N	\N	\N	f	\N	\N	f	\N	\N	\N	f	f	f	\N	AED	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	0	\N	\N	f	30	2026-09-12 00:50:17.422	f	\N	f	0.00	\N	0.00	\N	0	\N	0.00	f	Dubai Charity Foundation	\N	AE	\N	Dubai	\N	\N	\N	EXEMPT	2.00
585cb801-9a2f-4a51-bdbb-af34d3f216df	QTN-2026-0013	\N	\N	\N	\N	\N	\N	3d064932-b265-43dd-8ece-9410442db90c	eb75c7ec-441c-48b4-acea-295f64cfc332	f889a7bb-8903-4570-bc4d-bdaf7444fe4a	6500.00	\N	\N	\N	\N	\N	\N	\N	2026-08-13 00:50:17.540134	2026-08-13 00:50:17.593924	SALE	QUOTATION	\N	\N	\N	0.00	\N	2026-08-13	\N	\N	\N	\N	\N	\N	f	f	\N	\N	\N	\N	\N	\N	\N	\N	6500.00	0.00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	f	\N	\N	\N	\N	\N	\N	\N	\N	DRAFT	\N	\N	\N	f	\N	\N	f	\N	\N	\N	f	f	f	\N	OMR	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	0	\N	\N	f	30	2026-09-12 00:50:17.539	f	\N	f	0.00	\N	0.00	\N	0	\N	0.00	f	Omar Al Nuaimi	\N	AE	\N	Dubai	\N	\N	\N	UNREGISTERED_STANDARD	2.00
d5a0393c-bd11-4db4-a001-229959275ade	QTN-2026-0014	\N	\N	\N	\N	\N	\N	c24a0a2c-6b0f-4ae5-aaaf-0346a65e6b6e	eb75c7ec-441c-48b4-acea-295f64cfc332	f889a7bb-8903-4570-bc4d-bdaf7444fe4a	0.00	\N	\N	\N	\N	\N	\N	\N	2026-08-13 02:09:41.158904	2026-08-13 02:09:41.264204	LEASE	QUOTATION	\N	\N	\N	0.00	\N	2026-08-13	\N	\N	\N	\N	\N	\N	f	f	\N	EMI	24	\N	1500.00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	f	\N	\N	\N	\N	\N	\N	\N	\N	DRAFT	\N	\N	\N	f	\N	\N	f	\N	\N	\N	f	f	f	\N	AED	\N	VAT	5.00	0.00	TRN100200300	\N	\N	f	\N	\N	\N	\N	\N	\N	0	\N	\N	f	30	2026-09-12 02:09:41.153	f	\N	f	0.00	\N	0.00	\N	0	\N	0.00	f	Omar Al Nuaimi	\N	AE	\N	Dubai	\N	\N	\N	UNREGISTERED_STANDARD	2.00
73956fae-12f5-4c8c-a040-39ee4078a5a3	QTN-2026-0015	\N	\N	\N	\N	\N	\N	c24a0a2c-6b0f-4ae5-aaaf-0346a65e6b6e	eb75c7ec-441c-48b4-acea-295f64cfc332	f889a7bb-8903-4570-bc4d-bdaf7444fe4a	0.00	\N	\N	\N	\N	\N	\N	\N	2026-08-13 02:09:41.408764	2026-08-13 02:09:41.445864	LEASE	QUOTATION	FIXED_LIMIT	QUARTERLY	\N	0.00	\N	2026-08-13	\N	\N	\N	\N	\N	\N	f	f	\N	FSM	12	\N	\N	2000.00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	f	\N	\N	\N	\N	\N	\N	\N	\N	DRAFT	\N	\N	\N	f	\N	\N	f	\N	\N	\N	f	f	f	\N	AED	\N	VAT	5.00	0.00	TRN100200300	\N	\N	f	\N	\N	\N	\N	\N	\N	0	\N	\N	f	30	2026-09-12 02:09:41.405	f	\N	f	0.00	\N	0.00	\N	0	\N	0.00	f	Omar Al Nuaimi	\N	AE	\N	Dubai	\N	\N	\N	UNREGISTERED_STANDARD	2.00
6bcb4f5e-c673-482c-9b1a-bef9c7ad8674	QTN-2026-0007	\N	\N	\N	\N	\N	\N	c24a0a2c-6b0f-4ae5-aaaf-0346a65e6b6e	eb75c7ec-441c-48b4-acea-295f64cfc332	f889a7bb-8903-4570-bc4d-bdaf7444fe4a	6825.00	\N	\N	\N	\N	\N	\N	\N	2026-08-13 00:46:43.831222	2026-08-13 02:21:13.567778	SALE	PROFORMA	\N	\N	\N	0.00	\N	2026-08-13	\N	\N	\N	\N	\N	\N	f	f	\N	\N	\N	\N	\N	\N	\N	\N	6500.00	0.00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	f	\N	\N	\N	\N	\N	\N	\N	\N	REFUNDED	\N	\N	\N	f	\N	\N	f	\N	\N	\N	f	f	f	\N	AED	\N	VAT	5.00	325.00	TRN100200300	\N	\N	f	\N	\N	\N	\N	\N	\N	0	\N	\N	f	30	2026-09-12 00:46:43.827	f	\N	f	0.00	\N	0.00	\N	0	\N	0.00	f	Omar Al Nuaimi	\N	AE	\N	Dubai	\N	\N	\N	UNREGISTERED_STANDARD	2.00
33b9d2b1-3236-443c-bff1-8c5173b75498	QTN-2026-0016	\N	\N	\N	\N	\N	\N	c24a0a2c-6b0f-4ae5-aaaf-0346a65e6b6e	eb75c7ec-441c-48b4-acea-295f64cfc332	f889a7bb-8903-4570-bc4d-bdaf7444fe4a	0.00	\N	\N	\N	\N	\N	\N	\N	2026-08-13 03:00:30.563247	2026-08-13 03:00:30.563247	SALE	QUOTATION	\N	\N	\N	0.00	\N	2026-08-13	\N	\N	\N	\N	\N	\N	f	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	f	\N	\N	\N	\N	\N	\N	\N	\N	DRAFT	\N	\N	\N	f	\N	\N	f	\N	\N	\N	f	f	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	0	\N	\N	f	30	2026-09-12 03:00:30.558	f	\N	f	0.00	\N	0.00	\N	0	\N	0.00	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	2.00
b9b1fbd7-9367-413a-8329-6c3ba1f2924f	QTN-2026-0017	\N	\N	\N	\N	\N	\N	c24a0a2c-6b0f-4ae5-aaaf-0346a65e6b6e	eb75c7ec-441c-48b4-acea-295f64cfc332	f889a7bb-8903-4570-bc4d-bdaf7444fe4a	0.00	\N	\N	\N	\N	\N	\N	\N	2026-08-13 03:00:30.757969	2026-08-13 03:00:30.757969	SALE	QUOTATION	\N	\N	\N	0.00	\N	2026-08-13	\N	\N	\N	\N	\N	\N	f	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	f	\N	\N	\N	\N	\N	\N	\N	\N	DRAFT	\N	\N	\N	f	\N	\N	f	\N	\N	\N	f	f	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	0	\N	\N	f	30	2026-09-12 03:00:30.757	f	\N	f	0.00	\N	0.00	\N	0	\N	0.00	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	2.00
465cfaff-1fec-4856-9603-58c8fee5fa51	QTN-2026-0018	\N	\N	\N	\N	\N	\N	c24a0a2c-6b0f-4ae5-aaaf-0346a65e6b6e	eb75c7ec-441c-48b4-acea-295f64cfc332	f889a7bb-8903-4570-bc4d-bdaf7444fe4a	6615.00	\N	\N	\N	\N	\N	\N	\N	2026-08-13 03:00:30.843703	2026-08-13 03:00:31.120573	SALE	QUOTATION	\N	\N	\N	0.00	\N	2026-08-13	\N	\N	\N	\N	\N	\N	f	f	\N	\N	\N	\N	\N	\N	\N	\N	6300.00	0.00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	f	\N	\N	\N	\N	\N	\N	\N	\N	DRAFT	\N	\N	\N	f	\N	\N	f	\N	\N	\N	f	f	f	\N	AED	\N	VAT	5.00	315.00	TRN100200300	\N	\N	f	\N	\N	\N	\N	\N	\N	0	\N	\N	f	30	2026-09-12 03:00:30.842	f	\N	f	0.00	\N	0.00	\N	0	\N	0.00	f	Omar Al Nuaimi	\N	AE	\N	Dubai	\N	\N	\N	UNREGISTERED_STANDARD	2.00
85e56219-54bb-4cac-a5b1-28d8c35409f5	QTN-2026-0019	\N	\N	\N	\N	\N	\N	c24a0a2c-6b0f-4ae5-aaaf-0346a65e6b6e	eb75c7ec-441c-48b4-acea-295f64cfc332	5cc2aed0-cefe-46bc-9244-c2b7becefa73	6090.00	\N	\N	\N	\N	\N	\N	\N	2026-08-13 03:00:31.476521	2026-08-13 03:00:31.591339	SALE	QUOTATION	\N	\N	\N	0.00	\N	2026-08-13	\N	\N	\N	\N	\N	\N	f	f	\N	\N	\N	\N	\N	\N	\N	\N	5800.00	0.00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	f	\N	\N	\N	\N	\N	\N	\N	\N	DRAFT	\N	\N	\N	f	\N	\N	f	\N	\N	\N	f	f	f	\N	AED	\N	VAT	5.00	290.00	TRN100200300	\N	\N	f	\N	\N	\N	\N	\N	\N	0	\N	\N	f	30	2026-09-12 03:00:31.466	f	\N	f	0.00	\N	0.00	\N	0	\N	0.00	f	Falcon Trading FZ-LLC	TRN555666777	AE	\N	Dubai	\N	\N	\N	REGISTERED	2.00
c9b1e2ae-9739-4192-906d-5fbe088058b4	QTN-2026-0020	\N	\N	\N	\N	\N	\N	c24a0a2c-6b0f-4ae5-aaaf-0346a65e6b6e	eb75c7ec-441c-48b4-acea-295f64cfc332	f889a7bb-8903-4570-bc4d-bdaf7444fe4a	0.00	\N	\N	\N	\N	\N	\N	\N	2026-08-13 03:27:30.872267	2026-08-13 03:27:30.872267	RENT	QUOTATION	FIXED_LIMIT	MONTHLY	1000.00	0.00	\N	2026-06-01	2026-09-01	\N	\N	\N	\N	\N	f	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	f	\N	\N	\N	\N	\N	\N	\N	\N	DRAFT	\N	\N	\N	f	\N	\N	f	\N	\N	\N	f	f	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	0	\N	\N	f	30	2026-09-12 03:27:30.87	f	\N	f	0.00	\N	0.00	\N	0	\N	0.00	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	2.00
b471632e-0503-439b-bc58-8cb4c72356d5	QTN-2026-0022	\N	\N	\N	\N	\N	\N	c24a0a2c-6b0f-4ae5-aaaf-0346a65e6b6e	eb75c7ec-441c-48b4-acea-295f64cfc332	f889a7bb-8903-4570-bc4d-bdaf7444fe4a	0.00	\N	\N	\N	\N	\N	\N	\N	2026-08-13 03:28:31.241431	2026-08-13 03:28:31.241431	SALE	QUOTATION	\N	\N	\N	0.00	\N	2026-08-13	\N	\N	\N	\N	\N	\N	f	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	f	\N	\N	\N	\N	\N	\N	\N	\N	DRAFT	\N	\N	\N	f	\N	\N	f	\N	\N	\N	f	f	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	0	\N	\N	f	30	2026-09-12 03:28:31.239	f	\N	f	0.00	\N	0.00	\N	0	\N	0.00	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	2.00
ead434c2-1f97-4e57-9e4d-479cfa04eed1	QTN-2026-0021	\N	\N	\N	\N	\N	\N	c24a0a2c-6b0f-4ae5-aaaf-0346a65e6b6e	eb75c7ec-441c-48b4-acea-295f64cfc332	f889a7bb-8903-4570-bc4d-bdaf7444fe4a	2100.00	ACTIVE	\N	\N	\N	1bb9ca55-954b-44b1-8866-6d86c21dd038	2026-08-13 03:28:44.637	\N	2026-08-13 03:28:30.991711	2026-08-13 03:32:32.302082	RENT	PROFORMA	FIXED_LIMIT	MONTHLY	1000.00	0.00	\N	2026-06-01	2026-09-01	\N	\N	\N	\N	\N	f	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	f	\N	\N	\N	\N	\N	\N	\N	\N	ACTIVE_CONTRACT	\N	\N	\N	f	\N	\N	f	\N	\N	\N	f	f	f	\N	AED	\N	VAT	5.00	0.00	TRN100200300	\N	\N	f	\N	\N	\N	\N	\N	\N	0	\N	\N	f	30	2026-09-12 03:28:30.983	f	\N	f	0.00	\N	0.00	\N	0	\N	0.00	f	Omar Al Nuaimi	\N	AE	\N	Dubai	\N	\N	\N	UNREGISTERED_STANDARD	2.00
29989874-0588-4213-9a2b-27b97835a8f7	QTN-2026-0023	\N	\N	\N	\N	\N	\N	c24a0a2c-6b0f-4ae5-aaaf-0346a65e6b6e	eb75c7ec-441c-48b4-acea-295f64cfc332	f889a7bb-8903-4570-bc4d-bdaf7444fe4a	2150.00	ACTIVE	\N	\N	\N	1bb9ca55-954b-44b1-8866-6d86c21dd038	2026-08-13 03:37:37.856	\N	2026-08-13 03:37:18.274899	2026-08-13 03:38:10.797829	RENT	PROFORMA	FIXED_LIMIT	MONTHLY	1000.00	0.00	\N	2026-06-01	2026-09-01	\N	\N	\N	\N	\N	f	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	f	\N	\N	\N	\N	\N	\N	\N	\N	ACTIVE_CONTRACT	\N	\N	\N	f	\N	\N	f	\N	\N	\N	f	f	f	\N	AED	\N	VAT	5.00	0.00	TRN100200300	\N	\N	f	\N	\N	\N	\N	\N	\N	0	\N	\N	f	30	2026-09-12 03:37:18.269	f	\N	f	0.00	\N	0.00	\N	0	\N	0.00	f	Omar Al Nuaimi	\N	AE	\N	Dubai	\N	\N	\N	UNREGISTERED_STANDARD	2.00
\.


--
-- Data for Name: machine_swap_requests; Type: TABLE DATA; Schema: public; Owner: xerouser
--

COPY public.machine_swap_requests (id, branch_id, contract_id, invoice_number, contract_type, customer_name, model_id, model_name, current_product_id, current_serial_number, requested_product_id, requested_serial_number, reason, requested_by_id, requested_by_name, status, reviewed_by_id, reviewed_by_name, reviewed_at, rejection_reason, swap_executed_at, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: manual_journal_entries; Type: TABLE DATA; Schema: public; Owner: xerouser
--

COPY public.manual_journal_entries (id, "entryNo", date, "chartOfAccountId", amount, description, "branchId", "referenceNo", notes, "createdBy", "createdAt") FROM stdin;
\.


--
-- Data for Name: manual_payables; Type: TABLE DATA; Schema: public; Owner: xerouser
--

COPY public.manual_payables (id, "referenceNo", type, "payableTo", "vendorId", "employeeId", description, amount, currency, "issueDate", "dueDate", "amountPaid", outstanding, status, "branchId", notes, "createdBy", "createdAt", "linkedPurchaseId") FROM stdin;
576bcf47-02b9-4a6d-b186-003ef8e6ca22	REFUND-CN-2026-00014	CUSTOMER_REFUND	Omar Al Nuaimi	\N	\N	Refund for Credit Note CN-2026-00014	6825.00	AED	2026-08-12	2026-08-12	0.00	6825.00	PENDING	c24a0a2c-6b0f-4ae5-aaaf-0346a65e6b6e	approved for refund	1bb9ca55-954b-44b1-8866-6d86c21dd038	2026-08-13 02:21:13.567778	\N
\.


--
-- Data for Name: manual_receivables; Type: TABLE DATA; Schema: public; Owner: xerouser
--

COPY public.manual_receivables (id, "referenceNo", type, "customerId", "customerName", description, amount, currency, "issueDate", "dueDate", "amountPaid", outstanding, status, "linkedInvoiceId", "branchId", notes, "createdBy", "createdAt") FROM stdin;
\.


--
-- Data for Name: opening_balance_entries; Type: TABLE DATA; Schema: public; Owner: xerouser
--

COPY public.opening_balance_entries (id, entry_number, customer_id, branch_id, balance_type, opening_balance, remaining_balance, original_total_amount, already_paid_amount, invoice_id, is_fully_settled, migrated_at, monthly_billing_amount, billing_cycle_in_days, next_payment_due_date, total_contract_months, months_completed, months_remaining, remaining_contract_value, contract_start_date, product_brand, product_model, serial_number, product_id, notes, created_at, updated_at, deleted_at, branch_name) FROM stdin;
\.


--
-- Data for Name: owners; Type: TABLE DATA; Schema: public; Owner: xerouser
--

COPY public.owners (id, name, email, phone, "ownershipPercent", "isActive", notes, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: payable_payments; Type: TABLE DATA; Schema: public; Owner: xerouser
--

COPY public.payable_payments (id, "payableId", "paymentDate", amount, "paidFromAccount", "paymentMode", "referenceNo", notes, "createdBy", "createdAt") FROM stdin;
\.


--
-- Data for Name: payment_ledgers; Type: TABLE DATA; Schema: public; Owner: xerouser
--

COPY public.payment_ledgers (id, "invoiceId", "amountPaid", "paymentMode", "paymentDate", "referenceNumber", remarks, "recordedBy", "createdAt", "receiptUrl") FROM stdin;
\.


--
-- Data for Name: payment_transactions; Type: TABLE DATA; Schema: public; Owner: xerouser
--

COPY public.payment_transactions (id, invoice_id, transaction_date, payment_mode, reference_number, amount, recorded_by, remarks, created_at, currency_code, receipt_url, exchange_rate_snapshot) FROM stdin;
09f88ad0-d167-4cdc-b442-90eb3440aba2	70a76578-6e64-402a-ac65-4ad08237b2c1	2026-08-10 05:30:00	CASH	cash nadhil1232	2000.00	eb75c7ec-441c-48b4-acea-295f64cfc332	Advance payment collected at conversion — Invoice QTN-2026-0002	2026-08-10 16:54:17.146235	QAR	\N	\N
19d6d0b7-b939-4190-8e85-339c85df8b51	37d3fa40-18f7-46c1-8660-bf7fe1407947	2026-08-10 05:30:00	CASH	nadhil rent cash123	400.00	eb75c7ec-441c-48b4-acea-295f64cfc332	Advance payment collected at conversion — Invoice QTN-2026-0003	2026-08-10 17:14:13.174822	QAR	\N	\N
a88b087f-939d-43a6-8658-6fd61fac408f	4c6872cb-12c0-4e6a-bc6d-8b85c044122e	2026-08-11 05:30:00	CASH	TXVBVDHHVD	47750.00	1bb9ca55-954b-44b1-8866-6d86c21dd038	Usage bill — Aug 2026 to Sept 2026	2026-08-11 12:49:56.499554	QAR	\N	\N
421669e3-8c11-433d-8500-c880b8200cc7	4c6872cb-12c0-4e6a-bc6d-8b85c044122e	2026-08-11 05:30:00	CASH	\N	500.00	1bb9ca55-954b-44b1-8866-6d86c21dd038	Sale payment approved — SPAY-2026-0004	2026-08-11 12:51:33.789728	QAR	\N	\N
07f11796-a097-4f74-8fb5-f34b79ec12d4	44acfc22-4317-4484-a546-79b545c4c2c2	2026-08-11 05:30:00	CASH	CASH123	300.00	1bb9ca55-954b-44b1-8866-6d86c21dd038	Sale payment approved — SPAY-2026-0002	2026-08-11 16:30:11.399513	QAR	\N	\N
4ab85187-b10c-42d8-8ce6-42376c9cbff0	6bcb4f5e-c673-482c-9b1a-bef9c7ad8674	2026-08-12 05:30:00	CASH	ADV-001	2000.00	1bb9ca55-954b-44b1-8866-6d86c21dd038	Sale payment approved — SPAY-2026-0005	2026-08-13 00:52:14.651447	AED	\N	\N
f407873a-bec5-499a-b1cf-181fda83adfe	6bcb4f5e-c673-482c-9b1a-bef9c7ad8674	2026-08-12 05:30:00	CHEQUE	SALE-CHQ	2500.00	1bb9ca55-954b-44b1-8866-6d86c21dd038	Sale payment approved — SPAY-2026-0008	2026-08-13 03:54:32.984379	AED	\N	\N
e0c41286-2d4e-4fdc-878d-7d4e92259fba	29989874-0588-4213-9a2b-27b97835a8f7	2026-08-12 05:30:00	CHEQUE	\N	1100.00	1bb9ca55-954b-44b1-8866-6d86c21dd038	Sale payment approved — SPAY-2026-0009	2026-08-13 03:57:51.000489	AED	\N	\N
269d5958-4c44-4291-89b0-3b4eb41f72c8	29989874-0588-4213-9a2b-27b97835a8f7	2026-08-12 05:30:00	CHEQUE	\N	1050.00	1bb9ca55-954b-44b1-8866-6d86c21dd038	Sale payment approved — SPAY-2026-0010	2026-08-13 03:59:56.13883	AED	\N	\N
\.


--
-- Data for Name: product_allocations; Type: TABLE DATA; Schema: public; Owner: xerouser
--

COPY public.product_allocations (id, "contractId", "modelId", "productId", "serialNumber", status, "startTimestamp", "endTimestamp", "replacementOfAllocationId", "replacementReason", "initialBwA4", "initialBwA3", "initialColorA4", "initialColorA3", "currentBwA4", "currentBwA3", "currentColorA4", "currentColorA3", "createdAt", "updatedAt") FROM stdin;
dedd25f5-0f27-45a3-9a65-ccac14a4e470	6762b9fc-74f2-433e-8ac4-1513d1b51195	44a967c8-a9e6-48b5-87cd-f351dcbf9904	27ee9e9a-bcd7-4ad3-90eb-29ff5c605b2d	5678263	ALLOCATED	2026-08-10 13:58:54.726233	\N	\N	\N	0	0	0	0	0	0	0	0	2026-08-10 13:58:54.726233	2026-08-10 13:58:54.726233
d390b599-a8b5-43c6-bd0c-c0823ce5a6e2	70a76578-6e64-402a-ac65-4ad08237b2c1	53e2bd4a-6baa-454c-8610-f93b6e43f27b	1e3a8f25-f00f-43a8-928d-cc02f03b4621	56674783	ALLOCATED	2026-08-10 16:54:16.622418	\N	\N	\N	0	0	0	0	0	0	0	0	2026-08-10 16:54:16.622418	2026-08-10 16:54:16.622418
a8b9b906-f195-40e8-9adb-2e8411e01fc2	37d3fa40-18f7-46c1-8660-bf7fe1407947	a4469217-ba28-436d-9b8f-9a546df29573	4f19426e-ebd0-4230-9a72-c077b6b0b0b5	45627878967	ALLOCATED	2026-08-10 17:14:12.970503	\N	\N	\N	0	0	0	0	0	0	0	0	2026-08-10 17:14:12.970503	2026-08-10 17:14:12.970503
4406faf5-0766-4da7-a876-4d3dff73e8d5	44acfc22-4317-4484-a546-79b545c4c2c2	4c217962-0457-4c96-8a1a-75af057dc8bd	ebea2256-4ff9-438a-bd73-bd61d320fba9	7456476830	ALLOCATED	2026-08-11 11:46:51.789924	\N	\N	\N	0	0	0	0	0	0	0	0	2026-08-11 11:46:51.789924	2026-08-11 11:46:51.789924
7befe268-8bbf-41bb-adbb-6e63bde89d83	4c6872cb-12c0-4e6a-bc6d-8b85c044122e	36782f49-6661-4bd9-90fc-d47ec4c265e1	6809bc5c-a899-4419-b29c-9056060025c1	677874883	ALLOCATED	2026-08-11 12:35:15.585607	\N	\N	\N	0	0	0	0	4500	4500	4500	4500	2026-08-11 12:35:15.585607	2026-08-11 12:49:56.326314
bec45faa-3a26-4993-8c35-6bc7b3c9c4ba	29989874-0588-4213-9a2b-27b97835a8f7	4e72c048-49ed-4f27-a991-dba112ca653c	3e95e6ce-6832-40b8-b07b-981043b123b8	AE-SN-0004	REPLACED	2026-08-13 03:37:37.613449	2026-07-15 15:30:00	\N	Defective drum unit	0	0	0	0	8500	0	1800	0	2026-08-13 03:37:37.613449	2026-08-13 03:37:51.965535
7a1306c9-f47a-4db6-a736-59f20054ec42	29989874-0588-4213-9a2b-27b97835a8f7	4e72c048-49ed-4f27-a991-dba112ca653c	68ee2cc4-82c6-4f79-a2f1-db436bd0b930	AE-SN-0005	ALLOCATED	2026-07-15 15:30:00	\N	bec45faa-3a26-4993-8c35-6bc7b3c9c4ba	\N	0	0	0	0	3000	0	500	0	2026-08-13 03:37:51.965535	2026-08-13 03:38:10.766227
\.


--
-- Data for Name: quotation_template_assignments; Type: TABLE DATA; Schema: public; Owner: xerouser
--

COPY public.quotation_template_assignments (id, "templateId", "employeeId", "assignedAt", "assignedBy") FROM stdin;
\.


--
-- Data for Name: receivable_payments; Type: TABLE DATA; Schema: public; Owner: xerouser
--

COPY public.receivable_payments (id, "receivableId", "paymentDate", amount, "paidToAccount", "paymentMode", "referenceNo", notes, "createdBy", "createdAt") FROM stdin;
\.


--
-- Data for Name: return_credits; Type: TABLE DATA; Schema: public; Owner: xerouser
--

COPY public.return_credits (id, invoice_id, "branchId", "createdBy", amount, note, "returnedItemId", "returnedItemType", "createdAt") FROM stdin;
91ced487-d99b-45d9-80c3-cf151c9e0e68	6bcb4f5e-c673-482c-9b1a-bef9c7ad8674	c24a0a2c-6b0f-4ae5-aaaf-0346a65e6b6e	1bb9ca55-954b-44b1-8866-6d86c21dd038	6825.00	Refund for Credit Note CN-2026-00014. Finance Note: approved for refund	261030a9-9484-4d06-90aa-41a97a58e263	PRODUCT	2026-08-13 02:21:13.567778
\.


--
-- Data for Name: sale_payment_requests; Type: TABLE DATA; Schema: public; Owner: xerouser
--

COPY public.sale_payment_requests (id, "requestNo", "invoiceId", "invoiceNumber", "branchId", "recordedByEmployeeId", "recordedByEmployeeName", "customerName", amount, currency, "paymentMode", "paymentDate", "referenceNumber", remarks, "cashAccountId", "chequeNumber", "chequeBankName", "chequeDueDate", "chequeDate", "receiptUrl", status, "reviewedById", "reviewedByName", "reviewedAt", "rejectionReason", "paymentTransactionId", "createdAt", "updatedAt", "collectLater", "paymentContext") FROM stdin;
501cb0ec-ef52-490b-8c67-04f4b7d5e16f	SPAY-2026-0001	44acfc22-4317-4484-a546-79b545c4c2c2	QTN-2026-0005	426625c1-62e8-4e14-952b-457452eb0f28	eb75c7ec-441c-48b4-acea-295f64cfc332	RIYAS EMPLOYEE MANAGER	NADHIL CUSTOMER	300.00	QAR	CASH	2026-08-11	\N	Advance payment collected at conversion — Invoice QTN-2026-0005	\N	\N	\N	\N	\N	\N	PENDING	\N	\N	\N	\N	\N	2026-08-11 11:46:52.064996	2026-08-11 11:46:52.064996	f	RENT_ADVANCE
051b83c1-1541-4325-845f-28aa150ed21d	SPAY-2026-0003	4c6872cb-12c0-4e6a-bc6d-8b85c044122e	QTN-2026-0006	426625c1-62e8-4e14-952b-457452eb0f28	eb75c7ec-441c-48b4-acea-295f64cfc332	RIYAS EMPLOYEE MANAGER	NADHIL CUSTOMER	500.00	QAR	CASH	2026-08-11	cash recipt 	Advance payment collected at conversion — Invoice QTN-2026-0006	\N	\N	\N	\N	\N	\N	PENDING	\N	\N	\N	\N	\N	2026-08-11 12:35:15.929116	2026-08-11 12:35:15.929116	f	RENT_ADVANCE
12e98978-faab-428f-9ddb-fed1b79a31af	SPAY-2026-0004	4c6872cb-12c0-4e6a-bc6d-8b85c044122e	QTN-2026-0006	426625c1-62e8-4e14-952b-457452eb0f28	eb75c7ec-441c-48b4-acea-295f64cfc332	RIYAS EMPLOYEE MANAGER	NADHIL CUSTOMER	500.00	QAR	CASH	2026-08-11	\N	\N	\N	\N	\N	\N	\N	\N	APPROVED	1bb9ca55-954b-44b1-8866-6d86c21dd038	RIYAS FINANCE MANAGER	2026-08-11 12:51:33.789	\N	421669e3-8c11-433d-8500-c880b8200cc7	2026-08-11 12:37:04.355734	2026-08-11 12:51:33.789728	f	RENT_ADVANCE
85099374-a7df-4945-aed7-57d75e2cf2e9	SPAY-2026-0009	29989874-0588-4213-9a2b-27b97835a8f7	QTN-2026-0023	c24a0a2c-6b0f-4ae5-aaaf-0346a65e6b6e	1bb9ca55-954b-44b1-8866-6d86c21dd038	RIYAS FINANCE MANAGER	Omar Al Nuaimi	1100.00	AED	CHEQUE	2026-08-12	\N	\N	\N	CHQ-RENT-1	ENBD	2026-08-28	2026-08-14	\N	APPROVED	1bb9ca55-954b-44b1-8866-6d86c21dd038	RIYAS FINANCE MANAGER	2026-08-13 03:57:51.003	\N	e0c41286-2d4e-4fdc-878d-7d4e92259fba	2026-08-13 03:57:50.935852	2026-08-13 03:57:51.000489	f	RENT_PERIODIC
a3c78896-40b9-4582-bc8a-1223c4414da9	SPAY-2026-0002	44acfc22-4317-4484-a546-79b545c4c2c2	QTN-2026-0005	426625c1-62e8-4e14-952b-457452eb0f28	eb75c7ec-441c-48b4-acea-295f64cfc332	RIYAS EMPLOYEE MANAGER	NADHIL CUSTOMER	300.00	QAR	CASH	2026-08-11	CASH123	\N	\N	\N	\N	\N	\N	\N	APPROVED	1bb9ca55-954b-44b1-8866-6d86c21dd038	RIYAS FINANCE MANAGER	2026-08-11 16:30:11.399	\N	07f11796-a097-4f74-8fb5-f34b79ec12d4	2026-08-11 12:28:04.8365	2026-08-11 16:30:11.399513	f	RENT_ADVANCE
68b3c5b8-b070-4b36-b788-61ee6b1a100e	SPAY-2026-0005	6bcb4f5e-c673-482c-9b1a-bef9c7ad8674	QTN-2026-0007	c24a0a2c-6b0f-4ae5-aaaf-0346a65e6b6e	eb75c7ec-441c-48b4-acea-295f64cfc332	RIYAS EMPLOYEE MANAGER	Omar Al Nuaimi	2000.00	AED	CASH	2026-08-12	ADV-001	\N	f3e2dcc2-6702-4016-9196-9d7d67a2cb77	\N	\N	\N	\N	\N	APPROVED	1bb9ca55-954b-44b1-8866-6d86c21dd038	RIYAS FINANCE MANAGER	2026-08-13 00:52:14.651	\N	4ab85187-b10c-42d8-8ce6-42376c9cbff0	2026-08-13 00:51:59.637901	2026-08-13 00:52:14.651447	f	SALE_ADVANCE
d171538d-38da-4f67-a115-242c0fd652b1	SPAY-2026-0006	6bcb4f5e-c673-482c-9b1a-bef9c7ad8674	QTN-2026-0007	c24a0a2c-6b0f-4ae5-aaaf-0346a65e6b6e	eb75c7ec-441c-48b4-acea-295f64cfc332	RIYAS EMPLOYEE MANAGER	Omar Al Nuaimi	1500.00	AED	CASH	2026-08-12	BAL-001	\N	f3e2dcc2-6702-4016-9196-9d7d67a2cb77	\N	\N	\N	\N	https://pub-8bbb88e1d79042349d0bc47ad1f3eb23.r2.dev/sale-receipts/SPAY-2026-0006-1786562632294.pdf	PENDING	\N	\N	\N	\N	\N	2026-08-13 00:53:52.023919	2026-08-13 00:53:53.333673	f	SALE_BALANCE
8503e39b-998a-4f4a-a1a4-6f156cbeb2d4	SPAY-2026-0010	29989874-0588-4213-9a2b-27b97835a8f7	QTN-2026-0023	c24a0a2c-6b0f-4ae5-aaaf-0346a65e6b6e	1bb9ca55-954b-44b1-8866-6d86c21dd038	RIYAS FINANCE MANAGER	Omar Al Nuaimi	1050.00	AED	CHEQUE	2026-08-12	\N	\N	\N	CHQ-RENT-2	ENBD	2026-08-29	2026-08-15	\N	APPROVED	1bb9ca55-954b-44b1-8866-6d86c21dd038	RIYAS FINANCE MANAGER	2026-08-13 03:59:56.138	\N	269d5958-4c44-4291-89b0-3b4eb41f72c8	2026-08-13 03:59:56.081232	2026-08-13 03:59:56.13883	f	RENT_PERIODIC
4ecee985-a3fa-4b5f-9dc1-93018861f62c	SPAY-2026-0007	73956fae-12f5-4c8c-a040-39ee4078a5a3	QTN-2026-0015	c24a0a2c-6b0f-4ae5-aaaf-0346a65e6b6e	1bb9ca55-954b-44b1-8866-6d86c21dd038	RIYAS FINANCE MANAGER	Omar Al Nuaimi	2000.00	AED	BANK_TRANSFER	2026-08-12	LEASE-Q1	\N	92923eac-fa5a-4739-bf7c-99ece684098e	\N	\N	\N	\N	https://pub-8bbb88e1d79042349d0bc47ad1f3eb23.r2.dev/sale-receipts/SPAY-2026-0007-1786571411994.pdf	REJECTED	1bb9ca55-954b-44b1-8866-6d86c21dd038	RIYAS FINANCE MANAGER	2026-08-13 03:20:32.717	\N	\N	2026-08-13 03:20:11.728683	2026-08-13 03:20:32.720176	f	LEASE_PERIODIC
4d8dc97c-e39b-42d6-8a60-e3616113458a	SPAY-2026-0008	6bcb4f5e-c673-482c-9b1a-bef9c7ad8674	QTN-2026-0007	c24a0a2c-6b0f-4ae5-aaaf-0346a65e6b6e	eb75c7ec-441c-48b4-acea-295f64cfc332	RIYAS EMPLOYEE MANAGER	Omar Al Nuaimi	2500.00	AED	CHEQUE	2026-08-12	SALE-CHQ	\N	\N	CHQ-SALEFLOW-1	Emirates NBD	2026-08-25	2026-08-14	\N	APPROVED	1bb9ca55-954b-44b1-8866-6d86c21dd038	RIYAS FINANCE MANAGER	2026-08-13 03:54:32.984	\N	f407873a-bec5-499a-b1cf-181fda83adfe	2026-08-13 03:54:19.506452	2026-08-13 03:54:32.984379	f	SALE_BALANCE
\.


--
-- Data for Name: spare_part_credit_notes; Type: TABLE DATA; Schema: public; Owner: xerouser
--

COPY public.spare_part_credit_notes (id, "creditNoteNo", "sparePartId", "partName", sku, brand, quantity, "unitPrice", "totalAmount", "branchId", "customerId", "customerName", "invoiceReference", type, status, "sellerEmployeeId", notes, "financeNote", "damageReason", "rejectionReason", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: usage_record_items; Type: TABLE DATA; Schema: public; Owner: xerouser
--

COPY public.usage_record_items (id, "usageRecordId", "allocationId", "periodStart", "periodEnd", "startBwA4", "endBwA4", "deltaBwA4", "startBwA3", "endBwA3", "deltaBwA3", "startColorA4", "endColorA4", "deltaColorA4", "startColorA3", "endColorA3", "deltaColorA3") FROM stdin;
2a17c138-18b9-42af-bf26-c2bacd4b4932	690a0d1c-a7af-4667-82b1-f8953828b6dd	7befe268-8bbf-41bb-adbb-6e63bde89d83	2026-08-11 05:30:00	2026-09-10 05:30:00	0	4500	4500	0	4500	4500	0	4500	4500	0	4500	4500
9750eb1b-7213-4470-9e1d-0cf9600bf737	b127d41b-0895-4582-9394-cd0cd17866ab	bec45faa-3a26-4993-8c35-6bc7b3c9c4ba	2026-06-01 05:30:00	2026-06-30 05:30:00	0	6000	6000	0	0	0	0	1200	1200	0	0	0
10f700b8-528c-43b0-b5a1-8a39c8ff95a3	72feea60-c5ed-4818-8bf1-ea089120e722	bec45faa-3a26-4993-8c35-6bc7b3c9c4ba	2026-07-01 05:30:00	2026-07-31 05:30:00	6000	8500	2500	0	0	0	1200	1800	600	0	0	0
6b3a6a9c-647b-496b-b440-6bf861e7053d	72feea60-c5ed-4818-8bf1-ea089120e722	7a1306c9-f47a-4db6-a736-59f20054ec42	2026-07-01 05:30:00	2026-07-31 05:30:00	0	3000	3000	0	0	0	0	500	500	0	0	0
\.


--
-- Data for Name: usage_records; Type: TABLE DATA; Schema: public; Owner: xerouser
--

COPY public.usage_records (id, "contractId", "billingPeriodStart", "billingPeriodEnd", "bwA4Count", "bwA3Count", "colorA4Count", "colorA3Count", "bwA4Delta", "bwA3Delta", "colorA4Delta", "colorA3Delta", "exceededTotal", "exceededCharge", "monthlyRent", "advanceAdjusted", "totalCharge", "discountBwCopies", "discountColorCopies", "discountAmount", "reportedBy", remarks, "meterImageUrl", "createdAt", "updatedAt", "emailSentAt", "whatsappSentAt") FROM stdin;
690a0d1c-a7af-4667-82b1-f8953828b6dd	4c6872cb-12c0-4e6a-bc6d-8b85c044122e	2026-08-11	2026-09-10	4500	4500	4500	4500	4500	4500	4500	4500	21000	47250.00	500.00	0.00	47750.00	0	0	0.00	EMPLOYEE		meter-readings/1786432794903-Screenshot from 2026-06-27 12-00-17.png	2026-08-11 12:49:56.336184	2026-08-11 12:49:56.336184	\N	\N
464e2de9-baa2-443d-99a2-8b1cad588895	ead434c2-1f97-4e57-9e4d-479cfa04eed1	2026-06-01	2026-06-30	6000	0	1200	0	6000	0	1200	0	1200	100.00	1000.00	0.00	1100.00	0	0	0.00	EMPLOYEE	\N	\N	2026-08-13 03:32:32.27172	2026-08-13 03:32:32.27172	\N	\N
b127d41b-0895-4582-9394-cd0cd17866ab	29989874-0588-4213-9a2b-27b97835a8f7	2026-06-01	2026-06-30	6000	0	1200	0	6000	0	1200	0	1200	100.00	1000.00	0.00	1100.00	0	0	0.00	EMPLOYEE	\N	\N	2026-08-13 03:37:38.058158	2026-08-13 03:37:38.058158	\N	\N
72feea60-c5ed-4818-8bf1-ea089120e722	29989874-0588-4213-9a2b-27b97835a8f7	2026-07-01	2026-07-31	11500	0	2300	0	5500	0	1100	0	600	50.00	1000.00	0.00	1050.00	0	0	0.00	EMPLOYEE	\N	\N	2026-08-13 03:38:10.772566	2026-08-13 03:38:10.772566	\N	\N
\.


--
-- Data for Name: vat_remittances; Type: TABLE DATA; Schema: public; Owner: xerouser
--

COPY public.vat_remittances (id, "branchId", "periodFrom", "periodTo", "amountRemitted", "remittedDate", "referenceNo", notes, "createdBy", "createdAt") FROM stdin;
\.


--
-- Name: cn_seq_2026; Type: SEQUENCE SET; Schema: public; Owner: xerouser
--

SELECT pg_catalog.setval('public.cn_seq_2026', 14, true);


--
-- Name: usage_record_items PK_0dca803e32ece244d38f4b454ec; Type: CONSTRAINT; Schema: public; Owner: xerouser
--

ALTER TABLE ONLY public.usage_record_items
    ADD CONSTRAINT "PK_0dca803e32ece244d38f4b454ec" PRIMARY KEY (id);


--
-- Name: device_meter_readings PK_306aaab59c4cc86ce854d75bff2; Type: CONSTRAINT; Schema: public; Owner: xerouser
--

ALTER TABLE ONLY public.device_meter_readings
    ADD CONSTRAINT "PK_306aaab59c4cc86ce854d75bff2" PRIMARY KEY (id);


--
-- Name: product_allocations PK_4d813b9d12a8132d52364ed6828; Type: CONSTRAINT; Schema: public; Owner: xerouser
--

ALTER TABLE ONLY public.product_allocations
    ADD CONSTRAINT "PK_4d813b9d12a8132d52364ed6828" PRIMARY KEY (id);


--
-- Name: invoice_items PK_53b99f9e0e2945e69de1a12b75a; Type: CONSTRAINT; Schema: public; Owner: xerouser
--

ALTER TABLE ONLY public.invoice_items
    ADD CONSTRAINT "PK_53b99f9e0e2945e69de1a12b75a" PRIMARY KEY (id);


--
-- Name: quotation_template_assignments PK_58a5f214ba72b89511654953220; Type: CONSTRAINT; Schema: public; Owner: xerouser
--

ALTER TABLE ONLY public.quotation_template_assignments
    ADD CONSTRAINT "PK_58a5f214ba72b89511654953220" PRIMARY KEY (id);


--
-- Name: invoices PK_668cef7c22a427fd822cc1be3ce; Type: CONSTRAINT; Schema: public; Owner: xerouser
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT "PK_668cef7c22a427fd822cc1be3ce" PRIMARY KEY (id);


--
-- Name: return_credits PK_92937a1675530b041d74fb2f4b0; Type: CONSTRAINT; Schema: public; Owner: xerouser
--

ALTER TABLE ONLY public.return_credits
    ADD CONSTRAINT "PK_92937a1675530b041d74fb2f4b0" PRIMARY KEY (id);


--
-- Name: usage_records PK_e511cf9f7dc53851569f87467a5; Type: CONSTRAINT; Schema: public; Owner: xerouser
--

ALTER TABLE ONLY public.usage_records
    ADD CONSTRAINT "PK_e511cf9f7dc53851569f87467a5" PRIMARY KEY (id);


--
-- Name: payment_ledgers PK_fcba1eb80af3248a37f268bb713; Type: CONSTRAINT; Schema: public; Owner: xerouser
--

ALTER TABLE ONLY public.payment_ledgers
    ADD CONSTRAINT "PK_fcba1eb80af3248a37f268bb713" PRIMARY KEY (id);


--
-- Name: invoices UQ_bf8e0f9dd4558ef209ec111782d; Type: CONSTRAINT; Schema: public; Owner: xerouser
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT "UQ_bf8e0f9dd4558ef209ec111782d" UNIQUE ("invoiceNumber");


--
-- Name: account_reconciliations account_reconciliations_pkey; Type: CONSTRAINT; Schema: public; Owner: xerouser
--

ALTER TABLE ONLY public.account_reconciliations
    ADD CONSTRAINT account_reconciliations_pkey PRIMARY KEY (id);


--
-- Name: asset_depreciation_register asset_depreciation_register_pkey; Type: CONSTRAINT; Schema: public; Owner: xerouser
--

ALTER TABLE ONLY public.asset_depreciation_register
    ADD CONSTRAINT asset_depreciation_register_pkey PRIMARY KEY (id);


--
-- Name: asset_depreciation_register asset_depreciation_register_productId_key; Type: CONSTRAINT; Schema: public; Owner: xerouser
--

ALTER TABLE ONLY public.asset_depreciation_register
    ADD CONSTRAINT "asset_depreciation_register_productId_key" UNIQUE ("productId");


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: xerouser
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- Name: cash_bank_accounts cash_bank_accounts_pkey; Type: CONSTRAINT; Schema: public; Owner: xerouser
--

ALTER TABLE ONLY public.cash_bank_accounts
    ADD CONSTRAINT cash_bank_accounts_pkey PRIMARY KEY (id);


--
-- Name: cashbook_entries cashbook_entries_pkey; Type: CONSTRAINT; Schema: public; Owner: xerouser
--

ALTER TABLE ONLY public.cashbook_entries
    ADD CONSTRAINT cashbook_entries_pkey PRIMARY KEY (id);


--
-- Name: cashbook_entries cashbook_entries_referenceNo_key; Type: CONSTRAINT; Schema: public; Owner: xerouser
--

ALTER TABLE ONLY public.cashbook_entries
    ADD CONSTRAINT "cashbook_entries_referenceNo_key" UNIQUE ("referenceNo");


--
-- Name: chart_of_accounts chart_of_accounts_accountNumber_key; Type: CONSTRAINT; Schema: public; Owner: xerouser
--

ALTER TABLE ONLY public.chart_of_accounts
    ADD CONSTRAINT "chart_of_accounts_accountNumber_key" UNIQUE ("accountNumber");


--
-- Name: chart_of_accounts chart_of_accounts_pkey; Type: CONSTRAINT; Schema: public; Owner: xerouser
--

ALTER TABLE ONLY public.chart_of_accounts
    ADD CONSTRAINT chart_of_accounts_pkey PRIMARY KEY (id);


--
-- Name: cheque_status_history cheque_status_history_pkey; Type: CONSTRAINT; Schema: public; Owner: xerouser
--

ALTER TABLE ONLY public.cheque_status_history
    ADD CONSTRAINT cheque_status_history_pkey PRIMARY KEY (id);


--
-- Name: cheques cheques_pkey; Type: CONSTRAINT; Schema: public; Owner: xerouser
--

ALTER TABLE ONLY public.cheques
    ADD CONSTRAINT cheques_pkey PRIMARY KEY (id);


--
-- Name: contract_agreements contract_agreements_agreementNumber_key; Type: CONSTRAINT; Schema: public; Owner: xerouser
--

ALTER TABLE ONLY public.contract_agreements
    ADD CONSTRAINT "contract_agreements_agreementNumber_key" UNIQUE ("agreementNumber");


--
-- Name: contract_agreements contract_agreements_pkey; Type: CONSTRAINT; Schema: public; Owner: xerouser
--

ALTER TABLE ONLY public.contract_agreements
    ADD CONSTRAINT contract_agreements_pkey PRIMARY KEY (id);


--
-- Name: contract_agreements contract_agreements_signingToken_key; Type: CONSTRAINT; Schema: public; Owner: xerouser
--

ALTER TABLE ONLY public.contract_agreements
    ADD CONSTRAINT "contract_agreements_signingToken_key" UNIQUE ("signingToken");


--
-- Name: country_tax_rules country_tax_rules_country_key; Type: CONSTRAINT; Schema: public; Owner: xerouser
--

ALTER TABLE ONLY public.country_tax_rules
    ADD CONSTRAINT country_tax_rules_country_key UNIQUE (country);


--
-- Name: country_tax_rules country_tax_rules_pkey; Type: CONSTRAINT; Schema: public; Owner: xerouser
--

ALTER TABLE ONLY public.country_tax_rules
    ADD CONSTRAINT country_tax_rules_pkey PRIMARY KEY (id);


--
-- Name: credit_notes credit_notes_creditNoteNo_key; Type: CONSTRAINT; Schema: public; Owner: xerouser
--

ALTER TABLE ONLY public.credit_notes
    ADD CONSTRAINT "credit_notes_creditNoteNo_key" UNIQUE ("creditNoteNo");


--
-- Name: credit_notes credit_notes_pkey; Type: CONSTRAINT; Schema: public; Owner: xerouser
--

ALTER TABLE ONLY public.credit_notes
    ADD CONSTRAINT credit_notes_pkey PRIMARY KEY (id);


--
-- Name: depreciation_brand_rules depreciation_brand_rules_brandId_key; Type: CONSTRAINT; Schema: public; Owner: xerouser
--

ALTER TABLE ONLY public.depreciation_brand_rules
    ADD CONSTRAINT "depreciation_brand_rules_brandId_key" UNIQUE ("brandId");


--
-- Name: depreciation_brand_rules depreciation_brand_rules_pkey; Type: CONSTRAINT; Schema: public; Owner: xerouser
--

ALTER TABLE ONLY public.depreciation_brand_rules
    ADD CONSTRAINT depreciation_brand_rules_pkey PRIMARY KEY (id);


--
-- Name: depreciation_journal_entries depreciation_journal_entries_periodYear_periodMonth_branchI_key; Type: CONSTRAINT; Schema: public; Owner: xerouser
--

ALTER TABLE ONLY public.depreciation_journal_entries
    ADD CONSTRAINT "depreciation_journal_entries_periodYear_periodMonth_branchI_key" UNIQUE ("periodYear", "periodMonth", "branchId");


--
-- Name: depreciation_journal_entries depreciation_journal_entries_pkey; Type: CONSTRAINT; Schema: public; Owner: xerouser
--

ALTER TABLE ONLY public.depreciation_journal_entries
    ADD CONSTRAINT depreciation_journal_entries_pkey PRIMARY KEY (id);


--
-- Name: depreciation_model_rules depreciation_model_rules_modelId_key; Type: CONSTRAINT; Schema: public; Owner: xerouser
--

ALTER TABLE ONLY public.depreciation_model_rules
    ADD CONSTRAINT "depreciation_model_rules_modelId_key" UNIQUE ("modelId");


--
-- Name: depreciation_model_rules depreciation_model_rules_pkey; Type: CONSTRAINT; Schema: public; Owner: xerouser
--

ALTER TABLE ONLY public.depreciation_model_rules
    ADD CONSTRAINT depreciation_model_rules_pkey PRIMARY KEY (id);


--
-- Name: employee_expense_requests employee_expense_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: xerouser
--

ALTER TABLE ONLY public.employee_expense_requests
    ADD CONSTRAINT employee_expense_requests_pkey PRIMARY KEY (id);


--
-- Name: employee_expense_requests employee_expense_requests_requestNo_key; Type: CONSTRAINT; Schema: public; Owner: xerouser
--

ALTER TABLE ONLY public.employee_expense_requests
    ADD CONSTRAINT "employee_expense_requests_requestNo_key" UNIQUE ("requestNo");


--
-- Name: employee_target_achievements employee_target_achievements_pkey; Type: CONSTRAINT; Schema: public; Owner: xerouser
--

ALTER TABLE ONLY public.employee_target_achievements
    ADD CONSTRAINT employee_target_achievements_pkey PRIMARY KEY (id);


--
-- Name: employee_target_achievements employee_target_achievements_targetId_key; Type: CONSTRAINT; Schema: public; Owner: xerouser
--

ALTER TABLE ONLY public.employee_target_achievements
    ADD CONSTRAINT "employee_target_achievements_targetId_key" UNIQUE ("targetId");


--
-- Name: employee_targets employee_targets_pkey; Type: CONSTRAINT; Schema: public; Owner: xerouser
--

ALTER TABLE ONLY public.employee_targets
    ADD CONSTRAINT employee_targets_pkey PRIMARY KEY (id);


--
-- Name: equity_entries equity_entries_entryNo_key; Type: CONSTRAINT; Schema: public; Owner: xerouser
--

ALTER TABLE ONLY public.equity_entries
    ADD CONSTRAINT "equity_entries_entryNo_key" UNIQUE ("entryNo");


--
-- Name: equity_entries equity_entries_pkey; Type: CONSTRAINT; Schema: public; Owner: xerouser
--

ALTER TABLE ONLY public.equity_entries
    ADD CONSTRAINT equity_entries_pkey PRIMARY KEY (id);


--
-- Name: exchange_rates exchange_rates_fromCurrency_toCurrency_key; Type: CONSTRAINT; Schema: public; Owner: xerouser
--

ALTER TABLE ONLY public.exchange_rates
    ADD CONSTRAINT "exchange_rates_fromCurrency_toCurrency_key" UNIQUE ("fromCurrency", "toCurrency");


--
-- Name: exchange_rates exchange_rates_pkey; Type: CONSTRAINT; Schema: public; Owner: xerouser
--

ALTER TABLE ONLY public.exchange_rates
    ADD CONSTRAINT exchange_rates_pkey PRIMARY KEY (id);


--
-- Name: expense_entries expense_entries_expenseNo_key; Type: CONSTRAINT; Schema: public; Owner: xerouser
--

ALTER TABLE ONLY public.expense_entries
    ADD CONSTRAINT "expense_entries_expenseNo_key" UNIQUE ("expenseNo");


--
-- Name: expense_entries expense_entries_pkey; Type: CONSTRAINT; Schema: public; Owner: xerouser
--

ALTER TABLE ONLY public.expense_entries
    ADD CONSTRAINT expense_entries_pkey PRIMARY KEY (id);


--
-- Name: guarantee_cheques guarantee_cheques_pkey; Type: CONSTRAINT; Schema: public; Owner: xerouser
--

ALTER TABLE ONLY public.guarantee_cheques
    ADD CONSTRAINT guarantee_cheques_pkey PRIMARY KEY (id);


--
-- Name: income_entries income_entries_incomeNo_key; Type: CONSTRAINT; Schema: public; Owner: xerouser
--

ALTER TABLE ONLY public.income_entries
    ADD CONSTRAINT "income_entries_incomeNo_key" UNIQUE ("incomeNo");


--
-- Name: income_entries income_entries_pkey; Type: CONSTRAINT; Schema: public; Owner: xerouser
--

ALTER TABLE ONLY public.income_entries
    ADD CONSTRAINT income_entries_pkey PRIMARY KEY (id);


--
-- Name: installation_requests installation_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: xerouser
--

ALTER TABLE ONLY public.installation_requests
    ADD CONSTRAINT installation_requests_pkey PRIMARY KEY (id);


--
-- Name: invoice_ledger invoice_ledger_pkey; Type: CONSTRAINT; Schema: public; Owner: xerouser
--

ALTER TABLE ONLY public.invoice_ledger
    ADD CONSTRAINT invoice_ledger_pkey PRIMARY KEY (id);


--
-- Name: machine_swap_requests machine_swap_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: xerouser
--

ALTER TABLE ONLY public.machine_swap_requests
    ADD CONSTRAINT machine_swap_requests_pkey PRIMARY KEY (id);


--
-- Name: manual_journal_entries manual_journal_entries_entryNo_key; Type: CONSTRAINT; Schema: public; Owner: xerouser
--

ALTER TABLE ONLY public.manual_journal_entries
    ADD CONSTRAINT "manual_journal_entries_entryNo_key" UNIQUE ("entryNo");


--
-- Name: manual_journal_entries manual_journal_entries_pkey; Type: CONSTRAINT; Schema: public; Owner: xerouser
--

ALTER TABLE ONLY public.manual_journal_entries
    ADD CONSTRAINT manual_journal_entries_pkey PRIMARY KEY (id);


--
-- Name: manual_payables manual_payables_pkey; Type: CONSTRAINT; Schema: public; Owner: xerouser
--

ALTER TABLE ONLY public.manual_payables
    ADD CONSTRAINT manual_payables_pkey PRIMARY KEY (id);


--
-- Name: manual_payables manual_payables_referenceNo_key; Type: CONSTRAINT; Schema: public; Owner: xerouser
--

ALTER TABLE ONLY public.manual_payables
    ADD CONSTRAINT "manual_payables_referenceNo_key" UNIQUE ("referenceNo");


--
-- Name: manual_receivables manual_receivables_pkey; Type: CONSTRAINT; Schema: public; Owner: xerouser
--

ALTER TABLE ONLY public.manual_receivables
    ADD CONSTRAINT manual_receivables_pkey PRIMARY KEY (id);


--
-- Name: manual_receivables manual_receivables_referenceNo_key; Type: CONSTRAINT; Schema: public; Owner: xerouser
--

ALTER TABLE ONLY public.manual_receivables
    ADD CONSTRAINT "manual_receivables_referenceNo_key" UNIQUE ("referenceNo");


--
-- Name: opening_balance_entries opening_balance_entries_entry_number_key; Type: CONSTRAINT; Schema: public; Owner: xerouser
--

ALTER TABLE ONLY public.opening_balance_entries
    ADD CONSTRAINT opening_balance_entries_entry_number_key UNIQUE (entry_number);


--
-- Name: opening_balance_entries opening_balance_entries_pkey; Type: CONSTRAINT; Schema: public; Owner: xerouser
--

ALTER TABLE ONLY public.opening_balance_entries
    ADD CONSTRAINT opening_balance_entries_pkey PRIMARY KEY (id);


--
-- Name: owners owners_pkey; Type: CONSTRAINT; Schema: public; Owner: xerouser
--

ALTER TABLE ONLY public.owners
    ADD CONSTRAINT owners_pkey PRIMARY KEY (id);


--
-- Name: payable_payments payable_payments_pkey; Type: CONSTRAINT; Schema: public; Owner: xerouser
--

ALTER TABLE ONLY public.payable_payments
    ADD CONSTRAINT payable_payments_pkey PRIMARY KEY (id);


--
-- Name: payment_transactions payment_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: xerouser
--

ALTER TABLE ONLY public.payment_transactions
    ADD CONSTRAINT payment_transactions_pkey PRIMARY KEY (id);


--
-- Name: receivable_payments receivable_payments_pkey; Type: CONSTRAINT; Schema: public; Owner: xerouser
--

ALTER TABLE ONLY public.receivable_payments
    ADD CONSTRAINT receivable_payments_pkey PRIMARY KEY (id);


--
-- Name: sale_payment_requests sale_payment_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: xerouser
--

ALTER TABLE ONLY public.sale_payment_requests
    ADD CONSTRAINT sale_payment_requests_pkey PRIMARY KEY (id);


--
-- Name: sale_payment_requests sale_payment_requests_requestNo_key; Type: CONSTRAINT; Schema: public; Owner: xerouser
--

ALTER TABLE ONLY public.sale_payment_requests
    ADD CONSTRAINT "sale_payment_requests_requestNo_key" UNIQUE ("requestNo");


--
-- Name: spare_part_credit_notes spare_part_credit_notes_creditNoteNo_key; Type: CONSTRAINT; Schema: public; Owner: xerouser
--

ALTER TABLE ONLY public.spare_part_credit_notes
    ADD CONSTRAINT "spare_part_credit_notes_creditNoteNo_key" UNIQUE ("creditNoteNo");


--
-- Name: spare_part_credit_notes spare_part_credit_notes_pkey; Type: CONSTRAINT; Schema: public; Owner: xerouser
--

ALTER TABLE ONLY public.spare_part_credit_notes
    ADD CONSTRAINT spare_part_credit_notes_pkey PRIMARY KEY (id);


--
-- Name: employee_targets uniq_employee_month; Type: CONSTRAINT; Schema: public; Owner: xerouser
--

ALTER TABLE ONLY public.employee_targets
    ADD CONSTRAINT uniq_employee_month UNIQUE ("employeeId", "targetMonth");


--
-- Name: vat_remittances vat_remittances_pkey; Type: CONSTRAINT; Schema: public; Owner: xerouser
--

ALTER TABLE ONLY public.vat_remittances
    ADD CONSTRAINT vat_remittances_pkey PRIMARY KEY (id);


--
-- Name: IDX_00732eae833f1d221c6a759b26; Type: INDEX; Schema: public; Owner: xerouser
--

CREATE INDEX "IDX_00732eae833f1d221c6a759b26" ON public.invoices USING btree ("assignedEmployeeId");


--
-- Name: IDX_05c1dd35c7e7f14396c2b6ea38; Type: INDEX; Schema: public; Owner: xerouser
--

CREATE INDEX "IDX_05c1dd35c7e7f14396c2b6ea38" ON public.return_credits USING btree ("branchId");


--
-- Name: IDX_087453334d99e04669b8828990; Type: INDEX; Schema: public; Owner: xerouser
--

CREATE INDEX "IDX_087453334d99e04669b8828990" ON public.device_meter_readings USING btree ("serialNumber");


--
-- Name: IDX_23d944d6d174314fb4b6b5c72d; Type: INDEX; Schema: public; Owner: xerouser
--

CREATE INDEX "IDX_23d944d6d174314fb4b6b5c72d" ON public.invoices USING btree ("contractStatus", type) WHERE (type = 'PROFORMA'::public.invoices_type_enum);


--
-- Name: IDX_2beb767e5644b31a1e5ec153f3; Type: INDEX; Schema: public; Owner: xerouser
--

CREATE INDEX "IDX_2beb767e5644b31a1e5ec153f3" ON public.usage_record_items USING btree ("usageRecordId");


--
-- Name: IDX_3e2e31772735cd3f366cc0b0ba; Type: INDEX; Schema: public; Owner: xerouser
--

CREATE INDEX "IDX_3e2e31772735cd3f366cc0b0ba" ON public.product_allocations USING btree ("productId");


--
-- Name: IDX_4027c467b44543fd81b2096591; Type: INDEX; Schema: public; Owner: xerouser
--

CREATE INDEX "IDX_4027c467b44543fd81b2096591" ON public.return_credits USING btree (invoice_id);


--
-- Name: IDX_5cb39c8c98de7bb80ea975775c; Type: INDEX; Schema: public; Owner: xerouser
--

CREATE INDEX "IDX_5cb39c8c98de7bb80ea975775c" ON public.invoices USING btree ("isTemplate");


--
-- Name: IDX_687afc7f2a08d1af62a30c2ba1; Type: INDEX; Schema: public; Owner: xerouser
--

CREATE INDEX "IDX_687afc7f2a08d1af62a30c2ba1" ON public.usage_record_items USING btree ("allocationId");


--
-- Name: IDX_81d316e7e2e5e0704fa130e19b; Type: INDEX; Schema: public; Owner: xerouser
--

CREATE INDEX "IDX_81d316e7e2e5e0704fa130e19b" ON public.product_allocations USING btree ("contractId");


--
-- Name: IDX_8c59a402b1e601c77bb8245348; Type: INDEX; Schema: public; Owner: xerouser
--

CREATE INDEX "IDX_8c59a402b1e601c77bb8245348" ON public.quotation_template_assignments USING btree ("templateId");


--
-- Name: IDX_c92393a336302f3c92e00f5f3d; Type: INDEX; Schema: public; Owner: xerouser
--

CREATE UNIQUE INDEX "IDX_c92393a336302f3c92e00f5f3d" ON public.invoices USING btree ("templateId", "assignedEmployeeId", "customerId") WHERE (((status)::text <> ALL ((ARRAY['SUPERSEDED'::character varying, 'RETAKEN'::character varying])::text[])) AND (type = 'QUOTATION'::public.invoices_type_enum) AND ("templateId" IS NOT NULL) AND ("assignedEmployeeId" IS NOT NULL) AND ("customerId" IS NOT NULL));


--
-- Name: IDX_contract_agreements_branchId; Type: INDEX; Schema: public; Owner: xerouser
--

CREATE INDEX "IDX_contract_agreements_branchId" ON public.contract_agreements USING btree ("branchId");


--
-- Name: IDX_contract_agreements_invoiceId; Type: INDEX; Schema: public; Owner: xerouser
--

CREATE INDEX "IDX_contract_agreements_invoiceId" ON public.contract_agreements USING btree ("invoiceId");


--
-- Name: IDX_credit_notes_spare_part_id; Type: INDEX; Schema: public; Owner: xerouser
--

CREATE INDEX "IDX_credit_notes_spare_part_id" ON public.credit_notes USING btree ("sparePartId");


--
-- Name: IDX_de1dfd8828ec49166cb70fb4c6; Type: INDEX; Schema: public; Owner: xerouser
--

CREATE INDEX "IDX_de1dfd8828ec49166cb70fb4c6" ON public.invoices USING btree ("templateId");


--
-- Name: IDX_df2aa5614e3532a4ef95e7c1b3; Type: INDEX; Schema: public; Owner: xerouser
--

CREATE INDEX "IDX_df2aa5614e3532a4ef95e7c1b3" ON public.device_meter_readings USING btree ("invoiceId");


--
-- Name: IDX_installation_requests_branchId; Type: INDEX; Schema: public; Owner: xerouser
--

CREATE INDEX "IDX_installation_requests_branchId" ON public.installation_requests USING btree ("branchId");


--
-- Name: IDX_installation_requests_invoiceId; Type: INDEX; Schema: public; Owner: xerouser
--

CREATE INDEX "IDX_installation_requests_invoiceId" ON public.installation_requests USING btree ("invoiceId");


--
-- Name: IDX_machine_swap_requests_branchId; Type: INDEX; Schema: public; Owner: xerouser
--

CREATE INDEX "IDX_machine_swap_requests_branchId" ON public.machine_swap_requests USING btree (branch_id);


--
-- Name: IDX_machine_swap_requests_contractId; Type: INDEX; Schema: public; Owner: xerouser
--

CREATE INDEX "IDX_machine_swap_requests_contractId" ON public.machine_swap_requests USING btree (contract_id);


--
-- Name: IDX_machine_swap_requests_status; Type: INDEX; Schema: public; Owner: xerouser
--

CREATE INDEX "IDX_machine_swap_requests_status" ON public.machine_swap_requests USING btree (status);


--
-- Name: IDX_sale_payment_requests_branchId; Type: INDEX; Schema: public; Owner: xerouser
--

CREATE INDEX "IDX_sale_payment_requests_branchId" ON public.sale_payment_requests USING btree ("branchId");


--
-- Name: IDX_sale_payment_requests_invoiceId; Type: INDEX; Schema: public; Owner: xerouser
--

CREATE INDEX "IDX_sale_payment_requests_invoiceId" ON public.sale_payment_requests USING btree ("invoiceId");


--
-- Name: IDX_sale_payment_requests_status; Type: INDEX; Schema: public; Owner: xerouser
--

CREATE INDEX "IDX_sale_payment_requests_status" ON public.sale_payment_requests USING btree (status);


--
-- Name: idx_expense_req_branch; Type: INDEX; Schema: public; Owner: xerouser
--

CREATE INDEX idx_expense_req_branch ON public.employee_expense_requests USING btree ("branchId");


--
-- Name: idx_expense_req_date; Type: INDEX; Schema: public; Owner: xerouser
--

CREATE INDEX idx_expense_req_date ON public.employee_expense_requests USING btree (date);


--
-- Name: idx_expense_req_employee; Type: INDEX; Schema: public; Owner: xerouser
--

CREATE INDEX idx_expense_req_employee ON public.employee_expense_requests USING btree ("employeeId");


--
-- Name: idx_expense_req_status; Type: INDEX; Schema: public; Owner: xerouser
--

CREATE INDEX idx_expense_req_status ON public.employee_expense_requests USING btree (status);


--
-- Name: idx_machine_swap_branch; Type: INDEX; Schema: public; Owner: xerouser
--

CREATE INDEX idx_machine_swap_branch ON public.machine_swap_requests USING btree (branch_id);


--
-- Name: idx_machine_swap_contract; Type: INDEX; Schema: public; Owner: xerouser
--

CREATE INDEX idx_machine_swap_contract ON public.machine_swap_requests USING btree (contract_id);


--
-- Name: idx_machine_swap_status; Type: INDEX; Schema: public; Owner: xerouser
--

CREATE INDEX idx_machine_swap_status ON public.machine_swap_requests USING btree (status);


--
-- Name: uniq_cashbook_source; Type: INDEX; Schema: public; Owner: xerouser
--

CREATE UNIQUE INDEX uniq_cashbook_source ON public.cashbook_entries USING btree ("sourceType", "sourceId") WHERE ("sourceType" IS NOT NULL);


--
-- Name: uniq_product_allocation_active; Type: INDEX; Schema: public; Owner: xerouser
--

CREATE UNIQUE INDEX uniq_product_allocation_active ON public.product_allocations USING btree ("productId") WHERE (("productId" IS NOT NULL) AND (status = 'ALLOCATED'::public.product_allocations_status_enum));


--
-- Name: usage_record_items FK_2beb767e5644b31a1e5ec153f38; Type: FK CONSTRAINT; Schema: public; Owner: xerouser
--

ALTER TABLE ONLY public.usage_record_items
    ADD CONSTRAINT "FK_2beb767e5644b31a1e5ec153f38" FOREIGN KEY ("usageRecordId") REFERENCES public.usage_records(id) ON DELETE CASCADE;


--
-- Name: return_credits FK_4027c467b44543fd81b20965918; Type: FK CONSTRAINT; Schema: public; Owner: xerouser
--

ALTER TABLE ONLY public.return_credits
    ADD CONSTRAINT "FK_4027c467b44543fd81b20965918" FOREIGN KEY (invoice_id) REFERENCES public.invoices(id) ON DELETE CASCADE;


--
-- Name: usage_record_items FK_687afc7f2a08d1af62a30c2ba13; Type: FK CONSTRAINT; Schema: public; Owner: xerouser
--

ALTER TABLE ONLY public.usage_record_items
    ADD CONSTRAINT "FK_687afc7f2a08d1af62a30c2ba13" FOREIGN KEY ("allocationId") REFERENCES public.product_allocations(id) ON DELETE RESTRICT;


--
-- Name: invoice_items FK_7fb6895fc8fad9f5200e91abb59; Type: FK CONSTRAINT; Schema: public; Owner: xerouser
--

ALTER TABLE ONLY public.invoice_items
    ADD CONSTRAINT "FK_7fb6895fc8fad9f5200e91abb59" FOREIGN KEY ("invoiceId") REFERENCES public.invoices(id) ON DELETE CASCADE;


--
-- Name: product_allocations FK_81d316e7e2e5e0704fa130e19b0; Type: FK CONSTRAINT; Schema: public; Owner: xerouser
--

ALTER TABLE ONLY public.product_allocations
    ADD CONSTRAINT "FK_81d316e7e2e5e0704fa130e19b0" FOREIGN KEY ("contractId") REFERENCES public.invoices(id) ON DELETE CASCADE;


--
-- Name: usage_records FK_c32b5ff4a2dd713e2e2986a4141; Type: FK CONSTRAINT; Schema: public; Owner: xerouser
--

ALTER TABLE ONLY public.usage_records
    ADD CONSTRAINT "FK_c32b5ff4a2dd713e2e2986a4141" FOREIGN KEY ("contractId") REFERENCES public.invoices(id);


--
-- Name: payment_ledgers FK_cd91f46302281f4b683765a1c6e; Type: FK CONSTRAINT; Schema: public; Owner: xerouser
--

ALTER TABLE ONLY public.payment_ledgers
    ADD CONSTRAINT "FK_cd91f46302281f4b683765a1c6e" FOREIGN KEY ("invoiceId") REFERENCES public.invoices(id) ON DELETE CASCADE;


--
-- Name: account_reconciliations account_reconciliations_accountId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: xerouser
--

ALTER TABLE ONLY public.account_reconciliations
    ADD CONSTRAINT "account_reconciliations_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES public.cash_bank_accounts(id) ON DELETE CASCADE;


--
-- Name: cashbook_entries cashbook_entries_accountId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: xerouser
--

ALTER TABLE ONLY public.cashbook_entries
    ADD CONSTRAINT "cashbook_entries_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES public.cash_bank_accounts(id);


--
-- Name: chart_of_accounts chart_of_accounts_linkedCashBankAccountId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: xerouser
--

ALTER TABLE ONLY public.chart_of_accounts
    ADD CONSTRAINT "chart_of_accounts_linkedCashBankAccountId_fkey" FOREIGN KEY ("linkedCashBankAccountId") REFERENCES public.cash_bank_accounts(id);


--
-- Name: chart_of_accounts chart_of_accounts_parentAccountId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: xerouser
--

ALTER TABLE ONLY public.chart_of_accounts
    ADD CONSTRAINT "chart_of_accounts_parentAccountId_fkey" FOREIGN KEY ("parentAccountId") REFERENCES public.chart_of_accounts(id);


--
-- Name: cheque_status_history cheque_status_history_cheque_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: xerouser
--

ALTER TABLE ONLY public.cheque_status_history
    ADD CONSTRAINT cheque_status_history_cheque_id_fkey FOREIGN KEY (cheque_id) REFERENCES public.cheques(id) ON DELETE CASCADE;


--
-- Name: cheques cheques_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: xerouser
--

ALTER TABLE ONLY public.cheques
    ADD CONSTRAINT cheques_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.cash_bank_accounts(id);


--
-- Name: cheques cheques_cashbook_entry_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: xerouser
--

ALTER TABLE ONLY public.cheques
    ADD CONSTRAINT cheques_cashbook_entry_id_fkey FOREIGN KEY (cashbook_entry_id) REFERENCES public.cashbook_entries(id);


--
-- Name: credit_notes credit_notes_invoice_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: xerouser
--

ALTER TABLE ONLY public.credit_notes
    ADD CONSTRAINT credit_notes_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES public.invoices(id);


--
-- Name: depreciation_journal_entries depreciation_journal_entries_expenseEntryId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: xerouser
--

ALTER TABLE ONLY public.depreciation_journal_entries
    ADD CONSTRAINT "depreciation_journal_entries_expenseEntryId_fkey" FOREIGN KEY ("expenseEntryId") REFERENCES public.expense_entries(id);


--
-- Name: equity_entries equity_entries_linkedCashAccountId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: xerouser
--

ALTER TABLE ONLY public.equity_entries
    ADD CONSTRAINT "equity_entries_linkedCashAccountId_fkey" FOREIGN KEY ("linkedCashAccountId") REFERENCES public.cash_bank_accounts(id);


--
-- Name: equity_entries equity_entries_ownerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: xerouser
--

ALTER TABLE ONLY public.equity_entries
    ADD CONSTRAINT "equity_entries_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES public.owners(id);


--
-- Name: expense_entries expense_entries_paidFrom_fkey; Type: FK CONSTRAINT; Schema: public; Owner: xerouser
--

ALTER TABLE ONLY public.expense_entries
    ADD CONSTRAINT "expense_entries_paidFrom_fkey" FOREIGN KEY ("paidFrom") REFERENCES public.cash_bank_accounts(id);


--
-- Name: income_entries income_entries_receivedTo_fkey; Type: FK CONSTRAINT; Schema: public; Owner: xerouser
--

ALTER TABLE ONLY public.income_entries
    ADD CONSTRAINT "income_entries_receivedTo_fkey" FOREIGN KEY ("receivedTo") REFERENCES public.cash_bank_accounts(id);


--
-- Name: invoice_ledger invoice_ledger_invoice_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: xerouser
--

ALTER TABLE ONLY public.invoice_ledger
    ADD CONSTRAINT invoice_ledger_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES public.invoices(id) ON DELETE CASCADE;


--
-- Name: manual_journal_entries manual_journal_entries_chartOfAccountId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: xerouser
--

ALTER TABLE ONLY public.manual_journal_entries
    ADD CONSTRAINT "manual_journal_entries_chartOfAccountId_fkey" FOREIGN KEY ("chartOfAccountId") REFERENCES public.chart_of_accounts(id);


--
-- Name: opening_balance_entries opening_balance_entries_invoice_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: xerouser
--

ALTER TABLE ONLY public.opening_balance_entries
    ADD CONSTRAINT opening_balance_entries_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES public.invoices(id) ON DELETE SET NULL;


--
-- Name: payable_payments payable_payments_paidFromAccount_fkey; Type: FK CONSTRAINT; Schema: public; Owner: xerouser
--

ALTER TABLE ONLY public.payable_payments
    ADD CONSTRAINT "payable_payments_paidFromAccount_fkey" FOREIGN KEY ("paidFromAccount") REFERENCES public.cash_bank_accounts(id);


--
-- Name: payable_payments payable_payments_payableId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: xerouser
--

ALTER TABLE ONLY public.payable_payments
    ADD CONSTRAINT "payable_payments_payableId_fkey" FOREIGN KEY ("payableId") REFERENCES public.manual_payables(id);


--
-- Name: payment_transactions payment_transactions_invoice_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: xerouser
--

ALTER TABLE ONLY public.payment_transactions
    ADD CONSTRAINT payment_transactions_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES public.invoices(id) ON DELETE CASCADE;


--
-- Name: receivable_payments receivable_payments_paidToAccount_fkey; Type: FK CONSTRAINT; Schema: public; Owner: xerouser
--

ALTER TABLE ONLY public.receivable_payments
    ADD CONSTRAINT "receivable_payments_paidToAccount_fkey" FOREIGN KEY ("paidToAccount") REFERENCES public.cash_bank_accounts(id);


--
-- Name: receivable_payments receivable_payments_receivableId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: xerouser
--

ALTER TABLE ONLY public.receivable_payments
    ADD CONSTRAINT "receivable_payments_receivableId_fkey" FOREIGN KEY ("receivableId") REFERENCES public.manual_receivables(id);


--
-- PostgreSQL database dump complete
--

\unrestrict ibOukVJJj6M1d8RbtIjYLg35t5Dnfn93eMkQOSqdLMWywCSnSKBwxdfnkVKGaEg

