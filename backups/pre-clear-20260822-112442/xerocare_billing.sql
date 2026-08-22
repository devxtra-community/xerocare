--
-- PostgreSQL database dump
--

\restrict vpHtde3veTEav8V62QD6Ikodw1wQW2EKfOBchJmjtJX7o0gXwUHGZFE8IuunANf

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
-- Name: invoices_deliverystatus_enum; Type: TYPE; Schema: public; Owner: xerouser
--

CREATE TYPE public.invoices_deliverystatus_enum AS ENUM (
    'NOT_DELIVERED',
    'DELIVERED'
);


ALTER TYPE public.invoices_deliverystatus_enum OWNER TO xerouser;

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
    a3_multiplier numeric(4,2) DEFAULT 2.00 NOT NULL,
    "deliveryStatus" public.invoices_deliverystatus_enum DEFAULT 'NOT_DELIVERED'::public.invoices_deliverystatus_enum NOT NULL
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
-- Name: migration_markers; Type: TABLE; Schema: public; Owner: xerouser
--

CREATE TABLE public.migration_markers (
    key character varying NOT NULL,
    "ranAt" timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.migration_markers OWNER TO xerouser;

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
    exchange_rate_snapshot numeric(18,6),
    is_reversed boolean DEFAULT false NOT NULL,
    reversed_by_id uuid
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
    "paymentContext" character varying,
    "usageRecordId" uuid,
    "taxableAmount" numeric(12,2),
    "taxAmount" numeric(12,2),
    "taxPercent" numeric(5,2)
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
    "whatsappSentAt" timestamp without time zone,
    "taxableAmount" numeric(10,2) DEFAULT 0 NOT NULL,
    "taxAmount" numeric(10,2) DEFAULT 0 NOT NULL,
    "taxPercent" numeric(5,2),
    "billStatus" character varying DEFAULT 'PENDING_APPROVAL'::character varying NOT NULL,
    "billCreatedByEmployeeId" uuid,
    "billCreatedByName" character varying,
    "billSentAt" timestamp without time zone,
    "signingToken" character varying,
    "signingTokenExpiresAt" timestamp without time zone,
    "signingTokenUsed" boolean DEFAULT false NOT NULL,
    "customerApprovedByName" character varying,
    "customerApprovedAt" timestamp without time zone,
    "customerApprovalMethod" character varying,
    "customerApprovalNote" text,
    "customerRejectionReason" text,
    "customerRejectedAt" timestamp without time zone,
    "billType" character varying DEFAULT 'USAGE'::character varying NOT NULL
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
2f9fad49-57f6-470f-88e2-accc3bfbe940	323dbba4-0669-43fd-aac9-efdec49ad33d	CREATION	4ad3cdfb-86a4-407a-b502-15a97c9f92ec	\N	\N	Created quotation QTN-2026-0001	2026-08-21 16:30:22.094555
a459e6f0-8c1a-4386-9152-23322b8750ad	02b43c38-8df6-4423-acea-9bb0622a70ef	CREATION	4ad3cdfb-86a4-407a-b502-15a97c9f92ec	\N	\N	Created quotation QTN-2026-0002	2026-08-21 16:31:21.788004
3421304b-c700-4a67-ab5e-634b95540872	06bcfd35-e97f-465a-ad8c-e95c7c7639e1	CREATION	4ad3cdfb-86a4-407a-b502-15a97c9f92ec	\N	\N	Created quotation QTN-2026-0003	2026-08-21 16:33:24.198919
69937db4-d32b-46b7-8911-17139af51ec8	06bcfd35-e97f-465a-ad8c-e95c7c7639e1	STATUS_CHANGE	4ad3cdfb-86a4-407a-b502-15a97c9f92ec	DRAFT	EMPLOYEE_APPROVED	Employee approved the quotation for Finance review.	2026-08-21 16:33:56.595212
4284f277-7394-4c8e-92ce-59ccc733e27e	02b43c38-8df6-4423-acea-9bb0622a70ef	STATUS_CHANGE	4ad3cdfb-86a4-407a-b502-15a97c9f92ec	DRAFT	EMPLOYEE_APPROVED	Employee approved the quotation for Finance review.	2026-08-21 16:34:00.62954
95c10ac1-0ee4-412d-b82d-42217c7a0d1b	323dbba4-0669-43fd-aac9-efdec49ad33d	STATUS_CHANGE	4ad3cdfb-86a4-407a-b502-15a97c9f92ec	DRAFT	EMPLOYEE_APPROVED	Employee approved the quotation for Finance review.	2026-08-21 16:34:03.499272
4767be78-5f57-4a51-97e7-9b165a0327cb	06bcfd35-e97f-465a-ad8c-e95c7c7639e1	STATUS_CHANGE	54e43449-9b18-462d-aec6-112dbbc65d9b	EMPLOYEE_APPROVED	FINANCE_APPROVED	Finance approved quotation pricing.	2026-08-21 16:44:36.878573
c1240f38-d750-4892-a69e-e9ec652c0480	02b43c38-8df6-4423-acea-9bb0622a70ef	STATUS_CHANGE	54e43449-9b18-462d-aec6-112dbbc65d9b	EMPLOYEE_APPROVED	FINANCE_APPROVED	Finance approved quotation pricing.	2026-08-21 16:44:40.510292
10a52cba-1520-4f58-aa9d-6fc2cc1db825	323dbba4-0669-43fd-aac9-efdec49ad33d	STATUS_CHANGE	54e43449-9b18-462d-aec6-112dbbc65d9b	EMPLOYEE_APPROVED	FINANCE_APPROVED	Finance approved quotation pricing.	2026-08-21 16:44:43.786117
93e3b1b3-0739-4620-be72-1f8c3eb4d8e2	323dbba4-0669-43fd-aac9-efdec49ad33d	STATUS_CHANGE	4ad3cdfb-86a4-407a-b502-15a97c9f92ec	FINANCE_APPROVED	DRAFT	Converted approved quotation into transaction (Proforma draft).	2026-08-21 16:45:31.661987
5401e41c-4017-4010-85fa-e10d223b0f22	323dbba4-0669-43fd-aac9-efdec49ad33d	ALLOCATION	4ad3cdfb-86a4-407a-b502-15a97c9f92ec	\N	\N	Finance allocated inventory machines to Proforma. Status: FINANCE_APPROVED, Contract Status: PENDING_CONFIRMATION.	2026-08-21 16:45:31.835555
5a3c6411-95bd-435c-bc6c-058c5e544f0a	323dbba4-0669-43fd-aac9-efdec49ad33d	ACTIVATION	4ad3cdfb-86a4-407a-b502-15a97c9f92ec	\N	\N	Activated contract/invoice. Status: INVOICED, Contract Status: ACTIVE.	2026-08-21 16:45:31.94093
666cd378-10ff-4ff7-b8c4-2e7215a506a7	02b43c38-8df6-4423-acea-9bb0622a70ef	STATUS_CHANGE	4ad3cdfb-86a4-407a-b502-15a97c9f92ec	FINANCE_APPROVED	DRAFT	Converted approved quotation into transaction (Proforma draft).	2026-08-21 17:26:59.193713
3a4e20d1-a4a3-4dd4-a54e-3659cb18680d	02b43c38-8df6-4423-acea-9bb0622a70ef	ALLOCATION	4ad3cdfb-86a4-407a-b502-15a97c9f92ec	\N	\N	Finance allocated inventory machines to Proforma. Status: FINANCE_APPROVED, Contract Status: PENDING_CONFIRMATION.	2026-08-21 17:26:59.396905
de181784-3ae4-40d2-8eef-9913b2b515a5	02b43c38-8df6-4423-acea-9bb0622a70ef	ACTIVATION	4ad3cdfb-86a4-407a-b502-15a97c9f92ec	\N	\N	Activated contract/invoice. Status: ACTIVE_CONTRACT, Contract Status: ACTIVE.	2026-08-21 17:31:10.870613
c4a2134a-b1ba-4c2f-8972-b89584fbff86	06bcfd35-e97f-465a-ad8c-e95c7c7639e1	STATUS_CHANGE	4ad3cdfb-86a4-407a-b502-15a97c9f92ec	FINANCE_APPROVED	DRAFT	Converted approved quotation into transaction (Proforma draft).	2026-08-21 17:32:19.685215
e787494c-0e6a-4fbf-b5d0-962b184024b3	06bcfd35-e97f-465a-ad8c-e95c7c7639e1	ALLOCATION	4ad3cdfb-86a4-407a-b502-15a97c9f92ec	\N	\N	Finance allocated inventory machines to Proforma. Status: FINANCE_APPROVED, Contract Status: PENDING_CONFIRMATION.	2026-08-21 17:32:19.987504
0839f986-f567-4c32-9374-b0eac18e215d	06bcfd35-e97f-465a-ad8c-e95c7c7639e1	ACTIVATION	4ad3cdfb-86a4-407a-b502-15a97c9f92ec	\N	\N	Activated contract/invoice. Status: ACTIVE_CONTRACT, Contract Status: ACTIVE.	2026-08-21 17:33:32.384909
\.


--
-- Data for Name: cash_bank_accounts; Type: TABLE DATA; Schema: public; Owner: xerouser
--

COPY public.cash_bank_accounts (id, name, type, "bankName", "accountNumber", "branchId", currency, "openingBalance", "currentBalance", notes, "isActive", "createdAt", "updatedAt", iban, "accountType", "openingDate", "responsiblePersonId", "contactPerson", "isDefault") FROM stdin;
1300c98f-5dba-4671-bb7c-d07df25c5377	xerocare bank account	BANK	emirates bank	67647837y4	3f791696-075c-4c28-bcc8-25074cd0a54f	AED	32000.00	79662.50	BANK BALANCE ADDED BY RAFEEQ SHAREHOLDER OF XEROCARE 	t	2026-08-21 15:06:48.036157	2026-08-22 11:10:57.354189	AEHBH	CURRENT	2026-08-21	\N	RAFEEQ	f
9ad68db2-64d4-4b30-987a-e4ff1bb9007f	Test Cash Account	CASH	\N	\N	24039cac-a975-4a63-97b0-1035e720f577	AED	5000.00	4000.00	\N	t	2026-08-21 16:16:54.168926	2026-08-21 16:17:30.032249	\N	CURRENT	\N	\N	\N	t
6375d8b2-44b3-449e-99ef-87df85356a9c	Test Bank Account	BANK	Test Bank	\N	24039cac-a975-4a63-97b0-1035e720f577	AED	10000.00	500.00	\N	t	2026-08-21 16:16:54.215512	2026-08-21 16:19:54.505299	\N	CURRENT	\N	\N	\N	t
1b2d1d27-3fd5-47fa-90f3-6ca7cc6da53d	Second Cash Account (Petty Cash)	CASH	\N	\N	24039cac-a975-4a63-97b0-1035e720f577	AED	2000.00	2000.00	\N	t	2026-08-21 16:20:04.475335	2026-08-21 16:20:04.475335	\N	CURRENT	\N	\N	\N	f
4b228416-9ce8-4d78-89c2-7c90434d13bd	xerocare cash account	CASH	\N	\N	3f791696-075c-4c28-bcc8-25074cd0a54f	AED	425000.00	344576.50	manager contribution 	t	2026-08-21 15:04:56.944124	2026-08-22 11:08:36.707771	\N	CURRENT	2026-08-21	\N	\N	f
\.


--
-- Data for Name: cashbook_entries; Type: TABLE DATA; Schema: public; Owner: xerouser
--

COPY public.cashbook_entries (id, "referenceNo", date, "accountId", "entryType", amount, category, description, "linkedInvoiceId", "linkedPoId", "linkedExpenseId", "paymentMode", "chequeNo", notes, "createdBy", "branchId", "createdAt", "sourceType", "sourceId", "isReversed", "reversedById", "isPoOrphaned") FROM stdin;
a6821aee-59ff-4690-b8d4-bf741c03d20e	CBK-2026-00001	2026-08-21	4b228416-9ce8-4d78-89c2-7c90434d13bd	PAYMENT	200000.00	Vendor Purchase	Vendor payment: vendor (EXP-REQ-2026-0001)	\N	\N	\N	Cash	\N	Manager purchase payment request. PurchasePayment recorded in ven_inv (ID: 00c71456-022d-43c8-adc0-0907d08eecec). Cash held pending Finance approval.	54e43449-9b18-462d-aec6-112dbbc65d9b	3f791696-075c-4c28-bcc8-25074cd0a54f	2026-08-21 15:17:57.841713	\N	\N	f	\N	\N
b426edbc-6243-4b83-8351-9182bb3fd252	CBK-2026-00002	2026-08-21	9ad68db2-64d4-4b30-987a-e4ff1bb9007f	PAYMENT	1000.00	Expense	Employee expense: TEST MANAGER - TRAVEL	\N	\N	b35319c7-69af-41fc-8b84-c96c3ca24281	Cash	\N	\N	6cac7cd1-de80-4ec2-9f8b-d3c1db4f8fa3	24039cac-a975-4a63-97b0-1035e720f577	2026-08-21 16:17:30.032249	\N	\N	f	\N	\N
663bdc13-d255-4803-a208-c9d2f571773c	CBK-2026-00003	2026-08-21	6375d8b2-44b3-449e-99ef-87df85356a9c	PAYMENT	9000.00	Expense	Employee expense: TEST MANAGER - FUEL	\N	\N	4ac91c4b-b306-4a18-85f4-7f2cb7b72914	Bank Transfer	\N	\N	6cac7cd1-de80-4ec2-9f8b-d3c1db4f8fa3	24039cac-a975-4a63-97b0-1035e720f577	2026-08-21 16:18:09.258167	\N	\N	f	\N	\N
8675a339-846f-4d84-b6a2-58949579596f	CBK-2026-00004	2026-08-21	6375d8b2-44b3-449e-99ef-87df85356a9c	PAYMENT	500.00	Expense	Employee expense: TEST MANAGER - OFFICE_SUPPLIES	\N	\N	7638372c-ba44-499c-b21c-4db5264358e5	Bank Transfer	\N	\N	6cac7cd1-de80-4ec2-9f8b-d3c1db4f8fa3	24039cac-a975-4a63-97b0-1035e720f577	2026-08-21 16:19:54.505299	\N	\N	f	\N	\N
22c2013b-eb3a-41f1-a320-1f419e223a16	CE-SPAY-2026-0001	2026-08-21	4b228416-9ce8-4d78-89c2-7c90434d13bd	RECEIPT	2000.00	SALE_COLLECTION	Sale payment — QTN-2026-0001 (nadhil customer )	323dbba4-0669-43fd-aac9-efdec49ad33d	\N	\N	CASH	\N	\N	54e43449-9b18-462d-aec6-112dbbc65d9b	3f791696-075c-4c28-bcc8-25074cd0a54f	2026-08-21 16:46:23.863287	SALE_PAYMENT	093fa10f-87d2-4a95-87d2-8a90a4a01c33	f	\N	\N
eda04592-8c49-488d-8514-53384adbb61e	CE-SPAY-2026-0002	2026-08-21	1300c98f-5dba-4671-bb7c-d07df25c5377	RECEIPT	20000.00	SALE_COLLECTION	Sale payment — QTN-2026-0001 (nadhil customer )	323dbba4-0669-43fd-aac9-efdec49ad33d	\N	\N	BANK_TRANSFER	\N	\N	54e43449-9b18-462d-aec6-112dbbc65d9b	3f791696-075c-4c28-bcc8-25074cd0a54f	2026-08-21 16:54:45.398012	SALE_PAYMENT	2d64613f-44d4-4882-b3c5-ef942f1ce6f2	f	\N	\N
fbfc8f59-0c0d-433c-a47c-90b906f67bde	CHQ-CLR-CHQ738782-1787311681782	2026-08-21	1300c98f-5dba-4671-bb7c-d07df25c5377	RECEIPT	29450.00	Cheque Deposit	Cheque cleared — nadhil customer  #CHQ738782 · Invoice QTN-2026-0001	\N	\N	\N	Cheque	CHQ738782	\N	54e43449-9b18-462d-aec6-112dbbc65d9b	3f791696-075c-4c28-bcc8-25074cd0a54f	2026-08-21 16:58:01.782328	CHEQUE_CLEAR	3183628c-91b5-4e7a-a5fc-2e7a5d5ebd28	f	\N	\N
1c4f166b-7a42-4989-bd27-944e5d4e5fc7	CE-SPAY-2026-0004	2026-08-21	4b228416-9ce8-4d78-89c2-7c90434d13bd	RECEIPT	315.00	SALE_COLLECTION	Sale payment — QTN-2026-0002 (nadhil customer )	02b43c38-8df6-4423-acea-9bb0622a70ef	\N	\N	CASH	\N	\N	54e43449-9b18-462d-aec6-112dbbc65d9b	3f791696-075c-4c28-bcc8-25074cd0a54f	2026-08-21 17:51:19.183731	SALE_PAYMENT	d66788c6-7a5f-4a22-9dcf-f7f19db1c424	f	\N	\N
172bae29-c0d8-46ed-80a5-e590ac6c9b46	CE-SPAY-2026-0005	2026-08-21	4b228416-9ce8-4d78-89c2-7c90434d13bd	RECEIPT	3097.50	SALE_COLLECTION	Sale payment — QTN-2026-0002 (nadhil customer )	02b43c38-8df6-4423-acea-9bb0622a70ef	\N	\N	CASH	\N	\N	54e43449-9b18-462d-aec6-112dbbc65d9b	3f791696-075c-4c28-bcc8-25074cd0a54f	2026-08-21 17:59:24.548636	SALE_PAYMENT	8c514c83-f145-4185-bf01-74e9f5e88327	f	\N	\N
4b432253-e968-4d65-94fa-a03655e3cfa7	CE-SPAY-2026-0006	2026-08-21	4b228416-9ce8-4d78-89c2-7c90434d13bd	RECEIPT	300.00	SALE_COLLECTION	Sale payment — QTN-2026-0002 (nadhil customer )	02b43c38-8df6-4423-acea-9bb0622a70ef	\N	\N	CASH	\N	\N	54e43449-9b18-462d-aec6-112dbbc65d9b	3f791696-075c-4c28-bcc8-25074cd0a54f	2026-08-21 18:06:45.149179	SALE_PAYMENT	cf19e5f9-f6c0-497d-8fca-616b12e8b36a	f	\N	\N
83a8214d-cf95-4269-82c4-960c1001998b	CE-SPAY-2026-0007	2026-08-21	4b228416-9ce8-4d78-89c2-7c90434d13bd	RECEIPT	10000.00	SALE_COLLECTION	Sale payment — QTN-2026-0003 (nadhil customer )	06bcfd35-e97f-465a-ad8c-e95c7c7639e1	\N	\N	CASH	\N	\N	54e43449-9b18-462d-aec6-112dbbc65d9b	3f791696-075c-4c28-bcc8-25074cd0a54f	2026-08-21 22:16:46.922355	SALE_PAYMENT	46e8785a-0613-49d2-be6e-0204e4eff0c9	f	\N	\N
5dec1cb4-0a94-4e25-b233-5bc0037bf8cc	CE-SPAY-2026-0008	2026-08-21	4b228416-9ce8-4d78-89c2-7c90434d13bd	RECEIPT	10000.00	SALE_COLLECTION	Sale payment — QTN-2026-0003 (nadhil customer )	06bcfd35-e97f-465a-ad8c-e95c7c7639e1	\N	\N	CASH	\N	\N	54e43449-9b18-462d-aec6-112dbbc65d9b	3f791696-075c-4c28-bcc8-25074cd0a54f	2026-08-21 22:17:43.41598	SALE_PAYMENT	2c85cea3-641e-4154-94f9-441850282153	f	\N	\N
ca38bf75-be3e-43b6-b578-f0f86f71c539	CHQ-CLR-CHQ13243-1787330981759	2026-08-21	1300c98f-5dba-4671-bb7c-d07df25c5377	RECEIPT	212.50	Cheque Deposit	Cheque cleared — nadhil customer  #CHQ13243 · Invoice QTN-2026-0003	\N	\N	\N	Cheque	CHQ13243	\N	54e43449-9b18-462d-aec6-112dbbc65d9b	3f791696-075c-4c28-bcc8-25074cd0a54f	2026-08-21 22:19:41.759355	CHEQUE_CLEAR	8f888eea-c7ff-4b12-8a83-8bfb9549c105	f	\N	\N
152f67b4-c55a-4e5b-a8c3-1986db462270	CE-SPAY-2026-0010	2026-08-21	4b228416-9ce8-4d78-89c2-7c90434d13bd	RECEIPT	2771.25	SALE_COLLECTION	Sale payment — QTN-2026-0002 (nadhil customer )	02b43c38-8df6-4423-acea-9bb0622a70ef	\N	\N	CASH	\N	\N	54e43449-9b18-462d-aec6-112dbbc65d9b	3f791696-075c-4c28-bcc8-25074cd0a54f	2026-08-21 22:20:29.080278	SALE_PAYMENT	6864ede9-4f15-4831-a210-7395a8db417c	f	\N	\N
f4385b9b-27dd-4618-81b8-f5f354c89b18	CE-SPAY-2026-0011	2026-08-21	4b228416-9ce8-4d78-89c2-7c90434d13bd	RECEIPT	2620.80	SALE_COLLECTION	Sale payment — QTN-2026-0002 (nadhil customer )	02b43c38-8df6-4423-acea-9bb0622a70ef	\N	\N	CASH	\N	\N	54e43449-9b18-462d-aec6-112dbbc65d9b	3f791696-075c-4c28-bcc8-25074cd0a54f	2026-08-21 22:22:15.068476	SALE_PAYMENT	74cafbac-f5fe-4771-8c84-bf4119b4f553	f	\N	\N
d6f39ccc-30af-444b-b90d-fada85940d7f	CBK-2026-00016	2026-08-21	1300c98f-5dba-4671-bb7c-d07df25c5377	PAYMENT	2000.00	Expense	Employee expense: RIYAS  BRANCH MANAGER - TRANSPORT	\N	\N	3b340b16-cc06-44c9-9541-0d28e2f7b156	Bank Transfer	\N	\N	54e43449-9b18-462d-aec6-112dbbc65d9b	3f791696-075c-4c28-bcc8-25074cd0a54f	2026-08-21 22:32:07.578045	\N	\N	f	\N	\N
c893de90-a250-4d37-8968-86780ab38711	CE-SPAY-2026-0014	2026-08-21	4b228416-9ce8-4d78-89c2-7c90434d13bd	RECEIPT	88471.95	SALE_COLLECTION	Sale payment — QTN-2026-0002 (nadhil customer )	02b43c38-8df6-4423-acea-9bb0622a70ef	\N	\N	CASH	\N	\N	00000000-0000-0000-0000-000000000001	3f791696-075c-4c28-bcc8-25074cd0a54f	2026-08-22 02:12:11.487396	SALE_PAYMENT	a7db7066-9eeb-4844-b5e5-5e04fb84e16e	f	\N	\N
\.


--
-- Data for Name: chart_of_accounts; Type: TABLE DATA; Schema: public; Owner: xerouser
--

COPY public.chart_of_accounts (id, "accountNumber", "accountName", category, "accountGroup", "parentAccountId", "sourceType", "isSystemDefault", "linkedCashBankAccountId", "categoryKey", "isActive", "createdBy", "createdAt", "updatedAt") FROM stdin;
b2eb9f02-9821-49bb-8e4e-90f87ab5d2a9	1001	Cash in Hand	ASSET	CURRENT_ASSET	\N	SYSTEM	t	\N	\N	t	\N	2026-08-15 15:17:10.144081	2026-08-15 15:17:10.144081
924d29ed-d360-4b76-826a-8815caa6fbf6	1002	Cash at Bank	ASSET	CURRENT_ASSET	\N	SYSTEM	t	\N	\N	t	\N	2026-08-15 15:17:10.144081	2026-08-15 15:17:10.144081
dec3827b-16f1-4774-a5e1-8da3e1aeca34	1003	Accounts Receivable	ASSET	CURRENT_ASSET	\N	SYSTEM	t	\N	\N	t	\N	2026-08-15 15:17:10.144081	2026-08-15 15:17:10.144081
165cf5bd-e20c-43f8-a3b0-8dfa0ff8ec61	1004	Security Deposits Receivable	ASSET	CURRENT_ASSET	\N	SYSTEM	t	\N	\N	t	\N	2026-08-15 15:17:10.144081	2026-08-15 15:17:10.144081
7a22400d-76dd-42d7-82c4-8da41b06a027	1005	Prepaid Expenses	ASSET	CURRENT_ASSET	\N	SYSTEM	t	\N	\N	t	\N	2026-08-15 15:17:10.144081	2026-08-15 15:17:10.144081
bb57a61f-af02-4bc4-94cd-52bfb001b8d2	1006	Spare Parts Inventory	ASSET	CURRENT_ASSET	\N	SYSTEM	t	\N	\N	t	\N	2026-08-15 15:17:10.144081	2026-08-15 15:17:10.144081
5a17052e-eae3-459a-a59b-d94f7eb138ab	1007	Equipment Gross Cost	ASSET	NON_CURRENT_ASSET	\N	SYSTEM	t	\N	\N	t	\N	2026-08-15 15:17:10.144081	2026-08-15 15:17:10.144081
61aedb3a-3e94-4927-99fa-30cc7536f243	1008	Accumulated Depreciation	ASSET	NON_CURRENT_ASSET	\N	SYSTEM	t	\N	\N	t	\N	2026-08-15 15:17:10.144081	2026-08-15 15:17:10.144081
da28661a-7663-4ea1-af47-9a3f74309622	1009	Product Inventory	ASSET	CURRENT_ASSET	\N	SYSTEM	t	\N	\N	t	\N	2026-08-15 15:17:10.144081	2026-08-15 15:17:10.144081
43146c69-e0ca-4765-bfb4-67da46846fe7	2001	Accounts Payable	LIABILITY	CURRENT_LIABILITY	\N	SYSTEM	t	\N	\N	t	\N	2026-08-15 15:17:10.144081	2026-08-15 15:17:10.144081
cb8af93d-cace-43be-b0fe-2be657a2f161	2002	Accrued Expenses	LIABILITY	CURRENT_LIABILITY	\N	SYSTEM	t	\N	\N	t	\N	2026-08-15 15:17:10.144081	2026-08-15 15:17:10.144081
70e163e9-dd43-4514-b3df-8b7ce6a0f2c8	2003	VAT Payable	LIABILITY	CURRENT_LIABILITY	\N	SYSTEM	t	\N	\N	t	\N	2026-08-15 15:17:10.144081	2026-08-15 15:17:10.144081
667bbf83-262b-4ea4-801f-b0053b641007	2004	Security Deposits Received	LIABILITY	CURRENT_LIABILITY	\N	SYSTEM	t	\N	\N	t	\N	2026-08-15 15:17:10.144081	2026-08-15 15:17:10.144081
1d9145bf-966b-47cf-8514-7ceed0e4775c	2005	Deferred Revenue	LIABILITY	CURRENT_LIABILITY	\N	SYSTEM	t	\N	\N	t	\N	2026-08-15 15:17:10.144081	2026-08-15 15:17:10.144081
20358992-b58a-4b85-b002-c9410bb0d5ee	2006	Salary Payable	LIABILITY	CURRENT_LIABILITY	\N	SYSTEM	t	\N	\N	t	\N	2026-08-15 15:17:10.144081	2026-08-15 15:17:10.144081
07a20a24-62b1-4273-88e0-fa51b05737e6	3001	Owner's Capital	EQUITY	EQUITY	\N	SYSTEM	t	\N	\N	t	\N	2026-08-15 15:17:10.144081	2026-08-15 15:17:10.144081
43def381-16b5-4243-bf09-acf98aebcbf3	3002	Retained Earnings	EQUITY	EQUITY	\N	SYSTEM	t	\N	\N	t	\N	2026-08-15 15:17:10.144081	2026-08-15 15:17:10.144081
260f6fbc-3982-495b-a642-ae4541e8850b	3003	Reserves	EQUITY	EQUITY	\N	SYSTEM	t	\N	\N	t	\N	2026-08-15 15:17:10.144081	2026-08-15 15:17:10.144081
e3b3fbb7-71e2-4d61-9c65-4fd0576e9613	3004	Less: Withdrawals	EQUITY	EQUITY	\N	SYSTEM	t	\N	\N	t	\N	2026-08-15 15:17:10.144081	2026-08-15 15:17:10.144081
364f256a-0df9-4b5f-8d86-7e041a38f24f	3005	Less: Dividends	EQUITY	EQUITY	\N	SYSTEM	t	\N	\N	t	\N	2026-08-15 15:17:10.144081	2026-08-15 15:17:10.144081
b893a397-387b-4636-a121-303a42cb3d0c	4001	Rental Revenue	INCOME	INCOME	\N	SYSTEM	t	\N	\N	t	\N	2026-08-15 15:17:10.144081	2026-08-15 15:17:10.144081
2f741257-ad7a-4720-b4ef-398244c789ee	4002	Lease Revenue	INCOME	INCOME	\N	SYSTEM	t	\N	\N	t	\N	2026-08-15 15:17:10.144081	2026-08-15 15:17:10.144081
411795a3-664e-4e57-8b42-e1b4a926749c	4003	Sales Revenue	INCOME	INCOME	\N	SYSTEM	t	\N	\N	t	\N	2026-08-15 15:17:10.144081	2026-08-15 15:17:10.144081
fefb8edb-039a-44e0-b8ec-cb536e6b4db5	4004	Service Revenue	INCOME	INCOME	\N	SYSTEM	t	\N	\N	t	\N	2026-08-15 15:17:10.144081	2026-08-15 15:17:10.144081
e4679f4d-3dd6-4517-ae35-9264d19ecfcd	4005	Usage / Copy Revenue	INCOME	INCOME	\N	SYSTEM	t	\N	\N	t	\N	2026-08-15 15:17:10.144081	2026-08-15 15:17:10.144081
cd96859b-3917-45e1-bec9-a43acc3f0191	4006	AMC / SMA Revenue	INCOME	INCOME	\N	SYSTEM	t	\N	\N	t	\N	2026-08-15 15:17:10.144081	2026-08-15 15:17:10.144081
222ed652-4aab-4cf4-b2bf-26b7b561f5f2	4007	Spare Part Sales	INCOME	INCOME	\N	SYSTEM	t	\N	\N	t	\N	2026-08-15 15:17:10.144081	2026-08-15 15:17:10.144081
9a0f94e1-4acb-4632-8a1b-defbf896714a	4008	Other Income	INCOME	INCOME	\N	SYSTEM	t	\N	\N	t	\N	2026-08-15 15:17:10.144081	2026-08-15 15:17:10.144081
7d54e0a9-9251-4d57-9c80-7f1e20bdffcb	5001	Cost of Parts	EXPENSE	EXPENSE	\N	SYSTEM	t	\N	\N	t	\N	2026-08-15 15:17:10.144081	2026-08-15 15:17:10.144081
c2aa17e3-0b04-4c3c-a47c-87df22628284	5002	Labour Cost	EXPENSE	EXPENSE	\N	SYSTEM	t	\N	\N	t	\N	2026-08-15 15:17:10.144081	2026-08-15 15:17:10.144081
ba5ca400-8bcf-4598-ac5b-31a4574e1ac4	5003	Depreciation Expense	EXPENSE	EXPENSE	\N	SYSTEM	t	\N	\N	t	\N	2026-08-15 15:17:10.144081	2026-08-15 15:17:10.144081
f466d72b-0042-4342-b08d-2cc3acb948bb	5004	Vendor Purchases	EXPENSE	EXPENSE	\N	SYSTEM	t	\N	\N	t	\N	2026-08-15 15:17:10.144081	2026-08-15 15:17:10.144081
96b6bb6c-8de3-4a20-a783-39f10039da1c	5005	Shipping & Handling	EXPENSE	EXPENSE	\N	SYSTEM	t	\N	\N	t	\N	2026-08-15 15:17:10.144081	2026-08-15 15:17:10.144081
a7f88496-ccca-4994-90a3-c55b9ee396fc	5006	Salary Expense	EXPENSE	EXPENSE	\N	SYSTEM	t	\N	\N	t	\N	2026-08-15 15:17:10.144081	2026-08-15 15:17:10.144081
579d4413-306f-4b6b-874b-a264f4db9512	5007	Travel Expense	EXPENSE	EXPENSE	\N	SYSTEM	t	\N	\N	t	\N	2026-08-15 15:17:10.144081	2026-08-15 15:17:10.144081
6a8b56bb-3397-4359-aed6-2a9f4c34cdaf	5008	Rent Expense	EXPENSE	EXPENSE	\N	SYSTEM	t	\N	\N	t	\N	2026-08-15 15:17:10.144081	2026-08-15 15:17:10.144081
e48b3028-7db4-4fc4-ac2f-84968715cb7f	5009	Utilities Expense	EXPENSE	EXPENSE	\N	SYSTEM	t	\N	\N	t	\N	2026-08-15 15:17:10.144081	2026-08-15 15:17:10.144081
fe4aba9a-7234-4b8e-a4d4-be2e5dfe1c29	5010	Marketing Expense	EXPENSE	EXPENSE	\N	SYSTEM	t	\N	\N	t	\N	2026-08-15 15:17:10.144081	2026-08-15 15:17:10.144081
a59bdd04-ab2f-488b-a96c-721a3aea3aad	5011	Maintenance Expense	EXPENSE	EXPENSE	\N	SYSTEM	t	\N	\N	t	\N	2026-08-15 15:17:10.144081	2026-08-15 15:17:10.144081
82076ac5-18a4-4c0f-b9b7-b0cb563535d3	5012	Insurance Expense	EXPENSE	EXPENSE	\N	SYSTEM	t	\N	\N	t	\N	2026-08-15 15:17:10.144081	2026-08-15 15:17:10.144081
bd4ddf59-4f49-4e78-b824-159312c574c4	5013	Other Expenses	EXPENSE	EXPENSE	\N	SYSTEM	t	\N	\N	t	\N	2026-08-15 15:17:10.144081	2026-08-15 15:17:10.144081
2c7f90d4-3008-46fa-b5a6-51c9f13e9b77	5014	Import / Purchase Labour Cost	EXPENSE	EXPENSE	\N	SYSTEM	t	\N	\N	t	\N	2026-08-15 15:17:10.144081	2026-08-15 15:17:10.144081
caac54de-3334-4de0-86cf-3eaa6b2a124c	5015	Customs Duty	EXPENSE	EXPENSE	\N	SYSTEM	t	\N	\N	t	\N	2026-08-15 15:17:10.144081	2026-08-15 15:17:10.144081
\.


--
-- Data for Name: cheque_status_history; Type: TABLE DATA; Schema: public; Owner: xerouser
--

COPY public.cheque_status_history (id, cheque_id, from_status, to_status, notes, changed_by, changed_at) FROM stdin;
fd3b9d15-1d90-4b44-812d-78d69521c11b	3183628c-91b5-4e7a-a5fc-2e7a5d5ebd28	PENDING	DEPOSITED		54e43449-9b18-462d-aec6-112dbbc65d9b	2026-08-21 16:57:56.90838
a06d0459-20e7-42d9-8e94-2dc3953922e6	3183628c-91b5-4e7a-a5fc-2e7a5d5ebd28	DEPOSITED	CLEARED		54e43449-9b18-462d-aec6-112dbbc65d9b	2026-08-21 16:58:01.782328
189c5540-1f1b-4bd0-8b7f-cbd28d499d78	8f888eea-c7ff-4b12-8a83-8bfb9549c105	PENDING	DEPOSITED		54e43449-9b18-462d-aec6-112dbbc65d9b	2026-08-21 22:19:38.146449
12131967-0809-497e-9258-4668446f027d	8f888eea-c7ff-4b12-8a83-8bfb9549c105	DEPOSITED	CLEARED		54e43449-9b18-462d-aec6-112dbbc65d9b	2026-08-21 22:19:41.759355
\.


--
-- Data for Name: cheques; Type: TABLE DATA; Schema: public; Owner: xerouser
--

COPY public.cheques (id, cheque_no, bank_name, party_name, amount, due_date, issue_date, type, status, description, branch_id, account_id, cashbook_entry_id, created_by, created_at, updated_at, source_type, source_reference_id, source_label, invoice_no, cheque_date, deposit_date, cleared_date) FROM stdin;
3183628c-91b5-4e7a-a5fc-2e7a5d5ebd28	CHQ738782	RAKBANK (National Bank of Ras Al Khaimah)	nadhil customer 	29450.00	2026-08-21	2026-08-21	RECEIVED	CLEARED	Sale payment — QTN-2026-0001 (nadhil customer )	3f791696-075c-4c28-bcc8-25074cd0a54f	1300c98f-5dba-4671-bb7c-d07df25c5377	fbfc8f59-0c0d-433c-a47c-90b906f67bde	54e43449-9b18-462d-aec6-112dbbc65d9b	2026-08-21 16:57:27.059228	2026-08-21 16:58:01.782328	SALE	323dbba4-0669-43fd-aac9-efdec49ad33d	Invoice QTN-2026-0001	QTN-2026-0001	2026-08-21	2026-08-21	2026-08-21
8f888eea-c7ff-4b12-8a83-8bfb9549c105	CHQ13243	DAIRA BANK	nadhil customer 	212.50	2026-09-11	2026-08-21	RECEIVED	CLEARED	Rent payment — QTN-2026-0003 (nadhil customer )	3f791696-075c-4c28-bcc8-25074cd0a54f	1300c98f-5dba-4671-bb7c-d07df25c5377	ca38bf75-be3e-43b6-b578-f0f86f71c539	54e43449-9b18-462d-aec6-112dbbc65d9b	2026-08-21 22:19:15.890454	2026-08-21 22:19:41.759355	RENT	06bcfd35-e97f-465a-ad8c-e95c7c7639e1	Invoice QTN-2026-0003	QTN-2026-0003	2026-08-21	2026-08-21	2026-08-21
\.


--
-- Data for Name: contract_agreements; Type: TABLE DATA; Schema: public; Owner: xerouser
--

COPY public.contract_agreements (id, "agreementNumber", "invoiceId", "branchId", "contractDate", "customerName", "customerAddress", "customerPhone", "customerEmail", "customerVatNumber", "createdByEmployeeId", "createdByEmployeeName", "dealerName", "dealerAddress", "dealerPhone", "employeeSignatureData", "employeeSignedById", "employeeSignedByName", "employeeSignedAt", "customerSignatureData", "customerSignedMethod", "customerSignedByName", "customerSignedAt", "signingToken", "signingTokenExpiresAt", "signingTokenUsed", "signatureStatus", "termsAndConditions", "createdAt", "updatedAt", "customerSignedDocumentUrl", "customerSignedDocumentNote") FROM stdin;
154aec8c-8dba-43ec-b358-ff2e2d13a0f9	CA-2026-002	06bcfd35-e97f-465a-ad8c-e95c7c7639e1	3f791696-075c-4c28-bcc8-25074cd0a54f	2026-08-21	nadhil customer 	\N	\N	\N	\N	4ad3cdfb-86a4-407a-b502-15a97c9f92ec	RIYAS EMPLOYEE MANAGER	Xerocare	\N	\N	data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAZAAAACgCAYAAAAisjrVAAAQAElEQVR4AexdB3hUVRo9QxEUwbKWRaWIlEhQQFroHWmR3gk1AWmhQ+hRSuhNeiiBUAy9JPReAgSkCUiTZl/XBYyKQIC959fwRSB9ZpKZ+fl8b2beu/Xc+M77603zUP8pAoqAIqAIKAJJQCAN9J8ioAgoAoqAIpAEBJRAkgCaVlEErIKANqIIODgCSiAOvoA6fEVAEVAEUgoBJZCUQl77VQQUAUXAwRFwYAJxcOR1+IqAIqAIODgCSiAOvoA6fEVAEVAEUgoBJZCUQl77VQQcGAEduiJABJRAiIIeioAioAgoAolGQAkk0ZBpBUVAEVAEFAEioARCFOx9aH+KgCKgCDgBAkogTrCIOgVFQBFQBFICASWQlEBd+1QEFIGUQkD7tSICSiBWBFObUgQUAUXAlRBQAnGl1da5KgKKgCJgRQSUQKwIpis0pXNUBBQBRSAaASWQaCT0UxFQBBQBRSBRCCiBJAouLawIKAKKQEohkPr6VQJJfWuiI1IEFAFFwCEQUAJxiGXSQSoCioAikPoQUAJJfWuiI7INAtqqIqAIWBkBJRArA6rNKQKKgCLgKggogbjKSus8FQFFQBGwMgIJJhAr96vNKQKKgCKgCDg4AkogDr6AOnxFQBFQBFIKASWQlEJe+1UEEoyAFlQEUicCSiCpc110VIqAIqAIpHoElEBS/RLpABUBRUARSJ0IuAKBpE7kdVQOicC1a99g48YdmDBhJsqU8ZRj+vT5OHAgArdv/+mQc9JBKwJJRUAJJKnIaT2nRuDu3bs4fvxLLFmyCgMHjkL9+m2RO3cJlCpVGz4+vTBx4ixcuXJdjlGjpqBxYx/kyeOBatUao2/fT7B06WqcPXseDx8+dGqcdHKujYASiGuvv87eIPDTTz9j5879oCTRqVM/VK7cELlyFUft2i3Rr9+nWLgwBIcPHxMJI0uWzChZsig6dPCCv39fDB3aG61aNUb+/PmQJo0FZ86cF/IgiVSt2lhIpUmTDhg7djq2bt2NmzdvmR5d6D+dqlMjoATi1Murk4uJwP37D3Du3CWsXh2GESMmoVmzj1GwYEV88EEVeHl1ASWJ9eu3mDIXpVrOnNlRq1YVQyJdEBQ0FRERm/HVV/uxcuU8DBvWx0giLdGxYysEBAzCtm3LcenSYaxfvwifftofDRrUwjvv5MSff97B/v2HMWXKHLRt2x3u7uUMAdVEly5+mDt3iUg59+7dk/70pAg4GgJKII62YjreBCOwZ084AgMXo1evYahZs7mRKooZ6aIBunUbiJkzg7B370H897//wzPPPIMiRQqiRYsGhkQGYu3ahbh48ZCxa2zAnDkT0L17B1StWh5vvpk1zr6j22nfvjmmTh1l2l9nyOgAli8PNGqw7mYMlfHGG//G9evfmT42GRIaK1JOnjwl5XPo0DFy/dq1b+PsR28qAqkFgTSpZSA6jqchoNeSggBVUt7ePdG8eSejZhqHkJC1OHnyDKKiovD666+iUqUy8PX1NuQyEXv2rMXlyxEiOYwdOxStWzdBsWKF8OyzGZPS9RN1nn8+E0qXLm4kjnbS35EjW3Dq1G6jFvsMPXt2lLFkzpxJJJF585aacn7GzlIL779fwYylmyGiQOzbd8gQ0V9S0RMd6AVFIAURUAJJQfC1a+sicOvWr0Z9NAEeHjWxadNOWCwWlCjxAQYP7mlIZI6on44d247g4Ono37+bSAS5c78t5aw7krhb+9e/XkKVKuXQp09nGcuXX+7BwYMbMWvWOHTu3NaMv4iovrZv34sxY6ahadOORnJqaMbbHJGRv8XduN5VBOyIgBKIHcHWrmyDwJ07d8QATuKYPXsRaFOoW7eGPJRXr16ATp3aoEyZEqAB3DYjSH6r2bO/CU/Pahg0qAdWrZqP8+fDsWPHSkya9KlRb1UVkqMUValSAyPBnE1+h9pCvAhogfgRUAKJHyMtkUoRoFGc7rJ0raUB/NdfI1G+fEls2RJiCGU0smV7I5WOPP5hWSwWuLnlQePGdTB79nhs3Roi8/n++x9Rp05rI7msiL8RLaEI2BgBJRAbA6zN2wYBqqgqVaovMRc//vgfuLvnE++opUtnyXfb9JpyrdJNeMeOVahevRIYo+LnNwIdOvQRVVfKjUp7dnUElEBc/S/AVvO3UbtHjpwwKp2WoJH80qUryJkzu9gOKHUwPsNG3aaKZjNleg7z5k3CyJEDxHMsLGybIZSmEsyYKgaog3A5BJRAXG7JHXPCjN9o1aor6tZtLR5Lr732isRf0IuKtgOLxeKYE0vCqNu0aYqwsMWi0rp48bJEvzNIMQlNaRVFIFkIpElWba2sCNgYAer8u3cfjKpVGxmj8j7Q5bVfvy5iIGcEeLp0aW08gtTZfEyV1h9/3JYgRX//cYiKup86B6yjsicCdutLCcRuUGtHiUHgxo2b8Pcfj9KlPY1tYwPSpk0rkd90d2VgX8aMGRLTnFOWjVZpjR49GBkyZACDJuvWbYX//Oe/TjlfnVTqQ0AJJPWtiUuPiKk/pk4NlHQfgYHB5o06Cg0b1kZ4eKghlL546aUXXRqfp03ey6sRQkODkSPHW0a9dxoeHjWwefPOpxXVa4qAVRFQArEqnNpYUhGg6iU4eIUQB4PnIiN/R6VKZbFt2wpMmTJSUoAkte3E1nPE8lRpEauiRQvhzp276NPnE/XQcsSFdLAxK4E42II543BDQ7eiQoW6oGsq1S8FC7qD+aiCg6fBzS23M07ZJnOiSmvduoUoUMANVAEGBEyxST/aqCIQjYASSDQS+ml3BA4ePCrpOTp27CuuqLlzv425cydh48alko/K7gNykg7nzZsM2oiYW+vEidNOMiudRmpEwPoEkhpnqWNKVQicOXMezZt/bGwb7SXJ4b///RrGjRuGnTtXo0aNSqlqrI44mLfeyiq5vriZVZcuAyS1iyPOQ8ec+hFQAkn9a+RUI2zevJPELezZc1ByUw0c2F0M5M2b10fatPrnaK3F9vFpicKFC+Dq1euSkNFa7Wo7ikBMBPT/2Jho6HebIcC34UGDArBnT7j0wRiOQ4c2okuXduKCKhf1lFwEHtW3WCyYNi0A6dOnx5w5i0Cp79FN/aIIWAkBJRArAanNxI5AVFQUOnTojaCgz5EuXTowboG7+L3wQpbYK+mdZCOQM2d29O7dCUw62bWrH6I0yDDZmGoD/0RACeSfeOgvKyPAKGluHbtx4w4899yzWLZsFhi3YOVutLlYEOD+Iu7u+XDhwmVMnDgrllJ6WRFIGgJKIDFw06/WRYCupPXqtTE2jiMSALhmTRBKlSpm3U60tTgRoF1p2rTRRvJLa1Rac1WVFSdaejOxCCiBJBYxLZ8gBJjDqnZtL5w+fU6CABkpzfiEBFXWQlZFIG/eXGD6F1VlWRVWbcwgoARiQND/rIsA06zXqtVCPIAY2xEWtgTUx1u3F20tMQj4+vqAREJV1rRp8xJT1U5ltRtHREAJxBFXLRWPmRKHp6eXJPSjG+mGDcFg6vVUPGSXGBqzFlOVZbFYMG7cdOzefcAl5q2TtC0CSiC2xdelWg8PPwLaPKK3ll25cr7EergUCKl4sjSme3gUkREGBYXIp54UgeQgoASSHPRST90UHwm9rOhtRa+rOnWqY9Gi6ZJOI8UHpgP4BwIzZoxBmjRpsGvXfpES/3FTfygCiURACSSRgGnxJxFYsmSVxHlERUWhbdtmmD79L6+fJ0vqlZRGgOrEmjWrSEzI0qWrU3o42r+DI6AE4uALmNLDpz69X79PwUjz/v27YcQIP1gsrrO9bErjn5T+27RpItUWLgzBgwcP5LuekoGAC1dVAnHhxU/O1EkYJI7Jk+eISmTy5OHw9fVOTpNa104IlCxZVDyymDp/06YddupVu3FGBJRAnHFVbTwnqqqYmoSqq2eeeQYLFkxBo0Yf2bhXbd6aCLRr11yaW7Dgc/nUkyKQFASUQJKCmgvXoZGcxnIazZ9/PhOWLw9ElSrlkoGIVk0JBBo29ETmzJnAPVkYG5ISY9A+HR8BJRDHX0O7zSBmapJXXnkZ3P2uWLFCdutfO7IeAs8+m/GR1LhgwTLrNawtuRQCSiAutdxJn2zM1CTZsr2B0NAlcHPLk/QGtWaKI+Dt3ULGsGLFety+/ad815NrIZDc2SqBJBdBF6gfMzUJSYPkQRJxgak79RRz5MiGsmU9hDw+/3yNU89VJ2cbBJRAbIOr07R64sRpRKcmobqKaiuqr5xmgi4+kTZ/u/QGBi5xcSR0+klBQAkkKai5SJ09ew6iQYN2iE5NQoM5DecuMv34p+kEJapVqyDZkq9d+wb79x92ghnpFOyJgBKIPdF2oL7WrduMVq264M8/7yA6NQlddh1oCjrUBCDAtCatWjWWkkFB6tIrQOgpwQgogSQYKtcp2K5dD3Tu3F/SXXTs2EpTkzj50rds2QBp06bF5s27cP36d04+W52eNRFIQQKx5jS0LWshsHp1GLZs2SXNDRrUA0OH9tbUJIKG855eeulFvPNOTklHM2fOIuedqM7M6ggogVgdUsdtkKktBg4cKRNo0qSOkULaync9OT8CNWtWlklmyJBBPvWkCCQEASWQhKDkImWotoqM/B1FixbChAmfuMisXXOaj886X77ccumbb1SFJUDoKUEIKIEkCCbnL8RoZKa1YHqLGTNGq9rK+Zf8HzPMnv1N+X3t2rfyqSdFICEIKIEkBCUnL0MXzuHDJ8ksR4wYiDffzCrfHfX03Xc/oGfPoWjRojOGDBmT5KN798GoV68tjh494fRpz7Nnf0uWW43oAoOeEoiAEkgCgfpHMSf6wf0gPv64H+7cuYMPP6yIhg1rO9zs6Gq8Y8c++PuPR8WK9VC8eHUsX74Ou3cfwPz5S5N8rFy5ARERx1CnTmsUKFAeJJT167eAaj6HAymeAb/88oug/YMxP5GRv8VTWm8rAn8hoATyFw4ue546dS5OnTqLf/3rJUya9KnD4HD27HnMnBmExo198M47xdGqVVcEBgYjOrPsu+/mNQ/+6hg+vH+Sj65d2+H99/MjS5bMuHXrV5BQOnXqB3f3MoZo22P27EW4ePGyw2AW30Dffju7FFE1lsCgpwQgoASSAJCctchXX10wpDFLpjd16ii88EIW+Z4aTzdv3sKaNRtFCihcuDKqVm2MESMm4cCBCBku8zq1bt0E3Jvk4sVD2L59BWbMGAPue5HUY8CA7ti0aRlOn96LVavmi1da3ry5cP/+A0mD/umnE1ChQj2UKlUbQ4eOwd69B8G9UmRADnhyEDuIAyLrvENWAnHetY1zZvfu3QNVV1FR98EHb4UKpeIsb++bHBeN+qNHT0WNGs1EhdS16wCRAuhuzJQqVLkFBAwyaqbNCA8PxahRA8HUHM8996xVh5s2bRp4eBQB42J27VqDQ4c2GanGz5BHKaRLlw60Ic2btxTcJyV37hJGOvGWCH6rDsIOjeXI8ZcdRD2x7AC2jLVLYQAAEABJREFUk3ShBOIkC5nYaYwaNQXMspsjRzYMG9Y7sdVtUv7q1etYuDAEbdt2N2qisuZB3B6ffTZPVGwWiwUFC7rD19dHpIEzZ/YZ28Zko7pqbHejPzMRt2vXDEuWzMS5cwcwb94kNG9eH0wyee9elJFOjqBEierm/iqRVmwClg0azZbtL08sNaTbAFwnbVIJxEkXNrZp8Tq9igIDFyNNmjSYNWusGE953d7H77//IVHvAwaMNGqgWihd2hMDB47C1q278dtvv+O1116RTY+mTx+NL7/cjY0bl6J//64iDaRLl9bew31qf9yYqXr1Shg3bhhOntyFKVNGIn/+vPjvf/+Hfv0+RaVK9Y0abOdT66a2i9EqLJVAUtvKpN7xKIGk3rWxycj++OO20eX7SdqKnj07ipHYJh09pdGHDx+ah+wZTJ0aiPr125oHbRljo+iBRYuWGzXQt2CyRu5PMWRIL+zYsRLHj+/A5MnDUbduDbz44gtPaTH1XaIX27ZtKwwxjwOlO0p53t49Ubt2SzOfL1PfgGOMKFoCUSN6DFD0a5wIKIHECY/z3Rw8eDQYJ0Hvoh49Oth8gnwTp0ttly5+hqwqoGbN5hgzZhoOHz5mDM73kSdPLvj4tMTixTOMOmg/Pv98trHNtHb43Q49PasZo/paY+j3Ew+348e/FBLx8ellyPKbROP+ww8/YdeuA+L5RfJ1dy8rtqE6dVqBR/78ZVGs2Ify/dChLxLdPiu8/XY2fuDy5WvyqSdrI+B87aVxvinpjGJDYPfucISErBWVFVVXVGHFVjap1+/evYt9+w4ZI/NEVK7c0NgtKkpQ39q1m/C//90UT6/atauJyufYse3YvXsN/P37omLF0jKupPabGuvRwN62bTNj4A9DD0PWNO5v3LgD5crVgZ/fCPzyy40nhs0YDBJAUNDnUob7sbi5lULRotXQsmVn0POL5Hvz5q9iGzp69CR40M34++9/lO9ffvnVE+0m5MKBA0ekmMViEQlVfuhJEYgDASWQOMBxplt8wPj6DpQp+fv3EfWK/LDC6eLFy6BNhQ+4d98tg6ZNOxoVzkIjUVwEPZiKFCmI3r07YcOGYJw+vce8RY8To/Prr79qhd5TfxP0GOvbt4sQiZdXIzx48BDBwSsMKVQ1Nh5vIdvmzT8G3ZPd3ErLJl6DBgVIGZJJZOTvyJTpOXP/PTRrVs8Qbh+MH++PdesWPTomTx6BZctmy29KdIlFhX8fPXoMlmpjxw7VVDaChJ7iQ0AJJD6EnOQ+U3vwjZfuutEbCCVnal99dVEefnzoVajAh9o4UbEwKpzGb/YxZ854nD27H+vXL0KvXh/jgw/eF8N9Evt12Gr0LtuwYatIYjRQZ836mszl7t17hlSOCNnu2XMQdE+m1OLmlkfsPoxDCQqaioMHN+LChYMIDV0sxOHj4yVEUrRoQUNCfx2NGnkaycZDfkvjiTwxyp5/H/Xr15K2E1ldi7soAkogLrDwjKDmHh8MFGTAYHKmTDUU1SgffthEHn586DEFRqVKZfHJJ/2wc+dqYyzegYCAQahVqyr49p2c/hytLtVHy5atwZAho1GvXhvky1cKpUt7GrtOX0Ow+43KLtzYoH6UN/zMmZ+X6XFdKEEw+PHy5SPiQEDPM0bCV61aHtHeUVLYBqelS1dj27Y94vU2atQgG/SgTTorAkogzrqyf8+LD/jBgwPkF1OVMGWJ/EjkiZHgDOorUaK6UUEtwv3795E/fz4sXTrLGF0jjLplGry9WyBfvncS2bJjFo+M/E0IlKo7vr1XqdIIb75ZENWrN0WfPv6YP38ZIiKOizsyU6EwRT5VeX5+3RAWthRff33YqPgOoGTJopImJSLiGJh+hSo/eyJCj6thw8YKoTFyn9mY7dm/9uUgCMQyTCWQWIBxlsvRe3w0bOgpyRITOy8Sx5gxn6FEiRoS1Hf79p8iWTAie9u25ShfviSs8e/u3Sh5+NJLzBrtWbMNeq1Rgps4cRbat+8JD48aoK2iUSNvY48YJ9HxX311Qbp8662sZh6VxOYzf/5kHD68GV99td/YJhaKKq9bN28UKuT+yGGAD21KINFSgDRip9ODBw/QsWMf0LW7QwcvkMzs1LV24yQIKIE4yUI+bRpz5y4x+vOj5s04K0aMGPC0IrFeY1bWsWOnw8M8LJlwkUF/3LWOahbaNvLmzRVr3aTc6N//U1D9w31J+BYfad7wk9JOcuowfcq5cxcNIYQaYhgvNh66xzK7b7t2PTBhwkxs3rwT33zzvaQwocRAYvb372vqzBOJgoTByHTafJhqhYQS15hoL5oyZYQUoSRDO4T8sMPps8/mCua0uQwY4GuHHrULZ0NACcTZVvTv+TA/E9OVWCwWzJgxGglVTZA4xo+fISnRp0yZY1Qwf8gbNYkjMHCiefPO83cP1vtYsWK9pF9PmzYtnnkmvTzUvLy6wJb/SIgRRsVEwqLKiaSVJ4+HuB537z4IzOwbHn5E1EvErkSJD8D0JdypcfPmz3Hp0l8JG/nw9/FpKW/v0TaNJ8cd95Wqxs5Rp0516aty5QZxF7bSXZI1Jar06dODLwT8tFLT2owLIaAE4oSLTdVE69a+ssdHx46tQP17fNOMjPwdfKBQVTVp0mxEGgmAiQn5sOQbNd9S42sjKfeZtqRnzyFSdcIEf0lXkj59Ohw5cgJHj56Q68k9/fTTz9i5c59EwHfo0AeljVGbxm0auakyo9GbD9S7d+/i3/9+zZBIWXTv3sE8WCcYO0eoUUEdwOrVCzB8uB+aNq2L9957F+nNgze544pZv0ABN/n54MFD+bTliXgw3xglLkoe77yT05bdadtOjIASiBMuLvesYGzGq6/+S3JHxTXFSEMckyfPMTaO6qKioQRSpUo5bNkSIqnRox9scbWRnHs0Nj80z0ySXKNGH4khmTETbLNXr2HGWP+AXxN0PDA6fc577dpNGDlyMpgd9/33K+CDD6rAy6urRMCHhW3D1avXkSaNBVTD1atXE4MH95QI+NOn9+CLL7Zh0aJp6Nevi7H1VJF4GYvFkqD+k1qIKV4WL14l1YcO7SWftjjRfsWXBA+PmmBkO1VwtH3Yoi9t0zUQcAQCcY2VsNIsz5w5b97id4hXDfNIMb/U05qmCoe2Ddo4xo2bLuoTuuIyYeHChZ/B1sTBMUUaKYdR1RbLX2o2XuNBqYlvxV9/fVVUSbz2+MGH4bFjp8CAPD+/4ZImJG/ekmBMCtOmzJixANyfgzYFRoAzBoWxKWPGDEFY2BJwzxA6AkybFoBOndqgbFkPvPTSi493Y5ffzBBAlSOz+datW9PqfVKy4uZXTHVCOw5/U9KaOXOM/J1YvUNt0GUQUAJxoqWmSoIPT76J09unQoXST8yOxDFt2nwjcdQwb+Sf4ebNW5JGhMQRHDwNBQu6P1HHVhdCQtaBD7Ny5TzE0B/dD4PpJkz4RH5y0yhGYzPQjqTQuXN/lC9f10gPJeHp6SXpPoKDV4K5pkgqlLoqVCiFLl3aYebMsYZE1uH8+XCJgg8IGISWLRuiUKECj7ygpJMUPtEOwyG0b9/cGOfT8qtVDv49LF68EtzwirE7N27cNLatwuYFY6lIWsxDZpWOtBGXRUAJxImWnuoJqnComunVq+M/ZsaH6wzzVk6JIyBgCvgwoQsu04swkaE9iSN6YEFBn8vXli0byWf0iVLDvHlLQMmB6h3mg2KqD6ql1q3bbAzYV0CS5BaszKvl5+drJJFphkR24MSJneA+HQMHdsdHH30ISjK2yPkVPdbkfgYFhYD7uac3dh9u7JXc9lifmK1eHQbm3Orff7ioqwoXfg8hIXOwZk0QErXWbFAPRSAWBJRAYgHG0S6fPXsedMtMmzYNpk0b/cjIS+KYNWuhkTiqi12AkeRU15A4GARI1U5KzJXqpStXrkv0Mz2cQkO3YtiwsWCEe8GCFY3EsFXiE6LH9tJLLwgZMBCSe3DkypUTadOmxV9utxvwyScTxO22fPm6IqEk57N06doi4TBzMF2ZQ0LWijs07QZ8OEePKTmfDPCkIXvQoFHSjLt7Pkk0KT+ScWK8SpUqDdGt20DJ+kvnB8ajMA1KmTIlktGyVlUEnkRACeRJTBzuyr1792SPD76Vd+jQCnwY/fzzL6AbLiWO4cMnSubX0qWLyxsoU6anBHEw6vmLL04aaWGFUTH5Cc4kNBq6O3bsC8atnD597qmZYG/cuAXaRCidkBQvX74qkgj327D2cfXqN6Cq7+TJM4IhjfkNG7YHM+LmylUcFSrUQ+vW3TB06BhwK9sVKzYgMvJ3mU98JxIQ1UqUDuiBRilr6NDeWL9+cXxV47zPDMi1a7cA41XOnbuEnDmzmxeJAND9mvEocVbWm4pAEhFQAkkicAmrZp9SjNug6ooPDe7YRxfYIkWqgm/P3I+DEcZUXSxfHig6cFjx37ff/mBUR1/KLoJ8MJK0Bg4chQ4desumUdS/585dwtg4ChpdfC2jVmoldgsSB4cRFRXFjycOBuAVLlwAVauWB1OBsMCHH1bAnDkTwHns2bMWtjwCAydIyvlu3dobA301cd3lOGizIdbbt+8V8iCJ9OgxGGXK1JZkiBxnbAcJ9KOPWoFqpcjI34y0VRH7928AnQbSGskxtnpxXSfJ0R2ZGZCPHz+NrFlfN+s+VLChh5nFYlsPsrjGpvecHwElEAdf4xMnzmDGjCDxppk+PUC2T+XbMnNVMV36ihVzJUq6ePHCSZopg+28vXuCrsGUEmiPKFv2IzCVB3M/lShR3TxgW4LqGD4YSVoLF4YgLGw76GFF7yJKDDE7pwqKEdi8RhvFrFnjZIx7964D0358991JU3czQkOXIChoqrjVsuzevYdQrFghUJLKnftt2PKoWbOKpJynfWX27HFgPAzHdubMXjFCz5gxxhBBN0OIH4rhm0RNtdm6dZs41H8c9+8/MOrFeahYsT7oOcZ1oZ2GqiV+/0fhBP64cOGySEFUs3GNqNrz9+8jcSstWjSQMSWwKS2mCCQZASWQJEOX8hX/Ul31F4Myo6T3748wqqz+4Fs932oZ01CqVLEED5QPerqU0q2XREGC4Nvtpk07jYpli3mgbwU9oi5fvmZUNr9JuyQCN7fcyJ8/r5EysgqRyY0YJz4kGzSoBXpWRUTQCH4Yy5bNkhJRUffh6VlNIrlJJnzLlxsxTiQNZvbl+EhkMW7Z/euLL76AggXdwchxX19v8fSKiNgipMYYGtoemOokemB0q65WrTGYiPL+/Sh8/HFrHDgQatRgpaKLJOrz6tXrQuaVKtU36qm9YPQ7Y1aYQsXHxwuxuW0nqhMnKazTsD0CSiC2x9hmPQQETBVDKdU9VAnRu8pisYgKg3p1iyVu9QVdeLlDHl08a9RoZt7oS6BFi06YPHmOEAUH/uabWcEsst7eLcFU8FQf7dixEtzMaMiQXqAnFN+Gz569ACYdpI4/Q4Zn5M189OjB2Axgep4AABAASURBVLdvvXnr3i51GcXN9mD+5c37DtKkSSPjJxGaS3H+x7dri8Ui47p48UqcZe19kwRJXGhXorRRs2Yz0F7Tt+8nqFGjqRj6qY7btm0liBklsMSO8ccf/yNZfmk7Wb9+CzJmzICuXdshwhAyo+aT0mZix6DlFYHHEVACeRwRB/l9wqiu5swJltEyAG7Nmo3gQyQ4eLohgafnU2IKC7p3UtVEQ7C7ezn4+PSS9OynTp0V6SFv3lzw8mpoVC6j5MHPBxQ3hOKOglmyZJK3Xm/vXuYNvBWGG+M81VSM26CHDyO6abTlnhaMwfDyaoRcuXLIGB8/kTyi7128ePnx20/8fuONf6NcuZJyff78pfKZmk4kjui4ips3fzVjrQNm2M2YMSMYvLhhw2IQ28SOmcZxP78RRkKrZaS2NYZ00xp1YTNDpJswYED3R/ahxLar5RUBayCgBGINFO3cBt/Ymzb1EW8lkgfzOL388ougay6D6KKHwwczDdvcypYZZZnSgyoWXuO9dOnSijqG6SyY74r6fUZnjx49BPXr1xIX250796NHjyFwdy+LNm26GyN2MOh++/bbOeRBNn36aAlKW7BgitHJN0GOHNnA9OAJOSg5cayUgigNxVdn2LA+5gGaRh6kNN7HV56eW/GVies+PbFiux8Z+TtOnDhtVFhBkjIld+7ioLsv50NvOH6S9Ggkb9myoZAzr8V13LhxU5wRGDxZv35boxIsCBrHGW0fFRVlvtc1xLERI0b4gVHrcbWl9xQBeyCgBGIPlK3cx/TpC4wN4ndplQ8dvtlu2rQMd+/ek9Qf3sbo/d575Y2evZ4x9A7HqlVhol7KkCGDeZMtKokCaYM4dy5cDMJ8MFevXumJOAS6ADMr7ooV68XOIh3+fbpy5RoYQc3Id/bFTLaJPXbvDpfWmLyR0lB89an358OZBErjfXzlCxQoh/jKxHWfqVFiu+/mVgq1arUwD/NJYEwLsedk0qSxGEKpZ4hgOY4c2SIkzOtPO7766gLocMDsv/RWK1CgvCHl7kJKlOxYh9mJ3dzyiFcVbUhMQcLreigCqQEBJZDUsAqJGAMNtUxFEl2FW8a++uorqFy5IeiR4+8/XjyxaBOhgZX5rajqWLt2IS5cCBdvJxpdqQ6iyiu6nad9Zs6c+dHlDMauwZiFmEe0wfZp92KWi+07++cDN7oTqrViKxt9nbp/ljfmEKOye1ai1aPvxfxkOYvFAkZ4x7ye0O+UziwWi+kj4xN9cL4cQ8wjW7Y34O/fF2fO7JN9yxmLE/P+b7/9bkjgIJgtgFH1JKAqVRph4MBRZk1CxRZEPDw8iqBz57aYO3cSjh/fYaS9o6DNKVrdF7NN/e60CDjMxJRAHGSp+ADavn0PGHR3+/btR6Pm9QMHIsBPekQxtQfTjm/duhxnz+5DcPA0MbbSk4m2ikcVE/CF9gy61PKgXYMJCGMeV64cMZLNSTztXsxysX2/dOmweXAeMyqyDqLioXTBVOm0u8RW5+uvIySW5eFDoHfvjyUp4tPKsty3357A1atfxFrmafWir127dgyszzHyGj3aevfuJKqjO3fuCnqM3aDkRmnu0KFNxp7U8pFNgt5SK1duABM9ktzffbcMSBxMZsi8XlSBkRQaNvREQMAgyX58/vxBIy3Ox6BBPYzxvVKc0osMQE+KQAojoASSwgsQW/dUTTH1OAPVmN6DD6DWrX1x717Uoyo5cryFRo0+EvdY6tr5xjp79jjQpZdvwHyjf1Q4lX7hGJm+nQ/hzJmfB1U3Vas2xvnzX8c6YrrC8ubMmUEGj3v8arODHmb0pipcuLI4DVy//h2YsJGeT0eObAVtR5QaGIvBXGOMBCfJly7taVSFgw2BrxQvrEyZnjOG9ZJCliT1M2f2iocaN6RilmBmPyYh2Wwi2rAiYAME0tigTW0yCQjQWDt37mKJ3i5TxhPUh3PzI6bKOH36nNggsmd/U/z8KU2cPLkL4eFhmDx5uBhX3347exJ6TT1VmJ+Lqhrq+5lziq6wNK4/bYTc6IpY/PLLDSxfvv6JIsm9EBV1Hxs2bJW1qFixnnhT/fnnHTBn14wZY8RulD9/HmOrWChBlHnylATjZZjskbmobty4Bc6DAX20W9AxgUGIJEmSJdWKjCdJ7ji1viKQ0gikSekBuHL/9PKhTz+juPPk8cCwYePkDZxeTsSF8Rd82+YGR+fOHcDBgxuNTvwIaM9wRi8cxohs2rRUjNB8YNPFmFH13MuCnkgrV4aah/cOsSUwsJAY+fuPlWyzt279mqjNp1j38YN2I6ZioYH+44/7ylpQcmBf3bp5gwZskgT31WBUfmBgsLFTfIkXXsgMbsLFNDLMeEuyIBmOHTtUyJ1ODhaL5fHu9Lci4PAIKIHYeQlJGsuXr0ObNr6glw8jq5lUj8bw2rWryn4VDEq7fDkCjL9g4FnlymUl4tjOQ02R7miYHz/eX2InqN46ePAoGOjo5zfCqIQGGTtDLzDYkeorDvCPP/6UJIf585dF9uyFkSPHB+btv7TsQkhJjlHgdeu2FvsDvdPo0sw4GDobjB8/A3RIYPvMUVW4cCUwFQuD9l5++SVQqqM0QlUiMx0zlTyDJQsWdDfr19TUDcCBAxtw6tRucBMuX18fMB6Ga8mx6aEIODsCTxKIs884BeZH0qArLSUNqqZ69hyKbdv2gA8apvjgw4c68dmzx8uDk7meMmTIkAIjTT1dMnaCuwWWKVMc7du3MKTRwKiJakoCQqq7mNuL+HHEL7yQxRBsJtCGwAd+ZORvYNAkJTmmEmFySRqumZKF68A4GEoPdB9m9D4lHGYJZl22x+N//7thpL3rIl3UqlUFDJJcsyYIJHZuvjVy5AAZT86cjq065Fz1UASSioASSFKRi6deZOTv4p5JSYOkwTdfShp0D+VGR3TTPH16j6T4oPojsR5S8XTvFLeZbyokJNBIIP2MZDBU3viZgJDp6PkwZ74vTrRhw9rGUB2O69ePm4f+EZCMGYPBbL2bNi0Tz6bg4OmYM2c8+vTpjIoVS4trLuvyeO655+Du7iaZf8uV8wADHIcN6ytxHHRMmDNnArjtLUnL1YmdeOmhCEQjoAQSjYQVPkkaDLrjXhEMrmOAGCUNxjrwLZYeUiQNpvmoUaMS0qdPb4VeXbcJOhNw9pQw+MmDKjAaqBkFzmy977+fH/SSSp8+HRYvXgWqrXbtOiDR8mXKlAAzAdO+tHVriGT+XbZstrF9bEaHDi3BNtimHQ/tShFwKASUQJK5XJFGXUKbhpdXV5A0mPaDe0VYLBbQW4hqmC+/3GPefieAMRr6BptMwGNUp0RAOwm91O7cuRPjzl9fGXQZGLjY2CU8jTG7o0SMWywW0Ka0b996hITMkUzAVH39VUPPioAikBgElEASg9bfZUkazHvENB9UT9GmsXPnPslNValSGXGtpWGV+aG4qQ+jn/+uqh9WRIBk7OaWR1ycv/ji1KOWT5w4Da5J4cKV4e8/zqi1roOSCI3zDAykVxuD+B5V0C+KgCKQJAScikCShEACK9FN9PPP16Jly84So9Gr1zAw0eDDhw8kQIwPJ6qnqGtncF/mzJkS2LIWSw4C+fK9I9WpOly2bA1q1GgmOaooFfJGkyZ1ERa2FLSFNGtWT9Kg87oeioAikHwElEDiwJCkwYcS3UYZXdy79zBQf86UG9wmdvToweLCuWzZLIldYCR1HM3pLRsgEC3dMUakTx9/sx5nwY2p/P37ggbwiRM/QaFC7jboWZtUBBQBJZDH/gZu3rwlkcfMW0TS4ENp9+5wCVKjzn3ECD95MK1cOQ/c74IG28ea0J82RiAqKkoixRlkuGTJKumNkmCtWlXBGBpujevj0/JRXiopoCcbI6DNuyICSiB/r3pw8Eow5xTTijP3EeMGoqLugzvJDRvWRzZXouto27bNJKHe39X0w44IfP/9jxgzZhoYCc5IcQYZZs36moyAxvTp0wPAGBq5oCdFQBGwOQIuTyDcSY4BZcyaevr0OQGcKo+BA7uLO2do6BJ06OClmVEFGfufHj58KGrDNm184eFRA1OnBuLnn39B+fIlJZHh4cNbwGA+riO3kYX+UwQUAbsh4NIEwjfaBg3aSmxA+vTpxaWTCQppdO3SpZ0ElNlpJbSbxxBgXipmty1durY4LjCeJkuWLGBusAMHQo2acRaYSp0uuNGG9IsXrzzWiv5UBBQBWyLgsgSyefNOVKrUAAxC4wNox46VElTGFOm2BFzbjhsBrke3bgNRpEhVMHHhtWvfmu8FMWXKSKNG3AbmBnt8jbh+bPXCha/5oYcioAjYCQGXIxAGnPXr9ynat+8JxnNw74zNmz8HPXfshLl28xgC3Axr0aLl4MZLTHy4enUY0qdPBy+vhrIbH5NKMl0Jo8wfqyo/M2bMKJ8rVmyQTz0pAolCQAsnGQGXIhBuUlS1amPQc+fll18EA8q4e19sD6Yko6oVE4TAhQuX4ec3wkgYVTFgwEicO3cRbm65jeQxwEgb2zF69BDzO0+8bUWT/zPPaGqYeMHSAoqAFRFwGQLhxkzVqzcFDa2lShXDzp2rzRtvWStCqU0lBIETJ06DTgvcYZGbNXGfD0ognp7VJOnhjh2rJFV6dKbdhLSZJUtmKcadAuWLnhQBRcAuCDg9gdAYy5gObg3LAMABA7pLrIA+bKz19xV3O5cvXzOS3nLZx4N7dtSq1UKcFpin6vnnnzOSR3cwVxiTGjLpYdytPf3umTPn5YbaQAQGPSkCdkPAqQkkPPyIMZTXlx3ssmV7Axs2BKNr13awWCx2A9jVOvrllxtYs2YjmOqlePHqKFv2I0MSI2UnwXv37onU98kn/QyJz8H58wdlPahOTA5O773nJtU1e67AoCdFwG4IOCWBMACQHjyNG/tIzADVI1SNMKGe3ZB1kY64WRazDzNpYeXKDfD++xUMKQwAk03+8MNPkkbE19cbjNznVq+0O3l7t0Dp0iWshhDTsq9fH2xeEBZbrU1tSBFwBARSeoxORyDffPM9PD1bgjEEmTI9J+6fVI/we0qD7Qz9R0VF4dChL0QNVadOa+TPXwbc/4Rp08+duySxM82b1wf3PjlzZq8kMuzfvxuYO8yWm2YVKfI+1IjuDH9hOgdHQsCpCIQJ9apUaSgJ9ShtbN++EnT/dKQFSW1jZST42bPnDSEsAtPX0/jdoEE7MYQfPXoCzz6bUfY9GTlyALjHxuHDmzFu3DDZ+yTauJ3a5qTjUQQUAesg4BQEQjUKcyNxB0B+79y5ragzaPewDkyu1cp33/0grs6dOvVDwYIVQdfnTz+dAKavv3PnDooUKYiePTsaW0cQzpzZD+570qZNUzjcHhuutaw6W0XA6gg4PIGcOnXWGGYbGMLYCnpWMRvroEE9kC5dWquD5awN3rhxU/BjgGXJkjVB4ze/r1+/BTSK58iRzUgfjTB37iScPbsf69cvQp8+nU25wmCxjOFEAAAGS0lEQVQqEWfFReelCCgCcSPg0ATStesA2TyIdo8KFUqZN+TVYIxH3FPWu7dv/ykJCilVVKvWGO+9VwGU4Bhgef36d5IGvWbNyhgzZggiIjYjPDwUo0cPRo0alfD885kUQEVAEVAEBIFkEIjUT7FTYOASo0LZCOroR4zwMyqXmUiuO2iKTcbGHTN4j6lCuLcJ83/lzl1CEhTOnr3IqKDOC4bFihUSqYLSBb2lAgMnmjIN8eabWW08Om1eEVAEHBUBhyQQ6uFnzlwgmPfu3Qnco0N+uPiJkgWTEc6fvww9egwxqr2GhgAKipTGVCHcXfH8+UuC0muvvQrmAQsKmooLFw5i7dqFYtegfUMK6EkRUAQUgXgQcEgCofTx008/g1lYu3f3iWeKznmbzgJ0pw0MXAxf34FgWpC8eUuCyQiHDBmNFSvWS24pzp42jNq1q4F7nHD7XbrXHj++HcwDVrVqeaiLM1FyrENHqwikBgQcjkBu3ryFadPmCnYjRw4Ed6KTH058ioz8HQcORGDWrIXo0sVPorvz5SsFutMygG/VqjAjRVwWVRQTC9atW0PSnq9YMdeQSLjYMBiXwT1OypUriRdffMGJ0dKpKQKKgL0QcDgCGT9+JvhApdGcwWn2Aspe/ZAg9+49aEhyPjp27ItSpWrBza0UGFU/fPhEo2raBOaXSpPGgrx5c0mci79/X6xevQDnz4dj7951mD59tDGKtzZ1iyFzZjV622vttB9FwNUQcCgCuXLlOhYtChGpY+jQPklfq1RSky6yjK2YMmUOvL17gu6z7u7l0KzZxwgImILQ0K3ghkp0SX733bxo0qQu6DCwbt1CI3Ecwq5dayTS3senJUqU+EBVUalkXXUYioCrIOBQBDJixCTcv//AvI1/JPYPR1mkP/64bR74lzF37hJJAcLUHx98UEXyRjG6e+zY6di0aScYwMc5MYqe6UACAgYhLGyJIZFj2L59BSZO/EQcBooWLYSMGTOwqB6KgCKgCKQYAg5DIF98cRLchjZDhgxgSvYUQ+yxjm/cuAmm+ti5cx8WL14pBMFMtJQiKlSoZ4iuFPLk8RAj97BhYyUFCJMP0gmATRUq5I7WrZtg7Nih2LhxqSGRk4ZMlkk6kFatGqNQoQIspoci4CwI6DycCAGHIBDGevj49BbYO3dug1deeVm+2/r0n//8FydPnhHiCgr6XNRK9Hhq1MgbpUt7Ileu4ihQoLyk+vDy6or+/YcLQTATLe0YFy9eBjdL4jhff/1V/OtfLxn1VD2RJLZtWy5kERa2FKNGDUSLFg1QsKA7i+qhCCgCioBDIOAQBHL06EnwjZ0eV507t002sFSDMdX4sWOnjIpoG+gKSwN15879Ua9eG3h41EDOnEVRuHBl1KzZHO3b98SgQQFi2KbHE/cZuXr1OhiPQhdYej4xpXijRh/B19dHorYXLvwMW7cul82SvvvupGzReurUbiOh+IstI3/+fMmehzagCCgCikBKIuAQBMIoaWZ95Y6Cbm6lkSNHEdDYnJSD7q/ZsxdG0aLV4OnphQ4d+oCusHSRXbduMyIijoOpUbj5EbPJ5sv3DipUKCWSA4MWx40bhqVLZ4H7izBim0F49HwKCZmDyZOHGymkq+SNqlKlnBljPqtHx6fkH4v2rQgoAopATAQcgkA4YDe3PPwwRvT74J4UN2/eQlKOaJUSCYkqIz7ovbwamQd/NyEAxk6QEL7+OgIkiJ07V0ualPHj/dGr18egcbt8+ZJwc8stOaNkUHpSBBQBRcAFEXAYAgkNXQxGUFvruHTpsBitqWpiokBfX29QBcVkjFRJqZeTC/7foFNWBOJEQG8+joDDEAgHzghqax1sTw9FQBFQBBSBpCPgUASS9GlqTUVAEVAEFAFrI6AEYm1Etb3YENDrioAi4GQIKIE42YLqdBQBRUARsBcCSiD2Qlr7UQQUAUUgpRCwUb9KIDYCVptVBBQBRcDZEVACcfYV1vkpAoqAImAjBJRAbASsNutMCOhcFAFF4GkIKIE8DRW9pggoAoqAIhAvAkog8UKkBRQBRUARUASehoA9CORp/eo1RUARUAQUAQdHQAnEwRdQh68IKAKKQEohoASSUshrv4qAPRDQPhQBGyKgBGJDcLVpRUARUAScGYH/AwAA//+9ycjUAAAABklEQVQDAJfWhKXmovHZAAAAAElFTkSuQmCC	4ad3cdfb-86a4-407a-b502-15a97c9f92ec	RIYAS EMPLOYEE MANAGER	2026-08-21 17:32:54.032	data:image/png;base64,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	IN_PERSON	nadhil customer 	2026-08-21 17:33:19.898	defa00e594d3a673e5ec8b98586cc858ee6b0824ba743280aee42f5cec660d15	2026-08-24 17:33:02.541	f	FULLY_SIGNED	1. This agreement sets out the terms for rental of the above-described equipment.\n2. The equipment remains the sole property of the Seller throughout the rental period.\n3. The Buyer is responsible for the proper use, care, and safe custody of the equipment.\n4. Monthly rental charges and excess copy rates are as specified in the Rental Terms section.\n5. Excess usage beyond the agreed free limits will be billed at the applicable excess rates.\n6. Either party may terminate this agreement with 30 days' written notice.\n7. Upon termination, the Buyer must return the equipment in good working condition, fair wear and tear excepted.\n8. Security deposit, if any, will be refunded upon equipment return and final account settlement.\n9. The Seller shall provide maintenance services as agreed; the Buyer shall not tamper with the equipment.\n10. Disputes shall be resolved through mutually agreed arbitration under applicable local laws.	2026-08-21 17:32:43.923365	2026-08-21 17:33:19.904993	\N	\N
4a71ae27-eea9-48bd-b51e-e0d8cf98a1d7	CA-2026-001	02b43c38-8df6-4423-acea-9bb0622a70ef	3f791696-075c-4c28-bcc8-25074cd0a54f	2026-08-21	nadhil customer 	\N	\N	\N	\N	4ad3cdfb-86a4-407a-b502-15a97c9f92ec	RIYAS EMPLOYEE MANAGER	Xerocare	\N	\N	data:image/png;base64,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	4ad3cdfb-86a4-407a-b502-15a97c9f92ec	RIYAS EMPLOYEE MANAGER	2026-08-21 17:27:25.048	data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=	REMOTE	nadhil customer	2026-08-22 02:45:22.248	3a037f73821d55e9f9b41747e89bca8aa43ad613d5454e18b3c28800fce3d2ca	2026-08-25 02:44:34.49	t	FULLY_SIGNED	1. This agreement sets out the terms for rental of the above-described equipment.\n2. The equipment remains the sole property of the Seller throughout the rental period.\n3. The Buyer is responsible for the proper use, care, and safe custody of the equipment.\n4. Monthly rental charges and excess copy rates are as specified in the Rental Terms section.\n5. Excess usage beyond the agreed free limits will be billed at the applicable excess rates.\n6. Either party may terminate this agreement with 30 days' written notice.\n7. Upon termination, the Buyer must return the equipment in good working condition, fair wear and tear excepted.\n8. Security deposit, if any, will be refunded upon equipment return and final account settlement.\n9. The Seller shall provide maintenance services as agreed; the Buyer shall not tamper with the equipment.\n10. Disputes shall be resolved through mutually agreed arbitration under applicable local laws.	2026-08-21 17:27:02.338829	2026-08-22 02:45:22.254088	\N	\N
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
\.


--
-- Data for Name: employee_expense_requests; Type: TABLE DATA; Schema: public; Owner: xerouser
--

COPY public.employee_expense_requests (id, "requestNo", "employeeId", "employeeName", "employeeRole", "branchId", "branchName", date, category, "subCategory", description, amount, currency, "receiptUrl", status, "submittedAt", "reviewedBy", "reviewedByName", "reviewedAt", "rejectionReason", "paidAt", "paidFromAccount", "paymentReference", "expenseEntryId", notes, "createdAt", "updatedAt", "requestSource", "purchaseId", "purchaseRef", "vendorName", "paymentMode", "paidFromAccountId", "purchasePaymentId", "chequeNumber", "chequeBankName", "chequeDueDate", "purchaseOrigin") FROM stdin;
67040397-3d89-499c-908a-7e1b3d151fd5	EXP-REQ-2026-0004	61014340-f58f-4a8b-b4db-28a8c36fa10e	TEST MANAGER	MANAGER	24039cac-a975-4a63-97b0-1035e720f577	XEROCARE TEST BRANCH	2026-08-21	FUEL	\N	Test expense exceeding cash balance	9000.00	AED	\N	PAID	2026-08-21 16:17:45.657	6cac7cd1-de80-4ec2-9f8b-d3c1db4f8fa3	\N	2026-08-21 16:18:09.258	\N	2026-08-21 16:18:09.258	6375d8b2-44b3-449e-99ef-87df85356a9c	\N	4ac91c4b-b306-4a18-85f4-7f2cb7b72914	\N	2026-08-21 16:17:45.589732	2026-08-21 16:18:09.258167	EMPLOYEE_EXPENSE	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
8b0343f9-5f9a-485b-9f3f-fdfcc9fc9255	EXP-REQ-2026-0001	d746e29b-13be-441f-b43d-5c51fc67e713	RIYAS  BRANCH MANAGER	MANAGER	3f791696-075c-4c28-bcc8-25074cd0a54f	xerocare uae daira branch	2026-08-21	Vendor Purchase	Cash	Vendor payment — vendor (N/A)	200000.00	AED	\N	PAID	2026-08-21 15:15:03.234	54e43449-9b18-462d-aec6-112dbbc65d9b	\N	2026-08-21 15:17:57.842	\N	2026-08-21 15:17:57.842	4b228416-9ce8-4d78-89c2-7c90434d13bd	\N	\N	Manager purchase payment request. PurchasePayment recorded in ven_inv (ID: 00c71456-022d-43c8-adc0-0907d08eecec). Cash held pending Finance approval.	2026-08-21 15:15:03.240191	2026-08-21 15:17:57.841713	MANAGER_PURCHASE	50758ed3-34f4-453c-a1e5-0b1dccbf19a7	\N	\N	Cash	4b228416-9ce8-4d78-89c2-7c90434d13bd	00c71456-022d-43c8-adc0-0907d08eecec	\N	\N	\N	DOMESTIC
7de4003d-0503-43b3-b101-2dcb515f7ab8	EXP-REQ-2026-0003	61014340-f58f-4a8b-b4db-28a8c36fa10e	TEST MANAGER	MANAGER	24039cac-a975-4a63-97b0-1035e720f577	XEROCARE TEST BRANCH	2026-08-21	TRAVEL	\N	Test travel expense for validation testing	1000.00	AED	\N	PAID	2026-08-21 16:17:15.794	6cac7cd1-de80-4ec2-9f8b-d3c1db4f8fa3	\N	2026-08-21 16:17:30.032	\N	2026-08-21 16:17:30.032	9ad68db2-64d4-4b30-987a-e4ff1bb9007f	\N	b35319c7-69af-41fc-8b84-c96c3ca24281	\N	2026-08-21 16:17:09.319785	2026-08-21 16:17:30.032249	EMPLOYEE_EXPENSE	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
ab6cdf05-4fea-435f-b237-4f0ff376ffed	EXP-REQ-2026-0005	61014340-f58f-4a8b-b4db-28a8c36fa10e	TEST MANAGER	MANAGER	24039cac-a975-4a63-97b0-1035e720f577	XEROCARE TEST BRANCH	2026-08-21	OFFICE_SUPPLIES	\N	Test expense for Payable-table visibility check	500.00	AED	\N	PAID	2026-08-21 16:18:27.745	6cac7cd1-de80-4ec2-9f8b-d3c1db4f8fa3	\N	2026-08-21 16:19:54.505	\N	2026-08-21 16:19:54.505	6375d8b2-44b3-449e-99ef-87df85356a9c	\N	7638372c-ba44-499c-b21c-4db5264358e5	\N	2026-08-21 16:18:27.677557	2026-08-21 16:19:54.505299	EMPLOYEE_EXPENSE	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
8829085f-a079-400b-83dd-aff1d94e1cad	EXP-REQ-2026-0002	d746e29b-13be-441f-b43d-5c51fc67e713	RIYAS  BRANCH MANAGER	MANAGER	3f791696-075c-4c28-bcc8-25074cd0a54f	xerocare uae daira branch	2026-08-21	TRANSPORT	TANSPORT CHARGE 	TRANSPORT CHARGE OF MANGER 	2000.00	AED		PAID	2026-08-21 15:20:32.648	54e43449-9b18-462d-aec6-112dbbc65d9b	\N	2026-08-21 22:32:07.578	\N	2026-08-21 22:32:07.578	1300c98f-5dba-4671-bb7c-d07df25c5377		3b340b16-cc06-44c9-9541-0d28e2f7b156		2026-08-21 15:20:32.580391	2026-08-21 22:32:07.578045	EMPLOYEE_EXPENSE	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
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
180b74a5-f0d5-4605-95d6-2c4a766f0cc7	EQ-2026-0001	2026-08-21	OWNER_CONTRIBUTION	Opening balance — xerocare cash account	425000.00	AED	3f791696-075c-4c28-bcc8-25074cd0a54f	\N	4b228416-9ce8-4d78-89c2-7c90434d13bd	\N	Auto-created at account creation to give the opening balance a documented origin.	54e43449-9b18-462d-aec6-112dbbc65d9b	2026-08-21 15:04:56.944124	2026-08-21 15:04:56.944124	a360f46f-5156-4296-9a29-e2a18fae2ee2	\N	\N	\N	\N	\N	\N
1bdf167d-7eb1-4a7d-8264-d34da3312d64	EQ-2026-0002	2026-08-21	OWNER_CONTRIBUTION	Opening balance — xerocare bank account	32000.00	AED	3f791696-075c-4c28-bcc8-25074cd0a54f	\N	1300c98f-5dba-4671-bb7c-d07df25c5377	\N	Auto-created at account creation to give the opening balance a documented origin.	54e43449-9b18-462d-aec6-112dbbc65d9b	2026-08-21 15:06:48.036157	2026-08-21 15:06:48.036157	85bb553d-ab6d-423a-8b67-9e539e3545e4	\N	\N	\N	\N	\N	\N
d44518e2-3337-473d-a647-0b67952f235a	EQ-2026-0003	2026-08-21	OWNER_CONTRIBUTION	Opening balance — Test Cash Account	5000.00	AED	24039cac-a975-4a63-97b0-1035e720f577	\N	9ad68db2-64d4-4b30-987a-e4ff1bb9007f	\N	Auto-created at account creation to give the opening balance a documented origin.	6cac7cd1-de80-4ec2-9f8b-d3c1db4f8fa3	2026-08-21 16:16:54.168926	2026-08-21 16:16:54.168926	ffd615a5-1d16-4d4d-9b8d-27f26222be88	\N	\N	\N	\N	\N	\N
3437947a-caa6-4948-a4ad-eadbe09fefe1	EQ-2026-0004	2026-08-21	OWNER_CONTRIBUTION	Opening balance — Test Bank Account	10000.00	AED	24039cac-a975-4a63-97b0-1035e720f577	\N	6375d8b2-44b3-449e-99ef-87df85356a9c	\N	Auto-created at account creation to give the opening balance a documented origin.	6cac7cd1-de80-4ec2-9f8b-d3c1db4f8fa3	2026-08-21 16:16:54.215512	2026-08-21 16:16:54.215512	ffd615a5-1d16-4d4d-9b8d-27f26222be88	\N	\N	\N	\N	\N	\N
fe89af49-1f31-4022-bea3-bd58c70fafbe	EQ-2026-0005	2026-08-21	OWNER_CONTRIBUTION	Opening balance — Second Cash Account (Petty Cash)	2000.00	AED	24039cac-a975-4a63-97b0-1035e720f577	\N	1b2d1d27-3fd5-47fa-90f3-6ca7cc6da53d	\N	Auto-created at account creation to give the opening balance a documented origin.	6cac7cd1-de80-4ec2-9f8b-d3c1db4f8fa3	2026-08-21 16:20:04.475335	2026-08-21 16:20:04.475335	ffd615a5-1d16-4d4d-9b8d-27f26222be88	\N	\N	\N	\N	\N	\N
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
b35319c7-69af-41fc-8b84-c96c3ca24281	EXP-2026-0001	2026-08-21	TRAVEL	\N	[Employee: TEST MANAGER] Test travel expense for validation testing	24039cac-a975-4a63-97b0-1035e720f577	1000.00	0.00	1000.00	AED	PAID	9ad68db2-64d4-4b30-987a-e4ff1bb9007f	2026-08-21	Cash	\N	6cac7cd1-de80-4ec2-9f8b-d3c1db4f8fa3	\N	\N	6cac7cd1-de80-4ec2-9f8b-d3c1db4f8fa3	2026-08-21 16:17:30.032249	2026-08-21 16:17:30.032249	f	\N	\N
4ac91c4b-b306-4a18-85f4-7f2cb7b72914	EXP-2026-0002	2026-08-21	FUEL	\N	[Employee: TEST MANAGER] Test expense exceeding cash balance	24039cac-a975-4a63-97b0-1035e720f577	9000.00	0.00	9000.00	AED	PAID	6375d8b2-44b3-449e-99ef-87df85356a9c	2026-08-21	Bank Transfer	\N	6cac7cd1-de80-4ec2-9f8b-d3c1db4f8fa3	\N	\N	6cac7cd1-de80-4ec2-9f8b-d3c1db4f8fa3	2026-08-21 16:18:09.258167	2026-08-21 16:18:09.258167	f	\N	\N
7638372c-ba44-499c-b21c-4db5264358e5	EXP-2026-0003	2026-08-21	OFFICE_SUPPLIES	\N	[Employee: TEST MANAGER] Test expense for Payable-table visibility check	24039cac-a975-4a63-97b0-1035e720f577	500.00	0.00	500.00	AED	PAID	6375d8b2-44b3-449e-99ef-87df85356a9c	2026-08-21	Bank Transfer	\N	6cac7cd1-de80-4ec2-9f8b-d3c1db4f8fa3	\N	\N	6cac7cd1-de80-4ec2-9f8b-d3c1db4f8fa3	2026-08-21 16:19:54.505299	2026-08-21 16:19:54.505299	f	\N	\N
3b340b16-cc06-44c9-9541-0d28e2f7b156	EXP-2026-0004	2026-08-21	TRANSPORT	TANSPORT CHARGE 	[Employee: RIYAS  BRANCH MANAGER] TRANSPORT CHARGE OF MANGER 	3f791696-075c-4c28-bcc8-25074cd0a54f	2000.00	0.00	2000.00	AED	PAID	1300c98f-5dba-4671-bb7c-d07df25c5377	2026-08-21	Bank Transfer	\N	54e43449-9b18-462d-aec6-112dbbc65d9b			54e43449-9b18-462d-aec6-112dbbc65d9b	2026-08-21 22:32:07.578045	2026-08-21 22:32:07.578045	f	\N	\N
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
a3dc33d2-7857-4487-a2ef-030d894c94de	323dbba4-0669-43fd-aac9-efdec49ad33d	3f791696-075c-4c28-bcc8-25074cd0a54f	cdbba987-57d2-4277-b23f-4e15c9318699	RIYAS SERVICE  HELP DESK	ba455ef2-9d79-4681-8ac5-ed5231679059	RIYAS SERVICE TECHNICIAN	nadhil customer 	\N	QTN-2026-0001	\N	2026-08-21 17:44:40.672	2026-08-21 17:44:47.959	7	COMPLETED	2026-08-21 17:43:03.963652	2026-08-21 17:44:47.961227	PRODUCT_SALE	\N	\N	\N	\N
9e8ba9ab-0d04-4fdc-97b1-25080ac0da10	02b43c38-8df6-4423-acea-9bb0622a70ef	3f791696-075c-4c28-bcc8-25074cd0a54f	cdbba987-57d2-4277-b23f-4e15c9318699	RIYAS SERVICE  HELP DESK	ba455ef2-9d79-4681-8ac5-ed5231679059	RIYAS SERVICE TECHNICIAN	nadhil customer 	\N	QTN-2026-0002	\N	2026-08-21 17:44:42.602	2026-08-21 17:46:41.356	118	COMPLETED	2026-08-21 17:42:57.193994	2026-08-21 17:46:41.360423	RENT	2026-08-21 17:46:41.356	RIYAS SERVICE TECHNICIAN	\N	2026-08-21
9cd15fb3-58d8-4cc6-a379-9e8265426b90	06bcfd35-e97f-465a-ad8c-e95c7c7639e1	3f791696-075c-4c28-bcc8-25074cd0a54f	cdbba987-57d2-4277-b23f-4e15c9318699	RIYAS SERVICE  HELP DESK	ba455ef2-9d79-4681-8ac5-ed5231679059	RIYAS SERVICE TECHNICIAN	nadhil customer 	\N	QTN-2026-0003	\N	2026-08-21 17:44:44.678	2026-08-21 17:47:01.143	136	COMPLETED	2026-08-21 17:42:52.482772	2026-08-21 17:47:01.151769	RENT	2026-08-21 17:47:01.143	RIYAS SERVICE TECHNICIAN	\N	2026-08-21
\.


--
-- Data for Name: invoice_items; Type: TABLE DATA; Schema: public; Owner: xerouser
--

COPY public.invoice_items (id, "itemType", "bwIncludedLimit", "colorIncludedLimit", "combinedIncludedLimit", "bwExcessRate", "colorExcessRate", "combinedExcessRate", "bwSlabRanges", "colorSlabRanges", "comboSlabRanges", quantity, "unitPrice", "initialBwCount", "initialBwA3Count", "initialColorCount", "initialColorA3Count", "productId", "invoiceId", description, "sparePartId", "serialNumber", warranty, "modelId", "deletedAt", "discountAmount") FROM stdin;
cd16940d-274a-4a44-9804-59c5bf33c29d	PRODUCT	1000	1000	\N	0.2500	0.7500	0.0000	[]	[]	[]	1	0.00	10	10	10	10	9becf533-da18-4e0b-905b-befc7bd9c283	02b43c38-8df6-4423-acea-9bb0622a70ef	HP SMARTTANK  ST-585	\N	\N	\N	3086ad97-be40-42e5-b5bf-ec4f05779ea2	\N	0.00
cd0afbf0-477f-4ffe-a200-ba4b9572b69a	PRODUCT	\N	\N	\N	0.2500	0.7500	0.0000	[{"from":"1","to":"10000","rate":"1.25"},{"from":"10001","to":"50000","rate":"1"},{"from":"50001","to":"100000","rate":"0.75"},{"from":100001,"to":9999999,"rate":0.25}]	[{"from":"1","to":"10000","rate":"2"},{"from":"10001","to":"50000","rate":"1.50"},{"from":"50001","to":"100000","rate":"1"},{"from":100001,"to":9999999,"rate":0.75}]	[]	1	0.00	15	15	15	15	515b1815-6696-4d7d-b6e9-158605657229	06bcfd35-e97f-465a-ad8c-e95c7c7639e1	HP SMARTTANK  ST-585	\N	\N	\N	3086ad97-be40-42e5-b5bf-ec4f05779ea2	\N	0.00
2a2d6b57-c57f-41cd-bd87-a288efbc6c77	PRODUCT	\N	\N	\N	\N	\N	\N	\N	\N	\N	1	50000.00	\N	\N	\N	\N	25753c3b-6c31-4c31-873d-30f0410ebd99	323dbba4-0669-43fd-aac9-efdec49ad33d	[DISC:1000] HP SMARTTANK  ST-585	\N	\N	\N	3086ad97-be40-42e5-b5bf-ec4f05779ea2	\N	1000.00
\.


--
-- Data for Name: invoice_ledger; Type: TABLE DATA; Schema: public; Owner: xerouser
--

COPY public.invoice_ledger (id, invoice_id, total_amount, paid_amount, balance_amount, created_at, updated_at, deleted_at) FROM stdin;
f601a00c-305c-4fa8-b84b-fcd6c23d4667	323dbba4-0669-43fd-aac9-efdec49ad33d	51450.00	51450.00	0.00	2026-08-21 16:46:23.863287	2026-08-21 16:57:27.059228	\N
676d1660-0008-44a1-a269-b047c6f6fe1e	06bcfd35-e97f-465a-ad8c-e95c7c7639e1	20212.50	20212.50	0.00	2026-08-21 22:16:46.922355	2026-08-21 22:19:15.890454	\N
c2ac8b3b-3405-4156-90d1-241c85946844	02b43c38-8df6-4423-acea-9bb0622a70ef	97576.50	97576.50	0.00	2026-08-21 17:51:19.183731	2026-08-22 02:12:11.487396	\N
\.


--
-- Data for Name: invoices; Type: TABLE DATA; Schema: public; Owner: xerouser
--

COPY public.invoices (id, "invoiceNumber", "securityDepositAmount", "securityDepositMode", "securityDepositReference", "securityDepositDate", "securityDepositBank", "securityDepositReceivedDate", "branchId", "createdBy", "customerId", "totalAmount", "contractStatus", "contractConfirmationUrl", "employeeApprovedBy", "employeeApprovedAt", "financeApprovedBy", "financeApprovedAt", "financeRemarks", "createdAt", "updatedAt", "saleType", type, "rentType", "rentPeriod", "monthlyRent", "advanceAmount", "discountPercent", "effectiveFrom", "effectiveTo", "billingCycleInDays", "billingPeriodStart", "billingPeriodEnd", "emailSentAt", "whatsappSentAt", "isFinalMonth", "isSummaryInvoice", "completedAt", "leaseType", "leaseTenureMonths", "totalLeaseAmount", "monthlyEmiAmount", "monthlyLeaseAmount", "referenceContractId", "usageRecordId", "grossAmount", "discountAmount", "advanceAdjusted", "bwA4Count", "bwA3Count", "colorA4Count", "colorA3Count", "extraBwA4Count", "extraColorA4Count", "additionalCharges", "additionalChargesRemarks", "layoutId", notes, "isDirectSale", "isTemplate", "templateId", "assignedEmployeeId", "maxDiscountAllowed", "assignedAt", "assignedBy", "retakenAt", "retakenBy", "deletedAt", status, "billType", "serviceTicketId", "maxCopyLimit", "isReplacement", "warrantyType", "warrantyLimit", "isWarrantyAlertSent", "warrantyDurationValue", "warrantyDurationUnit", "warrantyCopyLimit", "warrantyEmailSent", "warrantyExpiryEmailSent", is_opening_entry, deleted_at, currency_code, exchange_rate_snapshot, tax_name, tax_percent, tax_amount, tax_registration_number, "validityDays", "expiryDate", "isConverted", "estimateValidUntil", "estimateExpired", "visitChargeAmount", "visitChargeMethod", "totalDiscountAmount", "technicianNoteToFinance", "revisionCount", "validityExtensionDays", "validityExtensionFee", "validityExtensionFeeAdded", validity_days, expiry_date, is_converted, estimate_valid_until, estimate_expired, visit_charge_amount, visit_charge_method, total_discount_amount, technician_note_to_finance, revision_count, validity_extension_days, validity_extension_fee, validity_extension_fee_added, customer_name, customer_vat_number, customer_country, customer_state_province, customer_city, "preferredPaymentMode", "preferredChequeBankName", "serviceContractId", customer_vat_status, a3_multiplier, "deliveryStatus") FROM stdin;
323dbba4-0669-43fd-aac9-efdec49ad33d	QTN-2026-0001	\N	\N	\N	\N	\N	\N	3f791696-075c-4c28-bcc8-25074cd0a54f	4ad3cdfb-86a4-407a-b502-15a97c9f92ec	09186b65-b7b9-40a9-8fb5-878c04cb9e33	51450.00	ACTIVE		4ad3cdfb-86a4-407a-b502-15a97c9f92ec	2026-08-21 16:34:03.484	4ad3cdfb-86a4-407a-b502-15a97c9f92ec	2026-08-21 16:45:31.931	\N	2026-08-21 16:30:21.883883	2026-08-21 17:25:45.856537	PRODUCT_SALE	FINAL	\N	\N	\N	0.00	\N	2026-08-21	2026-09-20	\N	\N	\N	\N	\N	f	f	\N	\N	\N	\N	\N	\N	\N	\N	50000.00	1000.00	\N	\N	\N	\N	\N	\N	\N	\N	\N	product:normal	[STYLE:normal]	f	f	\N	\N	\N	\N	\N	\N	\N	\N	INVOICED	\N	\N	\N	f	none	\N	f	\N	\N	\N	f	f	f	\N	AED	\N	VAT	5.00	2450.00	TRN6367828899377289893	\N	\N	f	\N	\N	\N	\N	\N	\N	0	\N	\N	f	30	2026-09-20 16:30:21.867	f	\N	f	0.00	\N	0.00	\N	0	\N	0.00	f	nadhil customer 	\N	AE	Dubai	Dubai	\N	\N	\N	UNREGISTERED_STANDARD	2.00	DELIVERED
06bcfd35-e97f-465a-ad8c-e95c7c7639e1	QTN-2026-0003	\N	CASH		\N		\N	3f791696-075c-4c28-bcc8-25074cd0a54f	4ad3cdfb-86a4-407a-b502-15a97c9f92ec	09186b65-b7b9-40a9-8fb5-878c04cb9e33	20212.50	COMPLETED		4ad3cdfb-86a4-407a-b502-15a97c9f92ec	2026-08-21 16:33:56.584	4ad3cdfb-86a4-407a-b502-15a97c9f92ec	2026-08-21 17:33:32.373	\N	2026-08-21 16:33:24.09428	2026-08-21 22:12:27.468307	RENT	PROFORMA	CPC	MONTHLY	\N	0.00	\N	2026-08-21	2026-09-20	\N	\N	\N	\N	\N	t	f	2026-08-21 22:12:27.468	\N	\N	\N	\N	\N	\N	\N	19250.00	0.00	0.00	\N	\N	\N	\N	\N	\N	\N	\N	rental:normal	[STYLE:normal]	f	f	\N	\N	\N	\N	\N	\N	\N	\N	ACTIVE_CONTRACT	\N	\N	\N	f	\N	\N	f	\N	\N	\N	f	f	f	\N	AED	\N	VAT	5.00	962.50	TRN6367828899377289893	\N	\N	f	\N	\N	\N	\N	\N	\N	0	\N	\N	f	30	2026-09-20 16:33:24.092	f	\N	f	0.00	\N	0.00	\N	0	\N	0.00	f	nadhil customer 	\N	AE	Dubai	Dubai	\N	\N	\N	UNREGISTERED_STANDARD	2.00	DELIVERED
02b43c38-8df6-4423-acea-9bb0622a70ef	QTN-2026-0002	300.00	CASH		\N		\N	3f791696-075c-4c28-bcc8-25074cd0a54f	4ad3cdfb-86a4-407a-b502-15a97c9f92ec	09186b65-b7b9-40a9-8fb5-878c04cb9e33	97576.50	COMPLETED		4ad3cdfb-86a4-407a-b502-15a97c9f92ec	2026-08-21 16:34:00.618	4ad3cdfb-86a4-407a-b502-15a97c9f92ec	2026-08-21 17:31:10.861	\N	2026-08-21 16:31:21.730039	2026-08-21 22:23:40.832365	RENT	PROFORMA	FIXED_LIMIT	MONTHLY	300.00	0.00	\N	2026-08-21	2026-11-20	\N	\N	\N	\N	\N	t	f	2026-08-21 22:23:40.832	\N	\N	\N	\N	\N	\N	\N	84559.00	0.00	300.00	\N	\N	\N	\N	\N	\N	\N	\N	rental:normal	[STYLE:normal]	f	f	\N	\N	\N	\N	\N	\N	\N	\N	ACTIVE_CONTRACT	\N	\N	\N	f	\N	\N	f	\N	\N	\N	f	f	f	\N	AED	\N	VAT	5.00	4646.50	TRN6367828899377289893	\N	\N	f	\N	\N	\N	\N	\N	\N	0	\N	\N	f	30	2026-09-20 16:31:21.728	f	\N	f	0.00	\N	0.00	\N	0	\N	0.00	f	nadhil customer 	\N	AE	Dubai	Dubai	\N	\N	\N	UNREGISTERED_STANDARD	2.00	DELIVERED
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
\.


--
-- Data for Name: manual_receivables; Type: TABLE DATA; Schema: public; Owner: xerouser
--

COPY public.manual_receivables (id, "referenceNo", type, "customerId", "customerName", description, amount, currency, "issueDate", "dueDate", "amountPaid", outstanding, status, "linkedInvoiceId", "branchId", notes, "createdBy", "createdAt") FROM stdin;
\.


--
-- Data for Name: migration_markers; Type: TABLE DATA; Schema: public; Owner: xerouser
--

COPY public.migration_markers (key, "ranAt") FROM stdin;
usage_records_bill_status_backfill	2026-08-20 13:52:27.596492
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
a360f46f-5156-4296-9a29-e2a18fae2ee2	rasheed manager	\N	\N	\N	t	\N	2026-08-21 15:04:53.17702	2026-08-21 15:04:53.17702
85bb553d-ab6d-423a-8b67-9e539e3545e4	RAFEEQ SHAREHOLDER	\N	\N	\N	t	\N	2026-08-21 15:06:27.117229	2026-08-21 15:06:27.117229
ffd615a5-1d16-4d4d-9b8d-27f26222be88	Test Owner	testowner@xerocare.test	\N	\N	t	\N	2026-08-21 16:16:46.412944	2026-08-21 16:16:46.412944
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

COPY public.payment_transactions (id, invoice_id, transaction_date, payment_mode, reference_number, amount, recorded_by, remarks, created_at, currency_code, receipt_url, exchange_rate_snapshot, is_reversed, reversed_by_id) FROM stdin;
d66788c6-7a5f-4a22-9dcf-f7f19db1c424	02b43c38-8df6-4423-acea-9bb0622a70ef	2026-08-21 05:30:00	CASH	\N	315.00	54e43449-9b18-462d-aec6-112dbbc65d9b	Advance payment collected at conversion — Invoice QTN-2026-0002	2026-08-21 17:51:19.183731	AED	\N	\N	f	\N
8c514c83-f145-4185-bf01-74e9f5e88327	02b43c38-8df6-4423-acea-9bb0622a70ef	2026-08-21 05:30:00	CASH	\N	3097.50	54e43449-9b18-462d-aec6-112dbbc65d9b	Usage bill pending top-up — Aug 2026 to Sept 2026	2026-08-21 17:59:24.548636	AED	\N	\N	f	\N
093fa10f-87d2-4a95-87d2-8a90a4a01c33	323dbba4-0669-43fd-aac9-efdec49ad33d	2026-08-21 05:30:00	CASH	12773287	2000.00	54e43449-9b18-462d-aec6-112dbbc65d9b	Advance payment collected at conversion — Invoice QTN-2026-0001	2026-08-21 16:46:23.863287	AED	\N	\N	f	\N
2d64613f-44d4-4882-b3c5-ef942f1ce6f2	323dbba4-0669-43fd-aac9-efdec49ad33d	2026-08-21 05:30:00	BANK_TRANSFER	gfdhgfdg	20000.00	54e43449-9b18-462d-aec6-112dbbc65d9b	Sale payment approved — SPAY-2026-0002	2026-08-21 16:54:45.398012	AED	\N	\N	f	\N
25dcf745-24fd-44e8-baf4-07e2e0883932	323dbba4-0669-43fd-aac9-efdec49ad33d	2026-08-21 05:30:00	CHEQUE	\N	29450.00	54e43449-9b18-462d-aec6-112dbbc65d9b	Sale payment approved — SPAY-2026-0003	2026-08-21 16:57:27.059228	AED	\N	\N	f	\N
cf19e5f9-f6c0-497d-8fca-616b12e8b36a	02b43c38-8df6-4423-acea-9bb0622a70ef	2026-08-21 05:30:00	CASH	\N	300.00	54e43449-9b18-462d-aec6-112dbbc65d9b	Usage bill pending top-up — Sept 2026 to Oct 2026	2026-08-21 18:06:45.149179	AED	\N	\N	f	\N
46e8785a-0613-49d2-be6e-0204e4eff0c9	06bcfd35-e97f-465a-ad8c-e95c7c7639e1	2026-08-21 05:30:00	CASH	\N	10000.00	54e43449-9b18-462d-aec6-112dbbc65d9b	Usage bill pending top-up — Aug 2026 to Sept 2026	2026-08-21 22:16:46.922355	AED	\N	\N	f	\N
2c85cea3-641e-4154-94f9-441850282153	06bcfd35-e97f-465a-ad8c-e95c7c7639e1	2026-08-21 05:30:00	CASH	\N	10000.00	54e43449-9b18-462d-aec6-112dbbc65d9b	Usage bill pending top-up — Aug 2026 to Sept 2026	2026-08-21 22:17:43.41598	AED	\N	\N	f	\N
3422aadc-99a6-4450-889f-6a08710025a8	06bcfd35-e97f-465a-ad8c-e95c7c7639e1	2026-08-21 05:30:00	CHEQUE	CHQ13243	212.50	54e43449-9b18-462d-aec6-112dbbc65d9b	Usage bill pending top-up — Aug 2026 to Sept 2026	2026-08-21 22:19:15.890454	AED	\N	\N	f	\N
6864ede9-4f15-4831-a210-7395a8db417c	02b43c38-8df6-4423-acea-9bb0622a70ef	2026-08-21 05:30:00	CASH	\N	2771.25	54e43449-9b18-462d-aec6-112dbbc65d9b	Usage bill pending top-up — Sept 2026 to Oct 2026	2026-08-21 22:20:29.080278	AED	\N	\N	f	\N
74cafbac-f5fe-4771-8c84-bf4119b4f553	02b43c38-8df6-4423-acea-9bb0622a70ef	2026-08-21 05:30:00	CASH	\N	2620.80	54e43449-9b18-462d-aec6-112dbbc65d9b	Usage bill pending top-up — Oct 2026 to Nov 2026	2026-08-21 22:22:15.068476	AED	\N	\N	f	\N
a7db7066-9eeb-4844-b5e5-5e04fb84e16e	02b43c38-8df6-4423-acea-9bb0622a70ef	2026-08-21 05:30:00	CASH	\N	88471.95	00000000-0000-0000-0000-000000000001	Usage bill pending top-up — Nov 2026 to Nov 2026	2026-08-22 02:12:11.487396	AED	\N	\N	f	\N
\.


--
-- Data for Name: product_allocations; Type: TABLE DATA; Schema: public; Owner: xerouser
--

COPY public.product_allocations (id, "contractId", "modelId", "productId", "serialNumber", status, "startTimestamp", "endTimestamp", "replacementOfAllocationId", "replacementReason", "initialBwA4", "initialBwA3", "initialColorA4", "initialColorA3", "currentBwA4", "currentBwA3", "currentColorA4", "currentColorA3", "createdAt", "updatedAt") FROM stdin;
5ae655ac-2743-49f3-a5b6-957b881d3333	323dbba4-0669-43fd-aac9-efdec49ad33d	3086ad97-be40-42e5-b5bf-ec4f05779ea2	25753c3b-6c31-4c31-873d-30f0410ebd99	5467564547	ALLOCATED	2026-08-21 16:45:31.733745	\N	\N	\N	0	0	0	0	0	0	0	0	2026-08-21 16:45:31.733745	2026-08-21 16:45:31.733745
5718f467-d20c-451f-b334-d6ff71573c1a	06bcfd35-e97f-465a-ad8c-e95c7c7639e1	3086ad97-be40-42e5-b5bf-ec4f05779ea2	515b1815-6696-4d7d-b6e9-158605657229	45646464	RETURNED	2026-08-21 17:32:19.878387	\N	\N	\N	0	0	0	0	200	1000	3000	4000	2026-08-21 17:32:19.878387	2026-08-21 22:12:27.519168
f7ce0e8f-bef1-4bbf-95b5-8847b07a4513	02b43c38-8df6-4423-acea-9bb0622a70ef	3086ad97-be40-42e5-b5bf-ec4f05779ea2	9becf533-da18-4e0b-905b-befc7bd9c283	5756465	RETURNED	2026-08-21 17:26:59.331425	\N	\N	\N	0	0	0	0	10000	43444	2320	44412	2026-08-21 17:26:59.331425	2026-08-21 22:23:40.869601
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
\.


--
-- Data for Name: sale_payment_requests; Type: TABLE DATA; Schema: public; Owner: xerouser
--

COPY public.sale_payment_requests (id, "requestNo", "invoiceId", "invoiceNumber", "branchId", "recordedByEmployeeId", "recordedByEmployeeName", "customerName", amount, currency, "paymentMode", "paymentDate", "referenceNumber", remarks, "cashAccountId", "chequeNumber", "chequeBankName", "chequeDueDate", "chequeDate", "receiptUrl", status, "reviewedById", "reviewedByName", "reviewedAt", "rejectionReason", "paymentTransactionId", "createdAt", "updatedAt", "collectLater", "paymentContext", "usageRecordId", "taxableAmount", "taxAmount", "taxPercent") FROM stdin;
e8cdea7b-f9a4-40a3-a21a-fea2bdea31d5	SPAY-2026-0002	323dbba4-0669-43fd-aac9-efdec49ad33d	QTN-2026-0001	3f791696-075c-4c28-bcc8-25074cd0a54f	4ad3cdfb-86a4-407a-b502-15a97c9f92ec	RIYAS EMPLOYEE MANAGER	nadhil customer 	20000.00	AED	BANK_TRANSFER	2026-08-21	gfdhgfdg	\N	\N	\N	\N	\N	\N	\N	APPROVED	54e43449-9b18-462d-aec6-112dbbc65d9b	RIYAS FINANCE MANAGER	2026-08-21 16:54:45.398	\N	2d64613f-44d4-4882-b3c5-ef942f1ce6f2	2026-08-21 16:53:53.29394	2026-08-21 16:54:45.398012	f	SALE	\N	\N	\N	\N
200a7c71-a444-42b6-acf0-e0291e233fd0	SPAY-2026-0003	323dbba4-0669-43fd-aac9-efdec49ad33d	QTN-2026-0001	3f791696-075c-4c28-bcc8-25074cd0a54f	4ad3cdfb-86a4-407a-b502-15a97c9f92ec	RIYAS EMPLOYEE MANAGER	nadhil customer 	29450.00	AED	CHEQUE	2026-08-21	\N	\N	\N	CHQ738782	RAKBANK (National Bank of Ras Al Khaimah)	2026-08-21	2026-08-21	\N	APPROVED	54e43449-9b18-462d-aec6-112dbbc65d9b	RIYAS FINANCE MANAGER	2026-08-21 16:57:27.06	\N	25dcf745-24fd-44e8-baf4-07e2e0883932	2026-08-21 16:55:56.701561	2026-08-21 16:57:27.059228	f	SALE	\N	\N	\N	\N
c7cabb6f-5372-442f-b4d2-07f0a2d40f13	SPAY-2026-0001	323dbba4-0669-43fd-aac9-efdec49ad33d	QTN-2026-0001	3f791696-075c-4c28-bcc8-25074cd0a54f	4ad3cdfb-86a4-407a-b502-15a97c9f92ec	RIYAS EMPLOYEE MANAGER	nadhil customer 	2000.00	AED	CASH	2026-08-21	12773287	Advance payment collected at conversion — Invoice QTN-2026-0001	\N	\N	\N	\N	\N	\N	APPROVED	54e43449-9b18-462d-aec6-112dbbc65d9b	RIYAS FINANCE MANAGER	2026-08-21 16:46:23.863	\N	093fa10f-87d2-4a95-87d2-8a90a4a01c33	2026-08-21 16:45:32.14426	2026-08-21 16:46:23.863287	f	SALE	\N	\N	\N	\N
9029841a-4b9b-4cae-8c67-4d2671ded57d	SPAY-2026-0004	02b43c38-8df6-4423-acea-9bb0622a70ef	QTN-2026-0002	3f791696-075c-4c28-bcc8-25074cd0a54f	4ad3cdfb-86a4-407a-b502-15a97c9f92ec	RIYAS EMPLOYEE MANAGER	nadhil customer 	315.00	AED	CASH	2026-08-21	\N	Advance payment collected at conversion — Invoice QTN-2026-0002	\N	\N	\N	\N	\N	\N	APPROVED	54e43449-9b18-462d-aec6-112dbbc65d9b	RIYAS FINANCE MANAGER	2026-08-21 17:51:19.185	\N	d66788c6-7a5f-4a22-9dcf-f7f19db1c424	2026-08-21 17:26:59.486427	2026-08-21 17:51:19.183731	f	RENT_ADVANCE	\N	300.00	15.00	5.00
46d7364d-fb87-4515-b4a3-8abe9674a02c	SPAY-2026-0005	02b43c38-8df6-4423-acea-9bb0622a70ef	QTN-2026-0002	3f791696-075c-4c28-bcc8-25074cd0a54f	54e43449-9b18-462d-aec6-112dbbc65d9b	RIYAS FINANCE MANAGER	nadhil customer 	3097.50	AED	CASH	2026-08-21	\N	Usage bill pending top-up — Aug 2026 to Sept 2026	4b228416-9ce8-4d78-89c2-7c90434d13bd	\N	\N	\N	\N	\N	APPROVED	54e43449-9b18-462d-aec6-112dbbc65d9b	RIYAS FINANCE MANAGER	2026-08-21 17:59:24.549	\N	8c514c83-f145-4185-bf01-74e9f5e88327	2026-08-21 17:59:00.999093	2026-08-21 17:59:24.548636	f	RENT_PERIODIC	169d3a10-98f9-4146-aef0-19f0ee9e364c	\N	\N	\N
1134b488-1dfe-4bb8-aa87-dbc8e76ad669	SPAY-2026-0006	02b43c38-8df6-4423-acea-9bb0622a70ef	QTN-2026-0002	3f791696-075c-4c28-bcc8-25074cd0a54f	54e43449-9b18-462d-aec6-112dbbc65d9b	RIYAS FINANCE MANAGER	nadhil customer 	300.00	AED	CASH	2026-08-21	\N	Usage bill pending top-up — Sept 2026 to Oct 2026	\N	\N	\N	\N	\N	\N	APPROVED	54e43449-9b18-462d-aec6-112dbbc65d9b	RIYAS FINANCE MANAGER	2026-08-21 18:06:45.149	\N	cf19e5f9-f6c0-497d-8fca-616b12e8b36a	2026-08-21 18:06:32.389328	2026-08-21 18:06:45.149179	f	RENT_PERIODIC	bd1bbd7a-97eb-44c2-9fcc-1eee902bb376	\N	\N	\N
d75cd1b3-e7b6-4579-a168-3d428e61f02b	SPAY-2026-0007	06bcfd35-e97f-465a-ad8c-e95c7c7639e1	QTN-2026-0003	3f791696-075c-4c28-bcc8-25074cd0a54f	54e43449-9b18-462d-aec6-112dbbc65d9b	RIYAS FINANCE MANAGER	nadhil customer 	10000.00	AED	CASH	2026-08-21	\N	Usage bill pending top-up — Aug 2026 to Sept 2026	4b228416-9ce8-4d78-89c2-7c90434d13bd	\N	\N	\N	\N	\N	APPROVED	54e43449-9b18-462d-aec6-112dbbc65d9b	RIYAS FINANCE MANAGER	2026-08-21 22:16:46.922	\N	46e8785a-0613-49d2-be6e-0204e4eff0c9	2026-08-21 22:16:26.686682	2026-08-21 22:16:46.922355	f	RENT_PERIODIC	f208eb85-8211-491c-863b-b39840e7c043	\N	\N	\N
3cae4f6a-5e77-4db7-a89d-4021006ea629	SPAY-2026-0008	06bcfd35-e97f-465a-ad8c-e95c7c7639e1	QTN-2026-0003	3f791696-075c-4c28-bcc8-25074cd0a54f	54e43449-9b18-462d-aec6-112dbbc65d9b	RIYAS FINANCE MANAGER	nadhil customer 	10000.00	AED	CASH	2026-08-21	\N	Usage bill pending top-up — Aug 2026 to Sept 2026	4b228416-9ce8-4d78-89c2-7c90434d13bd	\N	\N	\N	\N	\N	APPROVED	54e43449-9b18-462d-aec6-112dbbc65d9b	RIYAS FINANCE MANAGER	2026-08-21 22:17:43.417	\N	2c85cea3-641e-4154-94f9-441850282153	2026-08-21 22:17:27.194574	2026-08-21 22:17:43.41598	f	RENT_PERIODIC	f208eb85-8211-491c-863b-b39840e7c043	\N	\N	\N
0058286e-6716-4bcc-aeba-3fc3f1065a86	SPAY-2026-0009	06bcfd35-e97f-465a-ad8c-e95c7c7639e1	QTN-2026-0003	3f791696-075c-4c28-bcc8-25074cd0a54f	54e43449-9b18-462d-aec6-112dbbc65d9b	RIYAS FINANCE MANAGER	nadhil customer 	212.50	AED	CHEQUE	2026-08-21	CHQ13243	Usage bill pending top-up — Aug 2026 to Sept 2026	\N	CHQ13243	DAIRA BANK	2026-09-11	2026-08-21	\N	APPROVED	54e43449-9b18-462d-aec6-112dbbc65d9b	RIYAS FINANCE MANAGER	2026-08-21 22:19:15.891	\N	3422aadc-99a6-4450-889f-6a08710025a8	2026-08-21 22:18:49.237431	2026-08-21 22:19:15.890454	f	RENT_PERIODIC	f208eb85-8211-491c-863b-b39840e7c043	\N	\N	\N
2f3a3c51-2da7-4d08-b2e6-f532ea0bee85	SPAY-2026-0010	02b43c38-8df6-4423-acea-9bb0622a70ef	QTN-2026-0002	3f791696-075c-4c28-bcc8-25074cd0a54f	54e43449-9b18-462d-aec6-112dbbc65d9b	RIYAS FINANCE MANAGER	nadhil customer 	2771.25	AED	CASH	2026-08-21	\N	Usage bill pending top-up — Sept 2026 to Oct 2026	\N	\N	\N	\N	\N	\N	APPROVED	54e43449-9b18-462d-aec6-112dbbc65d9b	RIYAS FINANCE MANAGER	2026-08-21 22:20:29.08	\N	6864ede9-4f15-4831-a210-7395a8db417c	2026-08-21 22:20:10.717768	2026-08-21 22:20:29.080278	f	RENT_PERIODIC	bd1bbd7a-97eb-44c2-9fcc-1eee902bb376	\N	\N	\N
08014581-e0a1-493d-9c22-f0c44c491a43	SPAY-2026-0011	02b43c38-8df6-4423-acea-9bb0622a70ef	QTN-2026-0002	3f791696-075c-4c28-bcc8-25074cd0a54f	54e43449-9b18-462d-aec6-112dbbc65d9b	RIYAS FINANCE MANAGER	nadhil customer 	2620.80	AED	CASH	2026-08-21	\N	Usage bill pending top-up — Oct 2026 to Nov 2026	4b228416-9ce8-4d78-89c2-7c90434d13bd	\N	\N	\N	\N	\N	APPROVED	54e43449-9b18-462d-aec6-112dbbc65d9b	RIYAS FINANCE MANAGER	2026-08-21 22:22:15.069	\N	74cafbac-f5fe-4771-8c84-bf4119b4f553	2026-08-21 22:21:58.154858	2026-08-21 22:22:15.068476	f	RENT_PERIODIC	e5e17117-0fc0-4d0a-85ae-93569a943001	\N	\N	\N
9ccaeb86-a07f-451e-91b5-ff24e010196d	SPAY-2026-0012	02b43c38-8df6-4423-acea-9bb0622a70ef	QTN-2026-0002	3f791696-075c-4c28-bcc8-25074cd0a54f	54e43449-9b18-462d-aec6-112dbbc65d9b	RIYAS FINANCE MANAGER	nadhil customer 	88471.95	AED	CHEQUE	2026-08-21	133	Usage bill pending top-up — Nov 2026 to Nov 2026	\N	133	FF	\N	2026-08-21	\N	REJECTED	54e43449-9b18-462d-aec6-112dbbc65d9b	RIYAS FINANCE MANAGER	2026-08-21 22:28:05.815	RGTRG	\N	2026-08-21 22:27:00.761092	2026-08-21 22:28:05.820065	f	RENT_PERIODIC	650ea12e-37c7-41a7-9893-5b5907c81a4c	\N	\N	\N
71f5b43c-253f-43e5-9af2-9efd8db9d5b1	SPAY-2026-0015	06bcfd35-e97f-465a-ad8c-e95c7c7639e1	QTN-2026-0003	3f791696-075c-4c28-bcc8-25074cd0a54f	54e43449-9b18-462d-aec6-112dbbc65d9b	RIYAS FINANCE MANAGER	nadhil customer 	500.00	AED	CASH	2026-08-21	\N	Advance for AR-VAT-fix verification	\N	\N	\N	\N	\N	\N	REJECTED	54e43449-9b18-462d-aec6-112dbbc65d9b	RIYAS FINANCE MANAGER	2026-08-22 01:40:06.871	Test payment created during AR-VAT-fix verification, not a real collection — rejecting to avoid cluttering real contract data.	\N	2026-08-22 01:38:29.364872	2026-08-22 01:40:06.88422	f	RENT_PERIODIC	\N	\N	\N	\N
13a78a5e-7445-44b5-86d1-2ff5e51c7bb1	SPAY-2026-0013	02b43c38-8df6-4423-acea-9bb0622a70ef	QTN-2026-0002	3f791696-075c-4c28-bcc8-25074cd0a54f	54e43449-9b18-462d-aec6-112dbbc65d9b	RIYAS FINANCE MANAGER	nadhil customer 	88471.95	AED	CASH	2026-08-21	\N	Usage bill pending top-up — Nov 2026 to Nov 2026	4b228416-9ce8-4d78-89c2-7c90434d13bd	\N	\N	\N	\N	\N	REJECTED	54e43449-9b18-462d-aec6-112dbbc65d9b	RIYAS FINANCE MANAGER	2026-08-21 22:29:04.243	FRFGRGVR	\N	2026-08-21 22:28:27.618745	2026-08-21 22:29:04.246878	f	RENT_PERIODIC	650ea12e-37c7-41a7-9893-5b5907c81a4c	\N	\N	\N
fa241144-0255-4d31-b079-200b3ebb099e	SPAY-2026-0014	02b43c38-8df6-4423-acea-9bb0622a70ef	QTN-2026-0002	3f791696-075c-4c28-bcc8-25074cd0a54f	54e43449-9b18-462d-aec6-112dbbc65d9b	RIYAS FINANCE MANAGER	nadhil customer 	88471.95	AED	CASH	2026-08-21	\N	Usage bill pending top-up — Nov 2026 to Nov 2026	\N	\N	\N	\N	\N	https://pub-8bbb88e1d79042349d0bc47ad1f3eb23.r2.dev/sale-receipts/SPAY-2026-0014-1787346874825.pdf	APPROVED	00000000-0000-0000-0000-000000000001	Employee	2026-08-22 02:12:11.488	\N	a7db7066-9eeb-4844-b5e5-5e04fb84e16e	2026-08-22 00:54:24.942096	2026-08-22 02:44:35.862743	f	RENT_PERIODIC	650ea12e-37c7-41a7-9893-5b5907c81a4c	\N	\N	\N
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
c7447cca-4b61-4543-8def-9d21b93ec9db	169d3a10-98f9-4146-aef0-19f0ee9e364c	f7ce0e8f-bef1-4bbf-95b5-8847b07a4513	2026-08-22 05:30:00	2026-09-21 05:30:00	0	1000	1000	0	1400	1400	0	1200	1200	0	1200	1200
545b5166-fd65-43c3-a9bb-4fba15f438a6	e5e17117-0fc0-4d0a-85ae-93569a943001	f7ce0e8f-bef1-4bbf-95b5-8847b07a4513	2026-10-22 05:30:00	2026-11-19 05:30:00	1000	1100	100	1600	2398	798	1300	1396	96	1400	3200	1800
f1cf1e9c-f016-41aa-bb2e-b2affe4c52cf	bd1bbd7a-97eb-44c2-9fcc-1eee902bb376	f7ce0e8f-bef1-4bbf-95b5-8847b07a4513	2026-09-22 05:30:00	2026-10-21 05:30:00	1000	1000	0	1400	1600	200	1200	1300	100	1200	3400	2200
32fe6298-140e-46e3-af61-b1166abdb644	f208eb85-8211-491c-863b-b39840e7c043	5718f467-d20c-451f-b334-d6ff71573c1a	2026-08-21 05:30:00	2026-09-20 05:30:00	0	200	200	0	1000	1000	0	3000	3000	0	4000	4000
f8f7c8b8-fb0d-4174-9c38-a5c6b12c01ee	650ea12e-37c7-41a7-9893-5b5907c81a4c	f7ce0e8f-bef1-4bbf-95b5-8847b07a4513	2026-11-20 05:30:00	2026-11-20 05:30:00	1100	10000	8900	2398	43444	41046	1396	2320	924	3200	44412	41212
\.


--
-- Data for Name: usage_records; Type: TABLE DATA; Schema: public; Owner: xerouser
--

COPY public.usage_records (id, "contractId", "billingPeriodStart", "billingPeriodEnd", "bwA4Count", "bwA3Count", "colorA4Count", "colorA3Count", "bwA4Delta", "bwA3Delta", "colorA4Delta", "colorA3Delta", "exceededTotal", "exceededCharge", "monthlyRent", "advanceAdjusted", "totalCharge", "discountBwCopies", "discountColorCopies", "discountAmount", "reportedBy", remarks, "meterImageUrl", "createdAt", "updatedAt", "emailSentAt", "whatsappSentAt", "taxableAmount", "taxAmount", "taxPercent", "billStatus", "billCreatedByEmployeeId", "billCreatedByName", "billSentAt", "signingToken", "signingTokenExpiresAt", "signingTokenUsed", "customerApprovedByName", "customerApprovedAt", "customerApprovalMethod", "customerApprovalNote", "customerRejectionReason", "customerRejectedAt", "billType") FROM stdin;
bd1bbd7a-97eb-44c2-9fcc-1eee902bb376	02b43c38-8df6-4423-acea-9bb0622a70ef	2026-09-22	2026-10-21	1000	1600	1300	3400	0	200	100	2200	3500	2625.00	300.00	0.00	3071.25	0	0	0.00	EMPLOYEE		\N	2026-08-21 18:01:32.753275	2026-08-21 21:07:53.434559	\N	\N	2925.00	146.25	5.00	CUSTOMER_APPROVED	54e43449-9b18-462d-aec6-112dbbc65d9b	RIYAS FINANCE MANAGER	\N	3b192feea31b90ee8a2aa29e516916c3447637e104ac634acc959b06de80a388	2026-08-24 21:07:33.987	f	nadhil	2026-08-21 21:07:53.422	FINANCE_MANUAL	6y65u	\N	\N	USAGE
f208eb85-8211-491c-863b-b39840e7c043	06bcfd35-e97f-465a-ad8c-e95c7c7639e1	2026-08-21	2026-09-20	200	1000	3000	4000	200	1000	3000	4000	13200	19250.00	0.00	0.00	20212.50	0	0	0.00	EMPLOYEE		\N	2026-08-21 22:12:27.468307	2026-08-21 22:14:54.612102	\N	\N	19250.00	962.50	5.00	CUSTOMER_APPROVED	54e43449-9b18-462d-aec6-112dbbc65d9b	RIYAS FINANCE MANAGER	\N	\N	\N	f	nadhil kn	2026-08-21 22:14:54.602	FINANCE_MANUAL	rfregerq	\N	\N	USAGE
64f3d014-52ee-47c2-97c7-08c2a2f5df82	02b43c38-8df6-4423-acea-9bb0622a70ef	2026-08-21	2026-08-21	0	0	0	0	0	0	0	0	0	0.00	0.00	0.00	315.00	0	0	0.00	EMPLOYEE	\N	\N	2026-08-21 17:48:50.647029	2026-08-21 17:50:07.827056	\N	\N	300.00	15.00	5.00	CUSTOMER_APPROVED	54e43449-9b18-462d-aec6-112dbbc65d9b	RIYAS FINANCE MANAGER	\N	\N	\N	f	nadhil	2026-08-21 17:50:07.808	FINANCE_MANUAL	he approved	\N	\N	ADVANCE
169d3a10-98f9-4146-aef0-19f0ee9e364c	02b43c38-8df6-4423-acea-9bb0622a70ef	2026-08-22	2026-09-21	1000	1400	1200	1200	1000	1400	1200	1200	5400	2650.00	300.00	0.00	3097.50	0	0	0.00	EMPLOYEE		\N	2026-08-21 17:54:35.66871	2026-08-21 17:57:40.373761	\N	\N	2950.00	147.50	5.00	CUSTOMER_APPROVED	54e43449-9b18-462d-aec6-112dbbc65d9b	RIYAS FINANCE MANAGER	\N	\N	\N	f	nadhil	2026-08-21 17:57:40.359	FINANCE_MANUAL	gtedhg	\N	\N	USAGE
e5e17117-0fc0-4d0a-85ae-93569a943001	02b43c38-8df6-4423-acea-9bb0622a70ef	2026-10-22	2026-11-19	1100	2398	1396	3200	100	798	96	1800	3392	2196.00	300.00	0.00	2620.80	0	0	0.00	EMPLOYEE		\N	2026-08-21 18:10:41.820745	2026-08-21 22:21:26.622076	\N	\N	2496.00	124.80	5.00	CUSTOMER_APPROVED	54e43449-9b18-462d-aec6-112dbbc65d9b	RIYAS FINANCE MANAGER	\N	\N	\N	f	NADHIL	2026-08-21 22:21:26.614	FINANCE_MANUAL	SETHSHASEHQEAASE	\N	\N	USAGE
650ea12e-37c7-41a7-9893-5b5907c81a4c	02b43c38-8df6-4423-acea-9bb0622a70ef	2026-11-20	2026-11-20	10000	43444	2320	44412	8900	41046	924	41212	172340	84259.00	300.00	300.00	88471.95	0	0	0.00	EMPLOYEE		\N	2026-08-21 22:23:40.832365	2026-08-22 02:45:57.390552	\N	\N	84259.00	4212.95	5.00	CUSTOMER_APPROVED	54e43449-9b18-462d-aec6-112dbbc65d9b	RIYAS FINANCE MANAGER	2026-08-22 02:44:34.57	b84e2f083ac4e2d924b911a1453ccf7b5801940b62eb8fc01d265006bf426d9e	2026-08-25 02:44:34.552	t	nadhil customer	2026-08-22 02:45:57.388	REMOTE_LINK	CONTRACT COMPLETED	\N	\N	USAGE
\.


--
-- Data for Name: vat_remittances; Type: TABLE DATA; Schema: public; Owner: xerouser
--

COPY public.vat_remittances (id, "branchId", "periodFrom", "periodTo", "amountRemitted", "remittedDate", "referenceNo", notes, "createdBy", "createdAt") FROM stdin;
\.


--
-- Name: cn_seq_2026; Type: SEQUENCE SET; Schema: public; Owner: xerouser
--

SELECT pg_catalog.setval('public.cn_seq_2026', 16, true);


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
-- Name: migration_markers migration_markers_pkey; Type: CONSTRAINT; Schema: public; Owner: xerouser
--

ALTER TABLE ONLY public.migration_markers
    ADD CONSTRAINT migration_markers_pkey PRIMARY KEY (key);


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
-- Name: IDX_sale_payment_requests_usageRecordId; Type: INDEX; Schema: public; Owner: xerouser
--

CREATE INDEX "IDX_sale_payment_requests_usageRecordId" ON public.sale_payment_requests USING btree ("usageRecordId");


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
-- Name: uniq_contract_agreements_invoiceId; Type: INDEX; Schema: public; Owner: xerouser
--

CREATE UNIQUE INDEX "uniq_contract_agreements_invoiceId" ON public.contract_agreements USING btree ("invoiceId");


--
-- Name: uniq_product_allocation_active; Type: INDEX; Schema: public; Owner: xerouser
--

CREATE UNIQUE INDEX uniq_product_allocation_active ON public.product_allocations USING btree ("productId") WHERE (("productId" IS NOT NULL) AND (status = 'ALLOCATED'::public.product_allocations_status_enum));


--
-- Name: uniq_usage_records_signingToken; Type: INDEX; Schema: public; Owner: xerouser
--

CREATE UNIQUE INDEX "uniq_usage_records_signingToken" ON public.usage_records USING btree ("signingToken") WHERE ("signingToken" IS NOT NULL);


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

\unrestrict vpHtde3veTEav8V62QD6Ikodw1wQW2EKfOBchJmjtJX7o0gXwUHGZFE8IuunANf

