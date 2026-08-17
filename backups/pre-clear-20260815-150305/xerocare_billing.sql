--
-- PostgreSQL database dump
--

\restrict oHek2eqovVb1mLesnTniDlOpo8qsXPFV216JqNgX7pMrfSfz6eky7rejEuOftU7

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
-- Name: credit_note_status_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.credit_note_status_enum AS ENUM (
    'DRAFT',
    'PENDING_APPROVAL',
    'APPROVED',
    'REJECTED',
    'COMPLETED',
    'PRODUCT_REPLACED'
);


--
-- Name: credit_note_type_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.credit_note_type_enum AS ENUM (
    'DIRECT_REFUND',
    'REPLACEMENT',
    'CREDIT_EXCHANGE'
);


--
-- Name: damage_reason_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.damage_reason_enum AS ENUM (
    'Damaged Product',
    'Incomplete Parts',
    'Defective',
    'Wrong Item Delivered',
    'Other'
);


--
-- Name: device_meter_readings_source_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.device_meter_readings_source_enum AS ENUM (
    'MANUAL',
    'SYSTEM',
    'OCR'
);


--
-- Name: guarantee_cheques_purpose_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.guarantee_cheques_purpose_enum AS ENUM (
    'PERFORMANCE_SECURITY',
    'OTHER'
);


--
-- Name: guarantee_cheques_status_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.guarantee_cheques_status_enum AS ENUM (
    'RECEIVED',
    'RETURNED',
    'DEPOSITED'
);


--
-- Name: invoice_items_itemtype_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.invoice_items_itemtype_enum AS ENUM (
    'PRICING_RULE',
    'PRODUCT',
    'SPARE_PART'
);


--
-- Name: invoices_billtype_enum; Type: TYPE; Schema: public; Owner: -
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


--
-- Name: invoices_contractstatus_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.invoices_contractstatus_enum AS ENUM (
    'PENDING_CONFIRMATION',
    'ACTIVE',
    'COMPLETED',
    'CANCELLED'
);


--
-- Name: invoices_deliverystatus_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.invoices_deliverystatus_enum AS ENUM (
    'NOT_DELIVERED',
    'DELIVERED'
);


--
-- Name: invoices_leasetype_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.invoices_leasetype_enum AS ENUM (
    'EMI',
    'FSM'
);


--
-- Name: invoices_rentperiod_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.invoices_rentperiod_enum AS ENUM (
    'MONTHLY',
    'QUARTERLY',
    'HALF_YEARLY',
    'YEARLY',
    'CUSTOM'
);


--
-- Name: invoices_renttype_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.invoices_renttype_enum AS ENUM (
    'FIXED_LIMIT',
    'FIXED_COMBO',
    'FIXED_FLAT',
    'CPC',
    'CPC_COMBO'
);


--
-- Name: invoices_saletype_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.invoices_saletype_enum AS ENUM (
    'SALE',
    'RENT',
    'LEASE',
    'PRODUCT_SALE',
    'SPAREPART_SALE',
    'SERVICE'
);


--
-- Name: invoices_securitydepositmode_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.invoices_securitydepositmode_enum AS ENUM (
    'CASH',
    'CHEQUE',
    'BANK_TRANSFER',
    'CREDIT_CARD',
    'UPI'
);


--
-- Name: invoices_status_enum; Type: TYPE; Schema: public; Owner: -
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


--
-- Name: invoices_type_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.invoices_type_enum AS ENUM (
    'QUOTATION',
    'PROFORMA',
    'FINAL',
    'OPENING'
);


--
-- Name: invoices_warrantydurationunit_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.invoices_warrantydurationunit_enum AS ENUM (
    'months',
    'years'
);


--
-- Name: invoices_warrantytype_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.invoices_warrantytype_enum AS ENUM (
    'none',
    'duration',
    'copies',
    'both'
);


--
-- Name: opening_balance_entries_balance_type_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.opening_balance_entries_balance_type_enum AS ENUM (
    'SALE_OUTSTANDING',
    'RENT_CONTRACT',
    'LEASE_CONTRACT',
    'SERVICE_DEBT',
    'OTHER_DEBT'
);


--
-- Name: payment_ledgers_paymentmode_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.payment_ledgers_paymentmode_enum AS ENUM (
    'CASH',
    'BANK_TRANSFER',
    'CHEQUE',
    'CREDIT_CARD'
);


--
-- Name: product_allocations_status_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.product_allocations_status_enum AS ENUM (
    'ALLOCATED',
    'RETURNED',
    'REPLACED'
);


--
-- Name: swap_request_status_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.swap_request_status_enum AS ENUM (
    'PENDING',
    'APPROVED',
    'REJECTED'
);


--
-- Name: usage_records_reportedby_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.usage_records_reportedby_enum AS ENUM (
    'CUSTOMER',
    'EMPLOYEE'
);


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: account_reconciliations; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: asset_depreciation_register; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: cash_bank_accounts; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: cashbook_entries; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: chart_of_accounts; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: cheque_status_history; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: cheques; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: cn_seq_2026; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.cn_seq_2026
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: contract_agreements; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: country_tax_rules; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: credit_notes; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: depreciation_brand_rules; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: depreciation_journal_entries; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: depreciation_model_rules; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: device_meter_readings; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: employee_expense_requests; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: employee_target_achievements; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: employee_targets; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: equity_entries; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: exchange_rates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.exchange_rates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    "fromCurrency" character varying(3) NOT NULL,
    "toCurrency" character varying(3) NOT NULL,
    rate numeric(12,6) NOT NULL,
    "setBy" uuid NOT NULL,
    "createdAt" timestamp without time zone DEFAULT now()
);


--
-- Name: expense_entries; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: guarantee_cheques; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: income_entries; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: installation_requests; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: invoice_items; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: invoice_ledger; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: invoices; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: machine_swap_requests; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: manual_journal_entries; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: manual_payables; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: manual_receivables; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: opening_balance_entries; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: owners; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: payable_payments; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: payment_ledgers; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: payment_transactions; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: product_allocations; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: quotation_template_assignments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.quotation_template_assignments (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "templateId" uuid NOT NULL,
    "employeeId" character varying NOT NULL,
    "assignedAt" timestamp without time zone DEFAULT now() NOT NULL,
    "assignedBy" character varying NOT NULL
);


--
-- Name: receivable_payments; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: return_credits; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: sale_payment_requests; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: spare_part_credit_notes; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: usage_record_items; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: usage_records; Type: TABLE; Schema: public; Owner: -
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
    "taxPercent" numeric(5,2)
);


--
-- Name: vat_remittances; Type: TABLE; Schema: public; Owner: -
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


--
-- Data for Name: account_reconciliations; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.account_reconciliations (id, "accountId", "reconciliationDate", "statementDate", "bookBalance", "statementBalance", difference, "isBalanced", notes, "createdBy", "createdAt") FROM stdin;
\.


--
-- Data for Name: asset_depreciation_register; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.asset_depreciation_register (id, "productId", "brandId", "modelId", "branchId", "purchaseDate", "purchasePrice", "annualDepreciationPct", "usefulLifeMonths", "salvageValuePct", "salvageValue", method, status, "disposalDate", "disposalValue", notes, "createdBy", "createdAt", "updatedAt", "assetType", "assetCategory", "assetName") FROM stdin;
\.


--
-- Data for Name: audit_logs; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.audit_logs (id, "entityId", action, "performedBy", "oldValue", "newValue", details, "createdAt") FROM stdin;
6b6081d2-d583-443a-8f03-f5c3052189d4	246abb8b-43b8-4a1f-ac79-6404ef62ea8f	CREATION	b9708648-f4d7-4aaa-ad34-0949ceb8400c	\N	\N	Created quotation QTN-2026-0001	2026-08-13 14:29:10.11522
c98d1fc0-4de9-4fcb-9e52-6590d8eea861	246abb8b-43b8-4a1f-ac79-6404ef62ea8f	STATUS_CHANGE	b9708648-f4d7-4aaa-ad34-0949ceb8400c	DRAFT	EMPLOYEE_APPROVED	Employee approved the quotation for Finance review.	2026-08-13 14:29:17.446944
f8e1791f-b6cd-449c-8d94-f34dfe64e5db	baee65a2-a8d5-4a26-8428-37da883ebed6	CREATION	b9708648-f4d7-4aaa-ad34-0949ceb8400c	\N	\N	Created quotation QTN-2026-0002	2026-08-13 14:31:17.099767
39f3684c-225f-4a5f-9024-2671f0679055	baee65a2-a8d5-4a26-8428-37da883ebed6	STATUS_CHANGE	b9708648-f4d7-4aaa-ad34-0949ceb8400c	DRAFT	EMPLOYEE_APPROVED	Employee approved the quotation for Finance review.	2026-08-13 14:31:21.784597
522c3a93-9ab4-4cc8-966c-1b49c29c32c0	501212bc-250b-491e-96f2-495af1635c3c	CREATION	b9708648-f4d7-4aaa-ad34-0949ceb8400c	\N	\N	Created quotation QTN-2026-0003	2026-08-13 14:32:31.911912
9be7f116-c5b5-4bf9-9061-bc2186ed939b	501212bc-250b-491e-96f2-495af1635c3c	STATUS_CHANGE	b9708648-f4d7-4aaa-ad34-0949ceb8400c	DRAFT	EMPLOYEE_APPROVED	Employee approved the quotation for Finance review.	2026-08-13 14:32:38.610309
e16c0a8b-5d6f-414c-bc30-60214ad2bea4	501212bc-250b-491e-96f2-495af1635c3c	STATUS_CHANGE	5879065e-fc03-42a7-b009-4ef9ae39642e	EMPLOYEE_APPROVED	FINANCE_APPROVED	Finance approved quotation pricing.	2026-08-13 14:40:17.438897
55201f84-ea9a-4292-bca9-234a4df2ef3f	baee65a2-a8d5-4a26-8428-37da883ebed6	STATUS_CHANGE	5879065e-fc03-42a7-b009-4ef9ae39642e	EMPLOYEE_APPROVED	FINANCE_APPROVED	Finance approved quotation pricing.	2026-08-13 14:40:20.419125
85735f43-bb81-406a-82b5-cb7f1d1f4382	246abb8b-43b8-4a1f-ac79-6404ef62ea8f	STATUS_CHANGE	5879065e-fc03-42a7-b009-4ef9ae39642e	EMPLOYEE_APPROVED	FINANCE_APPROVED	Finance approved quotation pricing.	2026-08-13 14:40:23.200017
f883a315-50b6-4dbb-abc3-bad82be1bf55	246abb8b-43b8-4a1f-ac79-6404ef62ea8f	STATUS_CHANGE	b9708648-f4d7-4aaa-ad34-0949ceb8400c	FINANCE_APPROVED	DRAFT	Converted approved quotation into transaction (Proforma draft).	2026-08-13 14:43:45.167228
cdbab31b-63e7-490c-bc35-371d3b2594a5	246abb8b-43b8-4a1f-ac79-6404ef62ea8f	ALLOCATION	b9708648-f4d7-4aaa-ad34-0949ceb8400c	\N	\N	Finance allocated inventory machines to Proforma. Status: FINANCE_APPROVED, Contract Status: PENDING_CONFIRMATION.	2026-08-13 14:43:45.290551
473136c6-13ad-4e12-8f39-41f7f2b40a1a	246abb8b-43b8-4a1f-ac79-6404ef62ea8f	ACTIVATION	b9708648-f4d7-4aaa-ad34-0949ceb8400c	\N	\N	Activated contract/invoice. Status: INVOICED, Contract Status: ACTIVE.	2026-08-13 14:43:45.375365
3d1533bb-ca5f-4d8b-9bc7-6c7a4aeb3d8b	baee65a2-a8d5-4a26-8428-37da883ebed6	STATUS_CHANGE	b9708648-f4d7-4aaa-ad34-0949ceb8400c	FINANCE_APPROVED	DRAFT	Converted approved quotation into transaction (Proforma draft).	2026-08-13 14:55:46.255827
b4cb9fda-bef6-4e5d-aeee-75b5955f19a8	baee65a2-a8d5-4a26-8428-37da883ebed6	ALLOCATION	b9708648-f4d7-4aaa-ad34-0949ceb8400c	\N	\N	Finance allocated inventory machines to Proforma. Status: FINANCE_APPROVED, Contract Status: PENDING_CONFIRMATION.	2026-08-13 14:55:46.405688
832d8cfe-fb9c-4de4-9ec6-ba44886c07ff	baee65a2-a8d5-4a26-8428-37da883ebed6	ACTIVATION	b9708648-f4d7-4aaa-ad34-0949ceb8400c	\N	\N	Activated contract/invoice. Status: ACTIVE_CONTRACT, Contract Status: ACTIVE.	2026-08-13 14:58:31.793604
2ba6e09d-89e3-4e2c-82b9-33c0219428a0	baee65a2-a8d5-4a26-8428-37da883ebed6	STATUS_CHANGE	5879065e-fc03-42a7-b009-4ef9ae39642e	ACTIVE_CONTRACT	PAID	Invoice fully paid via payment transaction. Status updated to PAID.	2026-08-13 15:24:43.502859
c523803d-2b0d-4079-bb86-ac358a8f70de	baee65a2-a8d5-4a26-8428-37da883ebed6	PAYMENT_RECORDED	5879065e-fc03-42a7-b009-4ef9ae39642e	\N	\N	Payment transaction of QAR 2000 recorded via CASH.	2026-08-13 15:24:43.526333
b640b2cd-38aa-4696-a36f-a243dd6b2efd	baee65a2-a8d5-4a26-8428-37da883ebed6	PAYMENT_RECORDED	5879065e-fc03-42a7-b009-4ef9ae39642e	\N	\N	Payment transaction of QAR 2000 recorded via CASH.	2026-08-13 15:25:54.31118
c8aa4f4f-2241-4020-892c-07555eb34879	77f653f4-e93c-4d6d-801b-e553391317dd	CREATION	b9708648-f4d7-4aaa-ad34-0949ceb8400c	\N	\N	Created quotation QTN-2026-0004	2026-08-13 17:28:45.023461
21d13f55-4295-43b1-8582-b11133d297e8	77f653f4-e93c-4d6d-801b-e553391317dd	STATUS_CHANGE	b9708648-f4d7-4aaa-ad34-0949ceb8400c	DRAFT	EMPLOYEE_APPROVED	Employee approved the quotation for Finance review.	2026-08-13 17:28:50.039669
9652be34-3489-4eb1-8bec-11ac16db3f6b	77f653f4-e93c-4d6d-801b-e553391317dd	STATUS_CHANGE	5879065e-fc03-42a7-b009-4ef9ae39642e	EMPLOYEE_APPROVED	FINANCE_APPROVED	Finance approved quotation pricing.	2026-08-13 17:29:57.256802
66057081-fe78-47bd-ab46-05f38908c335	77f653f4-e93c-4d6d-801b-e553391317dd	STATUS_CHANGE	b9708648-f4d7-4aaa-ad34-0949ceb8400c	FINANCE_APPROVED	DRAFT	Converted approved quotation into transaction (Proforma draft).	2026-08-13 17:33:00.670081
7f759203-a08f-4177-aab3-403f32943297	77f653f4-e93c-4d6d-801b-e553391317dd	ALLOCATION	b9708648-f4d7-4aaa-ad34-0949ceb8400c	\N	\N	Finance allocated inventory machines to Proforma. Status: FINANCE_APPROVED, Contract Status: PENDING_CONFIRMATION.	2026-08-13 17:33:00.985175
178320ac-e6c3-44fa-abe2-d4706d86ad2b	77f653f4-e93c-4d6d-801b-e553391317dd	ACTIVATION	b9708648-f4d7-4aaa-ad34-0949ceb8400c	\N	\N	Activated contract/invoice. Status: INVOICED, Contract Status: ACTIVE.	2026-08-13 17:33:01.135906
dc30b22d-bdcf-4a5e-8c17-29fe493a947a	9e9762aa-4fe6-45db-bba7-2e088fb67c98	CREATION	b9708648-f4d7-4aaa-ad34-0949ceb8400c	\N	\N	Created quotation QTN-2026-0005	2026-08-13 18:22:44.921482
ec27a1b4-cec5-4f38-aac3-a08a6d916880	9e9762aa-4fe6-45db-bba7-2e088fb67c98	STATUS_CHANGE	b9708648-f4d7-4aaa-ad34-0949ceb8400c	DRAFT	EMPLOYEE_APPROVED	Employee approved the quotation for Finance review.	2026-08-13 18:22:48.875975
68918f2a-9857-415a-b899-cecc8dd0674f	9e9762aa-4fe6-45db-bba7-2e088fb67c98	STATUS_CHANGE	5879065e-fc03-42a7-b009-4ef9ae39642e	EMPLOYEE_APPROVED	FINANCE_APPROVED	Finance approved quotation pricing.	2026-08-13 18:23:04.501283
20263f60-5402-4a2c-90e5-d7a8a184f3f5	9e9762aa-4fe6-45db-bba7-2e088fb67c98	STATUS_CHANGE	b9708648-f4d7-4aaa-ad34-0949ceb8400c	FINANCE_APPROVED	DRAFT	Converted approved quotation into transaction (Proforma draft).	2026-08-13 18:32:24.182539
e2809f4c-a9a2-4af7-af1b-f32e96d77a4e	9e9762aa-4fe6-45db-bba7-2e088fb67c98	ALLOCATION	b9708648-f4d7-4aaa-ad34-0949ceb8400c	\N	\N	Finance allocated inventory machines to Proforma. Status: FINANCE_APPROVED, Contract Status: PENDING_CONFIRMATION.	2026-08-13 18:32:24.408025
9f1b85a5-b158-473b-a17a-2239153b91ca	9e9762aa-4fe6-45db-bba7-2e088fb67c98	ACTIVATION	b9708648-f4d7-4aaa-ad34-0949ceb8400c	\N	\N	Activated contract/invoice. Status: ACTIVE_CONTRACT, Contract Status: ACTIVE.	2026-08-13 19:03:58.368789
2c57f67f-484c-40a5-9b02-40e7af6ed1ad	502d6e65-5169-495e-a4cf-99434fd16d61	CREATION	b9708648-f4d7-4aaa-ad34-0949ceb8400c	\N	\N	Created quotation QTN-2026-0006	2026-08-13 19:22:37.570771
0a3b7210-ea22-4ca6-a47d-b8008a196681	502d6e65-5169-495e-a4cf-99434fd16d61	STATUS_CHANGE	b9708648-f4d7-4aaa-ad34-0949ceb8400c	DRAFT	EMPLOYEE_APPROVED	Employee approved the quotation for Finance review.	2026-08-13 19:22:39.480914
3e8ae967-44e8-4d08-bfa9-77fb45e951b8	502d6e65-5169-495e-a4cf-99434fd16d61	STATUS_CHANGE	5879065e-fc03-42a7-b009-4ef9ae39642e	EMPLOYEE_APPROVED	FINANCE_APPROVED	Finance approved quotation pricing.	2026-08-13 19:22:49.565428
38ebe9b3-f037-4dd3-acd5-4d9d7f01482e	502d6e65-5169-495e-a4cf-99434fd16d61	STATUS_CHANGE	b9708648-f4d7-4aaa-ad34-0949ceb8400c	FINANCE_APPROVED	DRAFT	Converted approved quotation into transaction (Proforma draft).	2026-08-13 19:42:30.951603
fd692000-8160-4fa4-a838-0fb456103d7a	502d6e65-5169-495e-a4cf-99434fd16d61	ALLOCATION	b9708648-f4d7-4aaa-ad34-0949ceb8400c	\N	\N	Finance allocated inventory machines to Proforma. Status: FINANCE_APPROVED, Contract Status: PENDING_CONFIRMATION.	2026-08-13 19:42:31.205279
83b1f2fd-e8e3-4ff8-a5e1-f8995539bb1b	502d6e65-5169-495e-a4cf-99434fd16d61	ACTIVATION	b9708648-f4d7-4aaa-ad34-0949ceb8400c	\N	\N	Activated contract/invoice. Status: ACTIVE_CONTRACT, Contract Status: ACTIVE.	2026-08-13 19:43:20.564026
\.


--
-- Data for Name: cash_bank_accounts; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.cash_bank_accounts (id, name, type, "bankName", "accountNumber", "branchId", currency, "openingBalance", "currentBalance", notes, "isActive", "createdAt", "updatedAt", iban, "accountType", "openingDate", "responsiblePersonId", "contactPerson", "isDefault") FROM stdin;
f9e4afb5-433f-4f41-a181-c0d22d7d6b59	XEROCARE BANK ACCOUNT	BANK	FAB ABUDABI BANK	4567387764663	d7b8ef01-87a7-4e0b-bd92-f0c6c4cd3352	AED	150000.00	150000.00	\N	t	2026-08-13 13:41:45.385152	2026-08-13 13:41:45.385152	AE455435	CURRENT	2026-08-13	\N	RASHEED XEROCARE	f
4b729758-4a85-40a0-91ff-0f87da938ea5	XEROCARE UAE CASH ACCOUNT	CASH	\N	\N	d7b8ef01-87a7-4e0b-bd92-f0c6c4cd3352	AED	100000.00	53555.00	\N	t	2026-08-13 13:40:52.811472	2026-08-13 19:46:07.959661	\N	CURRENT	2026-08-13	\N	\N	f
\.


--
-- Data for Name: cashbook_entries; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.cashbook_entries (id, "referenceNo", date, "accountId", "entryType", amount, category, description, "linkedInvoiceId", "linkedPoId", "linkedExpenseId", "paymentMode", "chequeNo", notes, "createdBy", "branchId", "createdAt", "sourceType", "sourceId", "isReversed", "reversedById", "isPoOrphaned") FROM stdin;
a078a2b0-c725-440f-a715-60ccc60eada3	CE-SPAY-2026-0001	2026-08-13	4b729758-4a85-40a0-91ff-0f87da938ea5	RECEIPT	10000.00	SALE_COLLECTION	Sale payment — QTN-2026-0001 (NADHIL CUSTOMER)	246abb8b-43b8-4a1f-ac79-6404ef62ea8f	\N	\N	CASH	\N	\N	5879065e-fc03-42a7-b009-4ef9ae39642e	d7b8ef01-87a7-4e0b-bd92-f0c6c4cd3352	2026-08-13 14:45:33.753396	SALE_PAYMENT	f50faccc-5a43-4c3b-a7c5-ec51603d185b	f	\N	\N
358eeb90-712e-4e55-866e-d4bd61003657	CE-SPAY-2026-0002	2026-08-13	4b729758-4a85-40a0-91ff-0f87da938ea5	RECEIPT	10000.00	SALE_COLLECTION	Sale payment — QTN-2026-0001 (NADHIL CUSTOMER)	246abb8b-43b8-4a1f-ac79-6404ef62ea8f	\N	\N	CASH	\N	\N	5879065e-fc03-42a7-b009-4ef9ae39642e	d7b8ef01-87a7-4e0b-bd92-f0c6c4cd3352	2026-08-13 14:46:55.869035	SALE_PAYMENT	460d2d35-f651-4ec8-b433-dfaa90753b4b	f	\N	\N
d5e49fb8-81f0-4b6e-bde1-2bb3cad92f57	CE-SPAY-2026-0003	2026-08-13	4b729758-4a85-40a0-91ff-0f87da938ea5	RECEIPT	15700.00	SALE_COLLECTION	Sale payment — QTN-2026-0001 (NADHIL CUSTOMER)	246abb8b-43b8-4a1f-ac79-6404ef62ea8f	\N	\N	CASH	\N	\N	5879065e-fc03-42a7-b009-4ef9ae39642e	d7b8ef01-87a7-4e0b-bd92-f0c6c4cd3352	2026-08-13 14:49:34.222643	SALE_PAYMENT	e1f247c9-1ae4-41b9-b175-0c7a7a60d90d	f	\N	\N
014628af-0773-4d18-b950-3a5408aa4d1f	CE-SPAY-2026-0004	2026-08-13	4b729758-4a85-40a0-91ff-0f87da938ea5	RECEIPT	500.00	SALE_COLLECTION	Sale payment — QTN-2026-0002 (NADHIL CUSTOMER)	baee65a2-a8d5-4a26-8428-37da883ebed6	\N	\N	CASH	\N	\N	5879065e-fc03-42a7-b009-4ef9ae39642e	d7b8ef01-87a7-4e0b-bd92-f0c6c4cd3352	2026-08-13 14:58:12.112589	SALE_PAYMENT	2590d738-f58a-4354-9b76-c4434440189f	f	\N	\N
b12ffe48-7489-4aa0-858b-c57a301e47ac	RCPT-67f109c8-533b-48c3-ba84-3e35f376a19a	2026-08-13	4b729758-4a85-40a0-91ff-0f87da938ea5	RECEIPT	2000.00	Customer Payment	Receipt for invoice QTN-2026-0002	baee65a2-a8d5-4a26-8428-37da883ebed6	\N	\N	CASH	MONTHLY PAYMENT COLLECTION	\N	5879065e-fc03-42a7-b009-4ef9ae39642e	d7b8ef01-87a7-4e0b-bd92-f0c6c4cd3352	2026-08-13 15:24:43.512506	INVOICE_PAYMENT	67f109c8-533b-48c3-ba84-3e35f376a19a	f	\N	\N
4204a295-677f-4e02-a78d-550d42f0bcab	RCPT-c397621d-97ce-4689-9ae4-96999950d594	2026-08-13	4b729758-4a85-40a0-91ff-0f87da938ea5	RECEIPT	2000.00	Customer Payment	Receipt for invoice QTN-2026-0002	baee65a2-a8d5-4a26-8428-37da883ebed6	\N	\N	CASH	PAYMENT MONTH 2	\N	5879065e-fc03-42a7-b009-4ef9ae39642e	d7b8ef01-87a7-4e0b-bd92-f0c6c4cd3352	2026-08-13 15:25:54.298295	INVOICE_PAYMENT	c397621d-97ce-4689-9ae4-96999950d594	f	\N	\N
194f1a62-797b-4b19-86e0-ded401ad222c	CBK-2026-00007	2026-08-13	4b729758-4a85-40a0-91ff-0f87da938ea5	PAYMENT	10000.00	Vendor Purchase	Vendor payment: vendor (EXP-REQ-2026-0001)	\N	\N	\N	Cash	\N	Manager purchase payment request. PurchasePayment recorded in ven_inv (ID: 3d7b67e8-9809-444d-9afa-f861e192037a). Cash held pending Finance approval.	5879065e-fc03-42a7-b009-4ef9ae39642e	d7b8ef01-87a7-4e0b-bd92-f0c6c4cd3352	2026-08-13 15:39:05.17368	\N	\N	f	\N	\N
71272174-2166-493d-a280-dc6a76d9f754	CBK-2026-00008	2026-08-13	4b729758-4a85-40a0-91ff-0f87da938ea5	PAYMENT	115000.00	Vendor Purchase	Vendor payment: vendor (EXP-REQ-2026-0002)	\N	\N	\N	Cash	\N	Manager purchase payment request. PurchasePayment recorded in ven_inv (ID: 0967dc13-cea8-42c7-b632-ca0c6f010302). Cash held pending Finance approval.	5879065e-fc03-42a7-b009-4ef9ae39642e	d7b8ef01-87a7-4e0b-bd92-f0c6c4cd3352	2026-08-13 15:43:55.147159	\N	\N	f	\N	\N
4663544c-dca6-4c91-b442-36e396ed7ad6	CE-SPAY-2026-0008	2026-08-13	4b729758-4a85-40a0-91ff-0f87da938ea5	RECEIPT	12000.00	SALE_COLLECTION	Sale payment — QTN-2026-0004 (NADHIL CUSTOMER)	77f653f4-e93c-4d6d-801b-e553391317dd	\N	\N	CASH	\N	\N	88888888-8888-8888-8888-888888888888	d7b8ef01-87a7-4e0b-bd92-f0c6c4cd3352	2026-08-13 17:58:11.133709	SALE_PAYMENT	18daffbd-78aa-4421-86d6-8b4fbb00fd58	f	\N	\N
89d6288e-cd50-4255-b659-3f49fcf6f5a1	CE-SPAY-2026-0009	2026-08-13	4b729758-4a85-40a0-91ff-0f87da938ea5	RECEIPT	5000.00	SALE_COLLECTION	Sale payment — QTN-2026-0004 (NADHIL CUSTOMER)	77f653f4-e93c-4d6d-801b-e553391317dd	\N	\N	CASH	\N	\N	88888888-8888-8888-8888-888888888888	d7b8ef01-87a7-4e0b-bd92-f0c6c4cd3352	2026-08-13 17:58:11.3752	SALE_PAYMENT	4e1cf9c2-7c5d-42a8-89a7-a5c57978b9cd	f	\N	\N
0d2a72c4-6340-408a-8496-3c141fdd5529	CE-SPAY-2026-0006	2026-08-13	4b729758-4a85-40a0-91ff-0f87da938ea5	RECEIPT	1000.00	SALE_COLLECTION	Sale payment — QTN-2026-0004 (NADHIL CUSTOMER)	77f653f4-e93c-4d6d-801b-e553391317dd	\N	\N	CASH	\N	\N	5879065e-fc03-42a7-b009-4ef9ae39642e	d7b8ef01-87a7-4e0b-bd92-f0c6c4cd3352	2026-08-13 18:05:13.554636	SALE_PAYMENT	18c5294e-c47d-4dfd-9dc7-2a6b178d183b	f	\N	\N
96fb0bf1-a466-40d5-9b56-595de97b937c	CE-SPAY-2026-0010	2026-08-13	4b729758-4a85-40a0-91ff-0f87da938ea5	RECEIPT	18750.00	SALE_COLLECTION	Sale payment — QTN-2026-0004 (NADHIL CUSTOMER)	77f653f4-e93c-4d6d-801b-e553391317dd	\N	\N	CASH	\N	\N	5879065e-fc03-42a7-b009-4ef9ae39642e	d7b8ef01-87a7-4e0b-bd92-f0c6c4cd3352	2026-08-13 18:06:34.09869	SALE_PAYMENT	8e1f6bb3-ed8a-4ae3-a6ec-55438cd2c96a	f	\N	\N
5a596e28-0dc6-4e7e-84db-80559552d187	CE-SPAY-2026-0013	2026-08-13	4b729758-4a85-40a0-91ff-0f87da938ea5	RECEIPT	100.00	SALE_COLLECTION	Sale payment — QTN-2026-0005 (NADHIL CUSTOMER)	9e9762aa-4fe6-45db-bba7-2e088fb67c98	\N	\N	CASH	\N	\N	88888888-8888-8888-8888-888888888888	d7b8ef01-87a7-4e0b-bd92-f0c6c4cd3352	2026-08-13 18:53:51.172173	SALE_PAYMENT	38c47ba3-bc38-4658-a25f-8f9f60e00112	f	\N	\N
2735240a-661f-4d62-8c4a-50fc237d2f0e	CE-SPAY-2026-0014	2026-08-13	4b729758-4a85-40a0-91ff-0f87da938ea5	RECEIPT	5.00	SALE_COLLECTION	Sale payment — QTN-2026-0005 (NADHIL CUSTOMER)	9e9762aa-4fe6-45db-bba7-2e088fb67c98	\N	\N	CASH	\N	\N	88888888-8888-8888-8888-888888888888	d7b8ef01-87a7-4e0b-bd92-f0c6c4cd3352	2026-08-13 18:54:31.47065	SALE_PAYMENT	6c61c5c4-6aa4-40a6-a930-d7f9059b7668	f	\N	\N
ac5d8099-e291-468b-a60d-72a2a636a378	CE-SPAY-2026-0015	2026-08-13	4b729758-4a85-40a0-91ff-0f87da938ea5	RECEIPT	1500.00	SALE_COLLECTION	Sale payment — QTN-2026-0006 (NADHIL CUSTOMER)	502d6e65-5169-495e-a4cf-99434fd16d61	\N	\N	CASH	\N	\N	5879065e-fc03-42a7-b009-4ef9ae39642e	d7b8ef01-87a7-4e0b-bd92-f0c6c4cd3352	2026-08-13 19:46:07.959661	SALE_PAYMENT	e29a35fe-3764-4aaa-8986-2077706cec74	f	\N	\N
\.


--
-- Data for Name: chart_of_accounts; Type: TABLE DATA; Schema: public; Owner: -
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
-- Data for Name: cheque_status_history; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.cheque_status_history (id, cheque_id, from_status, to_status, notes, changed_by, changed_at) FROM stdin;
\.


--
-- Data for Name: cheques; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.cheques (id, cheque_no, bank_name, party_name, amount, due_date, issue_date, type, status, description, branch_id, account_id, cashbook_entry_id, created_by, created_at, updated_at, source_type, source_reference_id, source_label, invoice_no, cheque_date, deposit_date, cleared_date) FROM stdin;
\.


--
-- Data for Name: contract_agreements; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.contract_agreements (id, "agreementNumber", "invoiceId", "branchId", "contractDate", "customerName", "customerAddress", "customerPhone", "customerEmail", "customerVatNumber", "createdByEmployeeId", "createdByEmployeeName", "dealerName", "dealerAddress", "dealerPhone", "employeeSignatureData", "employeeSignedById", "employeeSignedByName", "employeeSignedAt", "customerSignatureData", "customerSignedMethod", "customerSignedByName", "customerSignedAt", "signingToken", "signingTokenExpiresAt", "signingTokenUsed", "signatureStatus", "termsAndConditions", "createdAt", "updatedAt", "customerSignedDocumentUrl", "customerSignedDocumentNote") FROM stdin;
d4e09bb8-c18a-458c-a2fa-64a4161094c4	CA-2026-001	baee65a2-a8d5-4a26-8428-37da883ebed6	d7b8ef01-87a7-4e0b-bd92-f0c6c4cd3352	2026-08-13	NADHIL CUSTOMER	\N	\N	\N	\N	b9708648-f4d7-4aaa-ad34-0949ceb8400c	RIYAS EMPLOYEE MANAGER	Xerocare	\N	\N	data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAZAAAACgCAYAAAAisjrVAAAQAElEQVR4AeydB1yW1RfHfy9ow5apleZMc6WmOBEHCKHiFveeaG4cpKYoihu3hiM19165B7lFBffKlbvyX1mWVlZq//s7hBmCAjLel/fw8RnvM+74Xj/3PPece851+Fv/lIASUAJKQAnEg4AD9E8JKAEloASUQDwIqACJBzR9RQkkCAFNRAnYOAEVIDbegFp8JaAElEByEVABklzkNV8loASUgI0TsGEBYuPktfhKQAkoARsnoALExhtQi68ElIASSC4CKkCSi7zmqwRsmIAWXQmQgAoQUtBNCSgBJaAE4kxABUickekLSkAJKAElQAIqQEghqTfNTwkoASWQAgioAEkBjahVUAJKQAkkBwEVIMlBXfNUAkoguQhovglIQAVIAsLUpJSAElAC9kRABYg9tbbWVQkoASWQgARUgCQgTHtISuuoBJSAEogkoAIkkoQelYASUAJKIE4EVIDECZc+rASUgBJILgLWl68KEOtrEy2RElACSsAmCKgAsYlm0kIqASWgBKyPgAoQ62sTLVHiENBUlYASSGACKkASGKgmpwSUgBKwFwIqQOylpbWeSkAJKIEEJhBrAZLA+WpySkAJKAElYOMEVIDYeANq8ZWAElACyUVABUhykdd8lUCsCeiDSsA6CagAsc520VIpASWgBKyegAoQq28iLaASUAJKwDoJ2IMAsU7yWioloASUgI0TUAFi4w2oxVcCSkAJJBcBFSDJRV7zVQL2QEDrmKIJqABJ0c2rlVMCSkAJJB4BFSCJx1ZTVgJKQAmkaAIqQKy6ebVwSkAJKAHrJaACxHrbRkumBJSAErBqAipArLp5tHBKQAkkFwHN9+kEVIA8nZE+oQSUgBJQAtEQUAESDRS9pASUgBJQAk8noALk6Yz0ifgQ0HeUgBJI8QRUgKT4JtYKKgEloAQSh4AKkMThqqkqASWgBJKLQJLlqwIkyVBrRkpACSiBlEVABUjKak+tjRJQAkogyQioAEky1JqRrRDQcioBJRA7AipAYsdJn1ICSkAJKIEoBFSARAGiP5WAElACSiB2BBJegMQuX31KCSgBJaAEbJyAChAbb8CkLP6dO7/iu+9+wJUr13HmzAUcPnwcixevlvMffvgRDx48SMriaF5KQAkkMwEVIMncAAmV/W+/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	b9708648-f4d7-4aaa-ad34-0949ceb8400c	RIYAS EMPLOYEE MANAGER	2026-08-13 14:56:07.597	data:image/png;base64,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	IN_PERSON	NADHIL CUSTOMER	2026-08-13 14:56:17.66	\N	\N	f	FULLY_SIGNED	1. This agreement sets out the terms for rental of the above-described equipment.\n2. The equipment remains the sole property of the Seller throughout the rental period.\n3. The Buyer is responsible for the proper use, care, and safe custody of the equipment.\n4. Monthly rental charges and excess copy rates are as specified in the Rental Terms section.\n5. Excess usage beyond the agreed free limits will be billed at the applicable excess rates.\n6. Either party may terminate this agreement with 30 days' written notice.\n7. Upon termination, the Buyer must return the equipment in good working condition, fair wear and tear excepted.\n8. Security deposit, if any, will be refunded upon equipment return and final account settlement.\n9. The Seller shall provide maintenance services as agreed; the Buyer shall not tamper with the equipment.\n10. Disputes shall be resolved through mutually agreed arbitration under applicable local laws.	2026-08-13 14:55:52.665323	2026-08-13 14:56:17.664441	\N	\N
c8fe648b-99ae-4dff-b508-77f3df1bd200	CA-2026-002	9e9762aa-4fe6-45db-bba7-2e088fb67c98	d7b8ef01-87a7-4e0b-bd92-f0c6c4cd3352	2026-08-13	NADHIL CUSTOMER	\N	\N	\N	\N	b9708648-f4d7-4aaa-ad34-0949ceb8400c	RIYAS EMPLOYEE MANAGER	Xerocare	\N	\N	\N	\N	\N	\N	\N	IN_PERSON	\N	\N	\N	\N	f	PENDING_SIGNATURES	1. This agreement sets out the terms for rental of the above-described equipment.\n2. The equipment remains the sole property of the Seller throughout the rental period.\n3. The Buyer is responsible for the proper use, care, and safe custody of the equipment.\n4. Monthly rental charges and excess copy rates are as specified in the Rental Terms section.\n5. Excess usage beyond the agreed free limits will be billed at the applicable excess rates.\n6. Either party may terminate this agreement with 30 days' written notice.\n7. Upon termination, the Buyer must return the equipment in good working condition, fair wear and tear excepted.\n8. Security deposit, if any, will be refunded upon equipment return and final account settlement.\n9. The Seller shall provide maintenance services as agreed; the Buyer shall not tamper with the equipment.\n10. Disputes shall be resolved through mutually agreed arbitration under applicable local laws.	2026-08-13 18:32:29.626803	2026-08-13 18:32:29.626803	\N	\N
e13d2b22-c2ad-4bbe-9d79-f4ce24d7897f	CA-2026-003	502d6e65-5169-495e-a4cf-99434fd16d61	d7b8ef01-87a7-4e0b-bd92-f0c6c4cd3352	2026-08-13	NADHIL CUSTOMER	\N	\N	\N	\N	d38f9b7e-772c-4462-ac52-23fb44e8ed5f	RIYAS SERVICE DESK	Xerocare	\N	\N	data:image/png;base64,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dBwSWj5PnjJInz4vvLxaYv78pbh58w+NPdazZ3ts3hwKWaxq8ODPIIER41EVXkoCJOBkAv8VECdXiMVbh0CyZMk0fte4cYNw7Ng2hIXN0hhgEjY+IiICEkFYfBtHj27D8uWz0bZtE2TJ8oF1bpA1JQESiJYABSRaPDwZUwJubm6QiYjiED99epcGvZQIwjK6SmaVxzQfpiMBErAOAQqIddqKNU34BHiHJGApAhQQSzUXK0sCJEACrkOAAuI6bcGakAAJkIClCCQoAbEUeVaWBEiABCxOgAJi8QZk9UmABEjAWQQoIM4iz3JJIEER4M0kRgIUkMTY6rxnEiABErABAQqIDSAyCxIgARJIjAQoIK7R6qwFCZAACViOAAXEck3GCpMACZCAaxCggLhGO7AWJEACziLAcuNMgAISZ3S8kARIgAQSNwEKSOJuf949CZAACcSZAAUkzuh44UMC3JIACSRWAhSQxNryvG8SIAESiCcBCkg8AfJyEiABEnAWAWeXSwFxdguwfBIgARKwKAEKiEUbjtUmARIgAWcToIA4uwVYvvMIsGQSIIF4EaCAxAsfLyYBEiCBxEuAApJ42553TgIkQALxIhAPAYlXubyYBEiABEjA4gQoIBZvQFafBEiABJxFgALiLPIslwTiQYCXkoArEKCAuEIrsA4kQAIkYEECFBALNhqrTAIkQAKuQCBxCogrkGcdSIAESMDiBCggFm9AVp8ESIAEnEWAAuIs8iyXBBInAd51AiJAAUlAjclbIQESIAFHEqCAOJI2yyIBEiCBBESAAmKxxmR1SYAESMBVCFBAXKUlWA8SIAESsBgBCojFGozVJQEScBYBlvs4AQrI40T4mwRIgARIIEYEKCAxwsREJEACJEACjxOggDxOhL/tRYD5kgAJJDACFJAE1qC8HRIgARJwFAEKiKNIsxwSIAEScBYBO5VLAbETWGZLAiRAAgmdAAUkobcw748ESIAE7ESAAmInsMw2IRHgvZAACURFgAISFRUeIwESIAESeCoBCshTETEBCZAACZBAVAQcISBRlctjJEACJEACFidAAbF4A7L6JEACJOAsAhQQZ5FnuSTgCAIsgwTsSIACYke4zJoESIAEEjKB/wEAAP//YKxQEwAAAAZJREFUAwBjgAotwfSc/AAAAABJRU5ErkJggg==	d38f9b7e-772c-4462-ac52-23fb44e8ed5f	RIYAS SERVICE DESK	2026-08-13 23:20:06.973	data:image/png;base64,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	IN_PERSON	NADHIL CUSTOMER	2026-08-13 23:20:00.809	\N	\N	f	FULLY_SIGNED	1. This agreement sets out the terms for rental of the above-described equipment.\n2. The equipment remains the sole property of the Seller throughout the rental period.\n3. The Buyer is responsible for the proper use, care, and safe custody of the equipment.\n4. Monthly rental charges and excess copy rates are as specified in the Rental Terms section.\n5. Excess usage beyond the agreed free limits will be billed at the applicable excess rates.\n6. Either party may terminate this agreement with 30 days' written notice.\n7. Upon termination, the Buyer must return the equipment in good working condition, fair wear and tear excepted.\n8. Security deposit, if any, will be refunded upon equipment return and final account settlement.\n9. The Seller shall provide maintenance services as agreed; the Buyer shall not tamper with the equipment.\n10. Disputes shall be resolved through mutually agreed arbitration under applicable local laws.	2026-08-13 23:19:40.936686	2026-08-13 23:20:06.975988	\N	\N
\.


--
-- Data for Name: country_tax_rules; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.country_tax_rules (id, country, tax_name, default_tax_percent, is_active, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: credit_notes; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.credit_notes (id, "creditNoteNo", invoice_id, "customerId", "branchId", "productId", "productName", "modelName", brand, "serialNumber", "productAmount", type, status, "sellerEmployeeId", notes, "financeNote", "damageReason", "rejectionReason", "replacementProductId", "replacementSerialNumber", "replacementAmount", "createdAt", "updatedAt", "customerName", "invoiceNumber", "replacementDiscount", "replacementProductName", "paymentMode", "replacementInvoiceId", "replacementInvoiceNumber", "productImage", "replacementProductImage", item_category, "sparePartId", sku, quantity, "taxName", "taxPercent", "taxAmount", "replacementSparePartId", "replacementSparePartName", "replacementSparePartSku", "replacementQuantity", tax_name, tax_percent, tax_amount) FROM stdin;
\.


--
-- Data for Name: depreciation_brand_rules; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.depreciation_brand_rules (id, "brandId", "annualDepreciationPct", "usefulLifeMonths", "salvageValuePct", method, notes, "createdBy", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: depreciation_journal_entries; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.depreciation_journal_entries (id, "periodYear", "periodMonth", "totalAmount", "branchId", status, "postedBy", "postedAt", "expenseEntryId", "createdAt") FROM stdin;
\.


--
-- Data for Name: depreciation_model_rules; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.depreciation_model_rules (id, "brandId", "modelId", "annualDepreciationPct", "usefulLifeMonths", "salvageValuePct", method, notes, "createdBy", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: device_meter_readings; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.device_meter_readings (id, "serialNumber", "timestamp", "bwA4", "bwA3", "colorA4", "colorA3", source, "invoiceId", "createdAt") FROM stdin;
\.


--
-- Data for Name: employee_expense_requests; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.employee_expense_requests (id, "requestNo", "employeeId", "employeeName", "employeeRole", "branchId", "branchName", date, category, "subCategory", description, amount, currency, "receiptUrl", status, "submittedAt", "reviewedBy", "reviewedByName", "reviewedAt", "rejectionReason", "paidAt", "paidFromAccount", "paymentReference", "expenseEntryId", notes, "createdAt", "updatedAt", "requestSource", "purchaseId", "purchaseRef", "vendorName", "paymentMode", "paidFromAccountId", "purchasePaymentId", "chequeNumber", "chequeBankName", "chequeDueDate", "purchaseOrigin") FROM stdin;
390a9de1-f54b-4a36-a0e0-614cf1929df6	EXP-REQ-2026-0001	e864a3e4-fa37-4754-9440-613c6a7cdd2c	RIYAS  BRANCH MANAGER	MANAGER	d7b8ef01-87a7-4e0b-bd92-f0c6c4cd3352	XEROCARE UAE DUBAI BRANCH	2026-08-13	Vendor Purchase	Cash	PAYMENT FROM 	10000.00	AED	https://pub-8bbb88e1d79042349d0bc47ad1f3eb23.r2.dev/expense-proofs/00574140-45f9-4223-b603-cb6e89ca35d7/1786609329262-1.jpg	PAID	2026-08-13 13:52:09.688	5879065e-fc03-42a7-b009-4ef9ae39642e	\N	2026-08-13 15:39:05.174	\N	2026-08-13 15:39:05.174	4b729758-4a85-40a0-91ff-0f87da938ea5	\N	\N	Manager purchase payment request. PurchasePayment recorded in ven_inv (ID: 3d7b67e8-9809-444d-9afa-f861e192037a). Cash held pending Finance approval.	2026-08-13 13:52:09.690725	2026-08-13 15:39:05.17368	MANAGER_PURCHASE	00574140-45f9-4223-b603-cb6e89ca35d7	\N	\N	Cash	4b729758-4a85-40a0-91ff-0f87da938ea5	3d7b67e8-9809-444d-9afa-f861e192037a	\N	\N	\N	DOMESTIC
39ec8690-b38d-4026-9a32-844aad53f591	EXP-REQ-2026-0002	e864a3e4-fa37-4754-9440-613c6a7cdd2c	RIYAS  BRANCH MANAGER	MANAGER	d7b8ef01-87a7-4e0b-bd92-f0c6c4cd3352	XEROCARE UAE DUBAI BRANCH	2026-08-13	Vendor Purchase	Cash	Vendor payment — vendor (N/A)	115000.00	AED	https://pub-8bbb88e1d79042349d0bc47ad1f3eb23.r2.dev/expense-proofs/00574140-45f9-4223-b603-cb6e89ca35d7/1786615901628-3.jpg	PAID	2026-08-13 15:41:42.19	5879065e-fc03-42a7-b009-4ef9ae39642e	\N	2026-08-13 15:43:55.147	\N	2026-08-13 15:43:55.147	4b729758-4a85-40a0-91ff-0f87da938ea5	\N	\N	Manager purchase payment request. PurchasePayment recorded in ven_inv (ID: 0967dc13-cea8-42c7-b632-ca0c6f010302). Cash held pending Finance approval.	2026-08-13 15:41:42.190655	2026-08-13 15:43:55.147159	MANAGER_PURCHASE	00574140-45f9-4223-b603-cb6e89ca35d7	\N	\N	Cash	4b729758-4a85-40a0-91ff-0f87da938ea5	0967dc13-cea8-42c7-b632-ca0c6f010302	\N	\N	\N	DOMESTIC
\.


--
-- Data for Name: employee_target_achievements; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.employee_target_achievements (id, "targetId", "employeeId", "branchId", "targetMonth", "targetAmount", "achievedAmount", "achievementPercent", "appliedTierPercent", "incentiveAmount", "dealCount", "calculatedAt", "isFinalized") FROM stdin;
\.


--
-- Data for Name: employee_targets; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.employee_targets (id, "employeeId", "branchId", "assignedBy", "targetMonth", "targetAmount", "targetType", "currencyCode", tiers, status, "createdAt") FROM stdin;
\.


--
-- Data for Name: equity_entries; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.equity_entries (id, "entryNo", date, type, description, amount, currency, "branchId", "referenceNo", "linkedCashAccountId", "documentUrl", notes, "createdBy", "createdAt", "updatedAt", "ownerId", "paymentMode", "numberOfShares", "pricePerShare", "reserveType", "reserveSource", "paymentDate") FROM stdin;
60d52f64-ff07-47dc-958d-634893e6b999	EQ-2026-0001	2026-08-13	OPENING_BALANCE_EQUITY	Opening balance — XEROCARE UAE CASH ACCOUNT	100000.00	AED	d7b8ef01-87a7-4e0b-bd92-f0c6c4cd3352	\N	4b729758-4a85-40a0-91ff-0f87da938ea5	\N	Auto-created at account creation to give the opening balance a documented origin.	5879065e-fc03-42a7-b009-4ef9ae39642e	2026-08-13 13:40:52.871426	2026-08-13 13:40:52.871426	\N	\N	\N	\N	\N	\N	\N
c41d505e-0cfa-4626-8f5d-877c3a5644e8	EQ-2026-0002	2026-08-13	OPENING_BALANCE_EQUITY	Opening balance — XEROCARE BANK ACCOUNT	150000.00	AED	d7b8ef01-87a7-4e0b-bd92-f0c6c4cd3352	\N	f9e4afb5-433f-4f41-a181-c0d22d7d6b59	\N	Auto-created at account creation to give the opening balance a documented origin.	5879065e-fc03-42a7-b009-4ef9ae39642e	2026-08-13 13:41:45.397402	2026-08-13 13:41:45.397402	\N	\N	\N	\N	\N	\N	\N
\.


--
-- Data for Name: exchange_rates; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.exchange_rates (id, "fromCurrency", "toCurrency", rate, "setBy", "createdAt") FROM stdin;
\.


--
-- Data for Name: expense_entries; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.expense_entries (id, "expenseNo", date, category, "subCategory", description, "branchId", amount, "vatAmount", "netAmount", currency, status, "paidFrom", "paymentDate", "paymentMode", "referenceNo", "approvedBy", "receiptUrl", notes, "createdBy", "createdAt", "updatedAt", "isPrepayment", "coveredPeriodStart", "coveredPeriodEnd") FROM stdin;
\.


--
-- Data for Name: guarantee_cheques; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.guarantee_cheques (id, customer_id, customer_name, contract_invoice_id, contract_reference, cheque_number, amount, currency_code, bank_name, received_date, purpose, status, returned_date, branch_id, created_by, notes, deleted_at, created_at, updated_at, deposited_date, deposited_to_account_id) FROM stdin;
\.


--
-- Data for Name: income_entries; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.income_entries (id, "incomeNo", date, category, "subCategory", description, "branchId", amount, "vatAmount", "netAmount", currency, status, "receivedTo", "receivedDate", "receivedMode", "referenceNo", "approvedBy", "receiptUrl", notes, "createdBy", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: installation_requests; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.installation_requests (id, "invoiceId", "branchId", "assignedByEmployeeId", "assignedByEmployeeName", "technicianId", "technicianName", "customerName", "customerAddress", "invoiceNumber", notes, "startTime", "endTime", "durationSeconds", status, "createdAt", "updatedAt", "saleType", "initialReadingEnteredAt", "initialReadingEnteredByName", "initialReadingPhotoUrl", "initialReadingTakenDate") FROM stdin;
fc84b585-17ce-428c-837a-f32060b00b6d	baee65a2-a8d5-4a26-8428-37da883ebed6	d7b8ef01-87a7-4e0b-bd92-f0c6c4cd3352	d38f9b7e-772c-4462-ac52-23fb44e8ed5f	RIYAS SERVICE DESK	9d25cd2f-4213-49ee-88e0-011d1f55c533	RIYAS TECJNICIAN	NADHIL CUSTOMER	\N	QTN-2026-0002	\N	2026-08-13 15:18:57.796	2026-08-13 15:19:45.372	47	ASSIGNED	2026-08-13 15:13:54.879787	2026-08-13 23:13:38.100048	RENT	2026-08-13 15:19:45.372	RIYAS TECJNICIAN	\N	2026-08-13
cfeb4179-65d7-4e53-8352-87eef913773f	502d6e65-5169-495e-a4cf-99434fd16d61	d7b8ef01-87a7-4e0b-bd92-f0c6c4cd3352	d38f9b7e-772c-4462-ac52-23fb44e8ed5f	RIYAS SERVICE DESK	9d25cd2f-4213-49ee-88e0-011d1f55c533	RIYAS TECJNICIAN	NADHIL CUSTOMER	\N	QTN-2026-0006	contract number six assigned for riyas by service desk	2026-08-13 23:21:12.329	2026-08-13 23:21:55.165	42	COMPLETED	2026-08-13 23:19:31.564392	2026-08-13 23:21:55.167474	RENT	2026-08-13 23:21:55.164	RIYAS TECJNICIAN	\N	2026-08-13
\.


--
-- Data for Name: invoice_items; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.invoice_items (id, "itemType", "bwIncludedLimit", "colorIncludedLimit", "combinedIncludedLimit", "bwExcessRate", "colorExcessRate", "combinedExcessRate", "bwSlabRanges", "colorSlabRanges", "comboSlabRanges", quantity, "unitPrice", "initialBwCount", "initialBwA3Count", "initialColorCount", "initialColorA3Count", "productId", "invoiceId", description, "sparePartId", "serialNumber", warranty, "modelId", "deletedAt", "discountAmount") FROM stdin;
70143e78-2b15-4084-9312-ec749399ac7a	PRODUCT	\N	\N	\N	\N	\N	\N	\N	\N	\N	1	35000.00	\N	\N	\N	\N	6badd3cb-68a4-445d-9fdd-b79b927384a0	246abb8b-43b8-4a1f-ac79-6404ef62ea8f	[DISC:1000.00] HP SMARTTANK 585	\N	\N	\N	0f70661e-2916-4f23-a581-e9fd2f08154e	\N	1000.00
d9f20e12-2713-4f06-97fb-f25953a5596c	PRODUCT	\N	\N	\N	\N	\N	\N	\N	\N	\N	1	0.00	\N	\N	\N	\N	\N	501212bc-250b-491e-96f2-495af1635c3c	HP SMARTTANK 585	\N	\N	\N	0f70661e-2916-4f23-a581-e9fd2f08154e	\N	0.00
d8d325d0-bd03-405b-9d4a-0d83f79f5217	PRODUCT	1000	1000	\N	0.2500	0.5000	0.0000	[]	[]	[]	1	0.00	50	50	50	50	83831148-303f-4c71-8bed-11a340013d5e	baee65a2-a8d5-4a26-8428-37da883ebed6	HP SMARTTANK 585	\N	\N	\N	0f70661e-2916-4f23-a581-e9fd2f08154e	\N	0.00
5eed5bd3-5a73-4e90-87d6-d2a263ca5388	PRODUCT	\N	\N	\N	\N	\N	\N	\N	\N	\N	1	35000.00	\N	\N	\N	\N	aaa164a8-7bd6-4b26-9e23-b58c112fc44a	77f653f4-e93c-4d6d-801b-e553391317dd	HP SMARTTANK 585	\N	\N	\N	0f70661e-2916-4f23-a581-e9fd2f08154e	\N	0.00
1ec69410-f215-4a54-a0e8-33890939c5d5	PRODUCT	1100	1100	\N	0.2500	0.7500	0.0000	[]	[]	[]	1	0.00	\N	\N	\N	\N	ac670a58-b8ed-47b3-8b47-c6c89c563138	9e9762aa-4fe6-45db-bba7-2e088fb67c98	HP SMARTTANK 585	\N	\N	\N	0f70661e-2916-4f23-a581-e9fd2f08154e	\N	0.00
adc7034b-2854-42cc-8455-3b7277ee8acb	PRODUCT	100	100	\N	1.0000	2.0000	0.0000	[]	[]	[]	1	0.00	100	100	100	100	3c6dae6e-49d6-424e-a175-37b2c7be848d	502d6e65-5169-495e-a4cf-99434fd16d61	HP SMARTTANK 585	\N	\N	\N	0f70661e-2916-4f23-a581-e9fd2f08154e	\N	0.00
\.


--
-- Data for Name: invoice_ledger; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.invoice_ledger (id, invoice_id, total_amount, paid_amount, balance_amount, created_at, updated_at, deleted_at) FROM stdin;
4e8c4610-f6e3-4721-a8e5-b010e53db248	246abb8b-43b8-4a1f-ac79-6404ef62ea8f	35700.00	35700.00	0.00	2026-08-13 14:45:33.753396	2026-08-13 14:49:34.222643	\N
b7546882-5464-4f7f-8758-e599210be9e0	baee65a2-a8d5-4a26-8428-37da883ebed6	525.00	4500.00	0.00	2026-08-13 14:58:12.112589	2026-08-13 15:25:54.292051	\N
8d683f98-c902-4b2b-9a66-bbc3e3405ac7	77f653f4-e93c-4d6d-801b-e553391317dd	36750.00	36750.00	0.00	2026-08-13 17:58:11.133709	2026-08-13 18:06:34.09869	\N
fde06cc2-c016-4c80-8e3d-b3e170e99d16	502d6e65-5169-495e-a4cf-99434fd16d61	1575.00	1500.00	75.00	2026-08-13 19:46:07.959661	2026-08-13 19:46:07.959661	\N
9d5b3ecd-772b-44b8-807d-eb290d5bc07d	9e9762aa-4fe6-45db-bba7-2e088fb67c98	262.50	105.00	157.50	2026-08-13 18:53:51.172173	2026-08-13 18:54:31.47065	\N
\.


--
-- Data for Name: invoices; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.invoices (id, "invoiceNumber", "securityDepositAmount", "securityDepositMode", "securityDepositReference", "securityDepositDate", "securityDepositBank", "securityDepositReceivedDate", "branchId", "createdBy", "customerId", "totalAmount", "contractStatus", "contractConfirmationUrl", "employeeApprovedBy", "employeeApprovedAt", "financeApprovedBy", "financeApprovedAt", "financeRemarks", "createdAt", "updatedAt", "saleType", type, "rentType", "rentPeriod", "monthlyRent", "advanceAmount", "discountPercent", "effectiveFrom", "effectiveTo", "billingCycleInDays", "billingPeriodStart", "billingPeriodEnd", "emailSentAt", "whatsappSentAt", "isFinalMonth", "isSummaryInvoice", "completedAt", "leaseType", "leaseTenureMonths", "totalLeaseAmount", "monthlyEmiAmount", "monthlyLeaseAmount", "referenceContractId", "usageRecordId", "grossAmount", "discountAmount", "advanceAdjusted", "bwA4Count", "bwA3Count", "colorA4Count", "colorA3Count", "extraBwA4Count", "extraColorA4Count", "additionalCharges", "additionalChargesRemarks", "layoutId", notes, "isDirectSale", "isTemplate", "templateId", "assignedEmployeeId", "maxDiscountAllowed", "assignedAt", "assignedBy", "retakenAt", "retakenBy", "deletedAt", status, "billType", "serviceTicketId", "maxCopyLimit", "isReplacement", "warrantyType", "warrantyLimit", "isWarrantyAlertSent", "warrantyDurationValue", "warrantyDurationUnit", "warrantyCopyLimit", "warrantyEmailSent", "warrantyExpiryEmailSent", is_opening_entry, deleted_at, currency_code, exchange_rate_snapshot, tax_name, tax_percent, tax_amount, tax_registration_number, "validityDays", "expiryDate", "isConverted", "estimateValidUntil", "estimateExpired", "visitChargeAmount", "visitChargeMethod", "totalDiscountAmount", "technicianNoteToFinance", "revisionCount", "validityExtensionDays", "validityExtensionFee", "validityExtensionFeeAdded", validity_days, expiry_date, is_converted, estimate_valid_until, estimate_expired, visit_charge_amount, visit_charge_method, total_discount_amount, technician_note_to_finance, revision_count, validity_extension_days, validity_extension_fee, validity_extension_fee_added, customer_name, customer_vat_number, customer_country, customer_state_province, customer_city, "preferredPaymentMode", "preferredChequeBankName", "serviceContractId", customer_vat_status, a3_multiplier, "deliveryStatus") FROM stdin;
246abb8b-43b8-4a1f-ac79-6404ef62ea8f	QTN-2026-0001	\N	\N	\N	\N	\N	\N	d7b8ef01-87a7-4e0b-bd92-f0c6c4cd3352	b9708648-f4d7-4aaa-ad34-0949ceb8400c	42318e59-0a36-46e3-aa08-50330ba4a78d	35700.00	ACTIVE		b9708648-f4d7-4aaa-ad34-0949ceb8400c	2026-08-13 14:29:17.427	b9708648-f4d7-4aaa-ad34-0949ceb8400c	2026-08-13 14:43:45.36	\N	2026-08-13 14:29:09.946973	2026-08-13 14:43:45.353626	PRODUCT_SALE	FINAL	\N	\N	\N	0.00	\N	2026-08-13	2026-09-12	\N	\N	\N	\N	\N	f	f	\N	\N	\N	\N	\N	\N	\N	\N	35000.00	1000.00	\N	\N	\N	\N	\N	\N	\N	\N	\N	product:normal	[STYLE:normal]	f	f	\N	\N	\N	\N	\N	\N	\N	\N	INVOICED	\N	\N	\N	f	copies	\N	f	\N	\N	200000	f	f	f	\N	AED	\N	VAT	5.00	1700.00	TRN1452678919277387892	\N	\N	f	\N	\N	\N	\N	\N	\N	0	\N	\N	f	30	2026-09-12 14:29:09.932	f	\N	f	0.00	\N	0.00	\N	0	\N	0.00	f	NADHIL CUSTOMER	\N	AE	Dubai	Dubai	\N	\N	\N	UNREGISTERED_STANDARD	2.00	NOT_DELIVERED
77f653f4-e93c-4d6d-801b-e553391317dd	QTN-2026-0004	\N	\N	\N	\N	\N	\N	d7b8ef01-87a7-4e0b-bd92-f0c6c4cd3352	b9708648-f4d7-4aaa-ad34-0949ceb8400c	42318e59-0a36-46e3-aa08-50330ba4a78d	36750.00	ACTIVE		b9708648-f4d7-4aaa-ad34-0949ceb8400c	2026-08-13 17:28:49.992	b9708648-f4d7-4aaa-ad34-0949ceb8400c	2026-08-13 17:33:01.116	\N	2026-08-13 17:28:44.720059	2026-08-13 17:33:01.106866	PRODUCT_SALE	FINAL	\N	\N	\N	0.00	\N	2026-08-13	2026-09-12	\N	\N	\N	\N	\N	f	f	\N	\N	\N	\N	\N	\N	\N	\N	35000.00	0.00	\N	\N	\N	\N	\N	\N	\N	\N	\N	product:normal	[STYLE:normal]	f	f	\N	\N	\N	\N	\N	\N	\N	\N	INVOICED	\N	\N	\N	f	copies	\N	f	\N	\N	200000	f	f	f	\N	AED	\N	VAT	5.00	1750.00	TRN1452678919277387892	\N	\N	f	\N	\N	\N	\N	\N	\N	0	\N	\N	f	30	2026-09-12 17:28:44.706	f	\N	f	0.00	\N	0.00	\N	0	\N	0.00	f	NADHIL CUSTOMER	\N	AE	Dubai	Dubai	\N	\N	\N	UNREGISTERED_STANDARD	2.00	NOT_DELIVERED
501212bc-250b-491e-96f2-495af1635c3c	QTN-2026-0003	10000.00	CASH		\N		\N	d7b8ef01-87a7-4e0b-bd92-f0c6c4cd3352	b9708648-f4d7-4aaa-ad34-0949ceb8400c	42318e59-0a36-46e3-aa08-50330ba4a78d	10500.00	\N	\N	b9708648-f4d7-4aaa-ad34-0949ceb8400c	2026-08-13 14:32:38.531	5879065e-fc03-42a7-b009-4ef9ae39642e	2026-08-13 14:40:17.405	\N	2026-08-13 14:32:31.75206	2026-08-13 22:53:59.211008	LEASE	QUOTATION	\N	\N	\N	10000.00	\N	2026-08-13	2026-11-12	\N	\N	\N	\N	\N	f	f	\N	EMI	3	30000.00	10000.00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	lease:normal	[STYLE:normal]	f	f	\N	\N	\N	\N	\N	\N	\N	\N	FINANCE_APPROVED	\N	\N	\N	f	none	\N	f	\N	\N	\N	f	f	f	\N	AED	\N	VAT	5.00	500.00	TRN1452678919277387892	\N	\N	f	\N	\N	\N	\N	\N	\N	0	\N	\N	f	30	2026-09-12 14:32:31.75	f	\N	f	0.00	\N	0.00	\N	0	\N	0.00	f	NADHIL CUSTOMER	\N	AE	Dubai	Dubai	\N	\N	\N	UNREGISTERED_STANDARD	2.00	NOT_DELIVERED
baee65a2-a8d5-4a26-8428-37da883ebed6	QTN-2026-0002	500.00	CASH		\N		\N	d7b8ef01-87a7-4e0b-bd92-f0c6c4cd3352	b9708648-f4d7-4aaa-ad34-0949ceb8400c	42318e59-0a36-46e3-aa08-50330ba4a78d	2550.00	COMPLETED		b9708648-f4d7-4aaa-ad34-0949ceb8400c	2026-08-13 14:31:21.766	b9708648-f4d7-4aaa-ad34-0949ceb8400c	2026-08-13 14:58:31.786	\N	2026-08-13 14:31:16.874286	2026-08-13 15:26:52.06918	RENT	PROFORMA	FIXED_LIMIT	MONTHLY	500.00	0.00	\N	2026-08-13	2026-11-12	\N	\N	\N	\N	\N	t	f	2026-08-13 15:26:52.069	\N	\N	\N	\N	\N	\N	\N	3050.00	0.00	500.00	\N	\N	\N	\N	\N	\N	\N	\N	rental:normal	[STYLE:normal]	f	f	\N	\N	\N	\N	\N	\N	\N	\N	PAID	\N	\N	\N	f	\N	\N	f	\N	\N	\N	f	f	f	\N	AED	\N	VAT	5.00	25.00	TRN1452678919277387892	\N	\N	f	\N	\N	\N	\N	\N	\N	0	\N	\N	f	30	2026-09-12 14:31:16.866	f	\N	f	0.00	\N	0.00	\N	0	\N	0.00	f	NADHIL CUSTOMER	\N	AE	Dubai	Dubai	\N	\N	\N	UNREGISTERED_STANDARD	2.00	DELIVERED
502d6e65-5169-495e-a4cf-99434fd16d61	QTN-2026-0006	1500.00	CASH		\N		\N	d7b8ef01-87a7-4e0b-bd92-f0c6c4cd3352	b9708648-f4d7-4aaa-ad34-0949ceb8400c	42318e59-0a36-46e3-aa08-50330ba4a78d	1575.00	ACTIVE		b9708648-f4d7-4aaa-ad34-0949ceb8400c	2026-08-13 19:22:39.447	b9708648-f4d7-4aaa-ad34-0949ceb8400c	2026-08-13 19:43:20.554	\N	2026-08-13 19:22:37.273226	2026-08-15 14:44:45.894105	RENT	PROFORMA	FIXED_LIMIT	MONTHLY	1500.00	1500.00	\N	2026-08-13	2026-11-12	\N	\N	\N	\N	\N	f	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	rental:normal	[STYLE:normal]	f	f	\N	\N	\N	\N	\N	\N	\N	\N	ACTIVE_CONTRACT	\N	\N	\N	f	\N	\N	f	\N	\N	\N	f	f	f	\N	AED	\N	VAT	5.00	75.00	TRN1452678919277387892	\N	\N	f	\N	\N	\N	\N	\N	\N	0	\N	\N	f	30	2026-09-12 19:22:37.264	f	\N	f	0.00	\N	0.00	\N	0	\N	0.00	f	NADHIL CUSTOMER	\N	AE	Dubai	Dubai	\N	\N	\N	UNREGISTERED_STANDARD	2.00	DELIVERED
9e9762aa-4fe6-45db-bba7-2e088fb67c98	QTN-2026-0005	250.00	CASH		\N		\N	d7b8ef01-87a7-4e0b-bd92-f0c6c4cd3352	b9708648-f4d7-4aaa-ad34-0949ceb8400c	42318e59-0a36-46e3-aa08-50330ba4a78d	262.50	ACTIVE		b9708648-f4d7-4aaa-ad34-0949ceb8400c	2026-08-13 18:22:48.858	b9708648-f4d7-4aaa-ad34-0949ceb8400c	2026-08-13 19:03:58.34	\N	2026-08-13 18:22:44.743992	2026-08-14 13:40:44.809152	RENT	PROFORMA	FIXED_LIMIT	MONTHLY	250.00	250.00	\N	2026-08-13	2026-11-12	\N	\N	\N	\N	\N	f	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	rental:normal	[STYLE:normal]	f	f	\N	\N	\N	\N	\N	\N	\N	\N	ACTIVE_CONTRACT	\N	\N	\N	f	\N	\N	f	\N	\N	\N	f	f	f	\N	AED	\N	VAT	5.00	12.50	TRN1452678919277387892	\N	\N	f	\N	\N	\N	\N	\N	\N	0	\N	\N	f	30	2026-09-12 18:22:44.738	f	\N	f	0.00	\N	0.00	\N	0	\N	0.00	f	NADHIL CUSTOMER	\N	AE	Dubai	Dubai	\N	\N	\N	UNREGISTERED_STANDARD	2.00	NOT_DELIVERED
\.


--
-- Data for Name: machine_swap_requests; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.machine_swap_requests (id, branch_id, contract_id, invoice_number, contract_type, customer_name, model_id, model_name, current_product_id, current_serial_number, requested_product_id, requested_serial_number, reason, requested_by_id, requested_by_name, status, reviewed_by_id, reviewed_by_name, reviewed_at, rejection_reason, swap_executed_at, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: manual_journal_entries; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.manual_journal_entries (id, "entryNo", date, "chartOfAccountId", amount, description, "branchId", "referenceNo", notes, "createdBy", "createdAt") FROM stdin;
\.


--
-- Data for Name: manual_payables; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.manual_payables (id, "referenceNo", type, "payableTo", "vendorId", "employeeId", description, amount, currency, "issueDate", "dueDate", "amountPaid", outstanding, status, "branchId", notes, "createdBy", "createdAt", "linkedPurchaseId") FROM stdin;
\.


--
-- Data for Name: manual_receivables; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.manual_receivables (id, "referenceNo", type, "customerId", "customerName", description, amount, currency, "issueDate", "dueDate", "amountPaid", outstanding, status, "linkedInvoiceId", "branchId", notes, "createdBy", "createdAt") FROM stdin;
\.


--
-- Data for Name: opening_balance_entries; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.opening_balance_entries (id, entry_number, customer_id, branch_id, balance_type, opening_balance, remaining_balance, original_total_amount, already_paid_amount, invoice_id, is_fully_settled, migrated_at, monthly_billing_amount, billing_cycle_in_days, next_payment_due_date, total_contract_months, months_completed, months_remaining, remaining_contract_value, contract_start_date, product_brand, product_model, serial_number, product_id, notes, created_at, updated_at, deleted_at, branch_name) FROM stdin;
\.


--
-- Data for Name: owners; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.owners (id, name, email, phone, "ownershipPercent", "isActive", notes, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: payable_payments; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.payable_payments (id, "payableId", "paymentDate", amount, "paidFromAccount", "paymentMode", "referenceNo", notes, "createdBy", "createdAt") FROM stdin;
\.


--
-- Data for Name: payment_ledgers; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.payment_ledgers (id, "invoiceId", "amountPaid", "paymentMode", "paymentDate", "referenceNumber", remarks, "recordedBy", "createdAt", "receiptUrl") FROM stdin;
\.


--
-- Data for Name: payment_transactions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.payment_transactions (id, invoice_id, transaction_date, payment_mode, reference_number, amount, recorded_by, remarks, created_at, currency_code, receipt_url, exchange_rate_snapshot) FROM stdin;
f50faccc-5a43-4c3b-a7c5-ec51603d185b	246abb8b-43b8-4a1f-ac79-6404ef62ea8f	2026-08-13 05:30:00	CASH	ADV 10000 SALE	10000.00	5879065e-fc03-42a7-b009-4ef9ae39642e	Advance payment collected at conversion — Invoice QTN-2026-0001	2026-08-13 14:45:33.753396	AED	\N	\N
460d2d35-f651-4ec8-b433-dfaa90753b4b	246abb8b-43b8-4a1f-ac79-6404ef62ea8f	2026-08-13 05:30:00	CASH	\N	10000.00	5879065e-fc03-42a7-b009-4ef9ae39642e	Finance balance payment — QTN-2026-0001	2026-08-13 14:46:55.869035	AED	\N	\N
e1f247c9-1ae4-41b9-b175-0c7a7a60d90d	246abb8b-43b8-4a1f-ac79-6404ef62ea8f	2026-08-13 05:30:00	CASH	\N	15700.00	5879065e-fc03-42a7-b009-4ef9ae39642e	Finance balance payment — QTN-2026-0001	2026-08-13 14:49:34.222643	AED	\N	\N
2590d738-f58a-4354-9b76-c4434440189f	baee65a2-a8d5-4a26-8428-37da883ebed6	2026-08-13 05:30:00	CASH	CASH RENT 	500.00	5879065e-fc03-42a7-b009-4ef9ae39642e	Advance payment collected at conversion — Invoice QTN-2026-0002	2026-08-13 14:58:12.112589	AED	\N	\N
67f109c8-533b-48c3-ba84-3e35f376a19a	baee65a2-a8d5-4a26-8428-37da883ebed6	2026-08-13 05:30:00	CASH	MONTHLY PAYMENT COLLECTION	2000.00	5879065e-fc03-42a7-b009-4ef9ae39642e	Usage bill — Aug 2026 to Sept 2026	2026-08-13 15:24:43.474629	AED	\N	\N
c397621d-97ce-4689-9ae4-96999950d594	baee65a2-a8d5-4a26-8428-37da883ebed6	2026-08-13 05:30:00	CASH	PAYMENT MONTH 2	2000.00	5879065e-fc03-42a7-b009-4ef9ae39642e	Usage bill — Sept 2026 to Oct 2026	2026-08-13 15:25:54.282705	AED	\N	\N
18daffbd-78aa-4421-86d6-8b4fbb00fd58	77f653f4-e93c-4d6d-801b-e553391317dd	2026-08-13 05:30:00	CASH	\N	12000.00	88888888-8888-8888-8888-888888888888	collection 1	2026-08-13 17:58:11.133709	AED	\N	\N
4e1cf9c2-7c5d-42a8-89a7-a5c57978b9cd	77f653f4-e93c-4d6d-801b-e553391317dd	2026-08-13 05:30:00	CASH	\N	5000.00	88888888-8888-8888-8888-888888888888	collection 2	2026-08-13 17:58:11.3752	AED	\N	\N
18c5294e-c47d-4dfd-9dc7-2a6b178d183b	77f653f4-e93c-4d6d-801b-e553391317dd	2026-08-13 05:30:00	CASH	\N	1000.00	5879065e-fc03-42a7-b009-4ef9ae39642e	Advance payment collected at conversion — Invoice QTN-2026-0004	2026-08-13 18:05:13.554636	AED	\N	\N
8e1f6bb3-ed8a-4ae3-a6ec-55438cd2c96a	77f653f4-e93c-4d6d-801b-e553391317dd	2026-08-13 05:30:00	CASH	\N	18750.00	5879065e-fc03-42a7-b009-4ef9ae39642e	Sale payment approved — SPAY-2026-0010	2026-08-13 18:06:34.09869	AED	\N	\N
38c47ba3-bc38-4658-a25f-8f9f60e00112	9e9762aa-4fe6-45db-bba7-2e088fb67c98	2026-08-13 05:30:00	CASH	\N	100.00	88888888-8888-8888-8888-888888888888	rent advance receipt-icon test	2026-08-13 18:53:51.172173	AED	\N	\N
6c61c5c4-6aa4-40a6-a930-d7f9059b7668	9e9762aa-4fe6-45db-bba7-2e088fb67c98	2026-08-13 05:30:00	CASH	\N	5.00	88888888-8888-8888-8888-888888888888	gating check pending	2026-08-13 18:54:31.47065	AED	\N	\N
e29a35fe-3764-4aaa-8986-2077706cec74	502d6e65-5169-495e-a4cf-99434fd16d61	2026-08-13 05:30:00	CASH	\N	1500.00	5879065e-fc03-42a7-b009-4ef9ae39642e	Advance payment collected at conversion — Invoice QTN-2026-0006	2026-08-13 19:46:07.959661	AED	\N	\N
\.


--
-- Data for Name: product_allocations; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.product_allocations (id, "contractId", "modelId", "productId", "serialNumber", status, "startTimestamp", "endTimestamp", "replacementOfAllocationId", "replacementReason", "initialBwA4", "initialBwA3", "initialColorA4", "initialColorA3", "currentBwA4", "currentBwA3", "currentColorA4", "currentColorA3", "createdAt", "updatedAt") FROM stdin;
01b579c1-3d87-4103-94a6-58efe2e5e8c1	246abb8b-43b8-4a1f-ac79-6404ef62ea8f	0f70661e-2916-4f23-a581-e9fd2f08154e	6badd3cb-68a4-445d-9fdd-b79b927384a0	457876544	ALLOCATED	2026-08-13 14:43:45.234099	\N	\N	\N	0	0	0	0	0	0	0	0	2026-08-13 14:43:45.234099	2026-08-13 14:43:45.234099
72f80251-862b-492d-9c45-8e5a5b0ee5f2	baee65a2-a8d5-4a26-8428-37da883ebed6	0f70661e-2916-4f23-a581-e9fd2f08154e	83831148-303f-4c71-8bed-11a340013d5e	4678665446	ALLOCATED	2026-08-13 14:55:46.354066	\N	\N	\N	0	0	0	0	4000	3200	4000	3200	2026-08-13 14:55:46.354066	2026-08-13 15:26:52.062248
150e88d3-0410-4f2d-983e-da63207d73b6	77f653f4-e93c-4d6d-801b-e553391317dd	0f70661e-2916-4f23-a581-e9fd2f08154e	aaa164a8-7bd6-4b26-9e23-b58c112fc44a	54435534	ALLOCATED	2026-08-13 17:33:00.82625	\N	\N	\N	0	0	0	0	0	0	0	0	2026-08-13 17:33:00.82625	2026-08-13 17:33:00.82625
29580df0-3713-42c3-ba3c-e9c2c4b7a3fe	9e9762aa-4fe6-45db-bba7-2e088fb67c98	0f70661e-2916-4f23-a581-e9fd2f08154e	ac670a58-b8ed-47b3-8b47-c6c89c563138	456643445555	ALLOCATED	2026-08-13 18:32:24.316915	\N	\N	\N	0	0	0	0	5	0	2	0	2026-08-13 18:32:24.316915	2026-08-14 13:38:41.453258
e77c42bc-0928-4804-8f4a-e64254b432b1	502d6e65-5169-495e-a4cf-99434fd16d61	0f70661e-2916-4f23-a581-e9fd2f08154e	3c6dae6e-49d6-424e-a175-37b2c7be848d	674893993494004	ALLOCATED	2026-08-13 19:42:31.125324	\N	\N	\N	0	0	0	0	50	0	20	0	2026-08-13 19:42:31.125324	2026-08-15 14:15:51.540241
\.


--
-- Data for Name: quotation_template_assignments; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.quotation_template_assignments (id, "templateId", "employeeId", "assignedAt", "assignedBy") FROM stdin;
\.


--
-- Data for Name: receivable_payments; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.receivable_payments (id, "receivableId", "paymentDate", amount, "paidToAccount", "paymentMode", "referenceNo", notes, "createdBy", "createdAt") FROM stdin;
\.


--
-- Data for Name: return_credits; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.return_credits (id, invoice_id, "branchId", "createdBy", amount, note, "returnedItemId", "returnedItemType", "createdAt") FROM stdin;
\.


--
-- Data for Name: sale_payment_requests; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.sale_payment_requests (id, "requestNo", "invoiceId", "invoiceNumber", "branchId", "recordedByEmployeeId", "recordedByEmployeeName", "customerName", amount, currency, "paymentMode", "paymentDate", "referenceNumber", remarks, "cashAccountId", "chequeNumber", "chequeBankName", "chequeDueDate", "chequeDate", "receiptUrl", status, "reviewedById", "reviewedByName", "reviewedAt", "rejectionReason", "paymentTransactionId", "createdAt", "updatedAt", "collectLater", "paymentContext", "usageRecordId", "taxableAmount", "taxAmount", "taxPercent") FROM stdin;
5573588d-f4ba-407a-a55a-8fa3f505fccd	SPAY-2026-0001	246abb8b-43b8-4a1f-ac79-6404ef62ea8f	QTN-2026-0001	d7b8ef01-87a7-4e0b-bd92-f0c6c4cd3352	b9708648-f4d7-4aaa-ad34-0949ceb8400c	RIYAS EMPLOYEE MANAGER	NADHIL CUSTOMER	10000.00	AED	CASH	2026-08-13	ADV 10000 SALE	Advance payment collected at conversion — Invoice QTN-2026-0001	\N	\N	\N	\N	\N	\N	APPROVED	5879065e-fc03-42a7-b009-4ef9ae39642e	RIYAS FINANCE MANAGER	2026-08-13 14:45:33.753	\N	f50faccc-5a43-4c3b-a7c5-ec51603d185b	2026-08-13 14:43:45.565922	2026-08-13 14:45:33.753396	f	SALE	\N	\N	\N	\N
dd003d27-d3c0-4fb2-96a1-8c18dfbf4881	SPAY-2026-0002	246abb8b-43b8-4a1f-ac79-6404ef62ea8f	QTN-2026-0001	d7b8ef01-87a7-4e0b-bd92-f0c6c4cd3352	5879065e-fc03-42a7-b009-4ef9ae39642e	RIYAS FINANCE MANAGER	NADHIL CUSTOMER	10000.00	AED	CASH	2026-08-13	\N	Finance balance payment — QTN-2026-0001	4b729758-4a85-40a0-91ff-0f87da938ea5	\N	\N	\N	\N	\N	APPROVED	5879065e-fc03-42a7-b009-4ef9ae39642e	RIYAS FINANCE MANAGER	2026-08-13 14:46:55.869	\N	460d2d35-f651-4ec8-b433-dfaa90753b4b	2026-08-13 14:46:55.814598	2026-08-13 14:46:55.869035	f	SALE	\N	\N	\N	\N
57d4139b-8759-486a-a604-5b65df63c872	SPAY-2026-0003	246abb8b-43b8-4a1f-ac79-6404ef62ea8f	QTN-2026-0001	d7b8ef01-87a7-4e0b-bd92-f0c6c4cd3352	5879065e-fc03-42a7-b009-4ef9ae39642e	RIYAS FINANCE MANAGER	NADHIL CUSTOMER	15700.00	AED	CASH	2026-08-13	\N	Finance balance payment — QTN-2026-0001	4b729758-4a85-40a0-91ff-0f87da938ea5	\N	\N	\N	\N	\N	APPROVED	5879065e-fc03-42a7-b009-4ef9ae39642e	RIYAS FINANCE MANAGER	2026-08-13 14:49:34.225	\N	e1f247c9-1ae4-41b9-b175-0c7a7a60d90d	2026-08-13 14:49:34.162894	2026-08-13 14:49:34.222643	f	SALE	\N	\N	\N	\N
9d68fdbb-b6d9-4716-85e8-5c2a454be716	SPAY-2026-0005	baee65a2-a8d5-4a26-8428-37da883ebed6	QTN-2026-0002	d7b8ef01-87a7-4e0b-bd92-f0c6c4cd3352	b9708648-f4d7-4aaa-ad34-0949ceb8400c	RIYAS EMPLOYEE MANAGER	NADHIL CUSTOMER	500.00	AED	CASH	2026-08-13	\N	\N	\N	\N	\N	\N	\N	\N	REJECTED	5879065e-fc03-42a7-b009-4ef9ae39642e	RIYAS FINANCE MANAGER	2026-08-13 14:58:01.747	DUMMY	\N	2026-08-13 14:57:01.428551	2026-08-13 14:58:01.756268	f	RENT_ADVANCE	\N	\N	\N	\N
68cbc314-11e1-4e88-b2c8-50494304ac86	SPAY-2026-0004	baee65a2-a8d5-4a26-8428-37da883ebed6	QTN-2026-0002	d7b8ef01-87a7-4e0b-bd92-f0c6c4cd3352	b9708648-f4d7-4aaa-ad34-0949ceb8400c	RIYAS EMPLOYEE MANAGER	NADHIL CUSTOMER	500.00	AED	CASH	2026-08-13	CASH RENT 	Advance payment collected at conversion — Invoice QTN-2026-0002	\N	\N	\N	\N	\N	\N	APPROVED	5879065e-fc03-42a7-b009-4ef9ae39642e	RIYAS FINANCE MANAGER	2026-08-13 14:58:12.113	\N	2590d738-f58a-4354-9b76-c4434440189f	2026-08-13 14:55:46.462606	2026-08-13 14:58:12.112589	f	RENT_ADVANCE	\N	\N	\N	\N
38e63c14-e1ff-4aed-8713-c52998eebeaa	SPAY-2026-0009	77f653f4-e93c-4d6d-801b-e553391317dd	QTN-2026-0004	d7b8ef01-87a7-4e0b-bd92-f0c6c4cd3352	99999999-9999-9999-9999-999999999999	Employee	NADHIL CUSTOMER	5000.00	AED	CASH	2026-08-13	\N	collection 2	\N	\N	\N	\N	\N	\N	APPROVED	88888888-8888-8888-8888-888888888888	Employee	2026-08-13 17:58:11.376	\N	4e1cf9c2-7c5d-42a8-89a7-a5c57978b9cd	2026-08-13 17:58:11.296825	2026-08-13 17:58:11.3752	f	SALE	\N	\N	\N	\N
af966a7e-94c0-448f-aca4-a1eeb7999d4f	SPAY-2026-0007	246abb8b-43b8-4a1f-ac79-6404ef62ea8f	QTN-2026-0001	d7b8ef01-87a7-4e0b-bd92-f0c6c4cd3352	99999999-9999-9999-9999-999999999999	Employee	NADHIL CUSTOMER	1000.00	AED	CASH	2026-08-13	\N	e2e test collection 1	\N	\N	\N	\N	\N	https://pub-8bbb88e1d79042349d0bc47ad1f3eb23.r2.dev/sale-receipts/SPAY-2026-0007-1786624034583.pdf	REJECTED	88888888-8888-8888-8888-888888888888	Employee	2026-08-13 17:57:50.437	test cleanup — invoice already fully paid	\N	2026-08-13 17:57:13.907346	2026-08-13 17:57:50.441336	f	SALE	\N	\N	\N	\N
8b26f585-7134-4069-8b5d-81f5b151d007	SPAY-2026-0008	77f653f4-e93c-4d6d-801b-e553391317dd	QTN-2026-0004	d7b8ef01-87a7-4e0b-bd92-f0c6c4cd3352	99999999-9999-9999-9999-999999999999	Employee	NADHIL CUSTOMER	12000.00	AED	CASH	2026-08-13	\N	collection 1	\N	\N	\N	\N	\N	https://pub-8bbb88e1d79042349d0bc47ad1f3eb23.r2.dev/sale-receipts/SPAY-2026-0008-1786624090513.pdf	APPROVED	88888888-8888-8888-8888-888888888888	Employee	2026-08-13 17:58:11.133	\N	18daffbd-78aa-4421-86d6-8b4fbb00fd58	2026-08-13 17:58:10.376955	2026-08-13 17:58:11.133709	f	SALE	\N	\N	\N	\N
618365c2-3df6-4605-a55f-db980050bd60	SPAY-2026-0006	77f653f4-e93c-4d6d-801b-e553391317dd	QTN-2026-0004	d7b8ef01-87a7-4e0b-bd92-f0c6c4cd3352	b9708648-f4d7-4aaa-ad34-0949ceb8400c	RIYAS EMPLOYEE MANAGER	NADHIL CUSTOMER	1000.00	AED	CASH	2026-08-13	\N	Advance payment collected at conversion — Invoice QTN-2026-0004	\N	\N	\N	\N	\N	\N	APPROVED	5879065e-fc03-42a7-b009-4ef9ae39642e	RIYAS FINANCE MANAGER	2026-08-13 18:05:13.555	\N	18c5294e-c47d-4dfd-9dc7-2a6b178d183b	2026-08-13 17:33:01.365691	2026-08-13 18:05:13.554636	f	SALE	\N	\N	\N	\N
116406ef-9419-4ee3-889a-db6458e8cec5	SPAY-2026-0010	77f653f4-e93c-4d6d-801b-e553391317dd	QTN-2026-0004	d7b8ef01-87a7-4e0b-bd92-f0c6c4cd3352	b9708648-f4d7-4aaa-ad34-0949ceb8400c	RIYAS EMPLOYEE MANAGER	NADHIL CUSTOMER	18750.00	AED	CASH	2026-08-13	\N	\N	\N	\N	\N	\N	\N	\N	APPROVED	5879065e-fc03-42a7-b009-4ef9ae39642e	RIYAS FINANCE MANAGER	2026-08-13 18:06:34.099	\N	8e1f6bb3-ed8a-4ae3-a6ec-55438cd2c96a	2026-08-13 18:06:08.333638	2026-08-13 18:06:34.09869	f	SALE	\N	\N	\N	\N
1280860b-2615-4cf6-8de3-a1d16da2c37b	SPAY-2026-0011	246abb8b-43b8-4a1f-ac79-6404ef62ea8f	QTN-2026-0001	d7b8ef01-87a7-4e0b-bd92-f0c6c4cd3352	b9708648-f4d7-4aaa-ad34-0949ceb8400c	RIYAS EMPLOYEE MANAGER	NADHIL CUSTOMER	1.00	AED	CASH	2026-08-13	\N	partial/pending label check	\N	\N	\N	\N	\N	\N	REJECTED	88888888-8888-8888-8888-888888888888	Employee	2026-08-13 18:18:11.749	test cleanup	\N	2026-08-13 18:18:11.496607	2026-08-13 18:18:11.756326	f	SALE	\N	\N	\N	\N
847f232a-33c8-4282-a026-5749656cabda	SPAY-2026-0012	9e9762aa-4fe6-45db-bba7-2e088fb67c98	QTN-2026-0005	d7b8ef01-87a7-4e0b-bd92-f0c6c4cd3352	b9708648-f4d7-4aaa-ad34-0949ceb8400c	RIYAS EMPLOYEE MANAGER	NADHIL CUSTOMER	250.00	AED	CASH	2026-08-13	\N	Advance payment collected at conversion — Invoice QTN-2026-0005	\N	\N	\N	\N	\N	\N	PENDING	\N	\N	\N	\N	\N	2026-08-13 18:32:24.475537	2026-08-13 18:32:24.475537	f	RENT_ADVANCE	\N	\N	\N	\N
ef47990a-aca8-4ac0-8364-30df864b6afc	SPAY-2026-0013	9e9762aa-4fe6-45db-bba7-2e088fb67c98	QTN-2026-0005	d7b8ef01-87a7-4e0b-bd92-f0c6c4cd3352	b9708648-f4d7-4aaa-ad34-0949ceb8400c	RIYAS EMPLOYEE MANAGER	NADHIL CUSTOMER	100.00	AED	CASH	2026-08-13	\N	rent advance receipt-icon test	\N	\N	\N	\N	\N	https://pub-8bbb88e1d79042349d0bc47ad1f3eb23.r2.dev/sale-receipts/SPAY-2026-0013-1786627431691.pdf	APPROVED	88888888-8888-8888-8888-888888888888	Employee	2026-08-13 18:53:51.172	\N	38c47ba3-bc38-4658-a25f-8f9f60e00112	2026-08-13 18:53:51.056596	2026-08-13 18:53:52.471144	f	RENT_PERIODIC	\N	\N	\N	\N
7d1525d9-76db-406d-909a-808832b1deed	SPAY-2026-0014	9e9762aa-4fe6-45db-bba7-2e088fb67c98	QTN-2026-0005	d7b8ef01-87a7-4e0b-bd92-f0c6c4cd3352	b9708648-f4d7-4aaa-ad34-0949ceb8400c	RIYAS EMPLOYEE MANAGER	NADHIL CUSTOMER	5.00	AED	CASH	2026-08-13	\N	gating check pending	\N	\N	\N	\N	\N	\N	APPROVED	88888888-8888-8888-8888-888888888888	Employee	2026-08-13 18:54:31.47	\N	6c61c5c4-6aa4-40a6-a930-d7f9059b7668	2026-08-13 18:54:31.421601	2026-08-13 18:54:31.47065	f	RENT_PERIODIC	\N	\N	\N	\N
bbc4808c-7a8c-4bf4-8146-4fde23104c32	SPAY-2026-0015	502d6e65-5169-495e-a4cf-99434fd16d61	QTN-2026-0006	d7b8ef01-87a7-4e0b-bd92-f0c6c4cd3352	b9708648-f4d7-4aaa-ad34-0949ceb8400c	RIYAS EMPLOYEE MANAGER	NADHIL CUSTOMER	1500.00	AED	CASH	2026-08-13	\N	Advance payment collected at conversion — Invoice QTN-2026-0006	\N	\N	\N	\N	\N	\N	APPROVED	5879065e-fc03-42a7-b009-4ef9ae39642e	RIYAS FINANCE MANAGER	2026-08-13 19:46:07.96	\N	e29a35fe-3764-4aaa-8986-2077706cec74	2026-08-13 19:42:31.289705	2026-08-13 19:46:07.959661	f	RENT_ADVANCE	\N	\N	\N	\N
\.


--
-- Data for Name: spare_part_credit_notes; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.spare_part_credit_notes (id, "creditNoteNo", "sparePartId", "partName", sku, brand, quantity, "unitPrice", "totalAmount", "branchId", "customerId", "customerName", "invoiceReference", type, status, "sellerEmployeeId", notes, "financeNote", "damageReason", "rejectionReason", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: usage_record_items; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.usage_record_items (id, "usageRecordId", "allocationId", "periodStart", "periodEnd", "startBwA4", "endBwA4", "deltaBwA4", "startBwA3", "endBwA3", "deltaBwA3", "startColorA4", "endColorA4", "deltaColorA4", "startColorA3", "endColorA3", "deltaColorA3") FROM stdin;
1b3701ec-13c8-4351-9764-181597a3d880	67752494-20ae-46da-bdde-e772f6e2c98c	72f80251-862b-492d-9c45-8e5a5b0ee5f2	2026-08-13 05:30:00	2026-09-12 05:30:00	0	1000	1000	0	1000	1000	0	1000	1000	0	1000	1000
ff3f956e-89be-4634-ad80-ac86fef26724	ca207caf-8023-4f7b-af80-3dc67a2e7a34	72f80251-862b-492d-9c45-8e5a5b0ee5f2	2026-09-13 05:30:00	2026-10-12 05:30:00	1000	2000	1000	1000	2000	1000	1000	2000	1000	1000	2000	1000
19488d0b-cd80-4d70-a237-cfaea76b73ef	5c08d468-a185-4bd6-96e5-6c70d86df5b2	72f80251-862b-492d-9c45-8e5a5b0ee5f2	2026-10-13 05:30:00	2026-11-12 05:30:00	2000	4000	2000	2000	3200	1200	2000	4000	2000	2000	3200	1200
\.


--
-- Data for Name: usage_records; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.usage_records (id, "contractId", "billingPeriodStart", "billingPeriodEnd", "bwA4Count", "bwA3Count", "colorA4Count", "colorA3Count", "bwA4Delta", "bwA3Delta", "colorA4Delta", "colorA3Delta", "exceededTotal", "exceededCharge", "monthlyRent", "advanceAdjusted", "totalCharge", "discountBwCopies", "discountColorCopies", "discountAmount", "reportedBy", remarks, "meterImageUrl", "createdAt", "updatedAt", "emailSentAt", "whatsappSentAt", "taxableAmount", "taxAmount", "taxPercent") FROM stdin;
67752494-20ae-46da-bdde-e772f6e2c98c	baee65a2-a8d5-4a26-8428-37da883ebed6	2026-08-13	2026-09-12	1000	1000	1000	1000	1000	1000	1000	1000	4000	1500.00	500.00	0.00	2000.00	0	0	0.00	EMPLOYEE		meter-readings/1786614882811-2.jpg	2026-08-13 15:24:43.384341	2026-08-13 15:24:43.384341	\N	\N	2000.00	0.00	\N
ca207caf-8023-4f7b-af80-3dc67a2e7a34	baee65a2-a8d5-4a26-8428-37da883ebed6	2026-09-13	2026-10-12	2000	2000	2000	2000	1000	1000	1000	1000	4000	1500.00	500.00	0.00	2000.00	0	0	0.00	EMPLOYEE		meter-readings/1786614953782-2.jpg	2026-08-13 15:25:54.23544	2026-08-13 15:25:54.23544	\N	\N	2000.00	0.00	\N
5c08d468-a185-4bd6-96e5-6c70d86df5b2	baee65a2-a8d5-4a26-8428-37da883ebed6	2026-10-13	2026-11-12	4000	3200	4000	3200	2000	1200	2000	1200	6800	2550.00	500.00	500.00	2550.00	0	0	0.00	EMPLOYEE		meter-readings/1786615011653-2.jpg	2026-08-13 15:26:52.06918	2026-08-13 15:26:52.06918	\N	\N	2550.00	0.00	\N
\.


--
-- Data for Name: vat_remittances; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.vat_remittances (id, "branchId", "periodFrom", "periodTo", "amountRemitted", "remittedDate", "referenceNo", notes, "createdBy", "createdAt") FROM stdin;
\.


--
-- Name: cn_seq_2026; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.cn_seq_2026', 14, true);


--
-- Name: usage_record_items PK_0dca803e32ece244d38f4b454ec; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usage_record_items
    ADD CONSTRAINT "PK_0dca803e32ece244d38f4b454ec" PRIMARY KEY (id);


--
-- Name: device_meter_readings PK_306aaab59c4cc86ce854d75bff2; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.device_meter_readings
    ADD CONSTRAINT "PK_306aaab59c4cc86ce854d75bff2" PRIMARY KEY (id);


--
-- Name: product_allocations PK_4d813b9d12a8132d52364ed6828; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_allocations
    ADD CONSTRAINT "PK_4d813b9d12a8132d52364ed6828" PRIMARY KEY (id);


--
-- Name: invoice_items PK_53b99f9e0e2945e69de1a12b75a; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoice_items
    ADD CONSTRAINT "PK_53b99f9e0e2945e69de1a12b75a" PRIMARY KEY (id);


--
-- Name: quotation_template_assignments PK_58a5f214ba72b89511654953220; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quotation_template_assignments
    ADD CONSTRAINT "PK_58a5f214ba72b89511654953220" PRIMARY KEY (id);


--
-- Name: invoices PK_668cef7c22a427fd822cc1be3ce; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT "PK_668cef7c22a427fd822cc1be3ce" PRIMARY KEY (id);


--
-- Name: return_credits PK_92937a1675530b041d74fb2f4b0; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.return_credits
    ADD CONSTRAINT "PK_92937a1675530b041d74fb2f4b0" PRIMARY KEY (id);


--
-- Name: usage_records PK_e511cf9f7dc53851569f87467a5; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usage_records
    ADD CONSTRAINT "PK_e511cf9f7dc53851569f87467a5" PRIMARY KEY (id);


--
-- Name: payment_ledgers PK_fcba1eb80af3248a37f268bb713; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_ledgers
    ADD CONSTRAINT "PK_fcba1eb80af3248a37f268bb713" PRIMARY KEY (id);


--
-- Name: invoices UQ_bf8e0f9dd4558ef209ec111782d; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT "UQ_bf8e0f9dd4558ef209ec111782d" UNIQUE ("invoiceNumber");


--
-- Name: account_reconciliations account_reconciliations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.account_reconciliations
    ADD CONSTRAINT account_reconciliations_pkey PRIMARY KEY (id);


--
-- Name: asset_depreciation_register asset_depreciation_register_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.asset_depreciation_register
    ADD CONSTRAINT asset_depreciation_register_pkey PRIMARY KEY (id);


--
-- Name: asset_depreciation_register asset_depreciation_register_productId_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.asset_depreciation_register
    ADD CONSTRAINT "asset_depreciation_register_productId_key" UNIQUE ("productId");


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- Name: cash_bank_accounts cash_bank_accounts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cash_bank_accounts
    ADD CONSTRAINT cash_bank_accounts_pkey PRIMARY KEY (id);


--
-- Name: cashbook_entries cashbook_entries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cashbook_entries
    ADD CONSTRAINT cashbook_entries_pkey PRIMARY KEY (id);


--
-- Name: cashbook_entries cashbook_entries_referenceNo_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cashbook_entries
    ADD CONSTRAINT "cashbook_entries_referenceNo_key" UNIQUE ("referenceNo");


--
-- Name: chart_of_accounts chart_of_accounts_accountNumber_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chart_of_accounts
    ADD CONSTRAINT "chart_of_accounts_accountNumber_key" UNIQUE ("accountNumber");


--
-- Name: chart_of_accounts chart_of_accounts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chart_of_accounts
    ADD CONSTRAINT chart_of_accounts_pkey PRIMARY KEY (id);


--
-- Name: cheque_status_history cheque_status_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cheque_status_history
    ADD CONSTRAINT cheque_status_history_pkey PRIMARY KEY (id);


--
-- Name: cheques cheques_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cheques
    ADD CONSTRAINT cheques_pkey PRIMARY KEY (id);


--
-- Name: contract_agreements contract_agreements_agreementNumber_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contract_agreements
    ADD CONSTRAINT "contract_agreements_agreementNumber_key" UNIQUE ("agreementNumber");


--
-- Name: contract_agreements contract_agreements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contract_agreements
    ADD CONSTRAINT contract_agreements_pkey PRIMARY KEY (id);


--
-- Name: contract_agreements contract_agreements_signingToken_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contract_agreements
    ADD CONSTRAINT "contract_agreements_signingToken_key" UNIQUE ("signingToken");


--
-- Name: country_tax_rules country_tax_rules_country_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.country_tax_rules
    ADD CONSTRAINT country_tax_rules_country_key UNIQUE (country);


--
-- Name: country_tax_rules country_tax_rules_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.country_tax_rules
    ADD CONSTRAINT country_tax_rules_pkey PRIMARY KEY (id);


--
-- Name: credit_notes credit_notes_creditNoteNo_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.credit_notes
    ADD CONSTRAINT "credit_notes_creditNoteNo_key" UNIQUE ("creditNoteNo");


--
-- Name: credit_notes credit_notes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.credit_notes
    ADD CONSTRAINT credit_notes_pkey PRIMARY KEY (id);


--
-- Name: depreciation_brand_rules depreciation_brand_rules_brandId_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.depreciation_brand_rules
    ADD CONSTRAINT "depreciation_brand_rules_brandId_key" UNIQUE ("brandId");


--
-- Name: depreciation_brand_rules depreciation_brand_rules_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.depreciation_brand_rules
    ADD CONSTRAINT depreciation_brand_rules_pkey PRIMARY KEY (id);


--
-- Name: depreciation_journal_entries depreciation_journal_entries_periodYear_periodMonth_branchI_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.depreciation_journal_entries
    ADD CONSTRAINT "depreciation_journal_entries_periodYear_periodMonth_branchI_key" UNIQUE ("periodYear", "periodMonth", "branchId");


--
-- Name: depreciation_journal_entries depreciation_journal_entries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.depreciation_journal_entries
    ADD CONSTRAINT depreciation_journal_entries_pkey PRIMARY KEY (id);


--
-- Name: depreciation_model_rules depreciation_model_rules_modelId_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.depreciation_model_rules
    ADD CONSTRAINT "depreciation_model_rules_modelId_key" UNIQUE ("modelId");


--
-- Name: depreciation_model_rules depreciation_model_rules_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.depreciation_model_rules
    ADD CONSTRAINT depreciation_model_rules_pkey PRIMARY KEY (id);


--
-- Name: employee_expense_requests employee_expense_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_expense_requests
    ADD CONSTRAINT employee_expense_requests_pkey PRIMARY KEY (id);


--
-- Name: employee_expense_requests employee_expense_requests_requestNo_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_expense_requests
    ADD CONSTRAINT "employee_expense_requests_requestNo_key" UNIQUE ("requestNo");


--
-- Name: employee_target_achievements employee_target_achievements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_target_achievements
    ADD CONSTRAINT employee_target_achievements_pkey PRIMARY KEY (id);


--
-- Name: employee_target_achievements employee_target_achievements_targetId_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_target_achievements
    ADD CONSTRAINT "employee_target_achievements_targetId_key" UNIQUE ("targetId");


--
-- Name: employee_targets employee_targets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_targets
    ADD CONSTRAINT employee_targets_pkey PRIMARY KEY (id);


--
-- Name: equity_entries equity_entries_entryNo_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.equity_entries
    ADD CONSTRAINT "equity_entries_entryNo_key" UNIQUE ("entryNo");


--
-- Name: equity_entries equity_entries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.equity_entries
    ADD CONSTRAINT equity_entries_pkey PRIMARY KEY (id);


--
-- Name: exchange_rates exchange_rates_fromCurrency_toCurrency_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exchange_rates
    ADD CONSTRAINT "exchange_rates_fromCurrency_toCurrency_key" UNIQUE ("fromCurrency", "toCurrency");


--
-- Name: exchange_rates exchange_rates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exchange_rates
    ADD CONSTRAINT exchange_rates_pkey PRIMARY KEY (id);


--
-- Name: expense_entries expense_entries_expenseNo_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expense_entries
    ADD CONSTRAINT "expense_entries_expenseNo_key" UNIQUE ("expenseNo");


--
-- Name: expense_entries expense_entries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expense_entries
    ADD CONSTRAINT expense_entries_pkey PRIMARY KEY (id);


--
-- Name: guarantee_cheques guarantee_cheques_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.guarantee_cheques
    ADD CONSTRAINT guarantee_cheques_pkey PRIMARY KEY (id);


--
-- Name: income_entries income_entries_incomeNo_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.income_entries
    ADD CONSTRAINT "income_entries_incomeNo_key" UNIQUE ("incomeNo");


--
-- Name: income_entries income_entries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.income_entries
    ADD CONSTRAINT income_entries_pkey PRIMARY KEY (id);


--
-- Name: installation_requests installation_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.installation_requests
    ADD CONSTRAINT installation_requests_pkey PRIMARY KEY (id);


--
-- Name: invoice_ledger invoice_ledger_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoice_ledger
    ADD CONSTRAINT invoice_ledger_pkey PRIMARY KEY (id);


--
-- Name: machine_swap_requests machine_swap_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.machine_swap_requests
    ADD CONSTRAINT machine_swap_requests_pkey PRIMARY KEY (id);


--
-- Name: manual_journal_entries manual_journal_entries_entryNo_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.manual_journal_entries
    ADD CONSTRAINT "manual_journal_entries_entryNo_key" UNIQUE ("entryNo");


--
-- Name: manual_journal_entries manual_journal_entries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.manual_journal_entries
    ADD CONSTRAINT manual_journal_entries_pkey PRIMARY KEY (id);


--
-- Name: manual_payables manual_payables_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.manual_payables
    ADD CONSTRAINT manual_payables_pkey PRIMARY KEY (id);


--
-- Name: manual_payables manual_payables_referenceNo_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.manual_payables
    ADD CONSTRAINT "manual_payables_referenceNo_key" UNIQUE ("referenceNo");


--
-- Name: manual_receivables manual_receivables_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.manual_receivables
    ADD CONSTRAINT manual_receivables_pkey PRIMARY KEY (id);


--
-- Name: manual_receivables manual_receivables_referenceNo_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.manual_receivables
    ADD CONSTRAINT "manual_receivables_referenceNo_key" UNIQUE ("referenceNo");


--
-- Name: opening_balance_entries opening_balance_entries_entry_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.opening_balance_entries
    ADD CONSTRAINT opening_balance_entries_entry_number_key UNIQUE (entry_number);


--
-- Name: opening_balance_entries opening_balance_entries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.opening_balance_entries
    ADD CONSTRAINT opening_balance_entries_pkey PRIMARY KEY (id);


--
-- Name: owners owners_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.owners
    ADD CONSTRAINT owners_pkey PRIMARY KEY (id);


--
-- Name: payable_payments payable_payments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payable_payments
    ADD CONSTRAINT payable_payments_pkey PRIMARY KEY (id);


--
-- Name: payment_transactions payment_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_transactions
    ADD CONSTRAINT payment_transactions_pkey PRIMARY KEY (id);


--
-- Name: receivable_payments receivable_payments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.receivable_payments
    ADD CONSTRAINT receivable_payments_pkey PRIMARY KEY (id);


--
-- Name: sale_payment_requests sale_payment_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sale_payment_requests
    ADD CONSTRAINT sale_payment_requests_pkey PRIMARY KEY (id);


--
-- Name: sale_payment_requests sale_payment_requests_requestNo_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sale_payment_requests
    ADD CONSTRAINT "sale_payment_requests_requestNo_key" UNIQUE ("requestNo");


--
-- Name: spare_part_credit_notes spare_part_credit_notes_creditNoteNo_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.spare_part_credit_notes
    ADD CONSTRAINT "spare_part_credit_notes_creditNoteNo_key" UNIQUE ("creditNoteNo");


--
-- Name: spare_part_credit_notes spare_part_credit_notes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.spare_part_credit_notes
    ADD CONSTRAINT spare_part_credit_notes_pkey PRIMARY KEY (id);


--
-- Name: employee_targets uniq_employee_month; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_targets
    ADD CONSTRAINT uniq_employee_month UNIQUE ("employeeId", "targetMonth");


--
-- Name: vat_remittances vat_remittances_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vat_remittances
    ADD CONSTRAINT vat_remittances_pkey PRIMARY KEY (id);


--
-- Name: IDX_00732eae833f1d221c6a759b26; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_00732eae833f1d221c6a759b26" ON public.invoices USING btree ("assignedEmployeeId");


--
-- Name: IDX_05c1dd35c7e7f14396c2b6ea38; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_05c1dd35c7e7f14396c2b6ea38" ON public.return_credits USING btree ("branchId");


--
-- Name: IDX_087453334d99e04669b8828990; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_087453334d99e04669b8828990" ON public.device_meter_readings USING btree ("serialNumber");


--
-- Name: IDX_23d944d6d174314fb4b6b5c72d; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_23d944d6d174314fb4b6b5c72d" ON public.invoices USING btree ("contractStatus", type) WHERE (type = 'PROFORMA'::public.invoices_type_enum);


--
-- Name: IDX_2beb767e5644b31a1e5ec153f3; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_2beb767e5644b31a1e5ec153f3" ON public.usage_record_items USING btree ("usageRecordId");


--
-- Name: IDX_3e2e31772735cd3f366cc0b0ba; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_3e2e31772735cd3f366cc0b0ba" ON public.product_allocations USING btree ("productId");


--
-- Name: IDX_4027c467b44543fd81b2096591; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_4027c467b44543fd81b2096591" ON public.return_credits USING btree (invoice_id);


--
-- Name: IDX_5cb39c8c98de7bb80ea975775c; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_5cb39c8c98de7bb80ea975775c" ON public.invoices USING btree ("isTemplate");


--
-- Name: IDX_687afc7f2a08d1af62a30c2ba1; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_687afc7f2a08d1af62a30c2ba1" ON public.usage_record_items USING btree ("allocationId");


--
-- Name: IDX_81d316e7e2e5e0704fa130e19b; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_81d316e7e2e5e0704fa130e19b" ON public.product_allocations USING btree ("contractId");


--
-- Name: IDX_8c59a402b1e601c77bb8245348; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_8c59a402b1e601c77bb8245348" ON public.quotation_template_assignments USING btree ("templateId");


--
-- Name: IDX_c92393a336302f3c92e00f5f3d; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "IDX_c92393a336302f3c92e00f5f3d" ON public.invoices USING btree ("templateId", "assignedEmployeeId", "customerId") WHERE (((status)::text <> ALL ((ARRAY['SUPERSEDED'::character varying, 'RETAKEN'::character varying])::text[])) AND (type = 'QUOTATION'::public.invoices_type_enum) AND ("templateId" IS NOT NULL) AND ("assignedEmployeeId" IS NOT NULL) AND ("customerId" IS NOT NULL));


--
-- Name: IDX_contract_agreements_branchId; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_contract_agreements_branchId" ON public.contract_agreements USING btree ("branchId");


--
-- Name: IDX_contract_agreements_invoiceId; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_contract_agreements_invoiceId" ON public.contract_agreements USING btree ("invoiceId");


--
-- Name: IDX_credit_notes_spare_part_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_credit_notes_spare_part_id" ON public.credit_notes USING btree ("sparePartId");


--
-- Name: IDX_de1dfd8828ec49166cb70fb4c6; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_de1dfd8828ec49166cb70fb4c6" ON public.invoices USING btree ("templateId");


--
-- Name: IDX_df2aa5614e3532a4ef95e7c1b3; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_df2aa5614e3532a4ef95e7c1b3" ON public.device_meter_readings USING btree ("invoiceId");


--
-- Name: IDX_installation_requests_branchId; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_installation_requests_branchId" ON public.installation_requests USING btree ("branchId");


--
-- Name: IDX_installation_requests_invoiceId; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_installation_requests_invoiceId" ON public.installation_requests USING btree ("invoiceId");


--
-- Name: IDX_machine_swap_requests_branchId; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_machine_swap_requests_branchId" ON public.machine_swap_requests USING btree (branch_id);


--
-- Name: IDX_machine_swap_requests_contractId; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_machine_swap_requests_contractId" ON public.machine_swap_requests USING btree (contract_id);


--
-- Name: IDX_machine_swap_requests_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_machine_swap_requests_status" ON public.machine_swap_requests USING btree (status);


--
-- Name: IDX_sale_payment_requests_branchId; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_sale_payment_requests_branchId" ON public.sale_payment_requests USING btree ("branchId");


--
-- Name: IDX_sale_payment_requests_invoiceId; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_sale_payment_requests_invoiceId" ON public.sale_payment_requests USING btree ("invoiceId");


--
-- Name: IDX_sale_payment_requests_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_sale_payment_requests_status" ON public.sale_payment_requests USING btree (status);


--
-- Name: IDX_sale_payment_requests_usageRecordId; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_sale_payment_requests_usageRecordId" ON public.sale_payment_requests USING btree ("usageRecordId");


--
-- Name: idx_expense_req_branch; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_expense_req_branch ON public.employee_expense_requests USING btree ("branchId");


--
-- Name: idx_expense_req_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_expense_req_date ON public.employee_expense_requests USING btree (date);


--
-- Name: idx_expense_req_employee; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_expense_req_employee ON public.employee_expense_requests USING btree ("employeeId");


--
-- Name: idx_expense_req_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_expense_req_status ON public.employee_expense_requests USING btree (status);


--
-- Name: idx_machine_swap_branch; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_machine_swap_branch ON public.machine_swap_requests USING btree (branch_id);


--
-- Name: idx_machine_swap_contract; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_machine_swap_contract ON public.machine_swap_requests USING btree (contract_id);


--
-- Name: idx_machine_swap_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_machine_swap_status ON public.machine_swap_requests USING btree (status);


--
-- Name: uniq_cashbook_source; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uniq_cashbook_source ON public.cashbook_entries USING btree ("sourceType", "sourceId") WHERE ("sourceType" IS NOT NULL);


--
-- Name: uniq_product_allocation_active; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uniq_product_allocation_active ON public.product_allocations USING btree ("productId") WHERE (("productId" IS NOT NULL) AND (status = 'ALLOCATED'::public.product_allocations_status_enum));


--
-- Name: usage_record_items FK_2beb767e5644b31a1e5ec153f38; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usage_record_items
    ADD CONSTRAINT "FK_2beb767e5644b31a1e5ec153f38" FOREIGN KEY ("usageRecordId") REFERENCES public.usage_records(id) ON DELETE CASCADE;


--
-- Name: return_credits FK_4027c467b44543fd81b20965918; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.return_credits
    ADD CONSTRAINT "FK_4027c467b44543fd81b20965918" FOREIGN KEY (invoice_id) REFERENCES public.invoices(id) ON DELETE CASCADE;


--
-- Name: usage_record_items FK_687afc7f2a08d1af62a30c2ba13; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usage_record_items
    ADD CONSTRAINT "FK_687afc7f2a08d1af62a30c2ba13" FOREIGN KEY ("allocationId") REFERENCES public.product_allocations(id) ON DELETE RESTRICT;


--
-- Name: invoice_items FK_7fb6895fc8fad9f5200e91abb59; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoice_items
    ADD CONSTRAINT "FK_7fb6895fc8fad9f5200e91abb59" FOREIGN KEY ("invoiceId") REFERENCES public.invoices(id) ON DELETE CASCADE;


--
-- Name: product_allocations FK_81d316e7e2e5e0704fa130e19b0; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_allocations
    ADD CONSTRAINT "FK_81d316e7e2e5e0704fa130e19b0" FOREIGN KEY ("contractId") REFERENCES public.invoices(id) ON DELETE CASCADE;


--
-- Name: usage_records FK_c32b5ff4a2dd713e2e2986a4141; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usage_records
    ADD CONSTRAINT "FK_c32b5ff4a2dd713e2e2986a4141" FOREIGN KEY ("contractId") REFERENCES public.invoices(id);


--
-- Name: payment_ledgers FK_cd91f46302281f4b683765a1c6e; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_ledgers
    ADD CONSTRAINT "FK_cd91f46302281f4b683765a1c6e" FOREIGN KEY ("invoiceId") REFERENCES public.invoices(id) ON DELETE CASCADE;


--
-- Name: account_reconciliations account_reconciliations_accountId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.account_reconciliations
    ADD CONSTRAINT "account_reconciliations_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES public.cash_bank_accounts(id) ON DELETE CASCADE;


--
-- Name: cashbook_entries cashbook_entries_accountId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cashbook_entries
    ADD CONSTRAINT "cashbook_entries_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES public.cash_bank_accounts(id);


--
-- Name: chart_of_accounts chart_of_accounts_linkedCashBankAccountId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chart_of_accounts
    ADD CONSTRAINT "chart_of_accounts_linkedCashBankAccountId_fkey" FOREIGN KEY ("linkedCashBankAccountId") REFERENCES public.cash_bank_accounts(id);


--
-- Name: chart_of_accounts chart_of_accounts_parentAccountId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chart_of_accounts
    ADD CONSTRAINT "chart_of_accounts_parentAccountId_fkey" FOREIGN KEY ("parentAccountId") REFERENCES public.chart_of_accounts(id);


--
-- Name: cheque_status_history cheque_status_history_cheque_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cheque_status_history
    ADD CONSTRAINT cheque_status_history_cheque_id_fkey FOREIGN KEY (cheque_id) REFERENCES public.cheques(id) ON DELETE CASCADE;


--
-- Name: cheques cheques_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cheques
    ADD CONSTRAINT cheques_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.cash_bank_accounts(id);


--
-- Name: cheques cheques_cashbook_entry_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cheques
    ADD CONSTRAINT cheques_cashbook_entry_id_fkey FOREIGN KEY (cashbook_entry_id) REFERENCES public.cashbook_entries(id);


--
-- Name: credit_notes credit_notes_invoice_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.credit_notes
    ADD CONSTRAINT credit_notes_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES public.invoices(id);


--
-- Name: depreciation_journal_entries depreciation_journal_entries_expenseEntryId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.depreciation_journal_entries
    ADD CONSTRAINT "depreciation_journal_entries_expenseEntryId_fkey" FOREIGN KEY ("expenseEntryId") REFERENCES public.expense_entries(id);


--
-- Name: equity_entries equity_entries_linkedCashAccountId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.equity_entries
    ADD CONSTRAINT "equity_entries_linkedCashAccountId_fkey" FOREIGN KEY ("linkedCashAccountId") REFERENCES public.cash_bank_accounts(id);


--
-- Name: equity_entries equity_entries_ownerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.equity_entries
    ADD CONSTRAINT "equity_entries_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES public.owners(id);


--
-- Name: expense_entries expense_entries_paidFrom_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expense_entries
    ADD CONSTRAINT "expense_entries_paidFrom_fkey" FOREIGN KEY ("paidFrom") REFERENCES public.cash_bank_accounts(id);


--
-- Name: income_entries income_entries_receivedTo_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.income_entries
    ADD CONSTRAINT "income_entries_receivedTo_fkey" FOREIGN KEY ("receivedTo") REFERENCES public.cash_bank_accounts(id);


--
-- Name: invoice_ledger invoice_ledger_invoice_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoice_ledger
    ADD CONSTRAINT invoice_ledger_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES public.invoices(id) ON DELETE CASCADE;


--
-- Name: manual_journal_entries manual_journal_entries_chartOfAccountId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.manual_journal_entries
    ADD CONSTRAINT "manual_journal_entries_chartOfAccountId_fkey" FOREIGN KEY ("chartOfAccountId") REFERENCES public.chart_of_accounts(id);


--
-- Name: opening_balance_entries opening_balance_entries_invoice_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.opening_balance_entries
    ADD CONSTRAINT opening_balance_entries_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES public.invoices(id) ON DELETE SET NULL;


--
-- Name: payable_payments payable_payments_paidFromAccount_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payable_payments
    ADD CONSTRAINT "payable_payments_paidFromAccount_fkey" FOREIGN KEY ("paidFromAccount") REFERENCES public.cash_bank_accounts(id);


--
-- Name: payable_payments payable_payments_payableId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payable_payments
    ADD CONSTRAINT "payable_payments_payableId_fkey" FOREIGN KEY ("payableId") REFERENCES public.manual_payables(id);


--
-- Name: payment_transactions payment_transactions_invoice_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_transactions
    ADD CONSTRAINT payment_transactions_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES public.invoices(id) ON DELETE CASCADE;


--
-- Name: receivable_payments receivable_payments_paidToAccount_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.receivable_payments
    ADD CONSTRAINT "receivable_payments_paidToAccount_fkey" FOREIGN KEY ("paidToAccount") REFERENCES public.cash_bank_accounts(id);


--
-- Name: receivable_payments receivable_payments_receivableId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.receivable_payments
    ADD CONSTRAINT "receivable_payments_receivableId_fkey" FOREIGN KEY ("receivableId") REFERENCES public.manual_receivables(id);


--
-- PostgreSQL database dump complete
--

\unrestrict oHek2eqovVb1mLesnTniDlOpo8qsXPFV216JqNgX7pMrfSfz6eky7rejEuOftU7

