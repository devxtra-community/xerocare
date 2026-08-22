--
-- PostgreSQL database dump
--

\restrict xEIdestPCz3iopKBQGkVaFZLmUJlVrG9YYTKGb2r7NYqeJiEhafierefvQ9CVbb

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
-- Name: employee_employee_job_enum; Type: TYPE; Schema: public; Owner: xerouser
--

CREATE TYPE public.employee_employee_job_enum AS ENUM (
    'SALES',
    'CRM',
    'RENT_AND_LEASE',
    'MANAGER',
    'TECHNICIAN',
    'SERVICE_HELP_DESK',
    'SERVICE_TECHNICIAN'
);


ALTER TYPE public.employee_employee_job_enum OWNER TO xerouser;

--
-- Name: employee_finance_job_enum; Type: TYPE; Schema: public; Owner: xerouser
--

CREATE TYPE public.employee_finance_job_enum AS ENUM (
    'FINANCE_SALES',
    'FINANCE_RENT',
    'FINANCE_LEASE',
    'FINANCE_MANAGER',
    'FINANCE_RENT_LEASE'
);


ALTER TYPE public.employee_finance_job_enum OWNER TO xerouser;

--
-- Name: employee_role_enum; Type: TYPE; Schema: public; Owner: xerouser
--

CREATE TYPE public.employee_role_enum AS ENUM (
    'ADMIN',
    'HR',
    'MANAGER',
    'EMPLOYEE',
    'FINANCE'
);


ALTER TYPE public.employee_role_enum OWNER TO xerouser;

--
-- Name: employee_status_enum; Type: TYPE; Schema: public; Owner: xerouser
--

CREATE TYPE public.employee_status_enum AS ENUM (
    'ACTIVE',
    'INACTIVE',
    'DELETED'
);


ALTER TYPE public.employee_status_enum OWNER TO xerouser;

--
-- Name: leave_applications_leave_type_enum; Type: TYPE; Schema: public; Owner: xerouser
--

CREATE TYPE public.leave_applications_leave_type_enum AS ENUM (
    'SICK',
    'CASUAL',
    'VACATION',
    'PERSONAL',
    'EMERGENCY'
);


ALTER TYPE public.leave_applications_leave_type_enum OWNER TO xerouser;

--
-- Name: leave_applications_status_enum; Type: TYPE; Schema: public; Owner: xerouser
--

CREATE TYPE public.leave_applications_status_enum AS ENUM (
    'PENDING',
    'APPROVED',
    'REJECTED',
    'CANCELLED'
);


ALTER TYPE public.leave_applications_status_enum OWNER TO xerouser;

--
-- Name: payrolls_status_enum; Type: TYPE; Schema: public; Owner: xerouser
--

CREATE TYPE public.payrolls_status_enum AS ENUM (
    'PENDING',
    'PAID',
    'CANCELLED'
);


ALTER TYPE public.payrolls_status_enum OWNER TO xerouser;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: admin; Type: TABLE; Schema: public; Owner: xerouser
--

CREATE TABLE public.admin (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    email character varying(255) NOT NULL,
    password_hash character varying(255) NOT NULL,
    role character varying(255) DEFAULT 'ADMIN'::character varying NOT NULL,
    "createdAt" timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.admin OWNER TO xerouser;

--
-- Name: auth; Type: TABLE; Schema: public; Owner: xerouser
--

CREATE TABLE public.auth (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    refresh_token character varying NOT NULL,
    ip_address character varying,
    user_agent character varying,
    "createdAt" timestamp with time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
    employee_id uuid,
    admin_id uuid
);


ALTER TABLE public.auth OWNER TO xerouser;

--
-- Name: branches_mirror; Type: TABLE; Schema: public; Owner: xerouser
--

CREATE TABLE public.branches_mirror (
    branch_id character varying NOT NULL,
    name character varying NOT NULL,
    location character varying,
    status character varying DEFAULT 'ACTIVE'::character varying NOT NULL,
    synced_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.branches_mirror OWNER TO xerouser;

--
-- Name: employee; Type: TABLE; Schema: public; Owner: xerouser
--

CREATE TABLE public.employee (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    display_id character varying(20),
    email character varying(255) NOT NULL,
    first_name character varying(255),
    last_name character varying(255),
    password_hash character varying(255) NOT NULL,
    role public.employee_role_enum DEFAULT 'EMPLOYEE'::public.employee_role_enum NOT NULL,
    employee_job public.employee_employee_job_enum,
    finance_job public.employee_finance_job_enum,
    salary numeric(12,2),
    profile_image_url character varying(500),
    id_proof_key character varying(500),
    status public.employee_status_enum DEFAULT 'ACTIVE'::public.employee_status_enum NOT NULL,
    "createdAt" timestamp with time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
    expire_date timestamp with time zone,
    branch_id character varying(255)
);


ALTER TABLE public.employee OWNER TO xerouser;

--
-- Name: leave_applications; Type: TABLE; Schema: public; Owner: xerouser
--

CREATE TABLE public.leave_applications (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    employee_id uuid NOT NULL,
    branch_id character varying NOT NULL,
    start_date date NOT NULL,
    end_date date NOT NULL,
    leave_type public.leave_applications_leave_type_enum NOT NULL,
    reason text NOT NULL,
    status public.leave_applications_status_enum DEFAULT 'PENDING'::public.leave_applications_status_enum NOT NULL,
    reviewed_by uuid,
    reviewed_at timestamp with time zone,
    rejection_reason text,
    "createdAt" timestamp with time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.leave_applications OWNER TO xerouser;

--
-- Name: notifications; Type: TABLE; Schema: public; Owner: xerouser
--

CREATE TABLE public.notifications (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    employee_id uuid NOT NULL,
    title character varying(255) NOT NULL,
    message text NOT NULL,
    type character varying(50) DEFAULT 'INFO'::character varying NOT NULL,
    data jsonb,
    is_read boolean DEFAULT false NOT NULL,
    "createdAt" timestamp with time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.notifications OWNER TO xerouser;

--
-- Name: payrolls; Type: TABLE; Schema: public; Owner: xerouser
--

CREATE TABLE public.payrolls (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    employee_id uuid NOT NULL,
    branch_id character varying NOT NULL,
    month integer NOT NULL,
    year integer NOT NULL,
    salary_amount numeric(12,2) NOT NULL,
    work_days integer DEFAULT 0 NOT NULL,
    leave_days integer DEFAULT 0 NOT NULL,
    status public.payrolls_status_enum DEFAULT 'PENDING'::public.payrolls_status_enum NOT NULL,
    paid_date timestamp with time zone,
    "createdAt" timestamp with time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.payrolls OWNER TO xerouser;

--
-- Data for Name: admin; Type: TABLE DATA; Schema: public; Owner: xerouser
--

COPY public.admin (id, email, password_hash, role, "createdAt") FROM stdin;
531e24ad-e487-47a8-8096-3de80d3e5d8a	admin@xerocare.com	$2b$10$fFhCOTjwJoDXVw44zsRa5.nAmfsh.LOKDzHTMAikc/34yvrSMqQaW	ADMIN	2026-07-04 18:56:26.114974+05:30
\.


--
-- Data for Name: auth; Type: TABLE DATA; Schema: public; Owner: xerouser
--

COPY public.auth (id, refresh_token, ip_address, user_agent, "createdAt", "updatedAt", employee_id, admin_id) FROM stdin;
f23e5579-cd8d-4987-8d91-489fce8f184a	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjU0ZTQzNDQ5LTliMTgtNDYyZC1hZWM2LTExMmRiYmM2NWQ5YiIsImlhdCI6MTc4NzM0MjA4OCwiZXhwIjoxNzg4NjM4MDg4fQ.ghfbOu8SEcpOaBnfdqsQjUahDGsPia_a1-ar-O5VRPs	::ffff:127.0.0.1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36	2026-08-22 01:24:48.720556+05:30	2026-08-22 01:24:48.720556+05:30	54e43449-9b18-462d-aec6-112dbbc65d9b	\N
3abe0949-1527-4433-a07f-8ededc9ba4a4	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImQ3NDZlMjliLTEzYmUtNDQxZi1iNDNkLTVjNTFmYzY3ZTcxMyIsImlhdCI6MTc4NzMwNjkyMywiZXhwIjoxNzg4NjAyOTIzfQ.zzcEZM7ki7GVsbaXfBEO4jKSxZwHAUTU4c65Bw99fcI	::ffff:127.0.0.1	Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:152.0) Gecko/20100101 Firefox/152.0	2026-08-21 15:38:43.63249+05:30	2026-08-21 15:38:43.63249+05:30	d746e29b-13be-441f-b43d-5c51fc67e713	\N
89e7910c-1f1b-4de9-b837-c0fb268e6a82	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjUzMWUyNGFkLWU0ODctNDdhOC04MDk2LTNkZTgwZDNlNWQ4YSIsImlhdCI6MTc4Njk1ODA5MSwiZXhwIjoxNzg4MjU0MDkxfQ.OhBly4phOmBjo1TYuTc6fWjIfRAZp33gL-dUFGYLVfs	::ffff:127.0.0.1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36	2026-08-17 14:44:51.830344+05:30	2026-08-17 14:44:51.830344+05:30	\N	531e24ad-e487-47a8-8096-3de80d3e5d8a
4c304c8d-22c9-4c47-a3d7-2b930a91c88d	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjUzMWUyNGFkLWU0ODctNDdhOC04MDk2LTNkZTgwZDNlNWQ4YSIsImlhdCI6MTc4Njk1ODQxMCwiZXhwIjoxNzg4MjU0NDEwfQ.GBofSL4eTW8CDnZb9GdanKGhQmmi0ZM36rO63ovvh24	::ffff:127.0.0.1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36	2026-08-17 14:50:10.976459+05:30	2026-08-17 14:50:10.976459+05:30	\N	531e24ad-e487-47a8-8096-3de80d3e5d8a
2141ab03-8899-44fb-ad22-b616bf469359	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjRhZDNjZGZiLTg2YTQtNDA3YS1iNTAyLTE1YTk3YzlmOTJlYyIsImlhdCI6MTc4NzMxMTUyOCwiZXhwIjoxNzg4NjA3NTI4fQ.PI8mvW22nF77N-F4dm2brJ28yUEty8lp34IgSermg5s	::ffff:127.0.0.1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36	2026-08-21 16:55:28.417042+05:30	2026-08-21 16:55:28.417042+05:30	4ad3cdfb-86a4-407a-b502-15a97c9f92ec	\N
dd24662e-8e3b-4491-ad87-85005bf8578d	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjU0ZTQzNDQ5LTliMTgtNDYyZC1hZWM2LTExMmRiYmM2NWQ5YiIsImlhdCI6MTc4NzMxMTc2NywiZXhwIjoxNzg4NjA3NzY3fQ.y6B6m5uNeTaSuQpkCdGis5EZxjBY9uJQXY3LhMuKDY0	::ffff:127.0.0.1	Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:152.0) Gecko/20100101 Firefox/152.0	2026-08-21 16:59:27.289719+05:30	2026-08-21 16:59:27.289719+05:30	54e43449-9b18-462d-aec6-112dbbc65d9b	\N
803cf058-2b12-4157-b2f2-57dddab3139f	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjU0ZTQzNDQ5LTliMTgtNDYyZC1hZWM2LTExMmRiYmM2NWQ5YiIsImlhdCI6MTc4NzMxNTYxMSwiZXhwIjoxNzg4NjExNjExfQ.XIsK2ONnn4Ff-veHq2DtD9KeN7TBYVEjxcyJsP1yI38	::ffff:127.0.0.1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36	2026-08-21 18:03:31.973614+05:30	2026-08-21 18:03:31.973614+05:30	54e43449-9b18-462d-aec6-112dbbc65d9b	\N
76b6fe2e-b100-445c-ade2-31961df84a4a	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjU0ZTQzNDQ5LTliMTgtNDYyZC1hZWM2LTExMmRiYmM2NWQ5YiIsImlhdCI6MTc4NzMyNDI2OCwiZXhwIjoxNzg4NjIwMjY4fQ.7qrDWpuky_qxemyGvQezH5d2lmu9d45EAJOpEQ26A8s	::ffff:127.0.0.1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36	2026-08-21 20:27:48.676686+05:30	2026-08-21 20:27:48.676686+05:30	54e43449-9b18-462d-aec6-112dbbc65d9b	\N
4557235b-767a-4ff0-811a-1d6d843cef85	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjU0ZTQzNDQ5LTliMTgtNDYyZC1hZWM2LTExMmRiYmM2NWQ5YiIsImlhdCI6MTc4NzMyNjU2NSwiZXhwIjoxNzg4NjIyNTY1fQ.UJIyTY_YWQ57ol37gb-xST8lkpOGwawE6iDt6Ujv9Zg	::ffff:127.0.0.1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36	2026-08-21 21:06:05.0634+05:30	2026-08-21 21:06:05.0634+05:30	54e43449-9b18-462d-aec6-112dbbc65d9b	\N
\.


--
-- Data for Name: branches_mirror; Type: TABLE DATA; Schema: public; Owner: xerouser
--

COPY public.branches_mirror (branch_id, name, location, status, synced_at, updated_at) FROM stdin;
3f791696-075c-4c28-bcc8-25074cd0a54f	xerocare uae daira branch	daira	ACTIVE	2026-08-21 14:40:53.570422+05:30	2026-08-21 14:40:53.570422+05:30
24039cac-a975-4a63-97b0-1035e720f577	XEROCARE TEST BRANCH	Test Location	ACTIVE	2026-08-21 16:15:25.034573+05:30	2026-08-21 16:15:25.034573+05:30
\.


--
-- Data for Name: employee; Type: TABLE DATA; Schema: public; Owner: xerouser
--

COPY public.employee (id, display_id, email, first_name, last_name, password_hash, role, employee_job, finance_job, salary, profile_image_url, id_proof_key, status, "createdAt", "updatedAt", expire_date, branch_id) FROM stdin;
d746e29b-13be-441f-b43d-5c51fc67e713	M01	muhammedriyas9218@gmail.com	RIYAS 	BRANCH MANAGER 	$2b$10$YFpTNsWjrlsvquV58eG2e.L/f42T075nWXSEEDOa210TikJafgEJW	MANAGER	\N	\N	5000.00	\N	\N	ACTIVE	2026-08-21 14:41:57.560927+05:30	2026-08-21 14:49:03.572597+05:30	2026-08-21 00:00:00+05:30	3f791696-075c-4c28-bcc8-25074cd0a54f
6cac7cd1-de80-4ec2-9f8b-d3c1db4f8fa3	F02	testfinance@xerocare.test	TEST	FINANCE MANAGER	$2b$10$0qQM8Fzmu74CBdvkMfUf2.uYzVi.z3f9vp70CtGSWy.eKx4HVifn.	FINANCE	\N	FINANCE_MANAGER	\N	\N	\N	ACTIVE	2026-08-21 16:15:53.970188+05:30	2026-08-21 16:15:53.970188+05:30	\N	24039cac-a975-4a63-97b0-1035e720f577
61014340-f58f-4a8b-b4db-28a8c36fa10e	M02	testmanager@xerocare.test	TEST	MANAGER	$2b$10$/OqE/TYWeqmTaWO79/JjFegHaIPFnVU.E8uOv0nDPrT9XBgOOIRc.	MANAGER	MANAGER	\N	\N	\N	\N	ACTIVE	2026-08-21 16:16:00.85455+05:30	2026-08-21 16:16:00.85455+05:30	\N	24039cac-a975-4a63-97b0-1035e720f577
4ad3cdfb-86a4-407a-b502-15a97c9f92ec	E03	mriyastk8@gmail.com	RIYAS	EMPLOYEE MANAGER	$2b$10$QUPpk9SfxlERAZ1Wwnt4j.quaQRagG70sDBGlkKyGzgEpsTeOKOme	EMPLOYEE	MANAGER	\N	5000.00	\N	\N	ACTIVE	2026-08-21 14:44:32.332714+05:30	2026-08-21 16:24:43.233682+05:30	2026-08-21 00:00:00+05:30	3f791696-075c-4c28-bcc8-25074cd0a54f
54e43449-9b18-462d-aec6-112dbbc65d9b	F01	riyastk824@gmail.com	RIYAS	FINANCE MANAGER 	$2b$10$DYX627v7hT0bd3Mx0fAeQ.rK0q6dCmIxRU83KQf89BT.2ew/Vbh2q	FINANCE	\N	FINANCE_MANAGER	7000.00	\N	\N	ACTIVE	2026-08-21 14:45:20.660566+05:30	2026-08-21 16:43:29.515376+05:30	2026-08-21 00:00:00+05:30	3f791696-075c-4c28-bcc8-25074cd0a54f
cdbba987-57d2-4277-b23f-4e15c9318699	E02	riyasdevxtra@gmail.com	RIYAS	SERVICE  HELP DESK	$2b$10$hBSAw5HamrfQ35P7zycWLuWCX97/kIvHsQFTaMrkSTlOONYuvcDX.	EMPLOYEE	SERVICE_HELP_DESK	\N	5000.00	\N	\N	ACTIVE	2026-08-21 14:43:46.94056+05:30	2026-08-21 17:24:48.302368+05:30	2026-08-21 00:00:00+05:30	3f791696-075c-4c28-bcc8-25074cd0a54f
ba455ef2-9d79-4681-8ac5-ed5231679059	E01	riyaski368@gmail.com	RIYAS	SERVICE TECHNICIAN	$2b$10$g3dRKHe5dmaTqgdnln4vDO6rq6LscjMPUDZDmCSigKeHCpFgiBeHy	EMPLOYEE	SERVICE_TECHNICIAN	\N	5000.00	\N	\N	ACTIVE	2026-08-21 14:42:41.866341+05:30	2026-08-21 17:40:52.67572+05:30	2026-08-20 00:00:00+05:30	3f791696-075c-4c28-bcc8-25074cd0a54f
\.


--
-- Data for Name: leave_applications; Type: TABLE DATA; Schema: public; Owner: xerouser
--

COPY public.leave_applications (id, employee_id, branch_id, start_date, end_date, leave_type, reason, status, reviewed_by, reviewed_at, rejection_reason, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: notifications; Type: TABLE DATA; Schema: public; Owner: xerouser
--

COPY public.notifications (id, employee_id, title, message, type, data, is_read, "createdAt", "updatedAt") FROM stdin;
6551576d-5233-4531-af67-1190893da94c	d746e29b-13be-441f-b43d-5c51fc67e713	All Vendors Have Quoted	All vendors have submitted their quotes for RFQ [RFQ-202608-3834]. You can now compare and award.	RFQ_FULLY_QUOTED	{"referenceId": "0fd371e0-64a6-4c0c-b3e4-1c6c52cf71aa", "referenceType": "QUOTATION"}	f	2026-08-21 14:57:29.960589+05:30	2026-08-21 14:57:29.960589+05:30
1bb5c157-55e1-47d4-b287-45aacf604643	d746e29b-13be-441f-b43d-5c51fc67e713	RFQ Awarded	RFQ [RFQ-202608-3834] has been awarded to NADHIL REMAKOLI TRDERS . You can now create a lot from this RFQ.	RFQ_AWARDED	{"referenceId": "0fd371e0-64a6-4c0c-b3e4-1c6c52cf71aa", "referenceType": "QUOTATION"}	f	2026-08-21 14:57:37.290703+05:30	2026-08-21 14:57:37.290703+05:30
401daa4c-6ff0-4004-a3bc-86a52dfa265d	d746e29b-13be-441f-b43d-5c51fc67e713	Purchase Payment Approved ✅	Your AED 200000.00 payment to vendor has been approved and funds deducted.	EXPENSE_APPROVED	\N	f	2026-08-21 15:17:57.94033+05:30	2026-08-21 15:17:57.94033+05:30
5f735e4c-de2b-4807-a207-e1c7212c9ee8	d746e29b-13be-441f-b43d-5c51fc67e713	Expense Request Submitted	RIYAS  BRANCH MANAGER submitted a AED 2000.00 expense request for TRANSPORT.	EXPENSE_REQUEST	{"link": "/manager/expenses"}	f	2026-08-21 15:20:32.7657+05:30	2026-08-21 15:20:32.7657+05:30
81d49f59-afe9-408e-b0c8-ef5f3a1768ca	531e24ad-e487-47a8-8096-3de80d3e5d8a	Expense Request Submitted	RIYAS  BRANCH MANAGER (branch xerocare uae daira branch) submitted a AED 2000.00 expense request for TRANSPORT.	EXPENSE_REQUEST	\N	f	2026-08-21 15:20:32.843469+05:30	2026-08-21 15:20:32.843469+05:30
6332ef8d-ce26-4b04-b548-f832da85c1e5	61014340-f58f-4a8b-b4db-28a8c36fa10e	Expense Request Submitted	TEST MANAGER submitted a AED 1000.00 expense request for TRAVEL.	EXPENSE_REQUEST	{"link": "/manager/expenses"}	f	2026-08-21 16:17:15.956005+05:30	2026-08-21 16:17:15.956005+05:30
5271ce8c-6b97-492d-9e6d-df106ecf07a2	531e24ad-e487-47a8-8096-3de80d3e5d8a	Expense Request Submitted	TEST MANAGER (branch XEROCARE TEST BRANCH) submitted a AED 1000.00 expense request for TRAVEL.	EXPENSE_REQUEST	\N	f	2026-08-21 16:17:16.003824+05:30	2026-08-21 16:17:16.003824+05:30
fb2d73b0-bff6-46c2-9f40-3cb1efdc2b74	61014340-f58f-4a8b-b4db-28a8c36fa10e	Expense Approved & Paid ✅	Your expense of AED 1000.00 for TRAVEL has been approved and paid	EXPENSE_APPROVED	\N	f	2026-08-21 16:17:30.064356+05:30	2026-08-21 16:17:30.064356+05:30
6d779a50-cd11-4581-8573-6cd05083acfb	61014340-f58f-4a8b-b4db-28a8c36fa10e	Expense Request Approved	TEST MANAGER's AED 1000.00 expense for TRAVEL was approved.	EXPENSE_APPROVED	{"link": "/manager/expenses"}	f	2026-08-21 16:17:30.090477+05:30	2026-08-21 16:17:30.090477+05:30
40919887-f359-48c3-b62d-a5fa9d3c2d76	531e24ad-e487-47a8-8096-3de80d3e5d8a	Expense Request Approved	TEST MANAGER's (branch XEROCARE TEST BRANCH) AED 1000.00 expense for TRAVEL was approved.	EXPENSE_APPROVED	\N	f	2026-08-21 16:17:30.112266+05:30	2026-08-21 16:17:30.112266+05:30
900aaaf1-24ff-4e07-b173-61244c190136	61014340-f58f-4a8b-b4db-28a8c36fa10e	Expense Request Submitted	TEST MANAGER submitted a AED 9000.00 expense request for FUEL.	EXPENSE_REQUEST	{"link": "/manager/expenses"}	f	2026-08-21 16:17:45.690641+05:30	2026-08-21 16:17:45.690641+05:30
a0a60101-3078-4a97-a1cd-d0b1b804fa04	531e24ad-e487-47a8-8096-3de80d3e5d8a	Expense Request Submitted	TEST MANAGER (branch XEROCARE TEST BRANCH) submitted a AED 9000.00 expense request for FUEL.	EXPENSE_REQUEST	\N	f	2026-08-21 16:17:45.708174+05:30	2026-08-21 16:17:45.708174+05:30
db321f1a-b521-4f39-b93d-b3ee32622d0e	61014340-f58f-4a8b-b4db-28a8c36fa10e	Expense Approved & Paid ✅	Your expense of AED 9000.00 for FUEL has been approved and paid	EXPENSE_APPROVED	\N	f	2026-08-21 16:18:09.287917+05:30	2026-08-21 16:18:09.287917+05:30
63598372-25a7-4d1a-ac3c-cf3466a6ea50	61014340-f58f-4a8b-b4db-28a8c36fa10e	Expense Request Approved	TEST MANAGER's AED 9000.00 expense for FUEL was approved.	EXPENSE_APPROVED	{"link": "/manager/expenses"}	f	2026-08-21 16:18:09.310427+05:30	2026-08-21 16:18:09.310427+05:30
abd710fa-2c19-446c-abdb-d89607d602e9	531e24ad-e487-47a8-8096-3de80d3e5d8a	Expense Request Approved	TEST MANAGER's (branch XEROCARE TEST BRANCH) AED 9000.00 expense for FUEL was approved.	EXPENSE_APPROVED	\N	f	2026-08-21 16:18:09.328329+05:30	2026-08-21 16:18:09.328329+05:30
03df8324-a26a-4e9c-a703-65584423b20f	61014340-f58f-4a8b-b4db-28a8c36fa10e	Expense Request Submitted	TEST MANAGER submitted a AED 500.00 expense request for OFFICE_SUPPLIES.	EXPENSE_REQUEST	{"link": "/manager/expenses"}	f	2026-08-21 16:18:27.786484+05:30	2026-08-21 16:18:27.786484+05:30
03c67f1c-8079-4e0c-8678-5c4c099e128b	531e24ad-e487-47a8-8096-3de80d3e5d8a	Expense Request Submitted	TEST MANAGER (branch XEROCARE TEST BRANCH) submitted a AED 500.00 expense request for OFFICE_SUPPLIES.	EXPENSE_REQUEST	\N	f	2026-08-21 16:18:27.805423+05:30	2026-08-21 16:18:27.805423+05:30
7f4fda03-493f-44b6-b543-ad737c45d41c	61014340-f58f-4a8b-b4db-28a8c36fa10e	Expense Approved & Paid ✅	Your expense of AED 500.00 for OFFICE_SUPPLIES has been approved and paid	EXPENSE_APPROVED	\N	f	2026-08-21 16:19:54.53548+05:30	2026-08-21 16:19:54.53548+05:30
19e8e531-880a-4f3c-882f-170dab0b398e	61014340-f58f-4a8b-b4db-28a8c36fa10e	Expense Request Approved	TEST MANAGER's AED 500.00 expense for OFFICE_SUPPLIES was approved.	EXPENSE_APPROVED	{"link": "/manager/expenses"}	f	2026-08-21 16:19:54.555142+05:30	2026-08-21 16:19:54.555142+05:30
7a800ee2-1b87-474a-8f74-8520262adeb1	531e24ad-e487-47a8-8096-3de80d3e5d8a	Expense Request Approved	TEST MANAGER's (branch XEROCARE TEST BRANCH) AED 500.00 expense for OFFICE_SUPPLIES was approved.	EXPENSE_APPROVED	\N	f	2026-08-21 16:19:54.568236+05:30	2026-08-21 16:19:54.568236+05:30
8c4adfb7-6b59-4809-acda-e150330cef1a	d746e29b-13be-441f-b43d-5c51fc67e713	New Quotation Created	A new PRODUCT_SALE quotation (QTN-2026-0001) was created.	INFO	{"referenceId": "323dbba4-0669-43fd-aac9-efdec49ad33d", "referenceType": "QUOTATION"}	f	2026-08-21 16:30:22.164052+05:30	2026-08-21 16:30:22.164052+05:30
67faf9bb-05e3-41a2-8149-644524c1e30f	d746e29b-13be-441f-b43d-5c51fc67e713	New Quotation Created	A new RENT quotation (QTN-2026-0002) was created.	INFO	{"referenceId": "02b43c38-8df6-4423-acea-9bb0622a70ef", "referenceType": "QUOTATION"}	f	2026-08-21 16:31:21.813217+05:30	2026-08-21 16:31:21.813217+05:30
243c5a1e-c62a-4d4d-bcb8-e85d4ec533bf	d746e29b-13be-441f-b43d-5c51fc67e713	New Quotation Created	A new RENT quotation (QTN-2026-0003) was created.	INFO	{"referenceId": "06bcfd35-e97f-465a-ad8c-e95c7c7639e1", "referenceType": "QUOTATION"}	f	2026-08-21 16:33:24.238463+05:30	2026-08-21 16:33:24.238463+05:30
cf741100-b696-41ae-bfde-a2722caa7b6b	4ad3cdfb-86a4-407a-b502-15a97c9f92ec	Quotation Submitted	Your quotation [QTN-2026-0003] has been submitted for finance review.	QUOTATION_SUBMITTED	{"referenceId": "06bcfd35-e97f-465a-ad8c-e95c7c7639e1", "referenceType": "QUOTATION"}	f	2026-08-21 16:33:56.672943+05:30	2026-08-21 16:33:56.672943+05:30
13f971ab-8714-46b7-9d6c-b0aa146c7311	4ad3cdfb-86a4-407a-b502-15a97c9f92ec	Quotation Submitted	Your quotation [QTN-2026-0002] has been submitted for finance review.	QUOTATION_SUBMITTED	{"referenceId": "02b43c38-8df6-4423-acea-9bb0622a70ef", "referenceType": "QUOTATION"}	f	2026-08-21 16:34:00.689331+05:30	2026-08-21 16:34:00.689331+05:30
82f7f4ee-d8a8-4677-931f-3a5610b955de	4ad3cdfb-86a4-407a-b502-15a97c9f92ec	Quotation Submitted	Your quotation [QTN-2026-0001] has been submitted for finance review.	QUOTATION_SUBMITTED	{"referenceId": "323dbba4-0669-43fd-aac9-efdec49ad33d", "referenceType": "QUOTATION"}	f	2026-08-21 16:34:03.557507+05:30	2026-08-21 16:34:03.557507+05:30
4fb2926e-3a14-4c82-a964-a7cc172a0c34	4ad3cdfb-86a4-407a-b502-15a97c9f92ec	Quotation Approved	Great news! Your quotation [QTN-2026-0003] for Customer has been approved by Finance. You can now send it to the customer.	QUOTATION_APPROVED	{"referenceId": "06bcfd35-e97f-465a-ad8c-e95c7c7639e1", "referenceType": "QUOTATION"}	f	2026-08-21 16:44:36.977816+05:30	2026-08-21 16:44:36.977816+05:30
1a033bd1-322e-40e5-9c7e-a130048e7269	d746e29b-13be-441f-b43d-5c51fc67e713	Quotation Approved	A quotation [QTN-2026-0003] for Customer has been approved by Finance.	QUOTATION_APPROVED	{"referenceId": "06bcfd35-e97f-465a-ad8c-e95c7c7639e1", "referenceType": "QUOTATION"}	f	2026-08-21 16:44:37.189159+05:30	2026-08-21 16:44:37.189159+05:30
014b8669-681c-44e5-b4a9-a69eb1b02d73	531e24ad-e487-47a8-8096-3de80d3e5d8a	Quotation Approved	A quotation [QTN-2026-0003] for Customer (branch 3f791696-075c-4c28-bcc8-25074cd0a54f) has been approved by Finance.	QUOTATION_APPROVED	{"referenceId": "06bcfd35-e97f-465a-ad8c-e95c7c7639e1", "referenceType": "QUOTATION"}	f	2026-08-21 16:44:37.246479+05:30	2026-08-21 16:44:37.246479+05:30
65c2f1e0-70ff-49a8-92ea-87d2360ceca7	4ad3cdfb-86a4-407a-b502-15a97c9f92ec	Quotation Approved	Great news! Your quotation [QTN-2026-0002] for Customer has been approved by Finance. You can now send it to the customer.	QUOTATION_APPROVED	{"referenceId": "02b43c38-8df6-4423-acea-9bb0622a70ef", "referenceType": "QUOTATION"}	f	2026-08-21 16:44:40.543547+05:30	2026-08-21 16:44:40.543547+05:30
f12d4fcf-f3f1-434d-bf64-145576932fa2	d746e29b-13be-441f-b43d-5c51fc67e713	Quotation Approved	A quotation [QTN-2026-0002] for Customer has been approved by Finance.	QUOTATION_APPROVED	{"referenceId": "02b43c38-8df6-4423-acea-9bb0622a70ef", "referenceType": "QUOTATION"}	f	2026-08-21 16:44:40.571629+05:30	2026-08-21 16:44:40.571629+05:30
8dee9641-dd8e-404d-8195-91441517aa13	531e24ad-e487-47a8-8096-3de80d3e5d8a	Quotation Approved	A quotation [QTN-2026-0002] for Customer (branch 3f791696-075c-4c28-bcc8-25074cd0a54f) has been approved by Finance.	QUOTATION_APPROVED	{"referenceId": "02b43c38-8df6-4423-acea-9bb0622a70ef", "referenceType": "QUOTATION"}	f	2026-08-21 16:44:40.634422+05:30	2026-08-21 16:44:40.634422+05:30
f4379a9c-abd5-4e4b-a8da-af78f9d45ae7	4ad3cdfb-86a4-407a-b502-15a97c9f92ec	Quotation Approved	Great news! Your quotation [QTN-2026-0001] for Customer has been approved by Finance. You can now send it to the customer.	QUOTATION_APPROVED	{"referenceId": "323dbba4-0669-43fd-aac9-efdec49ad33d", "referenceType": "QUOTATION"}	f	2026-08-21 16:44:43.799766+05:30	2026-08-21 16:44:43.799766+05:30
2be2f7db-7cc1-42a7-a6a9-d6e6db8a3237	d746e29b-13be-441f-b43d-5c51fc67e713	Quotation Approved	A quotation [QTN-2026-0001] for Customer has been approved by Finance.	QUOTATION_APPROVED	{"referenceId": "323dbba4-0669-43fd-aac9-efdec49ad33d", "referenceType": "QUOTATION"}	f	2026-08-21 16:44:43.842017+05:30	2026-08-21 16:44:43.842017+05:30
7166aa39-01c9-426c-a672-c972d7d4a672	531e24ad-e487-47a8-8096-3de80d3e5d8a	Quotation Approved	A quotation [QTN-2026-0001] for Customer (branch 3f791696-075c-4c28-bcc8-25074cd0a54f) has been approved by Finance.	QUOTATION_APPROVED	{"referenceId": "323dbba4-0669-43fd-aac9-efdec49ad33d", "referenceType": "QUOTATION"}	f	2026-08-21 16:44:43.889551+05:30	2026-08-21 16:44:43.889551+05:30
28ba6305-eb6c-43ee-b274-021fcd23d83c	d746e29b-13be-441f-b43d-5c51fc67e713	Quotation Converted	A quotation [QTN-2026-0001] for Customer has been converted into a transaction (Proforma contract) by RIYAS EMPLOYEE MANAGER.	QUOTATION_CONVERTED	{"referenceId": "323dbba4-0669-43fd-aac9-efdec49ad33d", "referenceType": "CONTRACT"}	f	2026-08-21 16:45:31.700829+05:30	2026-08-21 16:45:31.700829+05:30
bcfbc762-a40b-4ae7-8754-2602d6890eea	4ad3cdfb-86a4-407a-b502-15a97c9f92ec	Contract Activated	The contract for customer Customer has been activated successfully.	CONTRACT_ACTIVATED	{"referenceId": "323dbba4-0669-43fd-aac9-efdec49ad33d", "referenceType": "CONTRACT"}	f	2026-08-21 16:45:31.995489+05:30	2026-08-21 16:45:31.995489+05:30
e32e36d4-a5e7-43cf-aa57-7e1093d60808	d746e29b-13be-441f-b43d-5c51fc67e713	Contract Activated	Contract [QTN-2026-0001] for customer Customer has been activated by RIYAS EMPLOYEE MANAGER.	CONTRACT_ACTIVATED	{"referenceId": "323dbba4-0669-43fd-aac9-efdec49ad33d", "referenceType": "CONTRACT"}	f	2026-08-21 16:45:32.015026+05:30	2026-08-21 16:45:32.015026+05:30
e1cd25cd-3404-44f8-8394-a30eaa9c29c0	531e24ad-e487-47a8-8096-3de80d3e5d8a	Contract Activated	The contract for customer Customer (branch 3f791696-075c-4c28-bcc8-25074cd0a54f) is now active.	CONTRACT_ACTIVATED	{"referenceId": "323dbba4-0669-43fd-aac9-efdec49ad33d", "referenceType": "CONTRACT"}	f	2026-08-21 16:45:32.083511+05:30	2026-08-21 16:45:32.083511+05:30
3a535335-17b5-4d38-b872-de38dd9099ed	d746e29b-13be-441f-b43d-5c51fc67e713	Quotation Converted	A quotation [QTN-2026-0002] for Customer has been converted into a transaction (Proforma contract) by RIYAS EMPLOYEE MANAGER.	QUOTATION_CONVERTED	{"referenceId": "02b43c38-8df6-4423-acea-9bb0622a70ef", "referenceType": "CONTRACT"}	f	2026-08-21 17:26:59.286986+05:30	2026-08-21 17:26:59.286986+05:30
c7178414-f38c-4607-855e-69ea1afd1314	4ad3cdfb-86a4-407a-b502-15a97c9f92ec	Contract Activated	The contract for customer Customer has been activated successfully.	CONTRACT_ACTIVATED	{"referenceId": "02b43c38-8df6-4423-acea-9bb0622a70ef", "referenceType": "CONTRACT"}	f	2026-08-21 17:31:10.919904+05:30	2026-08-21 17:31:10.919904+05:30
20b2c764-3b24-4354-bc67-2e768a29c702	d746e29b-13be-441f-b43d-5c51fc67e713	Contract Activated	Contract [QTN-2026-0002] for customer Customer has been activated by RIYAS EMPLOYEE MANAGER.	CONTRACT_ACTIVATED	{"referenceId": "02b43c38-8df6-4423-acea-9bb0622a70ef", "referenceType": "CONTRACT"}	f	2026-08-21 17:31:10.931089+05:30	2026-08-21 17:31:10.931089+05:30
5301035f-2f20-4124-8159-4fe8bab466cc	531e24ad-e487-47a8-8096-3de80d3e5d8a	Contract Activated	The contract for customer Customer (branch 3f791696-075c-4c28-bcc8-25074cd0a54f) is now active.	CONTRACT_ACTIVATED	{"referenceId": "02b43c38-8df6-4423-acea-9bb0622a70ef", "referenceType": "CONTRACT"}	f	2026-08-21 17:31:11.015957+05:30	2026-08-21 17:31:11.015957+05:30
fe796e0c-a1e6-41f6-aefc-d635c7d5b5ca	d746e29b-13be-441f-b43d-5c51fc67e713	Quotation Converted	A quotation [QTN-2026-0003] for Customer has been converted into a transaction (Proforma contract) by RIYAS EMPLOYEE MANAGER.	QUOTATION_CONVERTED	{"referenceId": "06bcfd35-e97f-465a-ad8c-e95c7c7639e1", "referenceType": "CONTRACT"}	f	2026-08-21 17:32:19.854479+05:30	2026-08-21 17:32:19.854479+05:30
724410d6-d9d6-4dee-9db3-582bffac4026	4ad3cdfb-86a4-407a-b502-15a97c9f92ec	Contract Activated	The contract for customer Customer has been activated successfully.	CONTRACT_ACTIVATED	{"referenceId": "06bcfd35-e97f-465a-ad8c-e95c7c7639e1", "referenceType": "CONTRACT"}	f	2026-08-21 17:33:32.434986+05:30	2026-08-21 17:33:32.434986+05:30
b25ecc1b-07f7-42cc-85d3-086365c46b6c	d746e29b-13be-441f-b43d-5c51fc67e713	Contract Activated	Contract [QTN-2026-0003] for customer Customer has been activated by RIYAS EMPLOYEE MANAGER.	CONTRACT_ACTIVATED	{"referenceId": "06bcfd35-e97f-465a-ad8c-e95c7c7639e1", "referenceType": "CONTRACT"}	f	2026-08-21 17:33:32.455547+05:30	2026-08-21 17:33:32.455547+05:30
4b3fa394-d92d-4918-90e6-e2441a4295a6	531e24ad-e487-47a8-8096-3de80d3e5d8a	Contract Activated	The contract for customer Customer (branch 3f791696-075c-4c28-bcc8-25074cd0a54f) is now active.	CONTRACT_ACTIVATED	{"referenceId": "06bcfd35-e97f-465a-ad8c-e95c7c7639e1", "referenceType": "CONTRACT"}	f	2026-08-21 17:33:32.525287+05:30	2026-08-21 17:33:32.525287+05:30
08d6cc56-0eee-4e63-85ee-fbb163d2dc95	54e43449-9b18-462d-aec6-112dbbc65d9b	Quotation Submitted for Review	A quotation [QTN-2026-0003] for Customer has been submitted for review. Please check details and approve/reject.	QUOTATION_SUBMITTED	{"referenceId": "06bcfd35-e97f-465a-ad8c-e95c7c7639e1", "referenceType": "QUOTATION"}	t	2026-08-21 16:33:56.63024+05:30	2026-08-21 19:18:40.674094+05:30
ea83dfb6-4f59-4ae8-b501-92406dd47cd2	54e43449-9b18-462d-aec6-112dbbc65d9b	Quotation Submitted for Review	A quotation [QTN-2026-0002] for Customer has been submitted for review. Please check details and approve/reject.	QUOTATION_SUBMITTED	{"referenceId": "02b43c38-8df6-4423-acea-9bb0622a70ef", "referenceType": "QUOTATION"}	t	2026-08-21 16:34:00.645433+05:30	2026-08-21 19:18:40.674094+05:30
5c8f226c-8f39-4efd-b6e0-4bd1633042ab	54e43449-9b18-462d-aec6-112dbbc65d9b	Quotation Submitted for Review	A quotation [QTN-2026-0001] for Customer has been submitted for review. Please check details and approve/reject.	QUOTATION_SUBMITTED	{"referenceId": "323dbba4-0669-43fd-aac9-efdec49ad33d", "referenceType": "QUOTATION"}	t	2026-08-21 16:34:03.514135+05:30	2026-08-21 19:18:40.674094+05:30
896382ce-538d-4469-9355-b6d8d8455600	54e43449-9b18-462d-aec6-112dbbc65d9b	Contract Activated	The contract for customer Customer is now active. Delivery and billing schedules are initialized.	CONTRACT_ACTIVATED	{"referenceId": "323dbba4-0669-43fd-aac9-efdec49ad33d", "referenceType": "CONTRACT"}	t	2026-08-21 16:45:32.039547+05:30	2026-08-21 19:18:40.674094+05:30
5b53a2ea-d974-4695-8327-f58838f7b31a	54e43449-9b18-462d-aec6-112dbbc65d9b	Cheque Deposited	Cheque #CHQ738782 from nadhil customer  deposited — Cash at Bank updates once it clears.	INFO	\N	t	2026-08-21 16:57:56.98724+05:30	2026-08-21 19:18:40.674094+05:30
745ef869-6f11-4b98-ac75-6a02d0235e8a	54e43449-9b18-462d-aec6-112dbbc65d9b	Contract Activated	The contract for customer Customer is now active. Delivery and billing schedules are initialized.	CONTRACT_ACTIVATED	{"referenceId": "02b43c38-8df6-4423-acea-9bb0622a70ef", "referenceType": "CONTRACT"}	t	2026-08-21 17:31:10.96287+05:30	2026-08-21 19:18:40.674094+05:30
e66d1e08-241e-4e13-bcff-06325e41ca05	54e43449-9b18-462d-aec6-112dbbc65d9b	Contract Activated	The contract for customer Customer is now active. Delivery and billing schedules are initialized.	CONTRACT_ACTIVATED	{"referenceId": "06bcfd35-e97f-465a-ad8c-e95c7c7639e1", "referenceType": "CONTRACT"}	t	2026-08-21 17:33:32.480078+05:30	2026-08-21 19:18:40.674094+05:30
5d8a8202-4076-4093-8d81-8ff3e02b3657	54e43449-9b18-462d-aec6-112dbbc65d9b	Cheque Deposited	Cheque #CHQ13243 from nadhil customer  deposited — Cash at Bank updates once it clears.	INFO	\N	f	2026-08-21 22:19:38.187892+05:30	2026-08-21 22:19:38.187892+05:30
60f45fe1-b836-42bc-8804-f5b07a0e4a59	d746e29b-13be-441f-b43d-5c51fc67e713	Expense Approved & Paid ✅	Your expense of AED 2000.00 for TRANSPORT has been approved and paid	EXPENSE_APPROVED	\N	f	2026-08-21 22:32:07.620814+05:30	2026-08-21 22:32:07.620814+05:30
33a93fc6-102f-4185-ba02-16c3faa0947c	d746e29b-13be-441f-b43d-5c51fc67e713	Expense Request Approved	RIYAS  BRANCH MANAGER's AED 2000.00 expense for TRANSPORT was approved.	EXPENSE_APPROVED	{"link": "/manager/expenses"}	f	2026-08-21 22:32:07.654415+05:30	2026-08-21 22:32:07.654415+05:30
6330f3fa-e207-4fa3-a6aa-b4ddd5aca941	531e24ad-e487-47a8-8096-3de80d3e5d8a	Expense Request Approved	RIYAS  BRANCH MANAGER's (branch xerocare uae daira branch) AED 2000.00 expense for TRANSPORT was approved.	EXPENSE_APPROVED	\N	f	2026-08-21 22:32:07.685333+05:30	2026-08-21 22:32:07.685333+05:30
78b9bded-5380-4f2c-8fc7-ee38ca6e97a9	4ad3cdfb-86a4-407a-b502-15a97c9f92ec	Customer signed contract agreement	nadhil customer has signed agreement CA-2026-001.	SUCCESS	{"referenceId": "02b43c38-8df6-4423-acea-9bb0622a70ef", "referenceType": "CONTRACT"}	f	2026-08-22 02:45:22.32251+05:30	2026-08-22 02:45:22.32251+05:30
58506833-e516-4765-8f2a-d7ad9832f2ef	54e43449-9b18-462d-aec6-112dbbc65d9b	Customer approved bill	nadhil customer approved the bill for contract QTN-2026-0002.	SUCCESS	{"referenceId": "02b43c38-8df6-4423-acea-9bb0622a70ef", "referenceType": "CONTRACT"}	f	2026-08-22 02:45:57.413692+05:30	2026-08-22 02:45:57.413692+05:30
640f9fb7-67d1-46ad-a988-0409f94cef44	00000000-0000-0000-0000-000000000002	Purchase Payment Approved ✅	Your AED 5000.00 payment to Test Vendor has been approved and funds deducted.	EXPENSE_APPROVED	\N	f	2026-08-22 11:08:37.148687+05:30	2026-08-22 11:08:37.148687+05:30
34ebbfc1-12ab-47ba-b7d6-700c67ed4eb3	d746e29b-13be-441f-b43d-5c51fc67e713	Expense Request Submitted	Employee submitted a AED 750.00 expense request for Office Supplies.	EXPENSE_REQUEST	{"link": "/manager/expenses"}	f	2026-08-22 11:09:57.749022+05:30	2026-08-22 11:09:57.749022+05:30
a8317477-e4a2-480c-b0fb-c92a8c1e3edb	531e24ad-e487-47a8-8096-3de80d3e5d8a	Expense Request Submitted	Employee (branch Unknown Branch) submitted a AED 750.00 expense request for Office Supplies.	EXPENSE_REQUEST	\N	f	2026-08-22 11:09:57.782877+05:30	2026-08-22 11:09:57.782877+05:30
25c30c2a-3f38-498d-81d5-2c1853915423	00000000-0000-0000-0000-000000000003	Expense Approved ✅	Your expense of AED 750.00 for Office Supplies has been approved	EXPENSE_APPROVED	\N	f	2026-08-22 11:10:01.182674+05:30	2026-08-22 11:10:01.182674+05:30
f4607778-36ff-494c-a49a-59317f70bab7	d746e29b-13be-441f-b43d-5c51fc67e713	Expense Request Approved	Employee's AED 750.00 expense for Office Supplies was approved.	EXPENSE_APPROVED	{"link": "/manager/expenses"}	f	2026-08-22 11:10:01.212426+05:30	2026-08-22 11:10:01.212426+05:30
84f2a12c-b1e5-4dba-8709-7b891dd1c8ae	531e24ad-e487-47a8-8096-3de80d3e5d8a	Expense Request Approved	Employee's (branch Unknown Branch) AED 750.00 expense for Office Supplies was approved.	EXPENSE_APPROVED	\N	f	2026-08-22 11:10:01.229539+05:30	2026-08-22 11:10:01.229539+05:30
ba927382-749e-441f-a0e0-b02fc84b186f	00000000-0000-0000-0000-000000000003	Expense Paid 💰	AED 750.00 for Office Supplies has been paid. Reference: N/A	EXPENSE_PAID	\N	f	2026-08-22 11:10:05.276627+05:30	2026-08-22 11:10:05.276627+05:30
\.


--
-- Data for Name: payrolls; Type: TABLE DATA; Schema: public; Owner: xerouser
--

COPY public.payrolls (id, employee_id, branch_id, month, year, salary_amount, work_days, leave_days, status, paid_date, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Name: branches_mirror PK_021bbe074b3c3273ba6181d02ef; Type: CONSTRAINT; Schema: public; Owner: xerouser
--

ALTER TABLE ONLY public.branches_mirror
    ADD CONSTRAINT "PK_021bbe074b3c3273ba6181d02ef" PRIMARY KEY (branch_id);


--
-- Name: employee PK_3c2bc72f03fd5abbbc5ac169498; Type: CONSTRAINT; Schema: public; Owner: xerouser
--

ALTER TABLE ONLY public.employee
    ADD CONSTRAINT "PK_3c2bc72f03fd5abbbc5ac169498" PRIMARY KEY (id);


--
-- Name: payrolls PK_4fc19dcf3522661435565b5ecf3; Type: CONSTRAINT; Schema: public; Owner: xerouser
--

ALTER TABLE ONLY public.payrolls
    ADD CONSTRAINT "PK_4fc19dcf3522661435565b5ecf3" PRIMARY KEY (id);


--
-- Name: notifications PK_6a72c3c0f683f6462415e653c3a; Type: CONSTRAINT; Schema: public; Owner: xerouser
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT "PK_6a72c3c0f683f6462415e653c3a" PRIMARY KEY (id);


--
-- Name: auth PK_7e416cf6172bc5aec04244f6459; Type: CONSTRAINT; Schema: public; Owner: xerouser
--

ALTER TABLE ONLY public.auth
    ADD CONSTRAINT "PK_7e416cf6172bc5aec04244f6459" PRIMARY KEY (id);


--
-- Name: leave_applications PK_d986913818cf9a2943d0dbe8f56; Type: CONSTRAINT; Schema: public; Owner: xerouser
--

ALTER TABLE ONLY public.leave_applications
    ADD CONSTRAINT "PK_d986913818cf9a2943d0dbe8f56" PRIMARY KEY (id);


--
-- Name: admin PK_e032310bcef831fb83101899b10; Type: CONSTRAINT; Schema: public; Owner: xerouser
--

ALTER TABLE ONLY public.admin
    ADD CONSTRAINT "PK_e032310bcef831fb83101899b10" PRIMARY KEY (id);


--
-- Name: IDX_01fc8c811016522a153d2e4b98; Type: INDEX; Schema: public; Owner: xerouser
--

CREATE INDEX "IDX_01fc8c811016522a153d2e4b98" ON public.leave_applications USING btree (employee_id, start_date, end_date);


--
-- Name: IDX_2ff9aebe42c1d2a69dce4cc7b4; Type: INDEX; Schema: public; Owner: xerouser
--

CREATE UNIQUE INDEX "IDX_2ff9aebe42c1d2a69dce4cc7b4" ON public.employee USING btree (display_id);


--
-- Name: IDX_3da5d5fb762ed0b0d0468c8f61; Type: INDEX; Schema: public; Owner: xerouser
--

CREATE INDEX "IDX_3da5d5fb762ed0b0d0468c8f61" ON public.employee USING btree (employee_job);


--
-- Name: IDX_5145d894f823722a43ec3e1955; Type: INDEX; Schema: public; Owner: xerouser
--

CREATE INDEX "IDX_5145d894f823722a43ec3e1955" ON public.payrolls USING btree (employee_id);


--
-- Name: IDX_53e354344b9ea90252e3fb078f; Type: INDEX; Schema: public; Owner: xerouser
--

CREATE INDEX "IDX_53e354344b9ea90252e3fb078f" ON public.leave_applications USING btree (status);


--
-- Name: IDX_6c6e8486cdf31c8b5100e449bf; Type: INDEX; Schema: public; Owner: xerouser
--

CREATE INDEX "IDX_6c6e8486cdf31c8b5100e449bf" ON public.payrolls USING btree (status);


--
-- Name: IDX_817d1d427138772d47eca04885; Type: INDEX; Schema: public; Owner: xerouser
--

CREATE UNIQUE INDEX "IDX_817d1d427138772d47eca04885" ON public.employee USING btree (email);


--
-- Name: IDX_95054ab1386d32dfb67edf80f1; Type: INDEX; Schema: public; Owner: xerouser
--

CREATE INDEX "IDX_95054ab1386d32dfb67edf80f1" ON public.leave_applications USING btree (employee_id);


--
-- Name: IDX_d501b14ccab3770f51e1ecc940; Type: INDEX; Schema: public; Owner: xerouser
--

CREATE INDEX "IDX_d501b14ccab3770f51e1ecc940" ON public.leave_applications USING btree (branch_id);


--
-- Name: IDX_d59afae1b9c6b8d9a17548e014; Type: INDEX; Schema: public; Owner: xerouser
--

CREATE INDEX "IDX_d59afae1b9c6b8d9a17548e014" ON public.notifications USING btree (employee_id);


--
-- Name: IDX_e58c7893b38aade592e91286fa; Type: INDEX; Schema: public; Owner: xerouser
--

CREATE INDEX "IDX_e58c7893b38aade592e91286fa" ON public.payrolls USING btree (branch_id);


--
-- Name: IDX_fec3a6e31e833dfefa4d958b38; Type: INDEX; Schema: public; Owner: xerouser
--

CREATE UNIQUE INDEX "IDX_fec3a6e31e833dfefa4d958b38" ON public.payrolls USING btree (employee_id, month, year);


--
-- Name: IDX_ffd79aa44a7d408dd88a993775; Type: INDEX; Schema: public; Owner: xerouser
--

CREATE INDEX "IDX_ffd79aa44a7d408dd88a993775" ON public.employee USING btree (finance_job);


--
-- Name: payrolls FK_5145d894f823722a43ec3e1955e; Type: FK CONSTRAINT; Schema: public; Owner: xerouser
--

ALTER TABLE ONLY public.payrolls
    ADD CONSTRAINT "FK_5145d894f823722a43ec3e1955e" FOREIGN KEY (employee_id) REFERENCES public.employee(id);


--
-- Name: auth FK_61721d6d698f66cf8781496d760; Type: FK CONSTRAINT; Schema: public; Owner: xerouser
--

ALTER TABLE ONLY public.auth
    ADD CONSTRAINT "FK_61721d6d698f66cf8781496d760" FOREIGN KEY (employee_id) REFERENCES public.employee(id) ON DELETE CASCADE;


--
-- Name: leave_applications FK_95054ab1386d32dfb67edf80f1f; Type: FK CONSTRAINT; Schema: public; Owner: xerouser
--

ALTER TABLE ONLY public.leave_applications
    ADD CONSTRAINT "FK_95054ab1386d32dfb67edf80f1f" FOREIGN KEY (employee_id) REFERENCES public.employee(id);


--
-- Name: auth FK_aa96af1497dfb79f48157654f7a; Type: FK CONSTRAINT; Schema: public; Owner: xerouser
--

ALTER TABLE ONLY public.auth
    ADD CONSTRAINT "FK_aa96af1497dfb79f48157654f7a" FOREIGN KEY (admin_id) REFERENCES public.admin(id) ON DELETE CASCADE;


--
-- Name: leave_applications FK_b777a3fef0f502d5727ea9d850a; Type: FK CONSTRAINT; Schema: public; Owner: xerouser
--

ALTER TABLE ONLY public.leave_applications
    ADD CONSTRAINT "FK_b777a3fef0f502d5727ea9d850a" FOREIGN KEY (reviewed_by) REFERENCES public.employee(id);


--
-- PostgreSQL database dump complete
--

\unrestrict xEIdestPCz3iopKBQGkVaFZLmUJlVrG9YYTKGb2r7NYqeJiEhafierefvQ9CVbb

