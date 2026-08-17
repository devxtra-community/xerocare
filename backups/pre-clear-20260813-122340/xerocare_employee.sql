--
-- PostgreSQL database dump
--

\restrict qeL9bpS2qMYJkBVMjgeLMbnSbQU5Puas9B0c4DnIBdv8wHpLgvHOPvaWu65UEGR

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
f8743bfd-70ac-4a94-970a-a5ccd2838574	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImViNzVjN2VjLTQ0MWMtNDhiNC1hY2VhLTI5NWY2NGNmYzMzMiIsImlhdCI6MTc4NjM0ODYyMiwiZXhwIjoxNzg3NjQ0NjIyfQ.7nUHr1SijDC3Ek4OVtfWe86Kv6hmQh2X4076gAQ3KJw	::ffff:127.0.0.1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36	2026-08-10 13:27:02.233294+05:30	2026-08-10 13:27:02.233294+05:30	eb75c7ec-441c-48b4-acea-295f64cfc332	\N
88660165-3988-4607-adac-efffa85b326e	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjFiYjljYTU1LTk1NGItNDRiMS04ODY2LTZkODZjMjFkZDAzOCIsImlhdCI6MTc4NjQ0NDkzMCwiZXhwIjoxNzg3NzQwOTMwfQ.o484MqgLbtKtfSfCUkR0Z0Qf7ZVvDhnmVC8Gh78cJbI	::ffff:127.0.0.1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36	2026-08-11 16:12:10.708485+05:30	2026-08-11 16:12:10.708485+05:30	1bb9ca55-954b-44b1-8866-6d86c21dd038	\N
935ce99b-9582-41d4-b4b9-54252d7b9aea	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjFiYjljYTU1LTk1NGItNDRiMS04ODY2LTZkODZjMjFkZDAzOCIsImlhdCI6MTc4NjQ0NzY5MCwiZXhwIjoxNzg3NzQzNjkwfQ.QzNK1DNSBdgl0bpmlIDstnec6kbJVY72zD32LObc5mI	::ffff:127.0.0.1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36	2026-08-11 16:58:10.750528+05:30	2026-08-11 16:58:10.750528+05:30	1bb9ca55-954b-44b1-8866-6d86c21dd038	\N
940d81e9-0a78-420b-8bcd-83aad11801b9	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjFiYjljYTU1LTk1NGItNDRiMS04ODY2LTZkODZjMjFkZDAzOCIsImlhdCI6MTc4NjU0NjQyNCwiZXhwIjoxNzg3ODQyNDI0fQ.Y1RS6psNTyebO_yxaj4B2CZrAGY669Y6ff8KpPmcrsA	::ffff:127.0.0.1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36	2026-08-12 20:23:44.696999+05:30	2026-08-12 20:23:44.696999+05:30	1bb9ca55-954b-44b1-8866-6d86c21dd038	\N
4e669aa6-f3e8-4a1e-8e6c-03de32ab05dd	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjFiYjljYTU1LTk1NGItNDRiMS04ODY2LTZkODZjMjFkZDAzOCIsImlhdCI6MTc4NjU0OTYxNCwiZXhwIjoxNzg3ODQ1NjE0fQ.QPXSL6xQfX9uaiyIwjKogb2E0IipLzXKmJ-L7bqu2T0	::ffff:127.0.0.1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36	2026-08-12 21:16:54.796086+05:30	2026-08-12 21:16:54.796086+05:30	1bb9ca55-954b-44b1-8866-6d86c21dd038	\N
ee9a678e-14a2-4b7b-94b4-cf7f879f7fc3	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImViNzVjN2VjLTQ0MWMtNDhiNC1hY2VhLTI5NWY2NGNmYzMzMiIsImlhdCI6MTc4NjM2MDk5NCwiZXhwIjoxNzg3NjU2OTk0fQ.x5-NA01svytj83fk6G_fo_ldRyQV9i71ga_cSKFFi6o	::ffff:127.0.0.1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36	2026-08-10 16:53:14.139012+05:30	2026-08-10 16:53:14.139012+05:30	eb75c7ec-441c-48b4-acea-295f64cfc332	\N
169390cb-7531-4ac3-9f7e-09c804b1f466	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImViNzVjN2VjLTQ0MWMtNDhiNC1hY2VhLTI5NWY2NGNmYzMzMiIsImlhdCI6MTc4NjM2MTYwNSwiZXhwIjoxNzg3NjU3NjA1fQ.KVgbHlcL7ynMCj0uvy8HWvtWfmXyi-0iwt46IM7NiJ0	::ffff:127.0.0.1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36	2026-08-10 17:03:25.317211+05:30	2026-08-10 17:03:25.317211+05:30	eb75c7ec-441c-48b4-acea-295f64cfc332	\N
6999e9d7-fcf6-4151-8f04-51e398d4a567	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjFiYjljYTU1LTk1NGItNDRiMS04ODY2LTZkODZjMjFkZDAzOCIsImlhdCI6MTc4NjM2NjA4MCwiZXhwIjoxNzg3NjYyMDgwfQ.dP5TWHrWXoz5-iCeVDOZvxz6bvk8Bc2kb-WS6zCw-t0	::ffff:127.0.0.1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36	2026-08-10 18:18:00.841519+05:30	2026-08-10 18:18:00.841519+05:30	1bb9ca55-954b-44b1-8866-6d86c21dd038	\N
c5f4079f-947c-408f-9294-23e21e72e4d4	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImViNzVjN2VjLTQ0MWMtNDhiNC1hY2VhLTI5NWY2NGNmYzMzMiIsImlhdCI6MTc4NjM3NzQ1OCwiZXhwIjoxNzg3NjczNDU4fQ.OWSkWIDiGxsxgCPhqe-nSUY9PPux_cp7_8L8Q6pSlT8	::ffff:127.0.0.1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36	2026-08-10 21:27:38.155228+05:30	2026-08-10 21:27:38.155228+05:30	eb75c7ec-441c-48b4-acea-295f64cfc332	\N
\.


--
-- Data for Name: branches_mirror; Type: TABLE DATA; Schema: public; Owner: xerouser
--

COPY public.branches_mirror (branch_id, name, location, status, synced_at, updated_at) FROM stdin;
426625c1-62e8-4e14-952b-457452eb0f28	XEROCARE PRIVET LIMITE QATAR	DOHA QATAR	ACTIVE	2026-08-10 11:30:45.038261+05:30	2026-08-10 11:30:45.038261+05:30
c24a0a2c-6b0f-4ae5-aaaf-0346a65e6b6e	XEROCARE UAE TAX BRANCH	DUBAI UAE	ACTIVE	2026-08-13 00:23:31.189884+05:30	2026-08-13 00:23:31.189884+05:30
3d064932-b265-43dd-8ece-9410442db90c	XEROCARE OMAN NOTAX BRANCH	MUSCAT OMAN	ACTIVE	2026-08-13 00:24:03.070977+05:30	2026-08-13 00:24:03.070977+05:30
\.


--
-- Data for Name: employee; Type: TABLE DATA; Schema: public; Owner: xerouser
--

COPY public.employee (id, display_id, email, first_name, last_name, password_hash, role, employee_job, finance_job, salary, profile_image_url, id_proof_key, status, "createdAt", "updatedAt", expire_date, branch_id) FROM stdin;
019c5b7d-20cf-4ef4-971a-91235dd6c10c	M01	muhammedriyas9218@gmail.com	RIYAS	BRANCH MANAGER	$2b$10$1P7WM2qb1KNUizAwIXcj7e.XZxJiaazmfizEHUY0m9UuVP1jy7U22	MANAGER	\N	\N	5000.00	\N	\N	ACTIVE	2026-08-10 11:35:52.966698+05:30	2026-08-10 11:48:30.988835+05:30	2026-08-10 00:00:00+05:30	426625c1-62e8-4e14-952b-457452eb0f28
eb75c7ec-441c-48b4-acea-295f64cfc332	E01	mriyastk8@gmail.com	RIYAS	EMPLOYEE MANAGER	$2b$10$pYg2o00p6KuxPnRsJlr3WuoW9iEAUzgCb7bgbG94ewrjNbmoI.MZS	EMPLOYEE	MANAGER	\N	5000.00	\N	\N	ACTIVE	2026-08-10 11:37:41.733304+05:30	2026-08-10 11:51:59.289018+05:30	2026-08-10 00:00:00+05:30	426625c1-62e8-4e14-952b-457452eb0f28
1bb9ca55-954b-44b1-8866-6d86c21dd038	F01	riyastk824@gmail.com	RIYAS	FINANCE MANAGER	$2b$10$mysDrqkTrsQOaIxLJX6/Q.qv1/hWURPYFbRBUPW3OpTyhE2bHYdQ.	FINANCE	\N	FINANCE_MANAGER	5000.00	\N	\N	ACTIVE	2026-08-10 11:39:18.416219+05:30	2026-08-10 11:52:53.177272+05:30	2026-08-10 00:00:00+05:30	426625c1-62e8-4e14-952b-457452eb0f28
4f20097e-a1b3-461a-91e5-6933659c4b6c	E03	riyaski368@gmail.com	RIYAS	SERVICE  HELP DESK	$2b$10$3xZMFGJp5O7Y.A3GIeOQNucvJbm3YevkntZMb9CEoDnTHaxR6RLhK	EMPLOYEE	SERVICE_HELP_DESK	\N	5000.00	\N	\N	ACTIVE	2026-08-10 11:42:23.366869+05:30	2026-08-10 11:53:48.872224+05:30	2026-08-10 00:00:00+05:30	426625c1-62e8-4e14-952b-457452eb0f28
071616fc-1f6c-44e2-9037-317453bf7809	E02	riyasdevxtra@gmail.com	RIYAS	TECHNICIAN	$2b$10$.18DQ3xTMFIpZ0JYkDmv2O3Md8jY7ocJxYr9ENP8XUivOJBBfeBP.	EMPLOYEE	SERVICE_TECHNICIAN	\N	5000.00	\N	\N	ACTIVE	2026-08-10 11:40:49.4482+05:30	2026-08-10 16:23:09.137226+05:30	2026-08-09 00:00:00+05:30	426625c1-62e8-4e14-952b-457452eb0f28
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
486b7693-fed6-4936-909d-49377ae0832d	1bb9ca55-954b-44b1-8866-6d86c21dd038	Quotation Submitted for Review	A quotation [QTN-2026-0001] for Customer has been submitted for review. Please check details and approve/reject.	QUOTATION_SUBMITTED	{"referenceId": "6762b9fc-74f2-433e-8ac4-1513d1b51195", "referenceType": "QUOTATION"}	t	2026-08-10 13:55:28.632317+05:30	2026-08-10 13:56:38.026817+05:30
a5723e38-aa48-417b-acfc-1202a4c4c545	531e24ad-e487-47a8-8096-3de80d3e5d8a	Quotation Approved	A quotation [QTN-2026-0001] for Customer (branch 426625c1-62e8-4e14-952b-457452eb0f28) has been approved by Finance.	QUOTATION_APPROVED	{"referenceId": "6762b9fc-74f2-433e-8ac4-1513d1b51195", "referenceType": "QUOTATION"}	f	2026-08-10 13:57:16.798379+05:30	2026-08-10 13:57:16.798379+05:30
78e5bba1-7873-43d0-8e6b-057816e1c81b	eb75c7ec-441c-48b4-acea-295f64cfc332	Quotation Approved	Great news! Your quotation [QTN-2026-0001] for Customer has been approved by Finance. You can now send it to the customer.	QUOTATION_APPROVED	{"referenceId": "6762b9fc-74f2-433e-8ac4-1513d1b51195", "referenceType": "QUOTATION"}	t	2026-08-10 13:57:16.711606+05:30	2026-08-10 13:57:51.684818+05:30
8ff7abd1-62ad-4917-965f-9112929355d1	eb75c7ec-441c-48b4-acea-295f64cfc332	Quotation Submitted	Your quotation [QTN-2026-0001] has been submitted for finance review.	QUOTATION_SUBMITTED	{"referenceId": "6762b9fc-74f2-433e-8ac4-1513d1b51195", "referenceType": "QUOTATION"}	t	2026-08-10 13:55:28.674387+05:30	2026-08-10 13:58:03.566018+05:30
5666a956-9653-47a6-8f88-f16a0ec1e427	1bb9ca55-954b-44b1-8866-6d86c21dd038	Contract Activated	The contract for customer Customer is now active. Delivery and billing schedules are initialized.	CONTRACT_ACTIVATED	{"referenceId": "6762b9fc-74f2-433e-8ac4-1513d1b51195", "referenceType": "CONTRACT"}	f	2026-08-10 13:58:54.965046+05:30	2026-08-10 13:58:54.965046+05:30
f2e9c161-9d98-4385-97e7-636e9060e280	531e24ad-e487-47a8-8096-3de80d3e5d8a	Contract Activated	The contract for customer Customer (branch 426625c1-62e8-4e14-952b-457452eb0f28) is now active.	CONTRACT_ACTIVATED	{"referenceId": "6762b9fc-74f2-433e-8ac4-1513d1b51195", "referenceType": "CONTRACT"}	f	2026-08-10 13:58:55.009802+05:30	2026-08-10 13:58:55.009802+05:30
32c0cd4c-a5b5-4c87-aa49-733af061dcda	eb75c7ec-441c-48b4-acea-295f64cfc332	Contract Activated	The contract for customer Customer has been activated successfully.	CONTRACT_ACTIVATED	{"referenceId": "6762b9fc-74f2-433e-8ac4-1513d1b51195", "referenceType": "CONTRACT"}	t	2026-08-10 13:58:54.91877+05:30	2026-08-10 15:56:40.680089+05:30
e775b408-8658-4c08-bf8b-6a5390366df1	1bb9ca55-954b-44b1-8866-6d86c21dd038	Quotation Submitted for Review	A quotation [QTN-2026-0004] for Customer has been submitted for review. Please check details and approve/reject.	QUOTATION_SUBMITTED	{"referenceId": "10c05f34-13d0-49f4-a910-245788fed9ea", "referenceType": "QUOTATION"}	f	2026-08-10 16:50:57.045729+05:30	2026-08-10 16:50:57.045729+05:30
96f7216f-268a-40de-9525-5f3ded8ddee0	1bb9ca55-954b-44b1-8866-6d86c21dd038	Quotation Submitted for Review	A quotation [QTN-2026-0003] for Customer has been submitted for review. Please check details and approve/reject.	QUOTATION_SUBMITTED	{"referenceId": "37d3fa40-18f7-46c1-8660-bf7fe1407947", "referenceType": "QUOTATION"}	f	2026-08-10 16:51:01.142565+05:30	2026-08-10 16:51:01.142565+05:30
bc599745-4291-4902-863c-f75fe4efc879	1bb9ca55-954b-44b1-8866-6d86c21dd038	Quotation Submitted for Review	A quotation [QTN-2026-0002] for Customer has been submitted for review. Please check details and approve/reject.	QUOTATION_SUBMITTED	{"referenceId": "70a76578-6e64-402a-ac65-4ad08237b2c1", "referenceType": "QUOTATION"}	f	2026-08-10 16:51:04.740221+05:30	2026-08-10 16:51:04.740221+05:30
2e17da3b-8032-4f04-8446-915f669a82e7	531e24ad-e487-47a8-8096-3de80d3e5d8a	Quotation Approved	A quotation [QTN-2026-0004] for Customer (branch 426625c1-62e8-4e14-952b-457452eb0f28) has been approved by Finance.	QUOTATION_APPROVED	{"referenceId": "10c05f34-13d0-49f4-a910-245788fed9ea", "referenceType": "QUOTATION"}	f	2026-08-10 16:52:17.161665+05:30	2026-08-10 16:52:17.161665+05:30
b6f5b862-1bfc-490c-a5ca-23a598a16257	eb75c7ec-441c-48b4-acea-295f64cfc332	Quotation Submitted	Your quotation [QTN-2026-0004] has been submitted for finance review.	QUOTATION_SUBMITTED	{"referenceId": "10c05f34-13d0-49f4-a910-245788fed9ea", "referenceType": "QUOTATION"}	t	2026-08-10 16:50:57.088566+05:30	2026-08-11 11:43:41.050419+05:30
ed77c082-ea43-4046-b7bc-47f8e5d9781c	eb75c7ec-441c-48b4-acea-295f64cfc332	Quotation Submitted	Your quotation [QTN-2026-0003] has been submitted for finance review.	QUOTATION_SUBMITTED	{"referenceId": "37d3fa40-18f7-46c1-8660-bf7fe1407947", "referenceType": "QUOTATION"}	t	2026-08-10 16:51:01.173756+05:30	2026-08-11 11:43:41.050419+05:30
5e6293d8-f076-4252-b68b-d619c422e020	eb75c7ec-441c-48b4-acea-295f64cfc332	Quotation Submitted	Your quotation [QTN-2026-0002] has been submitted for finance review.	QUOTATION_SUBMITTED	{"referenceId": "70a76578-6e64-402a-ac65-4ad08237b2c1", "referenceType": "QUOTATION"}	t	2026-08-10 16:51:04.78675+05:30	2026-08-11 11:43:41.050419+05:30
aad6f7c3-d64c-4207-89b3-401fd253e2e9	eb75c7ec-441c-48b4-acea-295f64cfc332	Quotation Approved	Great news! Your quotation [QTN-2026-0004] for Customer has been approved by Finance. You can now send it to the customer.	QUOTATION_APPROVED	{"referenceId": "10c05f34-13d0-49f4-a910-245788fed9ea", "referenceType": "QUOTATION"}	t	2026-08-10 16:52:17.068274+05:30	2026-08-11 11:43:41.050419+05:30
4af93f89-b203-401b-b201-46a90420ba07	019c5b7d-20cf-4ef4-971a-91235dd6c10c	New Quotation Created	A new PRODUCT_SALE quotation (QTN-2026-0001) was created.	INFO	{"referenceId": "6762b9fc-74f2-433e-8ac4-1513d1b51195", "referenceType": "QUOTATION"}	t	2026-08-10 13:55:01.646627+05:30	2026-08-11 13:16:58.939143+05:30
71f28c51-40d1-4e0e-b607-bda7240f585f	019c5b7d-20cf-4ef4-971a-91235dd6c10c	Quotation Approved	A quotation [QTN-2026-0001] for Customer has been approved by Finance.	QUOTATION_APPROVED	{"referenceId": "6762b9fc-74f2-433e-8ac4-1513d1b51195", "referenceType": "QUOTATION"}	t	2026-08-10 13:57:16.755825+05:30	2026-08-11 13:16:58.939143+05:30
37679466-a419-454b-9ad6-776141eceea3	019c5b7d-20cf-4ef4-971a-91235dd6c10c	Quotation Converted	A quotation [QTN-2026-0001] for Customer has been converted into a transaction (Proforma contract) by RIYAS EMPLOYEE MANAGER.	QUOTATION_CONVERTED	{"referenceId": "6762b9fc-74f2-433e-8ac4-1513d1b51195", "referenceType": "CONTRACT"}	t	2026-08-10 13:58:54.687466+05:30	2026-08-11 13:16:58.939143+05:30
e6872d8f-e510-48e2-8725-eac0d70d1486	019c5b7d-20cf-4ef4-971a-91235dd6c10c	Contract Activated	Contract [QTN-2026-0001] for customer Customer has been activated by RIYAS EMPLOYEE MANAGER.	CONTRACT_ACTIVATED	{"referenceId": "6762b9fc-74f2-433e-8ac4-1513d1b51195", "referenceType": "CONTRACT"}	t	2026-08-10 13:58:54.932124+05:30	2026-08-11 13:16:58.939143+05:30
a37cb7c1-49f1-4a9c-959c-5e94969c996a	531e24ad-e487-47a8-8096-3de80d3e5d8a	Quotation Approved	A quotation [QTN-2026-0003] for Customer (branch 426625c1-62e8-4e14-952b-457452eb0f28) has been approved by Finance.	QUOTATION_APPROVED	{"referenceId": "37d3fa40-18f7-46c1-8660-bf7fe1407947", "referenceType": "QUOTATION"}	f	2026-08-10 16:52:20.983668+05:30	2026-08-10 16:52:20.983668+05:30
077f8b05-53fb-4107-9f26-3fa0a99035f9	531e24ad-e487-47a8-8096-3de80d3e5d8a	Quotation Approved	A quotation [QTN-2026-0002] for Customer (branch 426625c1-62e8-4e14-952b-457452eb0f28) has been approved by Finance.	QUOTATION_APPROVED	{"referenceId": "70a76578-6e64-402a-ac65-4ad08237b2c1", "referenceType": "QUOTATION"}	f	2026-08-10 16:52:24.799548+05:30	2026-08-10 16:52:24.799548+05:30
156fc3d6-d037-438e-92ca-a48f96b0cca5	1bb9ca55-954b-44b1-8866-6d86c21dd038	Contract Activated	The contract for customer Customer is now active. Delivery and billing schedules are initialized.	CONTRACT_ACTIVATED	{"referenceId": "70a76578-6e64-402a-ac65-4ad08237b2c1", "referenceType": "CONTRACT"}	f	2026-08-10 16:54:16.938938+05:30	2026-08-10 16:54:16.938938+05:30
be600324-a98a-4289-97cb-9579b5382235	531e24ad-e487-47a8-8096-3de80d3e5d8a	Contract Activated	The contract for customer Customer (branch 426625c1-62e8-4e14-952b-457452eb0f28) is now active.	CONTRACT_ACTIVATED	{"referenceId": "70a76578-6e64-402a-ac65-4ad08237b2c1", "referenceType": "CONTRACT"}	f	2026-08-10 16:54:16.989581+05:30	2026-08-10 16:54:16.989581+05:30
8cf13da8-0166-4053-8fb1-4b5456a18514	1bb9ca55-954b-44b1-8866-6d86c21dd038	Contract Activated	The contract for customer Customer is now active. Delivery and billing schedules are initialized.	CONTRACT_ACTIVATED	{"referenceId": "37d3fa40-18f7-46c1-8660-bf7fe1407947", "referenceType": "CONTRACT"}	f	2026-08-10 17:15:42.270898+05:30	2026-08-10 17:15:42.270898+05:30
569620d9-52fd-470a-bb4d-61cafe775d93	531e24ad-e487-47a8-8096-3de80d3e5d8a	Contract Activated	The contract for customer Customer (branch 426625c1-62e8-4e14-952b-457452eb0f28) is now active.	CONTRACT_ACTIVATED	{"referenceId": "37d3fa40-18f7-46c1-8660-bf7fe1407947", "referenceType": "CONTRACT"}	f	2026-08-10 17:15:42.31815+05:30	2026-08-10 17:15:42.31815+05:30
92bd44d1-d614-429b-8661-40af05ca2ae0	1bb9ca55-954b-44b1-8866-6d86c21dd038	Quotation Submitted for Review	A quotation [QTN-2026-0005] for Customer has been submitted for review. Please check details and approve/reject.	QUOTATION_SUBMITTED	{"referenceId": "44acfc22-4317-4484-a546-79b545c4c2c2", "referenceType": "QUOTATION"}	f	2026-08-11 11:43:31.482103+05:30	2026-08-11 11:43:31.482103+05:30
4ad86e14-19fe-4f3f-9408-58ea711a397d	eb75c7ec-441c-48b4-acea-295f64cfc332	Quotation Approved	Great news! Your quotation [QTN-2026-0003] for Customer has been approved by Finance. You can now send it to the customer.	QUOTATION_APPROVED	{"referenceId": "37d3fa40-18f7-46c1-8660-bf7fe1407947", "referenceType": "QUOTATION"}	t	2026-08-10 16:52:20.899018+05:30	2026-08-11 11:43:41.050419+05:30
d75d6107-c817-4cf4-9534-529bee2fe465	eb75c7ec-441c-48b4-acea-295f64cfc332	Quotation Approved	Great news! Your quotation [QTN-2026-0002] for Customer has been approved by Finance. You can now send it to the customer.	QUOTATION_APPROVED	{"referenceId": "70a76578-6e64-402a-ac65-4ad08237b2c1", "referenceType": "QUOTATION"}	t	2026-08-10 16:52:24.710404+05:30	2026-08-11 11:43:41.050419+05:30
1d407896-7269-4916-aa0e-73cb29b17ec5	eb75c7ec-441c-48b4-acea-295f64cfc332	Contract Activated	The contract for customer Customer has been activated successfully.	CONTRACT_ACTIVATED	{"referenceId": "70a76578-6e64-402a-ac65-4ad08237b2c1", "referenceType": "CONTRACT"}	t	2026-08-10 16:54:16.895555+05:30	2026-08-11 11:43:41.050419+05:30
c9ba36a2-535b-4447-826f-94aad13ee382	eb75c7ec-441c-48b4-acea-295f64cfc332	Contract Activated	The contract for customer Customer has been activated successfully.	CONTRACT_ACTIVATED	{"referenceId": "37d3fa40-18f7-46c1-8660-bf7fe1407947", "referenceType": "CONTRACT"}	t	2026-08-10 17:15:42.22494+05:30	2026-08-11 11:43:41.050419+05:30
d905d275-04d6-48cf-9ed5-104ff08edd22	eb75c7ec-441c-48b4-acea-295f64cfc332	Quotation Submitted	Your quotation [QTN-2026-0005] has been submitted for finance review.	QUOTATION_SUBMITTED	{"referenceId": "44acfc22-4317-4484-a546-79b545c4c2c2", "referenceType": "QUOTATION"}	t	2026-08-11 11:43:31.525795+05:30	2026-08-11 11:43:41.050419+05:30
393891df-f78f-46f3-8daf-a517812ae993	531e24ad-e487-47a8-8096-3de80d3e5d8a	Quotation Approved	A quotation [QTN-2026-0005] for Customer (branch 426625c1-62e8-4e14-952b-457452eb0f28) has been approved by Finance.	QUOTATION_APPROVED	{"referenceId": "44acfc22-4317-4484-a546-79b545c4c2c2", "referenceType": "QUOTATION"}	f	2026-08-11 11:44:53.723916+05:30	2026-08-11 11:44:53.723916+05:30
a9fb6dd5-c6ea-4189-85ca-a77802ed5687	eb75c7ec-441c-48b4-acea-295f64cfc332	Quotation Approved	Great news! Your quotation [QTN-2026-0005] for Customer has been approved by Finance. You can now send it to the customer.	QUOTATION_APPROVED	{"referenceId": "44acfc22-4317-4484-a546-79b545c4c2c2", "referenceType": "QUOTATION"}	t	2026-08-11 11:44:53.656764+05:30	2026-08-11 11:45:31.629396+05:30
78f0bb1a-08e4-4204-9426-cd0ca32a0ec7	eb75c7ec-441c-48b4-acea-295f64cfc332	Contract Activated	The contract for customer Customer has been activated successfully.	CONTRACT_ACTIVATED	{"referenceId": "44acfc22-4317-4484-a546-79b545c4c2c2", "referenceType": "CONTRACT"}	f	2026-08-11 12:28:07.146582+05:30	2026-08-11 12:28:07.146582+05:30
91fc76b0-a80a-44c4-803c-ccae84518879	019c5b7d-20cf-4ef4-971a-91235dd6c10c	Quotation Approved	A quotation [QTN-2026-0003] for Customer has been approved by Finance.	QUOTATION_APPROVED	{"referenceId": "37d3fa40-18f7-46c1-8660-bf7fe1407947", "referenceType": "QUOTATION"}	t	2026-08-10 16:52:20.938184+05:30	2026-08-11 13:16:58.939143+05:30
9ac292f7-a0eb-42f9-b82d-693903b6dd47	1bb9ca55-954b-44b1-8866-6d86c21dd038	Contract Activated	The contract for customer Customer is now active. Delivery and billing schedules are initialized.	CONTRACT_ACTIVATED	{"referenceId": "44acfc22-4317-4484-a546-79b545c4c2c2", "referenceType": "CONTRACT"}	f	2026-08-11 12:28:07.21286+05:30	2026-08-11 12:28:07.21286+05:30
9195bcad-3c92-4261-babd-f8c9e389ba17	531e24ad-e487-47a8-8096-3de80d3e5d8a	Contract Activated	The contract for customer Customer (branch 426625c1-62e8-4e14-952b-457452eb0f28) is now active.	CONTRACT_ACTIVATED	{"referenceId": "44acfc22-4317-4484-a546-79b545c4c2c2", "referenceType": "CONTRACT"}	f	2026-08-11 12:28:07.259547+05:30	2026-08-11 12:28:07.259547+05:30
f2bb99dd-2124-45f1-a86f-27a2c4a61c47	1bb9ca55-954b-44b1-8866-6d86c21dd038	Quotation Submitted for Review	A quotation [QTN-2026-0006] for Customer has been submitted for review. Please check details and approve/reject.	QUOTATION_SUBMITTED	{"referenceId": "4c6872cb-12c0-4e6a-bc6d-8b85c044122e", "referenceType": "QUOTATION"}	f	2026-08-11 12:32:54.845572+05:30	2026-08-11 12:32:54.845572+05:30
74b71594-2ab7-47b3-ba53-1c2e305e19c3	eb75c7ec-441c-48b4-acea-295f64cfc332	Quotation Submitted	Your quotation [QTN-2026-0006] has been submitted for finance review.	QUOTATION_SUBMITTED	{"referenceId": "4c6872cb-12c0-4e6a-bc6d-8b85c044122e", "referenceType": "QUOTATION"}	f	2026-08-11 12:32:54.872078+05:30	2026-08-11 12:32:54.872078+05:30
987b6767-ef92-4b61-8916-80ef11d8f7d1	eb75c7ec-441c-48b4-acea-295f64cfc332	Quotation Approved	Great news! Your quotation [QTN-2026-0006] for Customer has been approved by Finance. You can now send it to the customer.	QUOTATION_APPROVED	{"referenceId": "4c6872cb-12c0-4e6a-bc6d-8b85c044122e", "referenceType": "QUOTATION"}	f	2026-08-11 12:33:51.765129+05:30	2026-08-11 12:33:51.765129+05:30
3c137510-cb23-44c8-bbee-711b09fcbd87	531e24ad-e487-47a8-8096-3de80d3e5d8a	Quotation Approved	A quotation [QTN-2026-0006] for Customer (branch 426625c1-62e8-4e14-952b-457452eb0f28) has been approved by Finance.	QUOTATION_APPROVED	{"referenceId": "4c6872cb-12c0-4e6a-bc6d-8b85c044122e", "referenceType": "QUOTATION"}	f	2026-08-11 12:33:51.910635+05:30	2026-08-11 12:33:51.910635+05:30
c1aa4d19-5669-429c-b6e7-131fea2ea1f3	eb75c7ec-441c-48b4-acea-295f64cfc332	Contract Activated	The contract for customer Customer has been activated successfully.	CONTRACT_ACTIVATED	{"referenceId": "4c6872cb-12c0-4e6a-bc6d-8b85c044122e", "referenceType": "CONTRACT"}	f	2026-08-11 12:37:29.474285+05:30	2026-08-11 12:37:29.474285+05:30
afe93d48-109d-4b09-9c24-f337b97cea62	1bb9ca55-954b-44b1-8866-6d86c21dd038	Contract Activated	The contract for customer Customer is now active. Delivery and billing schedules are initialized.	CONTRACT_ACTIVATED	{"referenceId": "4c6872cb-12c0-4e6a-bc6d-8b85c044122e", "referenceType": "CONTRACT"}	f	2026-08-11 12:37:29.5192+05:30	2026-08-11 12:37:29.5192+05:30
cb47cbc5-32e2-4180-ac88-fe998577ac74	531e24ad-e487-47a8-8096-3de80d3e5d8a	Contract Activated	The contract for customer Customer (branch 426625c1-62e8-4e14-952b-457452eb0f28) is now active.	CONTRACT_ACTIVATED	{"referenceId": "4c6872cb-12c0-4e6a-bc6d-8b85c044122e", "referenceType": "CONTRACT"}	f	2026-08-11 12:37:29.562712+05:30	2026-08-11 12:37:29.562712+05:30
5ced0833-f662-47d4-bc7d-89eb03dd8932	019c5b7d-20cf-4ef4-971a-91235dd6c10c	New Quotation Created	A new PRODUCT_SALE quotation (QTN-2026-0002) was created.	INFO	{"referenceId": "70a76578-6e64-402a-ac65-4ad08237b2c1", "referenceType": "QUOTATION"}	t	2026-08-10 16:48:50.730833+05:30	2026-08-11 13:16:58.939143+05:30
898daf6c-1008-4d41-8e57-68b3f9d80c30	019c5b7d-20cf-4ef4-971a-91235dd6c10c	New Quotation Created	A new RENT quotation (QTN-2026-0003) was created.	INFO	{"referenceId": "37d3fa40-18f7-46c1-8660-bf7fe1407947", "referenceType": "QUOTATION"}	t	2026-08-10 16:49:56.032076+05:30	2026-08-11 13:16:58.939143+05:30
25585ede-d662-4b01-9d39-37ab555adf9e	019c5b7d-20cf-4ef4-971a-91235dd6c10c	New Quotation Created	A new LEASE quotation (QTN-2026-0004) was created.	INFO	{"referenceId": "10c05f34-13d0-49f4-a910-245788fed9ea", "referenceType": "QUOTATION"}	t	2026-08-10 16:50:53.320422+05:30	2026-08-11 13:16:58.939143+05:30
fbe74660-f1c5-4a63-94b9-829c85a22c3e	019c5b7d-20cf-4ef4-971a-91235dd6c10c	Quotation Approved	A quotation [QTN-2026-0004] for Customer has been approved by Finance.	QUOTATION_APPROVED	{"referenceId": "10c05f34-13d0-49f4-a910-245788fed9ea", "referenceType": "QUOTATION"}	t	2026-08-10 16:52:17.108185+05:30	2026-08-11 13:16:58.939143+05:30
b39d95b2-bc60-4475-849b-7f125a199639	019c5b7d-20cf-4ef4-971a-91235dd6c10c	Quotation Approved	A quotation [QTN-2026-0002] for Customer has been approved by Finance.	QUOTATION_APPROVED	{"referenceId": "70a76578-6e64-402a-ac65-4ad08237b2c1", "referenceType": "QUOTATION"}	t	2026-08-10 16:52:24.751811+05:30	2026-08-11 13:16:58.939143+05:30
927c82f2-ce70-4706-8fca-29393ca3c1e7	019c5b7d-20cf-4ef4-971a-91235dd6c10c	Quotation Converted	A quotation [QTN-2026-0002] for Customer has been converted into a transaction (Proforma contract) by RIYAS EMPLOYEE MANAGER.	QUOTATION_CONVERTED	{"referenceId": "70a76578-6e64-402a-ac65-4ad08237b2c1", "referenceType": "CONTRACT"}	t	2026-08-10 16:54:16.584664+05:30	2026-08-11 13:16:58.939143+05:30
96345064-da20-4e2d-976c-236c60f14ecc	019c5b7d-20cf-4ef4-971a-91235dd6c10c	Contract Activated	Contract [QTN-2026-0002] for customer Customer has been activated by RIYAS EMPLOYEE MANAGER.	CONTRACT_ACTIVATED	{"referenceId": "70a76578-6e64-402a-ac65-4ad08237b2c1", "referenceType": "CONTRACT"}	t	2026-08-10 16:54:16.920692+05:30	2026-08-11 13:16:58.939143+05:30
4205c0e4-1c3b-40f9-a08b-748284bb9254	019c5b7d-20cf-4ef4-971a-91235dd6c10c	Payment Recorded	A payment of QAR 2000 was recorded via CASH on invoice [QTN-2026-0002].	PAYMENT_RECORDED	{"referenceId": "70a76578-6e64-402a-ac65-4ad08237b2c1", "referenceType": "CONTRACT"}	t	2026-08-10 16:54:17.252168+05:30	2026-08-11 13:16:58.939143+05:30
5de3c0c4-282e-4a89-9683-d87a2f058672	019c5b7d-20cf-4ef4-971a-91235dd6c10c	Quotation Converted	A quotation [QTN-2026-0003] for Customer has been converted into a transaction (Proforma contract) by RIYAS EMPLOYEE MANAGER.	QUOTATION_CONVERTED	{"referenceId": "37d3fa40-18f7-46c1-8660-bf7fe1407947", "referenceType": "CONTRACT"}	t	2026-08-10 17:14:12.904341+05:30	2026-08-11 13:16:58.939143+05:30
d09c8a49-eadf-4a5c-ab77-d8607a921447	019c5b7d-20cf-4ef4-971a-91235dd6c10c	Payment Recorded	A payment of QAR 400 was recorded via CASH on invoice [QTN-2026-0003].	PAYMENT_RECORDED	{"referenceId": "37d3fa40-18f7-46c1-8660-bf7fe1407947", "referenceType": "CONTRACT"}	t	2026-08-10 17:14:13.275851+05:30	2026-08-11 13:16:58.939143+05:30
e5e44940-75d9-4318-a67b-21a46a588b59	019c5b7d-20cf-4ef4-971a-91235dd6c10c	Contract Activated	Contract [QTN-2026-0003] for customer Customer has been activated by RIYAS EMPLOYEE MANAGER.	CONTRACT_ACTIVATED	{"referenceId": "37d3fa40-18f7-46c1-8660-bf7fe1407947", "referenceType": "CONTRACT"}	t	2026-08-10 17:15:42.237831+05:30	2026-08-11 13:16:58.939143+05:30
f00bf7be-286d-45f6-a4d7-c9b0dce2141f	019c5b7d-20cf-4ef4-971a-91235dd6c10c	New Quotation Created	A new RENT quotation (QTN-2026-0005) was created.	INFO	{"referenceId": "44acfc22-4317-4484-a546-79b545c4c2c2", "referenceType": "QUOTATION"}	t	2026-08-11 11:43:22.657136+05:30	2026-08-11 13:16:58.939143+05:30
e6d1088b-eea9-4e7b-abdd-f75668b78139	019c5b7d-20cf-4ef4-971a-91235dd6c10c	Quotation Approved	A quotation [QTN-2026-0005] for Customer has been approved by Finance.	QUOTATION_APPROVED	{"referenceId": "44acfc22-4317-4484-a546-79b545c4c2c2", "referenceType": "QUOTATION"}	t	2026-08-11 11:44:53.676855+05:30	2026-08-11 13:16:58.939143+05:30
b5eb4107-2aab-494a-bb25-863aaaa3bb0d	019c5b7d-20cf-4ef4-971a-91235dd6c10c	Quotation Converted	A quotation [QTN-2026-0005] for Customer has been converted into a transaction (Proforma contract) by RIYAS EMPLOYEE MANAGER.	QUOTATION_CONVERTED	{"referenceId": "44acfc22-4317-4484-a546-79b545c4c2c2", "referenceType": "CONTRACT"}	t	2026-08-11 11:46:51.734135+05:30	2026-08-11 13:16:58.939143+05:30
3d431d5d-029e-483c-a5be-9dfae5b9b07c	019c5b7d-20cf-4ef4-971a-91235dd6c10c	Contract Activated	Contract [QTN-2026-0005] for customer Customer has been activated by RIYAS EMPLOYEE MANAGER.	CONTRACT_ACTIVATED	{"referenceId": "44acfc22-4317-4484-a546-79b545c4c2c2", "referenceType": "CONTRACT"}	t	2026-08-11 12:28:07.178847+05:30	2026-08-11 13:16:58.939143+05:30
3913e683-160c-4edf-9f55-3a11e503cd41	019c5b7d-20cf-4ef4-971a-91235dd6c10c	New Quotation Created	A new RENT quotation (QTN-2026-0006) was created.	INFO	{"referenceId": "4c6872cb-12c0-4e6a-bc6d-8b85c044122e", "referenceType": "QUOTATION"}	t	2026-08-11 12:32:09.756463+05:30	2026-08-11 13:16:58.939143+05:30
9f9b7d31-3090-42a0-a80c-7766296b3231	019c5b7d-20cf-4ef4-971a-91235dd6c10c	Quotation Approved	A quotation [QTN-2026-0006] for Customer has been approved by Finance.	QUOTATION_APPROVED	{"referenceId": "4c6872cb-12c0-4e6a-bc6d-8b85c044122e", "referenceType": "QUOTATION"}	t	2026-08-11 12:33:51.839079+05:30	2026-08-11 13:16:58.939143+05:30
1bca4b3a-cbae-4365-a2ed-98c358cadb5d	019c5b7d-20cf-4ef4-971a-91235dd6c10c	Quotation Converted	A quotation [QTN-2026-0006] for Customer has been converted into a transaction (Proforma contract) by RIYAS EMPLOYEE MANAGER.	QUOTATION_CONVERTED	{"referenceId": "4c6872cb-12c0-4e6a-bc6d-8b85c044122e", "referenceType": "CONTRACT"}	t	2026-08-11 12:35:15.504186+05:30	2026-08-11 13:16:58.939143+05:30
8ad9de03-c40c-4fd9-ae1a-a600fe019e61	019c5b7d-20cf-4ef4-971a-91235dd6c10c	Contract Activated	Contract [QTN-2026-0006] for customer Customer has been activated by RIYAS EMPLOYEE MANAGER.	CONTRACT_ACTIVATED	{"referenceId": "4c6872cb-12c0-4e6a-bc6d-8b85c044122e", "referenceType": "CONTRACT"}	t	2026-08-11 12:37:29.487719+05:30	2026-08-11 13:16:58.939143+05:30
a1158dd8-3e6c-4863-8b1a-6f2f748ada3d	019c5b7d-20cf-4ef4-971a-91235dd6c10c	Payment Recorded	A payment of QAR 47750 was recorded via CASH on invoice [QTN-2026-0006].	PAYMENT_RECORDED	{"referenceId": "4c6872cb-12c0-4e6a-bc6d-8b85c044122e", "referenceType": "CONTRACT"}	t	2026-08-11 12:49:56.751498+05:30	2026-08-11 13:16:58.939143+05:30
b2e5438c-3b0e-4f5e-9af4-bee15b12ef4b	019c5b7d-20cf-4ef4-971a-91235dd6c10c	Vendor Quote Received	Gulf Office Systems LLC has submitted a quote for RFQ [RFQ-202608-1789].	VENDOR_QUOTE_RECEIVED	{"referenceId": "47b1ea7a-b714-456c-a625-345a616a7585", "referenceType": "QUOTATION"}	f	2026-08-13 00:40:46.722449+05:30	2026-08-13 00:40:46.722449+05:30
e9ae5a61-4ebb-40a4-aede-0b5ad09b13b5	019c5b7d-20cf-4ef4-971a-91235dd6c10c	All Vendors Have Quoted	All vendors have submitted their quotes for RFQ [RFQ-202608-1789]. You can now compare and award.	RFQ_FULLY_QUOTED	{"referenceId": "47b1ea7a-b714-456c-a625-345a616a7585", "referenceType": "QUOTATION"}	f	2026-08-13 00:40:47.574953+05:30	2026-08-13 00:40:47.574953+05:30
5664e77d-6dae-4190-8f11-7687daf8964c	019c5b7d-20cf-4ef4-971a-91235dd6c10c	RFQ Awarded	RFQ [RFQ-202608-1789] has been awarded to Tokyo Imaging Corp. You can now create a lot from this RFQ.	RFQ_AWARDED	{"referenceId": "47b1ea7a-b714-456c-a625-345a616a7585", "referenceType": "QUOTATION"}	f	2026-08-13 00:40:47.817333+05:30	2026-08-13 00:40:47.817333+05:30
b1a15105-c201-40f1-bd80-ea0d0fff894a	eb75c7ec-441c-48b4-acea-295f64cfc332	Credit Note Approved — Refund Completed	Your credit note CN-2026-00014 was approved and the refund has been completed.	CREDIT_NOTE_APPROVED	{"referenceId": "302df2bc-2d9b-417a-b1d6-9c476be4665b", "referenceType": "CREDIT_NOTE"}	f	2026-08-13 02:21:13.687633+05:30	2026-08-13 02:21:13.687633+05:30
c92c020e-5085-4301-bf95-a9631b4d0ccc	531e24ad-e487-47a8-8096-3de80d3e5d8a	Credit Note Approved	Credit note CN-2026-00014 (branch c24a0a2c-6b0f-4ae5-aaaf-0346a65e6b6e) was approved.	CREDIT_NOTE_APPROVED	{"referenceId": "302df2bc-2d9b-417a-b1d6-9c476be4665b", "referenceType": "CREDIT_NOTE"}	f	2026-08-13 02:21:13.736863+05:30	2026-08-13 02:21:13.736863+05:30
f07aa4ca-355f-461f-992b-835133b6e600	1bb9ca55-954b-44b1-8866-6d86c21dd038	Cheque Deposited	Cheque #CHQ-AUDIT-001 from Omar Al Nuaimi deposited — Cash at Bank updates once it clears.	INFO	\N	f	2026-08-13 03:13:48.315235+05:30	2026-08-13 03:13:48.315235+05:30
489edf97-621f-49e9-a737-8ee167029e3c	531e24ad-e487-47a8-8096-3de80d3e5d8a	Machine Swap Request	mriyastk8@gmail.com has requested to swap serial N/A → AE-SN-0008 on contract QTN-2026-0007.	INFO	{"referenceId": "7a85c447-1267-4e3c-8038-25063c915202", "referenceType": "MACHINE_SWAP"}	f	2026-08-13 03:18:12.616351+05:30	2026-08-13 03:18:12.616351+05:30
be04910b-9a43-43dd-bd03-291450ea84fb	eb75c7ec-441c-48b4-acea-295f64cfc332	Contract Activated	The contract for customer Customer has been activated successfully.	CONTRACT_ACTIVATED	{"referenceId": "ead434c2-1f97-4e57-9e4d-479cfa04eed1", "referenceType": "CONTRACT"}	f	2026-08-13 03:28:44.72432+05:30	2026-08-13 03:28:44.72432+05:30
8d3c1c72-a1ac-4b8a-a12d-8a58e57aa497	531e24ad-e487-47a8-8096-3de80d3e5d8a	Contract Activated	The contract for customer Customer (branch c24a0a2c-6b0f-4ae5-aaaf-0346a65e6b6e) is now active.	CONTRACT_ACTIVATED	{"referenceId": "ead434c2-1f97-4e57-9e4d-479cfa04eed1", "referenceType": "CONTRACT"}	f	2026-08-13 03:28:44.833866+05:30	2026-08-13 03:28:44.833866+05:30
cb0d5e12-5983-42dc-9c55-72155fcc7b18	eb75c7ec-441c-48b4-acea-295f64cfc332	Contract Activated	The contract for customer Customer has been activated successfully.	CONTRACT_ACTIVATED	{"referenceId": "29989874-0588-4213-9a2b-27b97835a8f7", "referenceType": "CONTRACT"}	f	2026-08-13 03:37:37.942301+05:30	2026-08-13 03:37:37.942301+05:30
5fd15d91-835c-4697-b92c-30fa17ca0d2f	531e24ad-e487-47a8-8096-3de80d3e5d8a	Contract Activated	The contract for customer Customer (branch c24a0a2c-6b0f-4ae5-aaaf-0346a65e6b6e) is now active.	CONTRACT_ACTIVATED	{"referenceId": "29989874-0588-4213-9a2b-27b97835a8f7", "referenceType": "CONTRACT"}	f	2026-08-13 03:37:37.997147+05:30	2026-08-13 03:37:37.997147+05:30
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

\unrestrict qeL9bpS2qMYJkBVMjgeLMbnSbQU5Puas9B0c4DnIBdv8wHpLgvHOPvaWu65UEGR

