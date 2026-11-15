import { useCallback, useEffect, useRef, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { USER_ROLES } from '@/utils/constants';
import { useLocation } from 'react-router-dom';

const WORKFLOW_STATE_VERSION = 1;
export const isText = (value: unknown): value is string =>
  typeof value === 'string' && value.length <= 500;
export const isDateKey = (value: unknown): value is string =>
  typeof value === 'string' &&
  /^\d{4}-\d{2}-\d{2}$/.test(value) &&
  !Number.isNaN(Date.parse(value)) &&
  new Date(value).toISOString().slice(0, 10) === value;
export const isPageNumber = (value: unknown): value is number =>
  Number.isInteger(value) && Number(value) >= 1 && Number(value) <= 100000;
export const isPageSize = (value: unknown): value is number =>
  typeof value === 'number' && [5, 10, 20, 25, 50, 100].includes(value);

export function useWorkflowScope() {
  const { user } = useAuth();
  const tenantId =
    (user?.role === USER_ROLES.SUPER_ADMIN && localStorage.getItem('impersonatedTenantId')) ||
    user?.tenant_id;
  return user && tenantId ? `${user.id}:${tenantId}` : '';
}

export function readWorkflowValue<T>(
  storage: Pick<Storage, 'getItem'>,
  key: string,
  fallback: T,
  validate: (value: unknown) => value is T
): T {
  try {
    const value: unknown = JSON.parse(storage.getItem(key) || 'null');
    return validate(value) ? value : fallback;
  } catch {
    return fallback;
  }
}

// Only UI preferences belong here. Never pass records, financial data or form drafts.
export function useWorkflowState<T>(
  screen: string | undefined,
  field: string,
  fallback: T,
  validate: (value: unknown) => value is T,
  temporary = false,
  navigationValue?: T
): [T, Dispatch<SetStateAction<T>>] {
  const scope = useWorkflowScope();
  const location = useLocation();
  const key = `workflow:v${WORKFLOW_STATE_VERSION}:${scope}:${screen}:${field}`;
  const storage = temporary ? sessionStorage : localStorage;
  const [state, setState] = useState<{ key: string; navigationKey: string; value: T }>(() => ({
    key,
    navigationKey: location.key,
    value:
      navigationValue !== undefined && validate(navigationValue)
        ? navigationValue
        : scope && screen
          ? readWorkflowValue(storage, key, fallback, validate)
          : fallback,
  }));
  // Consume explicit navigation once per history entry, including same-route links.
  if (state.navigationKey !== location.key) {
    setState({
      key,
      navigationKey: location.key,
      value:
        navigationValue !== undefined && validate(navigationValue)
          ? navigationValue
          : state.key === key
            ? state.value
            : readWorkflowValue(storage, key, fallback, validate),
    });
  }
  const value =
    state.key === key
      ? state.value
      : scope && screen
        ? readWorkflowValue(storage, key, fallback, validate)
        : fallback;
  const setValue: Dispatch<SetStateAction<T>> = useCallback(
    (next) => {
      setState((previous) => {
        const current = previous.key === key ? previous.value : fallback;
        return {
          key,
          navigationKey: previous.navigationKey,
          value: typeof next === 'function' ? (next as (value: T) => T)(current) : next,
        };
      });
    },
    [key, fallback]
  );
  useEffect(() => {
    if (!scope || !screen || state.key !== key) return;
    try {
      storage.setItem(key, JSON.stringify(state.value));
    } catch {
      /* Storage may be unavailable or full. */
    }
  }, [scope, screen, storage, key, state]);
  return [value, setValue];
}

export function useWorkflowScroll(screen: string, ready: boolean) {
  const scope = useWorkflowScope();
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const root = ref.current;
    if (!ready || !root || !scope) return;
    const key = `workflow:v${WORKFLOW_STATE_VERSION}:${scope}:${screen}:scroll`;
    const elements = [root, ...root.querySelectorAll<HTMLElement>('*')].filter((element) =>
      /auto|scroll/.test(getComputedStyle(element).overflowY)
    );
    const offsets = readWorkflowValue(
      sessionStorage,
      key,
      [] as number[],
      (value): value is number[] =>
        Array.isArray(value) &&
        value.every((item) => typeof item === 'number' && Number.isFinite(item) && item >= 0)
    );
    const frame = requestAnimationFrame(() =>
      elements.forEach((element, index) => {
        element.scrollTop = offsets[index] || 0;
      })
    );
    const save = () => {
      try {
        sessionStorage.setItem(key, JSON.stringify(elements.map((element) => element.scrollTop)));
      } catch {
        /* Best effort. */
      }
    };
    root.addEventListener('scroll', save, true);
    return () => {
      cancelAnimationFrame(frame);
      root.removeEventListener('scroll', save, true);
    };
  }, [screen, scope, ready]);
  return ref;
}
