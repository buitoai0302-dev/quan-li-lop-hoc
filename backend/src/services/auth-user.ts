import type { SessionUser } from './auth-session.service';

export interface PublicAuthUser {
  id: string;
  tenant_id: string;
  branch_id: string | null;
  email: string;
  full_name: string;
  role: string;
  is_active: boolean;
  is_email_verified: boolean;
  onboarding_completed: boolean;
  notify_upcoming_sessions: boolean;
  is_google_connected: boolean;
  tenant_name: string;
  tenant_settings: Record<string, unknown>;
  tenant_active: boolean;
  plan_id: string;
  plan_code: string;
  plan_features: Record<string, boolean>;
  signup_plan_id?: string | null;
  signup_plan_code?: string | null;
  signup_billing_cycle?: string | null;
}

export interface AuthUser extends PublicAuthUser, SessionUser {
  password_hash: string;
}

// Explicit public allowlist: adding a DB credential column must never expose it
// through login, Google login, or subsequent changes to the auth query.
export function toPublicAuthUser(user: AuthUser): PublicAuthUser {
  return {
    id: user.id,
    tenant_id: user.tenant_id,
    branch_id: user.branch_id,
    email: user.email,
    full_name: user.full_name,
    role: user.role,
    is_active: user.is_active,
    is_email_verified: user.is_email_verified,
    onboarding_completed: user.onboarding_completed,
    notify_upcoming_sessions: user.notify_upcoming_sessions,
    is_google_connected: Boolean(user.is_google_connected),
    tenant_name: user.tenant_name,
    tenant_settings: user.tenant_settings,
    tenant_active: user.tenant_active,
    plan_id: user.plan_id,
    plan_code: user.plan_code,
    plan_features: user.plan_features,
    signup_plan_id: user.signup_plan_id,
    signup_plan_code: user.signup_plan_code,
    signup_billing_cycle: user.signup_billing_cycle,
  };
}
