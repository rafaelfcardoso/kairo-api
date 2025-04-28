--
-- PostgreSQL database dump
--

-- Dumped from database version 14.15 (Homebrew)
-- Dumped by pg_dump version 14.15 (Homebrew)

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
-- Name: block_rule_type_enum; Type: TYPE; Schema: public; Owner: Rafael
--

CREATE TYPE public.block_rule_type_enum AS ENUM (
    'website',
    'application'
);


ALTER TYPE public.block_rule_type_enum OWNER TO "Rafael";

--
-- Name: block_type_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.block_type_enum AS ENUM (
    'app',
    'website'
);


ALTER TYPE public.block_type_enum OWNER TO postgres;

--
-- Name: focus_session_energylevel_enum; Type: TYPE; Schema: public; Owner: Rafael
--

CREATE TYPE public.focus_session_energylevel_enum AS ENUM (
    'low',
    'medium',
    'high'
);


ALTER TYPE public.focus_session_energylevel_enum OWNER TO "Rafael";

--
-- Name: nlp_feedback_type_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.nlp_feedback_type_enum AS ENUM (
    'task_parsing',
    'entity_extraction',
    'query_understanding',
    'intent_classification'
);


ALTER TYPE public.nlp_feedback_type_enum OWNER TO postgres;

--
-- Name: nlp_model_performance_operationtype_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.nlp_model_performance_operationtype_enum AS ENUM (
    'task_parsing',
    'entity_extraction',
    'query_understanding',
    'intent_classification'
);


ALTER TYPE public.nlp_model_performance_operationtype_enum OWNER TO postgres;

--
-- Name: project_type_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.project_type_enum AS ENUM (
    'inbox',
    'regular',
    'archive'
);


ALTER TYPE public.project_type_enum OWNER TO postgres;

--
-- Name: task_priority_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.task_priority_enum AS ENUM (
    'none',
    'low',
    'medium',
    'high'
);


ALTER TYPE public.task_priority_enum OWNER TO postgres;

--
-- Name: task_status_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.task_status_enum AS ENUM (
    'not_started',
    'in_progress',
    'blocked',
    'completed'
);


ALTER TYPE public.task_status_enum OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: api_metrics; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.api_metrics (
    id integer NOT NULL,
    endpoint character varying NOT NULL,
    method character varying NOT NULL,
    version character varying NOT NULL,
    date date NOT NULL,
    hour integer NOT NULL,
    "requestCount" integer DEFAULT 0 NOT NULL,
    "successCount" integer DEFAULT 0 NOT NULL,
    "errorCount" integer DEFAULT 0 NOT NULL,
    "avgResponseTime" real DEFAULT 0 NOT NULL,
    "p95ResponseTime" real,
    "p99ResponseTime" real,
    "minResponseTime" integer,
    "maxResponseTime" integer,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.api_metrics OWNER TO postgres;

--
-- Name: api_metrics_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.api_metrics_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.api_metrics_id_seq OWNER TO postgres;

--
-- Name: api_metrics_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.api_metrics_id_seq OWNED BY public.api_metrics.id;


--
-- Name: api_request_log; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.api_request_log (
    id integer NOT NULL,
    "requestId" uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    endpoint character varying NOT NULL,
    method character varying NOT NULL,
    version character varying NOT NULL,
    "statusCode" integer NOT NULL,
    "responseTime" integer NOT NULL,
    "userId" character varying,
    "userAgent" character varying,
    "ipAddress" character varying,
    "requestBody" jsonb,
    "requestQuery" jsonb,
    "responseSize" integer,
    "errorCode" character varying,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.api_request_log OWNER TO postgres;

--
-- Name: api_request_log_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.api_request_log_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.api_request_log_id_seq OWNER TO postgres;

--
-- Name: api_request_log_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.api_request_log_id_seq OWNED BY public.api_request_log.id;


--
-- Name: block_rule; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.block_rule (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name character varying NOT NULL,
    type public.block_rule_type_enum NOT NULL,
    target character varying NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    schedule jsonb,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.block_rule OWNER TO postgres;

--
-- Name: block_setting; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.block_setting (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    type public.block_type_enum NOT NULL,
    identifier character varying NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "userId" uuid NOT NULL,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.block_setting OWNER TO postgres;

--
-- Name: focus_session; Type: TABLE; Schema: public; Owner: Rafael
--

CREATE TABLE public.focus_session (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "startTime" timestamp without time zone NOT NULL,
    "endTime" timestamp without time zone,
    "durationMinutes" integer DEFAULT 0 NOT NULL,
    "energyLevel" public.focus_session_energylevel_enum DEFAULT 'medium'::public.focus_session_energylevel_enum NOT NULL,
    "wasSuccessful" boolean DEFAULT false NOT NULL,
    notes character varying,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "projectId" uuid,
    "taskId" character varying,
    "userId" uuid NOT NULL
);


ALTER TABLE public.focus_session OWNER TO "Rafael";

--
-- Name: focus_session_tasks_task; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.focus_session_tasks_task (
    "focusSessionId" uuid NOT NULL,
    "taskId" uuid NOT NULL
);


ALTER TABLE public.focus_session_tasks_task OWNER TO postgres;

--
-- Name: migrations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.migrations (
    id integer NOT NULL,
    "timestamp" bigint NOT NULL,
    name character varying NOT NULL
);


ALTER TABLE public.migrations OWNER TO postgres;

--
-- Name: migrations_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.migrations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.migrations_id_seq OWNER TO postgres;

--
-- Name: migrations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.migrations_id_seq OWNED BY public.migrations.id;


--
-- Name: project; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.project (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name character varying NOT NULL,
    description character varying,
    "isArchived" boolean DEFAULT false NOT NULL,
    color character varying,
    "order" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL,
    "parentId" uuid,
    "isSystem" boolean DEFAULT false NOT NULL,
    type public.project_type_enum DEFAULT 'regular'::public.project_type_enum NOT NULL,
    "userId" uuid NOT NULL
);


ALTER TABLE public.project OWNER TO postgres;

--
-- Name: project_closure; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.project_closure (
    id_ancestor uuid NOT NULL,
    id_descendant uuid NOT NULL
);


ALTER TABLE public.project_closure OWNER TO postgres;

--
-- Name: schedule; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.schedule (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "startHour" integer NOT NULL,
    "startMinute" integer NOT NULL,
    "endHour" integer NOT NULL,
    "endMinute" integer NOT NULL,
    days integer[] NOT NULL,
    active boolean DEFAULT true NOT NULL,
    "userId" uuid NOT NULL,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.schedule OWNER TO postgres;

--
-- Name: system_health; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.system_health (
    id integer NOT NULL,
    "timestamp" timestamp with time zone DEFAULT now() NOT NULL,
    status character varying NOT NULL,
    system_load numeric(5,2) NOT NULL,
    memory_used_mb integer NOT NULL,
    memory_total_mb integer NOT NULL,
    memory_used_percent numeric(5,2) NOT NULL,
    database_connected boolean NOT NULL,
    database_size_mb numeric(10,2),
    database_connections integer,
    service_disruptions integer DEFAULT 0 NOT NULL,
    recovery_attempts integer DEFAULT 0 NOT NULL,
    successful_recoveries integer DEFAULT 0 NOT NULL,
    uptime_seconds integer NOT NULL,
    additional_info jsonb
);


ALTER TABLE public.system_health OWNER TO postgres;

--
-- Name: system_health_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.system_health_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.system_health_id_seq OWNER TO postgres;

--
-- Name: system_health_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.system_health_id_seq OWNED BY public.system_health.id;


--
-- Name: tag; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.tag (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name character varying NOT NULL,
    description character varying,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL,
    color character varying,
    "order" integer DEFAULT 0 NOT NULL,
    "userId" uuid NOT NULL,
    "isArchived" boolean DEFAULT false NOT NULL
);


ALTER TABLE public.tag OWNER TO postgres;

--
-- Name: task; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.task (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    title character varying NOT NULL,
    description character varying,
    priority public.task_priority_enum DEFAULT 'none'::public.task_priority_enum NOT NULL,
    "dueDate" timestamp without time zone,
    "estimatedMinutes" integer DEFAULT 0 NOT NULL,
    "isArchived" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL,
    "hasTime" boolean DEFAULT false NOT NULL,
    status public.task_status_enum DEFAULT 'not_started'::public.task_status_enum NOT NULL,
    "projectId" uuid,
    "needsReminder" boolean DEFAULT false NOT NULL,
    "reminderMessage" character varying,
    "recurrenceRule" character varying,
    "nextDueDate" timestamp without time zone,
    "isRecurring" boolean DEFAULT false NOT NULL,
    "recurrencePattern" character varying,
    "recurrenceDays" character varying,
    "recurrenceTimeOfDay" character varying,
    "recurrenceTime" character varying,
    "recurringParentId" character varying,
    "completedAt" timestamp without time zone,
    "userId" uuid NOT NULL
);


ALTER TABLE public.task OWNER TO postgres;

--
-- Name: task_focus_sessions_focus_session; Type: TABLE; Schema: public; Owner: Rafael
--

CREATE TABLE public.task_focus_sessions_focus_session (
    "taskId" uuid NOT NULL,
    "focusSessionId" uuid NOT NULL
);


ALTER TABLE public.task_focus_sessions_focus_session OWNER TO "Rafael";

--
-- Name: task_tag; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.task_tag (
    "taskId" uuid NOT NULL,
    "tagId" uuid NOT NULL
);


ALTER TABLE public.task_tag OWNER TO postgres;

--
-- Name: user; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."user" (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    email character varying NOT NULL,
    "passwordHash" character varying NOT NULL,
    "firstName" character varying,
    "lastName" character varying,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public."user" OWNER TO postgres;

--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    email character varying NOT NULL,
    "passwordHash" character varying,
    name character varying,
    "avatarUrl" character varying,
    "googleId" character varying,
    "appleId" character varying,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.users OWNER TO postgres;

--
-- Name: api_metrics id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.api_metrics ALTER COLUMN id SET DEFAULT nextval('public.api_metrics_id_seq'::regclass);


--
-- Name: api_request_log id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.api_request_log ALTER COLUMN id SET DEFAULT nextval('public.api_request_log_id_seq'::regclass);


--
-- Name: migrations id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.migrations ALTER COLUMN id SET DEFAULT nextval('public.migrations_id_seq'::regclass);


--
-- Name: system_health id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.system_health ALTER COLUMN id SET DEFAULT nextval('public.system_health_id_seq'::regclass);


--
-- Name: focus_session PK_1275fae3091a5cb58e8d65d9c1b; Type: CONSTRAINT; Schema: public; Owner: Rafael
--

ALTER TABLE ONLY public.focus_session
    ADD CONSTRAINT "PK_1275fae3091a5cb58e8d65d9c1b" PRIMARY KEY (id);


--
-- Name: block_rule PK_32f64777364e416053427a08d86; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.block_rule
    ADD CONSTRAINT "PK_32f64777364e416053427a08d86" PRIMARY KEY (id);


--
-- Name: focus_session_tasks_task PK_66ca3207aa0b22d859ee8466717; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.focus_session_tasks_task
    ADD CONSTRAINT "PK_66ca3207aa0b22d859ee8466717" PRIMARY KEY ("focusSessionId", "taskId");


--
-- Name: migrations PK_8c82d7f526340ab734260ea46be; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.migrations
    ADD CONSTRAINT "PK_8c82d7f526340ab734260ea46be" PRIMARY KEY (id);


--
-- Name: users PK_a3ffb1c0c8416b9fc6f907b7433; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY (id);


--
-- Name: api_metrics PK_api_metrics; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.api_metrics
    ADD CONSTRAINT "PK_api_metrics" PRIMARY KEY (id);


--
-- Name: api_request_log PK_api_request_log; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.api_request_log
    ADD CONSTRAINT "PK_api_request_log" PRIMARY KEY (id);


--
-- Name: block_setting PK_block_setting; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.block_setting
    ADD CONSTRAINT "PK_block_setting" PRIMARY KEY (id);


--
-- Name: task_focus_sessions_focus_session PK_c5dfdd7eada029c70f672101095; Type: CONSTRAINT; Schema: public; Owner: Rafael
--

ALTER TABLE ONLY public.task_focus_sessions_focus_session
    ADD CONSTRAINT "PK_c5dfdd7eada029c70f672101095" PRIMARY KEY ("taskId", "focusSessionId");


--
-- Name: schedule PK_schedule; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.schedule
    ADD CONSTRAINT "PK_schedule" PRIMARY KEY (id);


--
-- Name: system_health PK_system_health; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.system_health
    ADD CONSTRAINT "PK_system_health" PRIMARY KEY (id);


--
-- Name: user PK_user; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."user"
    ADD CONSTRAINT "PK_user" PRIMARY KEY (id);


--
-- Name: users UQ_60cea0d80c39eedaaaf5e21f175; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT "UQ_60cea0d80c39eedaaaf5e21f175" UNIQUE ("appleId");


--
-- Name: users UQ_97672ac88f789774dd47f7c8be3; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE (email);


--
-- Name: users UQ_f382af58ab36057334fb262efd5; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT "UQ_f382af58ab36057334fb262efd5" UNIQUE ("googleId");


--
-- Name: tag UQ_tag_userId_name; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tag
    ADD CONSTRAINT "UQ_tag_userId_name" UNIQUE ("userId", name);


--
-- Name: user UQ_user_email; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."user"
    ADD CONSTRAINT "UQ_user_email" UNIQUE (email);


--
-- Name: project_closure project_closure_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.project_closure
    ADD CONSTRAINT project_closure_pkey PRIMARY KEY (id_ancestor, id_descendant);


--
-- Name: project project_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.project
    ADD CONSTRAINT project_pkey PRIMARY KEY (id);


--
-- Name: tag tag_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tag
    ADD CONSTRAINT tag_pkey PRIMARY KEY (id);


--
-- Name: task task_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.task
    ADD CONSTRAINT task_pkey PRIMARY KEY (id);


--
-- Name: task_tag task_tags_tag_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.task_tag
    ADD CONSTRAINT task_tags_tag_pkey PRIMARY KEY ("taskId", "tagId");


--
-- Name: IDX_0e31820cdb45be62449b4f69c8; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_0e31820cdb45be62449b4f69c8" ON public.task_tag USING btree ("tagId");


--
-- Name: IDX_34c358da8b9f0fad392f90dbf4; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_34c358da8b9f0fad392f90dbf4" ON public.project_closure USING btree (id_ancestor);


--
-- Name: IDX_374509e2164bd1126522f424f6; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_374509e2164bd1126522f424f6" ON public.task_tag USING btree ("taskId");


--
-- Name: IDX_3908f346f94fe3f23842a9ac04; Type: INDEX; Schema: public; Owner: Rafael
--

CREATE INDEX "IDX_3908f346f94fe3f23842a9ac04" ON public.focus_session USING btree ("userId");


--
-- Name: IDX_537323a8afda072e3a965a50f7; Type: INDEX; Schema: public; Owner: Rafael
--

CREATE INDEX "IDX_537323a8afda072e3a965a50f7" ON public.task_focus_sessions_focus_session USING btree ("taskId");


--
-- Name: IDX_60cea0d80c39eedaaaf5e21f17; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_60cea0d80c39eedaaaf5e21f17" ON public.users USING btree ("appleId");


--
-- Name: IDX_7c4b0d3b77eaf26f8b4da879e6; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_7c4b0d3b77eaf26f8b4da879e6" ON public.project USING btree ("userId");


--
-- Name: IDX_885070eafa2e7a3c333cb30b3b; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_885070eafa2e7a3c333cb30b3b" ON public.project_closure USING btree (id_descendant);


--
-- Name: IDX_97672ac88f789774dd47f7c8be; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_97672ac88f789774dd47f7c8be" ON public.users USING btree (email);


--
-- Name: IDX_991d6b1f6211230956a8d1332e; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_991d6b1f6211230956a8d1332e" ON public.focus_session_tasks_task USING btree ("taskId");


--
-- Name: IDX_api_metrics_endpoint_method_version_date_hour; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "IDX_api_metrics_endpoint_method_version_date_hour" ON public.api_metrics USING btree (endpoint, method, version, date, hour);


--
-- Name: IDX_api_request_log_createdAt; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_api_request_log_createdAt" ON public.api_request_log USING btree ("createdAt");


--
-- Name: IDX_api_request_log_endpoint; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_api_request_log_endpoint" ON public.api_request_log USING btree (endpoint);


--
-- Name: IDX_api_request_log_statusCode; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_api_request_log_statusCode" ON public.api_request_log USING btree ("statusCode");


--
-- Name: IDX_api_request_log_userId; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_api_request_log_userId" ON public.api_request_log USING btree ("userId");


--
-- Name: IDX_c2c2903a729145001634483cb3; Type: INDEX; Schema: public; Owner: Rafael
--

CREATE INDEX "IDX_c2c2903a729145001634483cb3" ON public.task_focus_sessions_focus_session USING btree ("focusSessionId");


--
-- Name: IDX_c67afaaa43b45b9407406a6458; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_c67afaaa43b45b9407406a6458" ON public.focus_session_tasks_task USING btree ("focusSessionId");


--
-- Name: IDX_d0dc39ff83e384b4a097f47d3f; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_d0dc39ff83e384b4a097f47d3f" ON public.tag USING btree ("userId");


--
-- Name: IDX_f316d3fe53497d4d8a2957db8b; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_f316d3fe53497d4d8a2957db8b" ON public.task USING btree ("userId");


--
-- Name: IDX_f382af58ab36057334fb262efd; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_f382af58ab36057334fb262efd" ON public.users USING btree ("googleId");


--
-- Name: IDX_project_closure_id_ancestor; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_project_closure_id_ancestor" ON public.project_closure USING btree (id_ancestor);


--
-- Name: IDX_project_closure_id_descendant; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_project_closure_id_descendant" ON public.project_closure USING btree (id_descendant);


--
-- Name: IDX_task_tag_tagId; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_task_tag_tagId" ON public.task_tag USING btree ("tagId");


--
-- Name: IDX_task_tag_taskId; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_task_tag_taskId" ON public.task_tag USING btree ("taskId");


--
-- Name: task_tag FK_0e31820cdb45be62449b4f69c8c; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.task_tag
    ADD CONSTRAINT "FK_0e31820cdb45be62449b4f69c8c" FOREIGN KEY ("tagId") REFERENCES public.tag(id);


--
-- Name: project_closure FK_34c358da8b9f0fad392f90dbf44; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.project_closure
    ADD CONSTRAINT "FK_34c358da8b9f0fad392f90dbf44" FOREIGN KEY (id_ancestor) REFERENCES public.project(id) ON DELETE CASCADE;


--
-- Name: task_tag FK_374509e2164bd1126522f424f6f; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.task_tag
    ADD CONSTRAINT "FK_374509e2164bd1126522f424f6f" FOREIGN KEY ("taskId") REFERENCES public.task(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: task FK_3797a20ef5553ae87af126bc2fe; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.task
    ADD CONSTRAINT "FK_3797a20ef5553ae87af126bc2fe" FOREIGN KEY ("projectId") REFERENCES public.project(id);


--
-- Name: focus_session FK_3908f346f94fe3f23842a9ac04c; Type: FK CONSTRAINT; Schema: public; Owner: Rafael
--

ALTER TABLE ONLY public.focus_session
    ADD CONSTRAINT "FK_3908f346f94fe3f23842a9ac04c" FOREIGN KEY ("userId") REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: task_focus_sessions_focus_session FK_537323a8afda072e3a965a50f7f; Type: FK CONSTRAINT; Schema: public; Owner: Rafael
--

ALTER TABLE ONLY public.task_focus_sessions_focus_session
    ADD CONSTRAINT "FK_537323a8afda072e3a965a50f7f" FOREIGN KEY ("taskId") REFERENCES public.task(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: project FK_7c4b0d3b77eaf26f8b4da879e63; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.project
    ADD CONSTRAINT "FK_7c4b0d3b77eaf26f8b4da879e63" FOREIGN KEY ("userId") REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: project_closure FK_885070eafa2e7a3c333cb30b3bb; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.project_closure
    ADD CONSTRAINT "FK_885070eafa2e7a3c333cb30b3bb" FOREIGN KEY (id_descendant) REFERENCES public.project(id) ON DELETE CASCADE;


--
-- Name: project FK_972cc84102e4234fb489536fccf; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.project
    ADD CONSTRAINT "FK_972cc84102e4234fb489536fccf" FOREIGN KEY ("parentId") REFERENCES public.project(id);


--
-- Name: focus_session_tasks_task FK_991d6b1f6211230956a8d1332e3; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.focus_session_tasks_task
    ADD CONSTRAINT "FK_991d6b1f6211230956a8d1332e3" FOREIGN KEY ("taskId") REFERENCES public.task(id);


--
-- Name: focus_session FK_ad9df59f4e875d4c110157e525c; Type: FK CONSTRAINT; Schema: public; Owner: Rafael
--

ALTER TABLE ONLY public.focus_session
    ADD CONSTRAINT "FK_ad9df59f4e875d4c110157e525c" FOREIGN KEY ("projectId") REFERENCES public.project(id);


--
-- Name: block_setting FK_block_setting_user; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.block_setting
    ADD CONSTRAINT "FK_block_setting_user" FOREIGN KEY ("userId") REFERENCES public."user"(id) ON DELETE CASCADE;


--
-- Name: task_focus_sessions_focus_session FK_c2c2903a729145001634483cb35; Type: FK CONSTRAINT; Schema: public; Owner: Rafael
--

ALTER TABLE ONLY public.task_focus_sessions_focus_session
    ADD CONSTRAINT "FK_c2c2903a729145001634483cb35" FOREIGN KEY ("focusSessionId") REFERENCES public.focus_session(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: focus_session_tasks_task FK_c67afaaa43b45b9407406a6458a; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.focus_session_tasks_task
    ADD CONSTRAINT "FK_c67afaaa43b45b9407406a6458a" FOREIGN KEY ("focusSessionId") REFERENCES public.focus_session(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: tag FK_d0dc39ff83e384b4a097f47d3f5; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tag
    ADD CONSTRAINT "FK_d0dc39ff83e384b4a097f47d3f5" FOREIGN KEY ("userId") REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: task FK_f316d3fe53497d4d8a2957db8b9; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.task
    ADD CONSTRAINT "FK_f316d3fe53497d4d8a2957db8b9" FOREIGN KEY ("userId") REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: schedule FK_schedule_user; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.schedule
    ADD CONSTRAINT "FK_schedule_user" FOREIGN KEY ("userId") REFERENCES public."user"(id) ON DELETE CASCADE;


--
-- Name: task_tag FK_task_tag_tag; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.task_tag
    ADD CONSTRAINT "FK_task_tag_tag" FOREIGN KEY ("tagId") REFERENCES public.tag(id) ON DELETE CASCADE;


--
-- Name: task_tag FK_task_tag_task; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.task_tag
    ADD CONSTRAINT "FK_task_tag_task" FOREIGN KEY ("taskId") REFERENCES public.task(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

