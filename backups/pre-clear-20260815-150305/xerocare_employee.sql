--
-- PostgreSQL database dump
--

\restrict EIUPqgbxrtBo6mvuQuZwddySyOa5hIeeYcx0aBrBdT4tbEg8M2rgYhRftRHhkDQ

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
-- Name: employee_employee_job_enum; Type: TYPE; Schema: public; Owner: -
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


--
-- Name: employee_finance_job_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.employee_finance_job_enum AS ENUM (
    'FINANCE_SALES',
    'FINANCE_RENT',
    'FINANCE_LEASE',
    'FINANCE_MANAGER',
    'FINANCE_RENT_LEASE'
);


--
-- Name: employee_role_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.employee_role_enum AS ENUM (
    'ADMIN',
    'HR',
    'MANAGER',
    'EMPLOYEE',
    'FINANCE'
);


--
-- Name: employee_status_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.employee_status_enum AS ENUM (
    'ACTIVE',
    'INACTIVE',
    'DELETED'
);


--
-- Name: leave_applications_leave_type_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.leave_applications_leave_type_enum AS ENUM (
    'SICK',
    'CASUAL',
    'VACATION',
    'PERSONAL',
    'EMERGENCY'
);


--
-- Name: leave_applications_status_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.leave_applications_status_enum AS ENUM (
    'PENDING',
    'APPROVED',
    'REJECTED',
    'CANCELLED'
);


--
-- Name: payrolls_status_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.payrolls_status_enum AS ENUM (
    'PENDING',
    'PAID',
    'CANCELLED'
);


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: admin; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.admin (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    email character varying(255) NOT NULL,
    password_hash character varying(255) NOT NULL,
    role character varying(255) DEFAULT 'ADMIN'::character varying NOT NULL,
    "createdAt" timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: auth; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: branches_mirror; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.branches_mirror (
    branch_id character varying NOT NULL,
    name character varying NOT NULL,
    location character varying,
    status character varying DEFAULT 'ACTIVE'::character varying NOT NULL,
    synced_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: employee; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: leave_applications; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: payrolls; Type: TABLE; Schema: public; Owner: -
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


--
-- Data for Name: admin; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.admin (id, email, password_hash, role, "createdAt") FROM stdin;
531e24ad-e487-47a8-8096-3de80d3e5d8a	admin@xerocare.com	$2b$10$fFhCOTjwJoDXVw44zsRa5.nAmfsh.LOKDzHTMAikc/34yvrSMqQaW	ADMIN	2026-07-04 18:56:26.114974+05:30
\.


--
-- Data for Name: auth; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.auth (id, refresh_token, ip_address, user_agent, "createdAt", "updatedAt", employee_id, admin_id) FROM stdin;
af48e072-944c-4b36-a8df-6160a6aa076e	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImU4NjRhM2U0LWZhMzctNDc1NC05NDQwLTYxM2M2YTdjZGQyYyIsImlhdCI6MTc4NjYwOTQwMywiZXhwIjoxNzg3OTA1NDAzfQ.LlfenZpc268X5f_IH-LqOvprg9Sz6MaKgyf5C4PvxAI	::ffff:127.0.0.1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36	2026-08-13 13:53:23.50772+05:30	2026-08-13 13:53:23.50772+05:30	e864a3e4-fa37-4754-9440-613c6a7cdd2c	\N
6a9a5903-7d38-4379-8897-ace6aecba27c	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjU4NzkwNjVlLWZjMDMtNDJhNy1iMDA5LTRlZjlhZTM5NjQyZSIsImlhdCI6MTc4NjYwOTQ4MiwiZXhwIjoxNzg3OTA1NDgyfQ.JYp31CskhSHfgC2f3FZbXTumC5B636353N83BwL7RhQ	::ffff:127.0.0.1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36	2026-08-13 13:54:42.290473+05:30	2026-08-13 13:54:42.290473+05:30	5879065e-fc03-42a7-b009-4ef9ae39642e	\N
333897b5-7d9a-4f28-8713-33768fea986c	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjU4NzkwNjVlLWZjMDMtNDJhNy1iMDA5LTRlZjlhZTM5NjQyZSIsImlhdCI6MTc4NjY0NzMwMiwiZXhwIjoxNzg3OTQzMzAyfQ.o5rAkacT3mlMV021QnwzhXqyXYkYQmmcRI1VlOwUlqo	::ffff:127.0.0.1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36	2026-08-14 00:25:02.263641+05:30	2026-08-14 00:25:02.263641+05:30	5879065e-fc03-42a7-b009-4ef9ae39642e	\N
32d00118-fc65-415c-9b85-01196a5a1b48	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImI5NzA4NjQ4LWY0ZDctNGFhYS1hZDM0LTA5NDljZWI4NDAwYyIsImlhdCI6MTc4NjYxMTIxOSwiZXhwIjoxNzg3OTA3MjE5fQ.1Ig9LXD93VbrzZ7oKB5cJsAC7q31bYYU_2cPriymTb8	::ffff:127.0.0.1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36	2026-08-13 14:23:39.864406+05:30	2026-08-13 14:23:39.864406+05:30	b9708648-f4d7-4aaa-ad34-0949ceb8400c	\N
1278f38c-cc55-4df5-ad9d-8b5e3f88249d	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImQzOGY5YjdlLTc3MmMtNDQ2Mi1hYzUyLTIzZmI0NGU4ZWQ1ZiIsImlhdCI6MTc4NjYxNTM5NiwiZXhwIjoxNzg3OTExMzk2fQ.xHkexE17kYGgYdogmiPsq4DdOIaTBDb1e4la2JTqPn4	::ffff:127.0.0.1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36	2026-08-13 15:33:16.451581+05:30	2026-08-13 15:33:16.451581+05:30	d38f9b7e-772c-4462-ac52-23fb44e8ed5f	\N
9a8feaa9-0d85-40bb-8121-a0a2152c048f	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjU4NzkwNjVlLWZjMDMtNDJhNy1iMDA5LTRlZjlhZTM5NjQyZSIsImlhdCI6MTc4NjYxNTk4NiwiZXhwIjoxNzg3OTExOTg2fQ.HBS8Ra80EMsr7lhPmc_T_hgmdX_hJpM-5IAMkCSTY30	::ffff:127.0.0.1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36	2026-08-13 15:43:06.158574+05:30	2026-08-13 15:43:06.158574+05:30	5879065e-fc03-42a7-b009-4ef9ae39642e	\N
ae6d44a5-1f51-43f1-9e3e-92d507fc4be9	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImI5NzA4NjQ4LWY0ZDctNGFhYS1hZDM0LTA5NDljZWI4NDAwYyIsImlhdCI6MTc4NjYyNjE0MCwiZXhwIjoxNzg3OTIyMTQwfQ.3w7eP1-krmsdIKdsIGhJoMDmKdoIun6xwBgFMr5R3Sk	::ffff:127.0.0.1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36	2026-08-13 18:32:20.886997+05:30	2026-08-13 18:32:20.886997+05:30	b9708648-f4d7-4aaa-ad34-0949ceb8400c	\N
381196e7-cd53-44d4-93a1-26bdc1844b81	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjU4NzkwNjVlLWZjMDMtNDJhNy1iMDA5LTRlZjlhZTM5NjQyZSIsImlhdCI6MTc4NjYyNjk3NiwiZXhwIjoxNzg3OTIyOTc2fQ.ykkE6SUbtZdZsdnVwddjvYdtlocVL3nAdCzqQUc3G7M	::ffff:127.0.0.1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36	2026-08-13 18:46:16.809236+05:30	2026-08-13 18:46:16.809236+05:30	5879065e-fc03-42a7-b009-4ef9ae39642e	\N
fef5da5e-58bf-4de7-94e1-1abdc08ebdf2	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjU4NzkwNjVlLWZjMDMtNDJhNy1iMDA5LTRlZjlhZTM5NjQyZSIsImlhdCI6MTc4NjYyOTIyNSwiZXhwIjoxNzg3OTI1MjI1fQ.k4xL6NNPa2SyJYpNwtkkWkF3GknMRFQPgydmhogmhXg	::ffff:127.0.0.1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36	2026-08-13 19:23:45.840512+05:30	2026-08-13 19:23:45.840512+05:30	5879065e-fc03-42a7-b009-4ef9ae39642e	\N
abb30e6e-f702-4e8e-9d9c-2f9e422dfa45	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImI5NzA4NjQ4LWY0ZDctNGFhYS1hZDM0LTA5NDljZWI4NDAwYyIsImlhdCI6MTc4NjYyOTk5MywiZXhwIjoxNzg3OTI1OTkzfQ.ncHFPao82jfTw8SAVw5I7ZXfC15C0Wr-dqU_674Uorg	::ffff:127.0.0.1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36	2026-08-13 19:36:33.627921+05:30	2026-08-13 19:36:33.627921+05:30	b9708648-f4d7-4aaa-ad34-0949ceb8400c	\N
330eb52e-6de0-48b0-8ac8-7f3912f18015	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImQzOGY5YjdlLTc3MmMtNDQ2Mi1hYzUyLTIzZmI0NGU4ZWQ1ZiIsImlhdCI6MTc4NjYzNzA0MCwiZXhwIjoxNzg3OTMzMDQwfQ.g0yakDRFg-DvqGJQ0IfE7dA3Ht3W8JLAAUi3SAuHWfg	::ffff:127.0.0.1	Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:152.0) Gecko/20100101 Firefox/152.0	2026-08-13 21:34:00.990897+05:30	2026-08-13 21:34:00.990897+05:30	d38f9b7e-772c-4462-ac52-23fb44e8ed5f	\N
01e76cdf-ca18-49a2-a4ff-7be7bb85f101	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImI5NzA4NjQ4LWY0ZDctNGFhYS1hZDM0LTA5NDljZWI4NDAwYyIsImlhdCI6MTc4NjYzNzU2NSwiZXhwIjoxNzg3OTMzNTY1fQ.qS5IRak9AZ4Fr7KP64DMq1pbYe52_jQXeBXVL60C_WU	::ffff:127.0.0.1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36	2026-08-13 21:42:45.660952+05:30	2026-08-13 21:42:45.660952+05:30	b9708648-f4d7-4aaa-ad34-0949ceb8400c	\N
f7418846-c549-4f39-976d-5255171120aa	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjU4NzkwNjVlLWZjMDMtNDJhNy1iMDA5LTRlZjlhZTM5NjQyZSIsImlhdCI6MTc4NjYzNzcxNiwiZXhwIjoxNzg3OTMzNzE2fQ.i_gPBumAEhKYNVPwZUzts-YWD0nQgUxT1fmo42LZhuI	::ffff:127.0.0.1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36	2026-08-13 21:45:16.349676+05:30	2026-08-13 21:45:16.349676+05:30	5879065e-fc03-42a7-b009-4ef9ae39642e	\N
\.


--
-- Data for Name: branches_mirror; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.branches_mirror (branch_id, name, location, status, synced_at, updated_at) FROM stdin;
d7b8ef01-87a7-4e0b-bd92-f0c6c4cd3352	XEROCARE UAE DUBAI BRANCH	DAIRA NAKHEEL STREET	ACTIVE	2026-08-13 13:13:14.64144+05:30	2026-08-13 13:13:14.64144+05:30
\.


--
-- Data for Name: employee; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.employee (id, display_id, email, first_name, last_name, password_hash, role, employee_job, finance_job, salary, profile_image_url, id_proof_key, status, "createdAt", "updatedAt", expire_date, branch_id) FROM stdin;
e864a3e4-fa37-4754-9440-613c6a7cdd2c	M01	muhammedriyas9218@gmail.com	RIYAS 	BRANCH MANAGER	$2b$10$vwazF4f2ddmBF.Hmh1L2keFMqh957Om38pwK62RRL3W8KL5dj4oZy	MANAGER	\N	\N	5000.00	\N	\N	ACTIVE	2026-08-13 13:15:12.8129+05:30	2026-08-13 13:22:40.864302+05:30	2026-08-13 00:00:00+05:30	d7b8ef01-87a7-4e0b-bd92-f0c6c4cd3352
5879065e-fc03-42a7-b009-4ef9ae39642e	F01	riyastk824@gmail.com	RIYAS	FINANCE MANAGER	$2b$10$kwnWJkiv.U143Nu5F6E8cuq2JmNPMMqmVCXF/uYly1wJdJVheNXwi	FINANCE	\N	FINANCE_MANAGER	5000.00	\N	\N	ACTIVE	2026-08-13 13:19:31.969289+05:30	2026-08-13 13:39:15.92276+05:30	2026-08-13 00:00:00+05:30	d7b8ef01-87a7-4e0b-bd92-f0c6c4cd3352
b9708648-f4d7-4aaa-ad34-0949ceb8400c	M02	mriyastk8@gmail.com	RIYAS	EMPLOYEE MANAGER	$2b$10$zs7GHeNjlVWjGpJAopZm3u0ZYmWZOWfFeIhQS01eFO/lTAQZMeuve	EMPLOYEE	MANAGER	\N	5000.00	\N	\N	ACTIVE	2026-08-13 13:18:38.363311+05:30	2026-08-13 14:23:10.181963+05:30	2026-08-12 00:00:00+05:30	d7b8ef01-87a7-4e0b-bd92-f0c6c4cd3352
d38f9b7e-772c-4462-ac52-23fb44e8ed5f	E01	riyaski368@gmail.com	RIYAS	SERVICE DESK	$2b$10$aalgZ4PvbsCUch7im0OW/e/VmKnFdzz85rGTtlYxeukFLJs2PPB3m	EMPLOYEE	SERVICE_HELP_DESK	\N	5000.00	\N	\N	ACTIVE	2026-08-13 13:21:11.314648+05:30	2026-08-13 15:02:31.812653+05:30	2026-08-13 00:00:00+05:30	d7b8ef01-87a7-4e0b-bd92-f0c6c4cd3352
9d25cd2f-4213-49ee-88e0-011d1f55c533	E02	kiriyas694@gmail.com	RIYAS	TECJNICIAN	$2b$10$Fqy2KllRoT.0uHdaS.lHa.LqcD498pV3PmwEfwZ1gnnZ2pS4jOHbi	EMPLOYEE	SERVICE_TECHNICIAN	\N	5000.00	\N	\N	ACTIVE	2026-08-13 15:10:12.021684+05:30	2026-08-13 15:12:57.740859+05:30	2026-08-13 00:00:00+05:30	d7b8ef01-87a7-4e0b-bd92-f0c6c4cd3352
\.


--
-- Data for Name: leave_applications; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.leave_applications (id, employee_id, branch_id, start_date, end_date, leave_type, reason, status, reviewed_by, reviewed_at, rejection_reason, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: notifications; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.notifications (id, employee_id, title, message, type, data, is_read, "createdAt", "updatedAt") FROM stdin;
e0ca58d9-1826-4e03-b8b5-a0e264af3499	e864a3e4-fa37-4754-9440-613c6a7cdd2c	All Vendors Have Quoted	All vendors have submitted their quotes for RFQ [RFQ-202608-9718]. You can now compare and award.	RFQ_FULLY_QUOTED	{"referenceId": "9b878a06-ff0c-47ce-a697-0c8a17fd39ce", "referenceType": "QUOTATION"}	t	2026-08-13 13:36:26.992999+05:30	2026-08-13 13:55:18.201815+05:30
9d883a35-151d-4655-8e1a-956079d2d258	e864a3e4-fa37-4754-9440-613c6a7cdd2c	RFQ Awarded	RFQ [RFQ-202608-9718] has been awarded to NADHIL XEROX LIMITED. You can now create a lot from this RFQ.	RFQ_AWARDED	{"referenceId": "9b878a06-ff0c-47ce-a697-0c8a17fd39ce", "referenceType": "QUOTATION"}	t	2026-08-13 13:36:49.17016+05:30	2026-08-13 13:55:18.201815+05:30
0be23021-5d86-4beb-8a5c-901672c8f7c9	e864a3e4-fa37-4754-9440-613c6a7cdd2c	New Quotation Created	A new PRODUCT_SALE quotation (QTN-2026-0001) was created.	INFO	{"referenceId": "246abb8b-43b8-4a1f-ac79-6404ef62ea8f", "referenceType": "QUOTATION"}	f	2026-08-13 14:29:10.153863+05:30	2026-08-13 14:29:10.153863+05:30
9f394d62-3a7e-495e-822f-2bdc7d42c9d6	5879065e-fc03-42a7-b009-4ef9ae39642e	Quotation Submitted for Review	A quotation [QTN-2026-0001] for Customer has been submitted for review. Please check details and approve/reject.	QUOTATION_SUBMITTED	{"referenceId": "246abb8b-43b8-4a1f-ac79-6404ef62ea8f", "referenceType": "QUOTATION"}	f	2026-08-13 14:29:17.485452+05:30	2026-08-13 14:29:17.485452+05:30
e896a2d0-7201-498a-8352-fa4ea68c8f06	b9708648-f4d7-4aaa-ad34-0949ceb8400c	Quotation Submitted	Your quotation [QTN-2026-0001] has been submitted for finance review.	QUOTATION_SUBMITTED	{"referenceId": "246abb8b-43b8-4a1f-ac79-6404ef62ea8f", "referenceType": "QUOTATION"}	f	2026-08-13 14:29:17.527699+05:30	2026-08-13 14:29:17.527699+05:30
006fe509-4e6b-43c9-8197-c87d15842e98	e864a3e4-fa37-4754-9440-613c6a7cdd2c	New Quotation Created	A new RENT quotation (QTN-2026-0002) was created.	INFO	{"referenceId": "baee65a2-a8d5-4a26-8428-37da883ebed6", "referenceType": "QUOTATION"}	f	2026-08-13 14:31:17.159384+05:30	2026-08-13 14:31:17.159384+05:30
9b543e03-d2b6-4c61-b20f-2d9266b5260c	5879065e-fc03-42a7-b009-4ef9ae39642e	Quotation Submitted for Review	A quotation [QTN-2026-0002] for Customer has been submitted for review. Please check details and approve/reject.	QUOTATION_SUBMITTED	{"referenceId": "baee65a2-a8d5-4a26-8428-37da883ebed6", "referenceType": "QUOTATION"}	f	2026-08-13 14:31:21.817182+05:30	2026-08-13 14:31:21.817182+05:30
9959fd40-2be9-4422-ba46-e06a21a28308	b9708648-f4d7-4aaa-ad34-0949ceb8400c	Quotation Submitted	Your quotation [QTN-2026-0002] has been submitted for finance review.	QUOTATION_SUBMITTED	{"referenceId": "baee65a2-a8d5-4a26-8428-37da883ebed6", "referenceType": "QUOTATION"}	f	2026-08-13 14:31:21.859526+05:30	2026-08-13 14:31:21.859526+05:30
1639ffde-585f-47bf-b8a7-d16d9677c180	e864a3e4-fa37-4754-9440-613c6a7cdd2c	New Quotation Created	A new LEASE quotation (QTN-2026-0003) was created.	INFO	{"referenceId": "501212bc-250b-491e-96f2-495af1635c3c", "referenceType": "QUOTATION"}	f	2026-08-13 14:32:31.973032+05:30	2026-08-13 14:32:31.973032+05:30
679f11da-1941-487c-84c5-3fb727060d40	5879065e-fc03-42a7-b009-4ef9ae39642e	Quotation Submitted for Review	A quotation [QTN-2026-0003] for Customer has been submitted for review. Please check details and approve/reject.	QUOTATION_SUBMITTED	{"referenceId": "501212bc-250b-491e-96f2-495af1635c3c", "referenceType": "QUOTATION"}	f	2026-08-13 14:32:38.691092+05:30	2026-08-13 14:32:38.691092+05:30
f23645c8-7f9f-4649-8bb5-4e2024aa10aa	b9708648-f4d7-4aaa-ad34-0949ceb8400c	Quotation Submitted	Your quotation [QTN-2026-0003] has been submitted for finance review.	QUOTATION_SUBMITTED	{"referenceId": "501212bc-250b-491e-96f2-495af1635c3c", "referenceType": "QUOTATION"}	f	2026-08-13 14:32:38.722754+05:30	2026-08-13 14:32:38.722754+05:30
4fe37e75-9d8f-442b-8882-7f995f8cc471	b9708648-f4d7-4aaa-ad34-0949ceb8400c	Quotation Approved	Great news! Your quotation [QTN-2026-0003] for Customer has been approved by Finance. You can now send it to the customer.	QUOTATION_APPROVED	{"referenceId": "501212bc-250b-491e-96f2-495af1635c3c", "referenceType": "QUOTATION"}	f	2026-08-13 14:40:17.551535+05:30	2026-08-13 14:40:17.551535+05:30
3636deff-2f1f-4e7d-8b6d-b353e1e1ebba	e864a3e4-fa37-4754-9440-613c6a7cdd2c	Quotation Approved	A quotation [QTN-2026-0003] for Customer has been approved by Finance.	QUOTATION_APPROVED	{"referenceId": "501212bc-250b-491e-96f2-495af1635c3c", "referenceType": "QUOTATION"}	f	2026-08-13 14:40:17.580776+05:30	2026-08-13 14:40:17.580776+05:30
2a4ef3ed-da36-4a60-a484-d77f260dbd7a	531e24ad-e487-47a8-8096-3de80d3e5d8a	Quotation Approved	A quotation [QTN-2026-0003] for Customer (branch d7b8ef01-87a7-4e0b-bd92-f0c6c4cd3352) has been approved by Finance.	QUOTATION_APPROVED	{"referenceId": "501212bc-250b-491e-96f2-495af1635c3c", "referenceType": "QUOTATION"}	f	2026-08-13 14:40:17.637625+05:30	2026-08-13 14:40:17.637625+05:30
9abc2e17-1df4-435e-8a8d-eb2afb7ce280	b9708648-f4d7-4aaa-ad34-0949ceb8400c	Quotation Approved	Great news! Your quotation [QTN-2026-0002] for Customer has been approved by Finance. You can now send it to the customer.	QUOTATION_APPROVED	{"referenceId": "baee65a2-a8d5-4a26-8428-37da883ebed6", "referenceType": "QUOTATION"}	f	2026-08-13 14:40:20.43932+05:30	2026-08-13 14:40:20.43932+05:30
47aa9f78-cacc-44a0-84e0-a7b2c405b991	e864a3e4-fa37-4754-9440-613c6a7cdd2c	Quotation Approved	A quotation [QTN-2026-0002] for Customer has been approved by Finance.	QUOTATION_APPROVED	{"referenceId": "baee65a2-a8d5-4a26-8428-37da883ebed6", "referenceType": "QUOTATION"}	f	2026-08-13 14:40:20.471572+05:30	2026-08-13 14:40:20.471572+05:30
dad93f6a-b609-4e1e-a86c-7a4d0cd514e9	531e24ad-e487-47a8-8096-3de80d3e5d8a	Quotation Approved	A quotation [QTN-2026-0002] for Customer (branch d7b8ef01-87a7-4e0b-bd92-f0c6c4cd3352) has been approved by Finance.	QUOTATION_APPROVED	{"referenceId": "baee65a2-a8d5-4a26-8428-37da883ebed6", "referenceType": "QUOTATION"}	f	2026-08-13 14:40:20.523243+05:30	2026-08-13 14:40:20.523243+05:30
a34e0ce7-1c8a-4322-b26e-4ea8de43b1a4	b9708648-f4d7-4aaa-ad34-0949ceb8400c	Quotation Approved	Great news! Your quotation [QTN-2026-0001] for Customer has been approved by Finance. You can now send it to the customer.	QUOTATION_APPROVED	{"referenceId": "246abb8b-43b8-4a1f-ac79-6404ef62ea8f", "referenceType": "QUOTATION"}	f	2026-08-13 14:40:23.218142+05:30	2026-08-13 14:40:23.218142+05:30
e5f53661-ee00-46ba-a655-a3d0ae1c9230	e864a3e4-fa37-4754-9440-613c6a7cdd2c	Quotation Approved	A quotation [QTN-2026-0001] for Customer has been approved by Finance.	QUOTATION_APPROVED	{"referenceId": "246abb8b-43b8-4a1f-ac79-6404ef62ea8f", "referenceType": "QUOTATION"}	f	2026-08-13 14:40:23.253472+05:30	2026-08-13 14:40:23.253472+05:30
0f70e3bd-ef07-4b1c-af28-44747d9cb1a0	531e24ad-e487-47a8-8096-3de80d3e5d8a	Quotation Approved	A quotation [QTN-2026-0001] for Customer (branch d7b8ef01-87a7-4e0b-bd92-f0c6c4cd3352) has been approved by Finance.	QUOTATION_APPROVED	{"referenceId": "246abb8b-43b8-4a1f-ac79-6404ef62ea8f", "referenceType": "QUOTATION"}	f	2026-08-13 14:40:23.300539+05:30	2026-08-13 14:40:23.300539+05:30
cbfeef5c-e379-432e-88a6-f035ae4930ea	e864a3e4-fa37-4754-9440-613c6a7cdd2c	Quotation Converted	A quotation [QTN-2026-0001] for Customer has been converted into a transaction (Proforma contract) by RIYAS EMPLOYEE MANAGER.	QUOTATION_CONVERTED	{"referenceId": "246abb8b-43b8-4a1f-ac79-6404ef62ea8f", "referenceType": "CONTRACT"}	f	2026-08-13 14:43:45.210808+05:30	2026-08-13 14:43:45.210808+05:30
12dd8e00-1183-48cb-bb9f-04081ae071f7	b9708648-f4d7-4aaa-ad34-0949ceb8400c	Contract Activated	The contract for customer Customer has been activated successfully.	CONTRACT_ACTIVATED	{"referenceId": "246abb8b-43b8-4a1f-ac79-6404ef62ea8f", "referenceType": "CONTRACT"}	f	2026-08-13 14:43:45.426509+05:30	2026-08-13 14:43:45.426509+05:30
c96f54df-9a06-4dd8-ac50-9cf238540710	e864a3e4-fa37-4754-9440-613c6a7cdd2c	Contract Activated	Contract [QTN-2026-0001] for customer Customer has been activated by RIYAS EMPLOYEE MANAGER.	CONTRACT_ACTIVATED	{"referenceId": "246abb8b-43b8-4a1f-ac79-6404ef62ea8f", "referenceType": "CONTRACT"}	f	2026-08-13 14:43:45.444194+05:30	2026-08-13 14:43:45.444194+05:30
a78af5ec-7a0c-4433-9706-5ed0709490de	5879065e-fc03-42a7-b009-4ef9ae39642e	Contract Activated	The contract for customer Customer is now active. Delivery and billing schedules are initialized.	CONTRACT_ACTIVATED	{"referenceId": "246abb8b-43b8-4a1f-ac79-6404ef62ea8f", "referenceType": "CONTRACT"}	f	2026-08-13 14:43:45.473377+05:30	2026-08-13 14:43:45.473377+05:30
9116045a-15e7-47f7-830a-6f0937afd4e0	531e24ad-e487-47a8-8096-3de80d3e5d8a	Contract Activated	The contract for customer Customer (branch d7b8ef01-87a7-4e0b-bd92-f0c6c4cd3352) is now active.	CONTRACT_ACTIVATED	{"referenceId": "246abb8b-43b8-4a1f-ac79-6404ef62ea8f", "referenceType": "CONTRACT"}	f	2026-08-13 14:43:45.518742+05:30	2026-08-13 14:43:45.518742+05:30
dbc626d3-3bcb-4a16-ba81-bfa82a18777d	e864a3e4-fa37-4754-9440-613c6a7cdd2c	Quotation Converted	A quotation [QTN-2026-0002] for Customer has been converted into a transaction (Proforma contract) by RIYAS EMPLOYEE MANAGER.	QUOTATION_CONVERTED	{"referenceId": "baee65a2-a8d5-4a26-8428-37da883ebed6", "referenceType": "CONTRACT"}	f	2026-08-13 14:55:46.327171+05:30	2026-08-13 14:55:46.327171+05:30
5427f895-92fe-4fe4-8dba-9c49229d1b42	b9708648-f4d7-4aaa-ad34-0949ceb8400c	Contract Activated	The contract for customer Customer has been activated successfully.	CONTRACT_ACTIVATED	{"referenceId": "baee65a2-a8d5-4a26-8428-37da883ebed6", "referenceType": "CONTRACT"}	f	2026-08-13 14:58:31.8413+05:30	2026-08-13 14:58:31.8413+05:30
77c7de9b-f82f-454f-96f9-634d76cfaa75	e864a3e4-fa37-4754-9440-613c6a7cdd2c	Contract Activated	Contract [QTN-2026-0002] for customer Customer has been activated by RIYAS EMPLOYEE MANAGER.	CONTRACT_ACTIVATED	{"referenceId": "baee65a2-a8d5-4a26-8428-37da883ebed6", "referenceType": "CONTRACT"}	f	2026-08-13 14:58:31.850551+05:30	2026-08-13 14:58:31.850551+05:30
6ab19971-70f1-489a-8fda-beec9d69c60f	5879065e-fc03-42a7-b009-4ef9ae39642e	Contract Activated	The contract for customer Customer is now active. Delivery and billing schedules are initialized.	CONTRACT_ACTIVATED	{"referenceId": "baee65a2-a8d5-4a26-8428-37da883ebed6", "referenceType": "CONTRACT"}	f	2026-08-13 14:58:31.884672+05:30	2026-08-13 14:58:31.884672+05:30
4a0afac8-b196-4eb2-a236-772b50382444	531e24ad-e487-47a8-8096-3de80d3e5d8a	Contract Activated	The contract for customer Customer (branch d7b8ef01-87a7-4e0b-bd92-f0c6c4cd3352) is now active.	CONTRACT_ACTIVATED	{"referenceId": "baee65a2-a8d5-4a26-8428-37da883ebed6", "referenceType": "CONTRACT"}	f	2026-08-13 14:58:31.927806+05:30	2026-08-13 14:58:31.927806+05:30
9f0c30c8-3d97-4153-a5ea-08876f2c63e5	e864a3e4-fa37-4754-9440-613c6a7cdd2c	Payment Recorded	A payment of QAR 2000 was recorded via CASH on invoice [QTN-2026-0002].	PAYMENT_RECORDED	{"referenceId": "baee65a2-a8d5-4a26-8428-37da883ebed6", "referenceType": "CONTRACT"}	f	2026-08-13 15:24:43.556631+05:30	2026-08-13 15:24:43.556631+05:30
fa223c87-46d2-45e5-a4be-9c42cc5009ea	e864a3e4-fa37-4754-9440-613c6a7cdd2c	Payment Recorded	A payment of QAR 2000 was recorded via CASH on invoice [QTN-2026-0002].	PAYMENT_RECORDED	{"referenceId": "baee65a2-a8d5-4a26-8428-37da883ebed6", "referenceType": "CONTRACT"}	f	2026-08-13 15:25:54.3309+05:30	2026-08-13 15:25:54.3309+05:30
85d76433-aae1-4daf-984a-005edd9910fb	e864a3e4-fa37-4754-9440-613c6a7cdd2c	Purchase Payment Approved ✅	Your AED 10000.00 payment to vendor has been approved and funds deducted.	EXPENSE_APPROVED	\N	f	2026-08-13 15:39:05.220101+05:30	2026-08-13 15:39:05.220101+05:30
bb82f735-a629-4db4-98f7-b81e48dfb9a7	e864a3e4-fa37-4754-9440-613c6a7cdd2c	Purchase Payment Approved ✅	Your AED 115000.00 payment to vendor has been approved and funds deducted.	EXPENSE_APPROVED	\N	f	2026-08-13 15:43:55.172073+05:30	2026-08-13 15:43:55.172073+05:30
01d596d5-1011-4ee3-b512-01bad9c230d8	e864a3e4-fa37-4754-9440-613c6a7cdd2c	New Quotation Created	A new PRODUCT_SALE quotation (QTN-2026-0004) was created.	INFO	{"referenceId": "77f653f4-e93c-4d6d-801b-e553391317dd", "referenceType": "QUOTATION"}	f	2026-08-13 17:28:45.160149+05:30	2026-08-13 17:28:45.160149+05:30
ee1cb03a-064d-4e41-b906-caaccec13e05	5879065e-fc03-42a7-b009-4ef9ae39642e	Quotation Submitted for Review	A quotation [QTN-2026-0004] for Customer has been submitted for review. Please check details and approve/reject.	QUOTATION_SUBMITTED	{"referenceId": "77f653f4-e93c-4d6d-801b-e553391317dd", "referenceType": "QUOTATION"}	f	2026-08-13 17:28:50.146751+05:30	2026-08-13 17:28:50.146751+05:30
0d859c2b-4ac8-4177-a47b-f6d73c713d7c	b9708648-f4d7-4aaa-ad34-0949ceb8400c	Quotation Submitted	Your quotation [QTN-2026-0004] has been submitted for finance review.	QUOTATION_SUBMITTED	{"referenceId": "77f653f4-e93c-4d6d-801b-e553391317dd", "referenceType": "QUOTATION"}	f	2026-08-13 17:28:50.197727+05:30	2026-08-13 17:28:50.197727+05:30
a3b4d509-d786-4d42-816f-da9ca5013a8c	b9708648-f4d7-4aaa-ad34-0949ceb8400c	Quotation Approved	Great news! Your quotation [QTN-2026-0004] for Customer has been approved by Finance. You can now send it to the customer.	QUOTATION_APPROVED	{"referenceId": "77f653f4-e93c-4d6d-801b-e553391317dd", "referenceType": "QUOTATION"}	f	2026-08-13 17:29:57.27856+05:30	2026-08-13 17:29:57.27856+05:30
f752fe38-06c1-4a56-9a93-44338317db2b	e864a3e4-fa37-4754-9440-613c6a7cdd2c	Quotation Approved	A quotation [QTN-2026-0004] for Customer has been approved by Finance.	QUOTATION_APPROVED	{"referenceId": "77f653f4-e93c-4d6d-801b-e553391317dd", "referenceType": "QUOTATION"}	f	2026-08-13 17:29:57.3105+05:30	2026-08-13 17:29:57.3105+05:30
aafd21c9-7fd0-4c50-9b60-da30496b49c9	531e24ad-e487-47a8-8096-3de80d3e5d8a	Quotation Approved	A quotation [QTN-2026-0004] for Customer (branch d7b8ef01-87a7-4e0b-bd92-f0c6c4cd3352) has been approved by Finance.	QUOTATION_APPROVED	{"referenceId": "77f653f4-e93c-4d6d-801b-e553391317dd", "referenceType": "QUOTATION"}	f	2026-08-13 17:29:57.36255+05:30	2026-08-13 17:29:57.36255+05:30
e3ff963b-0a02-45e7-b001-2b11e445a975	e864a3e4-fa37-4754-9440-613c6a7cdd2c	Quotation Converted	A quotation [QTN-2026-0004] for Customer has been converted into a transaction (Proforma contract) by RIYAS EMPLOYEE MANAGER.	QUOTATION_CONVERTED	{"referenceId": "77f653f4-e93c-4d6d-801b-e553391317dd", "referenceType": "CONTRACT"}	f	2026-08-13 17:33:00.746241+05:30	2026-08-13 17:33:00.746241+05:30
d14ae4f1-63fc-4119-9084-f34921e412d0	b9708648-f4d7-4aaa-ad34-0949ceb8400c	Contract Activated	The contract for customer Customer has been activated successfully.	CONTRACT_ACTIVATED	{"referenceId": "77f653f4-e93c-4d6d-801b-e553391317dd", "referenceType": "CONTRACT"}	f	2026-08-13 17:33:01.196049+05:30	2026-08-13 17:33:01.196049+05:30
424a277b-d44d-4486-9e02-a8d902899710	e864a3e4-fa37-4754-9440-613c6a7cdd2c	Contract Activated	Contract [QTN-2026-0004] for customer Customer has been activated by RIYAS EMPLOYEE MANAGER.	CONTRACT_ACTIVATED	{"referenceId": "77f653f4-e93c-4d6d-801b-e553391317dd", "referenceType": "CONTRACT"}	f	2026-08-13 17:33:01.222765+05:30	2026-08-13 17:33:01.222765+05:30
818df1a9-7660-4f2c-a9ca-81b6ac82a216	5879065e-fc03-42a7-b009-4ef9ae39642e	Contract Activated	The contract for customer Customer is now active. Delivery and billing schedules are initialized.	CONTRACT_ACTIVATED	{"referenceId": "77f653f4-e93c-4d6d-801b-e553391317dd", "referenceType": "CONTRACT"}	f	2026-08-13 17:33:01.252998+05:30	2026-08-13 17:33:01.252998+05:30
a09d5344-0e2e-4f4b-971c-4b40a0db56dd	531e24ad-e487-47a8-8096-3de80d3e5d8a	Contract Activated	The contract for customer Customer (branch d7b8ef01-87a7-4e0b-bd92-f0c6c4cd3352) is now active.	CONTRACT_ACTIVATED	{"referenceId": "77f653f4-e93c-4d6d-801b-e553391317dd", "referenceType": "CONTRACT"}	f	2026-08-13 17:33:01.297217+05:30	2026-08-13 17:33:01.297217+05:30
11b97887-ae65-427e-84e1-51db0c3d8e66	e864a3e4-fa37-4754-9440-613c6a7cdd2c	New Quotation Created	A new RENT quotation (QTN-2026-0005) was created.	INFO	{"referenceId": "9e9762aa-4fe6-45db-bba7-2e088fb67c98", "referenceType": "QUOTATION"}	f	2026-08-13 18:22:45.031627+05:30	2026-08-13 18:22:45.031627+05:30
86e36a4c-36d3-4bb5-b4f0-7d002e507c5c	5879065e-fc03-42a7-b009-4ef9ae39642e	Quotation Submitted for Review	A quotation [QTN-2026-0005] for Customer has been submitted for review. Please check details and approve/reject.	QUOTATION_SUBMITTED	{"referenceId": "9e9762aa-4fe6-45db-bba7-2e088fb67c98", "referenceType": "QUOTATION"}	f	2026-08-13 18:22:48.93672+05:30	2026-08-13 18:22:48.93672+05:30
a132abf2-fb97-414c-a10b-464e0fb49e1b	b9708648-f4d7-4aaa-ad34-0949ceb8400c	Quotation Submitted	Your quotation [QTN-2026-0005] has been submitted for finance review.	QUOTATION_SUBMITTED	{"referenceId": "9e9762aa-4fe6-45db-bba7-2e088fb67c98", "referenceType": "QUOTATION"}	f	2026-08-13 18:22:48.985728+05:30	2026-08-13 18:22:48.985728+05:30
059dc02a-975e-42fd-9151-a7cbe2ff7707	b9708648-f4d7-4aaa-ad34-0949ceb8400c	Quotation Approved	Great news! Your quotation [QTN-2026-0005] for Customer has been approved by Finance. You can now send it to the customer.	QUOTATION_APPROVED	{"referenceId": "9e9762aa-4fe6-45db-bba7-2e088fb67c98", "referenceType": "QUOTATION"}	f	2026-08-13 18:23:04.522941+05:30	2026-08-13 18:23:04.522941+05:30
1e80f162-020f-4363-baa5-c37c511ee56f	e864a3e4-fa37-4754-9440-613c6a7cdd2c	Quotation Approved	A quotation [QTN-2026-0005] for Customer has been approved by Finance.	QUOTATION_APPROVED	{"referenceId": "9e9762aa-4fe6-45db-bba7-2e088fb67c98", "referenceType": "QUOTATION"}	f	2026-08-13 18:23:04.585204+05:30	2026-08-13 18:23:04.585204+05:30
7c9c6855-8e49-43e7-b88f-a52ff39f2302	531e24ad-e487-47a8-8096-3de80d3e5d8a	Quotation Approved	A quotation [QTN-2026-0005] for Customer (branch d7b8ef01-87a7-4e0b-bd92-f0c6c4cd3352) has been approved by Finance.	QUOTATION_APPROVED	{"referenceId": "9e9762aa-4fe6-45db-bba7-2e088fb67c98", "referenceType": "QUOTATION"}	f	2026-08-13 18:23:04.637691+05:30	2026-08-13 18:23:04.637691+05:30
348cdeba-1c0f-48ad-b22f-866764df8d89	e864a3e4-fa37-4754-9440-613c6a7cdd2c	Quotation Converted	A quotation [QTN-2026-0005] for Customer has been converted into a transaction (Proforma contract) by RIYAS EMPLOYEE MANAGER.	QUOTATION_CONVERTED	{"referenceId": "9e9762aa-4fe6-45db-bba7-2e088fb67c98", "referenceType": "CONTRACT"}	f	2026-08-13 18:32:24.252776+05:30	2026-08-13 18:32:24.252776+05:30
ba563583-bf41-4f9c-8072-2f62263f68fe	b9708648-f4d7-4aaa-ad34-0949ceb8400c	Contract Activated	The contract for customer Customer has been activated successfully.	CONTRACT_ACTIVATED	{"referenceId": "9e9762aa-4fe6-45db-bba7-2e088fb67c98", "referenceType": "CONTRACT"}	f	2026-08-13 19:03:58.428526+05:30	2026-08-13 19:03:58.428526+05:30
521ec216-512f-45b6-95a2-b9bac4f4d763	e864a3e4-fa37-4754-9440-613c6a7cdd2c	Contract Activated	Contract [QTN-2026-0005] for customer Customer has been activated by RIYAS EMPLOYEE MANAGER.	CONTRACT_ACTIVATED	{"referenceId": "9e9762aa-4fe6-45db-bba7-2e088fb67c98", "referenceType": "CONTRACT"}	f	2026-08-13 19:03:58.490404+05:30	2026-08-13 19:03:58.490404+05:30
ed203cd4-27fb-4eaf-9752-74dd816a1f53	5879065e-fc03-42a7-b009-4ef9ae39642e	Contract Activated	The contract for customer Customer is now active. Delivery and billing schedules are initialized.	CONTRACT_ACTIVATED	{"referenceId": "9e9762aa-4fe6-45db-bba7-2e088fb67c98", "referenceType": "CONTRACT"}	f	2026-08-13 19:03:58.525635+05:30	2026-08-13 19:03:58.525635+05:30
6ab396e2-5f32-4c57-8a5b-28dfdbf48657	531e24ad-e487-47a8-8096-3de80d3e5d8a	Contract Activated	The contract for customer Customer (branch d7b8ef01-87a7-4e0b-bd92-f0c6c4cd3352) is now active.	CONTRACT_ACTIVATED	{"referenceId": "9e9762aa-4fe6-45db-bba7-2e088fb67c98", "referenceType": "CONTRACT"}	f	2026-08-13 19:03:58.571827+05:30	2026-08-13 19:03:58.571827+05:30
ba6e3734-f3a7-4ca2-ac99-cb0679294631	e864a3e4-fa37-4754-9440-613c6a7cdd2c	New Quotation Created	A new RENT quotation (QTN-2026-0006) was created.	INFO	{"referenceId": "502d6e65-5169-495e-a4cf-99434fd16d61", "referenceType": "QUOTATION"}	f	2026-08-13 19:22:37.720277+05:30	2026-08-13 19:22:37.720277+05:30
c3eb94f7-58f1-4b84-9ce1-e197d49f6a61	5879065e-fc03-42a7-b009-4ef9ae39642e	Quotation Submitted for Review	A quotation [QTN-2026-0006] for Customer has been submitted for review. Please check details and approve/reject.	QUOTATION_SUBMITTED	{"referenceId": "502d6e65-5169-495e-a4cf-99434fd16d61", "referenceType": "QUOTATION"}	f	2026-08-13 19:22:39.570663+05:30	2026-08-13 19:22:39.570663+05:30
81daa8b9-c31d-428f-8326-35a65f3a0f95	b9708648-f4d7-4aaa-ad34-0949ceb8400c	Quotation Submitted	Your quotation [QTN-2026-0006] has been submitted for finance review.	QUOTATION_SUBMITTED	{"referenceId": "502d6e65-5169-495e-a4cf-99434fd16d61", "referenceType": "QUOTATION"}	f	2026-08-13 19:22:39.625279+05:30	2026-08-13 19:22:39.625279+05:30
ab07d291-bfce-4402-baf7-d634019a3f5f	b9708648-f4d7-4aaa-ad34-0949ceb8400c	Quotation Approved	Great news! Your quotation [QTN-2026-0006] for Customer has been approved by Finance. You can now send it to the customer.	QUOTATION_APPROVED	{"referenceId": "502d6e65-5169-495e-a4cf-99434fd16d61", "referenceType": "QUOTATION"}	f	2026-08-13 19:22:49.594407+05:30	2026-08-13 19:22:49.594407+05:30
0162b4f3-f85f-4634-81c7-741c08a11dfe	e864a3e4-fa37-4754-9440-613c6a7cdd2c	Quotation Approved	A quotation [QTN-2026-0006] for Customer has been approved by Finance.	QUOTATION_APPROVED	{"referenceId": "502d6e65-5169-495e-a4cf-99434fd16d61", "referenceType": "QUOTATION"}	f	2026-08-13 19:22:49.65279+05:30	2026-08-13 19:22:49.65279+05:30
72cedc92-fd9a-4541-969c-d9b05cc98ec3	531e24ad-e487-47a8-8096-3de80d3e5d8a	Quotation Approved	A quotation [QTN-2026-0006] for Customer (branch d7b8ef01-87a7-4e0b-bd92-f0c6c4cd3352) has been approved by Finance.	QUOTATION_APPROVED	{"referenceId": "502d6e65-5169-495e-a4cf-99434fd16d61", "referenceType": "QUOTATION"}	f	2026-08-13 19:22:49.72087+05:30	2026-08-13 19:22:49.72087+05:30
2f4c630f-e338-48d5-b22e-ff85ed4c1f57	e864a3e4-fa37-4754-9440-613c6a7cdd2c	Quotation Converted	A quotation [QTN-2026-0006] for Customer has been converted into a transaction (Proforma contract) by RIYAS EMPLOYEE MANAGER.	QUOTATION_CONVERTED	{"referenceId": "502d6e65-5169-495e-a4cf-99434fd16d61", "referenceType": "CONTRACT"}	f	2026-08-13 19:42:31.064894+05:30	2026-08-13 19:42:31.064894+05:30
1f0b7006-7b99-4933-990f-d46d65bed790	b9708648-f4d7-4aaa-ad34-0949ceb8400c	Contract Activated	The contract for customer Customer has been activated successfully.	CONTRACT_ACTIVATED	{"referenceId": "502d6e65-5169-495e-a4cf-99434fd16d61", "referenceType": "CONTRACT"}	f	2026-08-13 19:43:20.615294+05:30	2026-08-13 19:43:20.615294+05:30
b43fcafe-2da8-4378-95b3-04380340c2b0	e864a3e4-fa37-4754-9440-613c6a7cdd2c	Contract Activated	Contract [QTN-2026-0006] for customer Customer has been activated by RIYAS EMPLOYEE MANAGER.	CONTRACT_ACTIVATED	{"referenceId": "502d6e65-5169-495e-a4cf-99434fd16d61", "referenceType": "CONTRACT"}	f	2026-08-13 19:43:20.629376+05:30	2026-08-13 19:43:20.629376+05:30
1169ea7b-e9ce-4e83-b18a-e6e6ebac18e7	5879065e-fc03-42a7-b009-4ef9ae39642e	Contract Activated	The contract for customer Customer is now active. Delivery and billing schedules are initialized.	CONTRACT_ACTIVATED	{"referenceId": "502d6e65-5169-495e-a4cf-99434fd16d61", "referenceType": "CONTRACT"}	f	2026-08-13 19:43:20.660222+05:30	2026-08-13 19:43:20.660222+05:30
afc528d1-b075-4545-94b3-e9c76ed99ee6	531e24ad-e487-47a8-8096-3de80d3e5d8a	Contract Activated	The contract for customer Customer (branch d7b8ef01-87a7-4e0b-bd92-f0c6c4cd3352) is now active.	CONTRACT_ACTIVATED	{"referenceId": "502d6e65-5169-495e-a4cf-99434fd16d61", "referenceType": "CONTRACT"}	f	2026-08-13 19:43:20.704872+05:30	2026-08-13 19:43:20.704872+05:30
\.


--
-- Data for Name: payrolls; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.payrolls (id, employee_id, branch_id, month, year, salary_amount, work_days, leave_days, status, paid_date, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Name: branches_mirror PK_021bbe074b3c3273ba6181d02ef; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.branches_mirror
    ADD CONSTRAINT "PK_021bbe074b3c3273ba6181d02ef" PRIMARY KEY (branch_id);


--
-- Name: employee PK_3c2bc72f03fd5abbbc5ac169498; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee
    ADD CONSTRAINT "PK_3c2bc72f03fd5abbbc5ac169498" PRIMARY KEY (id);


--
-- Name: payrolls PK_4fc19dcf3522661435565b5ecf3; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payrolls
    ADD CONSTRAINT "PK_4fc19dcf3522661435565b5ecf3" PRIMARY KEY (id);


--
-- Name: notifications PK_6a72c3c0f683f6462415e653c3a; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT "PK_6a72c3c0f683f6462415e653c3a" PRIMARY KEY (id);


--
-- Name: auth PK_7e416cf6172bc5aec04244f6459; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auth
    ADD CONSTRAINT "PK_7e416cf6172bc5aec04244f6459" PRIMARY KEY (id);


--
-- Name: leave_applications PK_d986913818cf9a2943d0dbe8f56; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leave_applications
    ADD CONSTRAINT "PK_d986913818cf9a2943d0dbe8f56" PRIMARY KEY (id);


--
-- Name: admin PK_e032310bcef831fb83101899b10; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin
    ADD CONSTRAINT "PK_e032310bcef831fb83101899b10" PRIMARY KEY (id);


--
-- Name: IDX_01fc8c811016522a153d2e4b98; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_01fc8c811016522a153d2e4b98" ON public.leave_applications USING btree (employee_id, start_date, end_date);


--
-- Name: IDX_2ff9aebe42c1d2a69dce4cc7b4; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "IDX_2ff9aebe42c1d2a69dce4cc7b4" ON public.employee USING btree (display_id);


--
-- Name: IDX_3da5d5fb762ed0b0d0468c8f61; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_3da5d5fb762ed0b0d0468c8f61" ON public.employee USING btree (employee_job);


--
-- Name: IDX_5145d894f823722a43ec3e1955; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_5145d894f823722a43ec3e1955" ON public.payrolls USING btree (employee_id);


--
-- Name: IDX_53e354344b9ea90252e3fb078f; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_53e354344b9ea90252e3fb078f" ON public.leave_applications USING btree (status);


--
-- Name: IDX_6c6e8486cdf31c8b5100e449bf; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_6c6e8486cdf31c8b5100e449bf" ON public.payrolls USING btree (status);


--
-- Name: IDX_817d1d427138772d47eca04885; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "IDX_817d1d427138772d47eca04885" ON public.employee USING btree (email);


--
-- Name: IDX_95054ab1386d32dfb67edf80f1; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_95054ab1386d32dfb67edf80f1" ON public.leave_applications USING btree (employee_id);


--
-- Name: IDX_d501b14ccab3770f51e1ecc940; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_d501b14ccab3770f51e1ecc940" ON public.leave_applications USING btree (branch_id);


--
-- Name: IDX_d59afae1b9c6b8d9a17548e014; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_d59afae1b9c6b8d9a17548e014" ON public.notifications USING btree (employee_id);


--
-- Name: IDX_e58c7893b38aade592e91286fa; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_e58c7893b38aade592e91286fa" ON public.payrolls USING btree (branch_id);


--
-- Name: IDX_fec3a6e31e833dfefa4d958b38; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "IDX_fec3a6e31e833dfefa4d958b38" ON public.payrolls USING btree (employee_id, month, year);


--
-- Name: IDX_ffd79aa44a7d408dd88a993775; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_ffd79aa44a7d408dd88a993775" ON public.employee USING btree (finance_job);


--
-- Name: payrolls FK_5145d894f823722a43ec3e1955e; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payrolls
    ADD CONSTRAINT "FK_5145d894f823722a43ec3e1955e" FOREIGN KEY (employee_id) REFERENCES public.employee(id);


--
-- Name: auth FK_61721d6d698f66cf8781496d760; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auth
    ADD CONSTRAINT "FK_61721d6d698f66cf8781496d760" FOREIGN KEY (employee_id) REFERENCES public.employee(id) ON DELETE CASCADE;


--
-- Name: leave_applications FK_95054ab1386d32dfb67edf80f1f; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leave_applications
    ADD CONSTRAINT "FK_95054ab1386d32dfb67edf80f1f" FOREIGN KEY (employee_id) REFERENCES public.employee(id);


--
-- Name: auth FK_aa96af1497dfb79f48157654f7a; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auth
    ADD CONSTRAINT "FK_aa96af1497dfb79f48157654f7a" FOREIGN KEY (admin_id) REFERENCES public.admin(id) ON DELETE CASCADE;


--
-- Name: leave_applications FK_b777a3fef0f502d5727ea9d850a; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leave_applications
    ADD CONSTRAINT "FK_b777a3fef0f502d5727ea9d850a" FOREIGN KEY (reviewed_by) REFERENCES public.employee(id);


--
-- PostgreSQL database dump complete
--

\unrestrict EIUPqgbxrtBo6mvuQuZwddySyOa5hIeeYcx0aBrBdT4tbEg8M2rgYhRftRHhkDQ

