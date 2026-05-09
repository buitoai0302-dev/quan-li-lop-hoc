# Database Schema Report

Generated at: 12:24:19 9/5/2026

## Table: attendance

| Column | Data Type | Nullable | Default |
|--------|-----------|----------|---------|
| id | uuid | NO | gen_random_uuid() |
| session_id | uuid | YES |  |
| student_id | uuid | YES |  |
| status | character varying | YES |  |
| created_at | timestamp without time zone | YES | CURRENT_TIMESTAMP |
| tenant_id | uuid | YES |  |
| updated_at | timestamp with time zone | YES | CURRENT_TIMESTAMP |

## Table: branches

| Column | Data Type | Nullable | Default |
|--------|-----------|----------|---------|
| id | uuid | NO | uuid_generate_v4() |
| tenant_id | uuid | NO |  |
| name | character varying | NO |  |
| address | text | YES |  |
| phone | character varying | YES |  |
| email | character varying | YES |  |
| is_active | boolean | NO | true |
| created_at | timestamp with time zone | NO | now() |
| updated_at | timestamp with time zone | NO | now() |
| is_deleted | boolean | NO | false |

## Table: class_recurring_schedules

| Column | Data Type | Nullable | Default |
|--------|-----------|----------|---------|
| id | uuid | NO | uuid_generate_v4() |
| class_id | uuid | NO |  |
| day_of_week | integer | NO |  |
| start_time | time without time zone | NO |  |
| end_time | time without time zone | NO |  |
| room_id | uuid | YES |  |
| created_at | timestamp with time zone | NO | now() |
| notes | text | YES |  |
| updated_at | timestamp with time zone | YES | now() |

## Table: class_students

| Column | Data Type | Nullable | Default |
|--------|-----------|----------|---------|
| tenant_id | uuid | NO |  |
| class_id | uuid | NO |  |
| student_id | uuid | NO |  |
| enrolled_at | timestamp with time zone | NO | now() |
| status | character varying | NO | 'enrolled'::character varying |

## Table: classes

| Column | Data Type | Nullable | Default |
|--------|-----------|----------|---------|
| id | uuid | NO | uuid_generate_v4() |
| tenant_id | uuid | NO |  |
| branch_id | uuid | NO |  |
| subject_id | uuid | NO |  |
| teacher_id | uuid | YES |  |
| name | character varying | NO |  |
| max_capacity | integer | NO | 30 |
| start_date | date | NO |  |
| end_date | date | NO |  |
| status | character varying | NO | 'active'::character varying |
| created_at | timestamp with time zone | NO | now() |
| updated_at | timestamp with time zone | NO | now() |
| is_deleted | boolean | NO | false |

## Table: plan_definitions

| Column | Data Type | Nullable | Default |
|--------|-----------|----------|---------|
| id | uuid | NO | uuid_generate_v4() |
| code | character varying | NO |  |
| name | character varying | NO |  |
| price_monthly | numeric | NO | 0.00 |
| is_active | boolean | NO | true |
| sort_order | integer | NO | 0 |
| created_at | timestamp with time zone | NO | now() |
| price_vnd | numeric | YES | 0.00 |
| price_usd | numeric | YES | 0.00 |

## Table: plan_features

| Column | Data Type | Nullable | Default |
|--------|-----------|----------|---------|
| plan_id | uuid | NO |  |
| feature_key | character varying | NO |  |
| is_enabled | boolean | NO | false |

## Table: plan_limits

| Column | Data Type | Nullable | Default |
|--------|-----------|----------|---------|
| plan_id | uuid | NO |  |
| limit_key | character varying | NO |  |
| limit_value | integer | NO | '-1'::integer |

## Table: plan_requests

| Column | Data Type | Nullable | Default |
|--------|-----------|----------|---------|
| id | uuid | NO | uuid_generate_v4() |
| tenant_id | uuid | NO |  |
| plan_id | uuid | NO |  |
| status | character varying | NO | 'pending'::character varying |
| notes | text | YES |  |
| created_at | timestamp with time zone | YES | now() |
| updated_at | timestamp with time zone | YES | now() |

## Table: refresh_tokens

| Column | Data Type | Nullable | Default |
|--------|-----------|----------|---------|
| id | uuid | NO | uuid_generate_v4() |
| user_id | uuid | NO |  |
| token | character varying | NO |  |
| expires_at | timestamp with time zone | NO |  |
| created_at | timestamp with time zone | NO | now() |

## Table: rooms

| Column | Data Type | Nullable | Default |
|--------|-----------|----------|---------|
| id | uuid | NO | uuid_generate_v4() |
| tenant_id | uuid | NO |  |
| branch_id | uuid | NO |  |
| name | character varying | NO |  |
| capacity | integer | NO |  |
| room_type | character varying | NO | 'classroom'::character varying |
| is_active | boolean | NO | true |
| created_at | timestamp with time zone | NO | now() |
| updated_at | timestamp with time zone | NO | now() |
| is_deleted | boolean | NO | false |

## Table: schedule_sessions

| Column | Data Type | Nullable | Default |
|--------|-----------|----------|---------|
| id | uuid | NO | uuid_generate_v4() |
| tenant_id | uuid | NO |  |
| class_id | uuid | NO |  |
| room_id | uuid | NO |  |
| teacher_id | uuid | NO |  |
| session_date | date | NO |  |
| start_time | time without time zone | NO |  |
| end_time | time without time zone | NO |  |
| session_type | character varying | NO | 'lecture'::character varying |
| notes | text | YES |  |
| status | character varying | NO | 'scheduled'::character varying |
| created_at | timestamp with time zone | NO | now() |
| updated_at | timestamp with time zone | NO | now() |
| is_notified | boolean | NO | false |
| google_event_id | character varying | YES |  |

## Table: students

| Column | Data Type | Nullable | Default |
|--------|-----------|----------|---------|
| id | uuid | NO | uuid_generate_v4() |
| tenant_id | uuid | NO |  |
| branch_id | uuid | NO |  |
| full_name | character varying | NO |  |
| email | character varying | NO |  |
| phone | character varying | YES |  |
| date_of_birth | date | YES |  |
| is_active | boolean | NO | true |
| created_at | timestamp with time zone | NO | now() |
| updated_at | timestamp with time zone | NO | now() |
| is_deleted | boolean | NO | false |
| parent_phone | character varying | YES |  |

## Table: subjects

| Column | Data Type | Nullable | Default |
|--------|-----------|----------|---------|
| id | uuid | NO | uuid_generate_v4() |
| tenant_id | uuid | NO |  |
| name | character varying | NO |  |
| code | character varying | NO |  |
| description | text | YES |  |
| created_at | timestamp with time zone | NO | now() |
| is_deleted | boolean | NO | false |

## Table: teachers

| Column | Data Type | Nullable | Default |
|--------|-----------|----------|---------|
| id | uuid | NO | uuid_generate_v4() |
| tenant_id | uuid | NO |  |
| branch_id | uuid | NO |  |
| full_name | character varying | NO |  |
| email | character varying | NO |  |
| phone | character varying | YES |  |
| specialization | character varying | YES |  |
| is_active | boolean | NO | true |
| created_at | timestamp with time zone | NO | now() |
| updated_at | timestamp with time zone | NO | now() |
| is_deleted | boolean | NO | false |

## Table: tenants

| Column | Data Type | Nullable | Default |
|--------|-----------|----------|---------|
| id | uuid | NO | uuid_generate_v4() |
| plan_id | uuid | NO |  |
| name | character varying | NO |  |
| domain | character varying | YES |  |
| is_active | boolean | NO | true |
| created_at | timestamp with time zone | NO | now() |
| updated_at | timestamp with time zone | NO | now() |
| contact_email | character varying | YES |  |
| status | USER-DEFINED | YES | 'pending'::tenant_status |
| api_key | character varying | YES |  |
| settings | jsonb | YES | '{"menu": {"rooms": true, "import": true, "classes": true, "branches": true, "schedule": true, "students": true, "teachers": true, "dashboard": true, "attendance": true}}'::jsonb |

## Table: users

| Column | Data Type | Nullable | Default |
|--------|-----------|----------|---------|
| id | uuid | NO | uuid_generate_v4() |
| tenant_id | uuid | NO |  |
| branch_id | uuid | YES |  |
| email | character varying | NO |  |
| password_hash | character varying | NO |  |
| full_name | character varying | NO |  |
| role | character varying | NO | 'teacher'::character varying |
| is_active | boolean | NO | true |
| created_at | timestamp with time zone | NO | now() |
| updated_at | timestamp with time zone | NO | now() |
| is_email_verified | boolean | NO | false |
| verification_token | character varying | YES |  |
| google_access_token | text | YES |  |
| google_refresh_token | text | YES |  |
| google_calendar_id | character varying | YES |  |
| notify_upcoming_sessions | boolean | NO | true |
| reset_password_token | character varying | YES |  |
| reset_password_expires | timestamp with time zone | YES |  |
| verification_token_expires | timestamp with time zone | YES |  |
| onboarding_completed | boolean | YES | false |

## Functions/Procedures

- uuid_nil (FUNCTION)
- uuid_ns_dns (FUNCTION)
- uuid_ns_url (FUNCTION)
- uuid_ns_oid (FUNCTION)
- uuid_ns_x500 (FUNCTION)
- uuid_generate_v1 (FUNCTION)
- uuid_generate_v1mc (FUNCTION)
- uuid_generate_v3 (FUNCTION)
- uuid_generate_v4 (FUNCTION)
- uuid_generate_v5 (FUNCTION)
- set_limit (FUNCTION)
- show_limit (FUNCTION)
- show_trgm (FUNCTION)
- similarity (FUNCTION)
- similarity_op (FUNCTION)
- word_similarity (FUNCTION)
- word_similarity_op (FUNCTION)
- word_similarity_commutator_op (FUNCTION)
- similarity_dist (FUNCTION)
- word_similarity_dist_op (FUNCTION)
- word_similarity_dist_commutator_op (FUNCTION)
- gtrgm_in (FUNCTION)
- gtrgm_out (FUNCTION)
- gtrgm_consistent (FUNCTION)
- gtrgm_distance (FUNCTION)
- gtrgm_compress (FUNCTION)
- gtrgm_decompress (FUNCTION)
- gtrgm_penalty (FUNCTION)
- gtrgm_picksplit (FUNCTION)
- gtrgm_union (FUNCTION)
- gtrgm_same (FUNCTION)
- gin_extract_value_trgm (FUNCTION)
- gin_extract_query_trgm (FUNCTION)
- gin_trgm_consistent (FUNCTION)
- gin_trgm_triconsistent (FUNCTION)
- strict_word_similarity (FUNCTION)
- strict_word_similarity_op (FUNCTION)
- strict_word_similarity_commutator_op (FUNCTION)
- strict_word_similarity_dist_op (FUNCTION)
- strict_word_similarity_dist_commutator_op (FUNCTION)
- gtrgm_options (FUNCTION)
- check_schedule_conflict (FUNCTION)
- update_updated_at (FUNCTION)
