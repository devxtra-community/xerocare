--
-- PostgreSQL database dump
--

\restrict snKUbsGLSUzpDJMVHmELYPqGKAs8lPhGwgpmKYb4HM2sDOn8R447Q27Z4y0XpVR

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


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: customers; Type: TABLE; Schema: public; Owner: -
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


--
-- Data for Name: customers; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.customers (id, name, email, phone, location, "isActive", branch_id, "createdAt", "updatedAt", address, vat_number, country, state_province, bank_name, bank_account_number, city, bank_accounts, vat_status, exemption_reason, created_by, updated_by, customer_type) FROM stdin;
42318e59-0a36-46e3-aa08-50330ba4a78d	NADHIL CUSTOMER	nadhilremakoli@gmail.com	+971 543828504	\N	t	d7b8ef01-87a7-4e0b-bd92-f0c6c4cd3352	2026-08-13 14:27:14.456698	2026-08-13 14:27:14.456698	SHUTTUMANI BU LDING 123	\N	AE	Dubai	Mashreq Bank	12456765435554	Dubai	[{"iban": "AE045454545454545454545", "branch": "daira branch", "address": "DAIRA NAKHEEL STREET", "bankName": "Mashreq Bank", "currency": "AED", "isPrimary": true, "swiftCode": "WEWWEE", "accountType": "Current Account", "bankCountry": "AE", "accountNumber": "12456765435554", "routingNumber": "", "accountHolderName": "MUHAMMED NADHIL KN"}]	UNREGISTERED_STANDARD	\N	b9708648-f4d7-4aaa-ad34-0949ceb8400c	\N	B2C
\.


--
-- Name: customers PK_133ec679a801fab5e070f73d3ea; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT "PK_133ec679a801fab5e070f73d3ea" PRIMARY KEY (id);


--
-- Name: IDX_2ae4f4add790956c0f16a48cb7; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_2ae4f4add790956c0f16a48cb7" ON public.customers USING btree (branch_id);


--
-- Name: IDX_8536b8b85c06969f84f0c098b0; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_8536b8b85c06969f84f0c098b0" ON public.customers USING btree (email);


--
-- Name: IDX_88acd889fbe17d0e16cc4bc917; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_88acd889fbe17d0e16cc4bc917" ON public.customers USING btree (phone);


--
-- PostgreSQL database dump complete
--

\unrestrict snKUbsGLSUzpDJMVHmELYPqGKAs8lPhGwgpmKYb4HM2sDOn8R447Q27Z4y0XpVR

