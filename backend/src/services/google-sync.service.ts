import { randomUUID } from 'node:crypto';
import pool from '../db';
import { AppError, NotFoundError } from '../utils/errors';
import { ERROR_CODES } from '../utils/constants';
import {
  GOOGLE_SYNC,
  GOOGLE_SYNC_STATE,
  type CalendarLink,
  type CalendarPayload,
} from '../utils/google-sync';
import { logger } from '../utils/logger';
import {
  CalendarEventDeletedError,
  CalendarOwnershipError,
  canAdoptLegacyEvent,
  getCalendarEvent,
  getGoogleFailure,
  getPersonalCalendar,
  ownsCalendarEvent,
  writePersonalEvent,
} from './google-calendar-provider.service';

interface SyncWork extends CalendarLink {
  revision: string;
  connection_version: number;
  current_connection_version: number;
  operation: 'upsert' | 'delete';
  payload: CalendarPayload | null;
  state: string;
  attempts: number;
  google_access_token: string | null;
  google_refresh_token: string | null;
  is_active: boolean;
  tenant_active: boolean;
  allowed: boolean;
}
const getUserLockKey = (tenantId: string, userId: string) => `google:${tenantId}:${userId}`;

export class GoogleSyncService {
  static async createJob(tenantId: string, userId: string, requestId: string = randomUUID()) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const user = await client.query(
        `SELECT u.id FROM users u JOIN tenants t ON t.id=u.tenant_id
        WHERE u.tenant_id=$1 AND u.id=$2 AND u.is_active AND t.is_active
          AND (u.google_access_token IS NOT NULL OR u.google_refresh_token IS NOT NULL) FOR UPDATE OF u`,
        [tenantId, userId]
      );
      if (!user.rowCount)
        throw new AppError(
          'Google Calendar is not connected',
          409,
          ERROR_CODES.GOOGLE_CONNECTION_FAILED
        );
      const existing = await client.query<{ id: string }>(
        'SELECT id FROM google_sync_jobs WHERE tenant_id=$1 AND user_id=$2 AND request_key=$3',
        [tenantId, userId, requestId]
      );
      if (existing.rowCount) {
        await client.query('COMMIT');
        return { id: existing.rows[0].id };
      }
      const sessions = await client.query<{ id: string }>(
        `SELECT id FROM schedule_sessions WHERE tenant_id=$1 AND can_sync_google_session($1,$2,id)
        AND session_date >= (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Ho_Chi_Minh')::date
        UNION SELECT session_id AS id FROM google_calendar_links WHERE tenant_id=$1 AND user_id=$2`,
        [tenantId, userId]
      );
      for (const session of sessions.rows)
        await client.query('SELECT enqueue_google_session($1,$2,$3)', [
          tenantId,
          session.id,
          userId,
        ]);
      // A new request also retries failed work; jobs refer to revisions, not mutable payload copies.
      await client.query(
        `UPDATE google_sync_outbox o SET revision=revision+1,state=$3,attempts=0,next_attempt_at=now(),error_code=NULL,updated_at=now()
        FROM google_calendar_links l WHERE l.tenant_id=$1 AND l.user_id=$2 AND o.tenant_id=l.tenant_id AND o.link_id=l.id AND o.state<>$4`,
        [tenantId, userId, GOOGLE_SYNC_STATE.PENDING, GOOGLE_SYNC_STATE.CONFIRMATION_REQUIRED]
      );
      const {
        rows: [job],
      } = await client.query<{ id: string }>(
        'INSERT INTO google_sync_jobs (tenant_id,user_id,request_key) VALUES ($1,$2,$3) RETURNING id',
        [tenantId, userId, requestId]
      );
      await client.query(
        `INSERT INTO google_sync_job_items (tenant_id,job_id,link_id,revision)
        SELECT o.tenant_id,$3,o.link_id,o.revision FROM google_sync_outbox o JOIN google_calendar_links l ON l.tenant_id=o.tenant_id AND l.id=o.link_id
        WHERE l.tenant_id=$1 AND l.user_id=$2`,
        [tenantId, userId, job.id]
      );
      await client.query('COMMIT');
      return job;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  static async progress(tenantId: string, userId: string, jobId?: string) {
    if (
      jobId &&
      !(
        await pool.query(
          'SELECT id FROM google_sync_jobs WHERE tenant_id=$1 AND user_id=$2 AND id=$3',
          [tenantId, userId, jobId]
        )
      ).rowCount
    )
      throw new NotFoundError('Sync job not found', ERROR_CODES.NOT_FOUND);
    const result = await pool.query<{
      counts: Record<string, number>;
      items: {
        id: string;
        sessionId: string;
        state: string;
        attempts: number;
        nextAttemptAt: string | null;
        errorCode: string | null;
        className: string | null;
      }[];
    }>(
      `WITH owned AS (
        SELECT l.id,l.session_id AS "sessionId",o.state,o.attempts,o.next_attempt_at AS "nextAttemptAt",o.error_code AS "errorCode",o.payload->>'className' AS "className",o.updated_at
        FROM google_calendar_links l JOIN google_sync_outbox o ON o.tenant_id=l.tenant_id AND o.link_id=l.id
        WHERE l.tenant_id=$1 AND l.user_id=$2 AND ($3::uuid IS NULL OR EXISTS (SELECT 1 FROM google_sync_job_items i WHERE i.tenant_id=l.tenant_id AND i.job_id=$3 AND i.link_id=l.id))
      ) SELECT COALESCE((SELECT json_object_agg(state,count) FROM (SELECT state,count(*)::int AS count FROM owned GROUP BY state) grouped),'{}'::json) AS counts,
        COALESCE((SELECT json_agg(page) FROM (SELECT id,"sessionId",state,attempts,"nextAttemptAt","errorCode","className" FROM owned ORDER BY updated_at DESC,id LIMIT 50) page),'[]'::json) AS items`,
      [tenantId, userId, jobId || null]
    );
    const counts = Object.fromEntries(
      Object.values(GOOGLE_SYNC_STATE).map((state) => [state, result.rows[0].counts[state] || 0])
    );
    return {
      id: jobId || null,
      paused: process.env.DISABLE_BACKGROUND_JOBS === 'true',
      counts,
      total: Object.values(counts).reduce((sum, count) => sum + count, 0),
      items: result.rows[0].items,
    };
  }

  static async retry(tenantId: string, userId: string, jobId?: string, confirmLegacy = false) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      // Link IDs/legacy confirmation must not change beneath an active provider request.
      await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))', [
        getUserLockKey(tenantId, userId),
      ]);
      if (
        jobId &&
        !(
          await client.query(
            'SELECT id FROM google_sync_jobs WHERE tenant_id=$1 AND user_id=$2 AND id=$3',
            [tenantId, userId, jobId]
          )
        ).rowCount
      ) {
        throw new NotFoundError('Sync job not found', ERROR_CODES.NOT_FOUND);
      }
      if (confirmLegacy)
        await client.query(
          `UPDATE google_calendar_links l SET legacy_confirmed=true,
        event_id=CASE WHEN l.legacy_event_id IS NULL THEN replace(gen_random_uuid()::text,'-','') ELSE l.event_id END
        FROM google_sync_outbox o WHERE l.tenant_id=$1 AND l.user_id=$2
          AND ($3::uuid IS NULL OR EXISTS (SELECT 1 FROM google_sync_job_items i WHERE i.tenant_id=l.tenant_id AND i.job_id=$3 AND i.link_id=l.id))
          AND o.tenant_id=l.tenant_id AND o.link_id=l.id AND o.state=$4`,
          [tenantId, userId, jobId, GOOGLE_SYNC_STATE.CONFIRMATION_REQUIRED]
        );
      await client.query(
        `UPDATE google_sync_outbox o SET revision=o.revision+1,state=$4,attempts=0,next_attempt_at=now(),error_code=NULL,updated_at=now()
        FROM google_calendar_links l WHERE l.tenant_id=$1 AND l.user_id=$2 AND o.tenant_id=l.tenant_id AND o.link_id=l.id
          AND ($3::uuid IS NULL OR EXISTS (SELECT 1 FROM google_sync_job_items i WHERE i.tenant_id=l.tenant_id AND i.job_id=$3 AND i.link_id=l.id))
          AND (o.state=$5 OR ($6 AND o.state=$7))`,
        [
          tenantId,
          userId,
          jobId,
          GOOGLE_SYNC_STATE.PENDING,
          GOOGLE_SYNC_STATE.RETRY_NEEDED,
          confirmLegacy,
          GOOGLE_SYNC_STATE.CONFIRMATION_REQUIRED,
        ]
      );
      await client.query('COMMIT');
      return { id: jobId || null };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  static async processPending() {
    if (process.env.DISABLE_BACKGROUND_JOBS === 'true') return false;
    const pending = await pool.query<{ link_id: string }>(
      `SELECT link_id FROM google_sync_outbox
      WHERE (state=$1 OR state=$2 OR (state=$3 AND next_attempt_at<=now())) ORDER BY updated_at,link_id LIMIT $4`,
      [
        GOOGLE_SYNC_STATE.PENDING,
        GOOGLE_SYNC_STATE.SYNCING,
        GOOGLE_SYNC_STATE.RETRY_NEEDED,
        GOOGLE_SYNC.BATCH_SIZE,
      ]
    );
    let processed = 0;
    for (const row of pending.rows)
      if (await GoogleSyncService.processLink(row.link_id)) processed++;
    return processed > 0 && pending.rows.length === GOOGLE_SYNC.BATCH_SIZE;
  }

  static async processLink(linkId: string) {
    if (process.env.DISABLE_BACKGROUND_JOBS === 'true') return;
    const client = await pool.connect();
    let lockKey: string | undefined;
    try {
      const identity = (
        await client.query<{ tenant_id: string; user_id: string }>(
          'SELECT tenant_id,user_id FROM google_calendar_links WHERE id=$1',
          [linkId]
        )
      ).rows[0];
      if (!identity) return;
      const key = getUserLockKey(identity.tenant_id, identity.user_id);
      const locked = (
        await client.query<{ locked: boolean }>(
          'SELECT pg_try_advisory_lock(hashtextextended($1,0)) AS locked',
          [key]
        )
      ).rows[0].locked;
      if (!locked) return;
      lockKey = key;
      const work = (
        await client.query<SyncWork>(
          `SELECT l.*,o.revision::text,o.connection_version,o.operation,o.payload,o.state,o.attempts,
          u.google_connection_version AS current_connection_version,u.google_access_token,u.google_refresh_token,u.is_active,t.is_active AS tenant_active,
          can_sync_google_session(l.tenant_id,l.user_id,l.session_id) AS allowed
        FROM google_calendar_links l JOIN google_sync_outbox o ON o.tenant_id=l.tenant_id AND o.link_id=l.id
        JOIN users u ON u.tenant_id=l.tenant_id AND u.id=l.user_id JOIN tenants t ON t.id=l.tenant_id
        WHERE l.tenant_id=$1 AND l.id=$2 AND (o.state=$3 OR o.state=$4 OR (o.state=$5 AND o.next_attempt_at<=now()))`,
          [
            identity.tenant_id,
            linkId,
            GOOGLE_SYNC_STATE.PENDING,
            GOOGLE_SYNC_STATE.SYNCING,
            GOOGLE_SYNC_STATE.RETRY_NEEDED,
          ]
        )
      ).rows[0];
      if (!work) return;
      const finish = async (
        state: string,
        errorCode: string | null = null,
        nextAttemptAt: Date | null = null
      ) =>
        client.query(
          `UPDATE google_sync_outbox
        SET state=$4,error_code=$5,next_attempt_at=$6,updated_at=now() WHERE tenant_id=$1 AND link_id=$2 AND revision=$3 AND connection_version=$7`,
          [
            work.tenant_id,
            linkId,
            work.revision,
            state,
            errorCode,
            nextAttemptAt,
            work.connection_version,
          ]
        );
      if (
        !work.is_active ||
        !work.tenant_active ||
        (!work.google_access_token && !work.google_refresh_token) ||
        work.current_connection_version !== work.connection_version
      ) {
        await finish(GOOGLE_SYNC_STATE.CONNECTION_REQUIRED, ERROR_CODES.GOOGLE_CONNECTION_FAILED);
        return true;
      }
      if (work.operation === 'upsert' && !work.allowed) {
        await client.query('SELECT enqueue_google_session($1,$2,$3)', [
          work.tenant_id,
          work.session_id,
          work.user_id,
        ]);
        return true;
      }
      const claimed = await client.query(
        `UPDATE google_sync_outbox SET state=$4,attempts=attempts+1,updated_at=now()
        WHERE tenant_id=$1 AND link_id=$2 AND revision=$3 RETURNING link_id`,
        [work.tenant_id, linkId, work.revision, GOOGLE_SYNC_STATE.SYNCING]
      );
      if (!claimed.rowCount) return;
      try {
        const calendar = getPersonalCalendar(work.google_access_token, work.google_refresh_token);
        if (work.legacy_event_id) {
          const legacy = await getCalendarEvent(calendar, work.legacy_event_id);
          if (
            legacy &&
            legacy.status !== 'cancelled' &&
            !ownsCalendarEvent(legacy, work) &&
            !work.legacy_confirmed
          )
            throw new CalendarOwnershipError();
          // Only adopt a verified event belonging to this user's primary calendar.
          if (
            legacy &&
            legacy.status !== 'cancelled' &&
            (ownsCalendarEvent(legacy, work) ||
              (work.legacy_confirmed && canAdoptLegacyEvent(legacy)))
          )
            work.event_id = work.legacy_event_id;
          await client.query(
            'UPDATE google_calendar_links SET event_id=$3 WHERE tenant_id=$1 AND id=$2',
            [work.tenant_id, linkId, work.event_id]
          );
          if (
            legacy &&
            work.event_id === work.legacy_event_id &&
            !ownsCalendarEvent(legacy, work)
          ) {
            // Explicitly confirmed ownership: mark before the standard idempotent writer.
            await calendar.events.patch(
              {
                calendarId: GOOGLE_SYNC.PRIMARY_CALENDAR,
                eventId: work.event_id,
                requestBody: {
                  extendedProperties: {
                    private: {
                      eduTenant: work.tenant_id,
                      eduUser: work.user_id,
                      eduSession: work.session_id,
                    },
                  },
                },
                sendUpdates: 'none',
              },
              { timeout: GOOGLE_SYNC.REQUEST_TIMEOUT_MS, retry: false }
            );
          }
          await client.query(
            'UPDATE google_calendar_links SET legacy_event_id=NULL WHERE tenant_id=$1 AND id=$2',
            [work.tenant_id, linkId]
          );
        }
        await writePersonalEvent(
          calendar,
          work,
          work.operation === 'delete' ? null : work.payload,
          work.revision
        );
        if (work.operation === 'delete') {
          // Google keeps deletion tombstones. A later reactivation needs a fresh, persisted ID.
          await client.query(
            "UPDATE google_calendar_links SET event_id=replace(gen_random_uuid()::text,'-','') WHERE tenant_id=$1 AND id=$2",
            [work.tenant_id, linkId]
          );
        }
        await finish(GOOGLE_SYNC_STATE.SYNCED);
      } catch (error) {
        if (error instanceof CalendarEventDeletedError) {
          await client.query(
            "UPDATE google_calendar_links SET event_id=replace(gen_random_uuid()::text,'-','') WHERE tenant_id=$1 AND id=$2",
            [work.tenant_id, linkId]
          );
          await finish(GOOGLE_SYNC_STATE.PENDING);
          return true;
        }
        const failure = getGoogleFailure(error);
        const attempts = work.attempts + 1;
        const state =
          error instanceof CalendarOwnershipError
            ? GOOGLE_SYNC_STATE.CONFIRMATION_REQUIRED
            : failure.auth
              ? GOOGLE_SYNC_STATE.CONNECTION_REQUIRED
              : GOOGLE_SYNC_STATE.RETRY_NEEDED;
        const next =
          state === GOOGLE_SYNC_STATE.RETRY_NEEDED &&
          failure.transient &&
          attempts <= GOOGLE_SYNC.MAX_RETRIES
            ? new Date(
                Date.now() +
                  GOOGLE_SYNC.RETRY_DELAY_MS * 2 ** (attempts - 1) * (1 + Math.random() * 0.2)
              )
            : null;
        const code = failure.auth
          ? ERROR_CODES.GOOGLE_CONNECTION_FAILED
          : failure.transient
            ? ERROR_CODES.INTERNAL_ERROR
            : ERROR_CODES.INVALID_DATA;
        await finish(state, code, next);
        logger.warn(
          {
            operation: 'GOOGLE_SYNC_ATTEMPT_FAILED',
            tenantId: work.tenant_id,
            userId: work.user_id,
            linkId,
            state,
            attempts,
          },
          'Calendar work deferred'
        );
      }
      return true;
    } finally {
      try {
        if (lockKey)
          await client.query('SELECT pg_advisory_unlock(hashtextextended($1,0))', [lockKey]);
      } catch (error) {
        client.release(true);
        throw error;
      }
      client.release();
    }
  }
}
