--
-- PostgreSQL database dump
--

\restrict Dj88jIBoTUULbix6Y0Rm9dFdHTiJDwHixhQScesUYa681NCPmhrfv5tdkK5rc0X

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


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: customers; Type: TABLE; Schema: public; Owner: xerouser
--

CREATE TABLE public.customers (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name character varying NOT NULL,
    email character varying,
    phone character varying,
    location character varying(255),
    "isActive" boolean DEFAULT true NOT NULL,
    branch_id character varying,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL,
    address text,
    vat_number character varying(50),
    country character varying(2),
    state_province character varying(100),
    bank_name character varying(100),
    bank_account_number character varying(50),
    city character varying(100),
    bank_accounts jsonb DEFAULT '[]'::jsonb,
    vat_status character varying(30) DEFAULT 'UNREGISTERED_STANDARD'::character varying NOT NULL,
    exemption_reason character varying(60),
    created_by uuid,
    updated_by uuid,
    customer_type character varying(3) DEFAULT 'B2C'::character varying NOT NULL
);


ALTER TABLE public.customers OWNER TO xerouser;

--
-- Data for Name: customers; Type: TABLE DATA; Schema: public; Owner: xerouser
--

COPY public.customers (id, name, email, phone, location, "isActive", branch_id, "createdAt", "updatedAt", address, vat_number, country, state_province, bank_name, bank_account_number, city, bank_accounts, vat_status, exemption_reason, created_by, updated_by, customer_type) FROM stdin;
09186b65-b7b9-40a9-8fb5-878c04cb9e33	nadhil customer 	nadhilkn33429@gmail.com	+971 543832983	\N	t	3f791696-075c-4c28-bcc8-25074cd0a54f	2026-08-21 16:29:09.083802	2026-08-21 16:29:09.083802	SHUTTUMANI BU LDING 123	\N	AE	Dubai	RAKBANK (National Bank of Ras Al Khaimah)	112213242443	Dubai	[{"iban": "AE677488949904949484940", "branch": "daira", "address": "daira dubai ", "bankName": "RAKBANK (National Bank of Ras Al Khaimah)", "currency": "AED", "isPrimary": true, "swiftCode": "QEFDERGF", "accountType": "Current Account", "bankCountry": "AE", "accountNumber": "112213242443", "routingNumber": "", "accountHolderName": "nadhil customer"}]	UNREGISTERED_STANDARD	\N	4ad3cdfb-86a4-407a-b502-15a97c9f92ec	\N	B2C
\.


--
-- Name: customers PK_133ec679a801fab5e070f73d3ea; Type: CONSTRAINT; Schema: public; Owner: xerouser
--

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT "PK_133ec679a801fab5e070f73d3ea" PRIMARY KEY (id);


--
-- Name: IDX_2ae4f4add790956c0f16a48cb7; Type: INDEX; Schema: public; Owner: xerouser
--

CREATE INDEX "IDX_2ae4f4add790956c0f16a48cb7" ON public.customers USING btree (branch_id);


--
-- Name: IDX_8536b8b85c06969f84f0c098b0; Type: INDEX; Schema: public; Owner: xerouser
--

CREATE INDEX "IDX_8536b8b85c06969f84f0c098b0" ON public.customers USING btree (email);


--
-- Name: IDX_88acd889fbe17d0e16cc4bc917; Type: INDEX; Schema: public; Owner: xerouser
--

CREATE INDEX "IDX_88acd889fbe17d0e16cc4bc917" ON public.customers USING btree (phone);


--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: pg_database_owner
--

GRANT ALL ON SCHEMA public TO xerouser;


--
-- PostgreSQL database dump complete
--

\unrestrict Dj88jIBoTUULbix6Y0Rm9dFdHTiJDwHixhQScesUYa681NCPmhrfv5tdkK5rc0X

