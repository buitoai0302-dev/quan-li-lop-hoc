import { logger } from '../utils/logger';
import { messaging, isFirebaseInitialized } from '../config/firebase';
import pool from '../db';

export class NotificationService {
  /**
   * Registers an FCM token for a user
   */
  static async registerToken(userId: string, token: string): Promise<void> {
    const query = `
      INSERT INTO user_fcm_tokens (user_id, token, last_used_at)
      VALUES ($1, $2, NOW())
      ON CONFLICT (token) 
      DO UPDATE SET user_id = $1, last_used_at = NOW()
    `;
    await pool.query(query, [userId, token]);
  }

  /**
   * Unregisters an FCM token (e.g., on logout)
   */
  static async unregisterToken(token: string): Promise<void> {
    const query = `DELETE FROM user_fcm_tokens WHERE token = $1`;
    await pool.query(query, [token]);
  }

  /**
   * Sends a notification to a specific user
   */
  static async sendToUser(
    userId: string,
    title: string,
    body: string,
    data?: Record<string, string>
  ): Promise<void> {
    const tokensResult = await pool.query('SELECT token FROM user_fcm_tokens WHERE user_id = $1', [
      userId,
    ]);
    const tokens = tokensResult.rows.map((row) => row.token);

    if (tokens.length === 0) return;

    if (!isFirebaseInitialized() || !messaging) {
      logger.info(`[MOCK NOTIFICATION] To User ${userId}: ${title} - ${body}`);
      return;
    }

    try {
      const message = {
        notification: {
          title,
          body,
        },
        data: data || {},
        tokens,
      };

      const response = await messaging.sendMulticast(message);

      // Handle invalid tokens
      if (response.failureCount > 0) {
        const failedTokens: string[] = [];
        response.responses.forEach((resp: any, idx: number) => {
          if (!resp.success) {
            if (
              resp.error?.code === 'messaging/invalid-registration-token' ||
              resp.error?.code === 'messaging/registration-token-not-registered'
            ) {
              failedTokens.push(tokens[idx]);
            }
          }
        });

        if (failedTokens.length > 0) {
          await pool.query('DELETE FROM user_fcm_tokens WHERE token = ANY($1)', [failedTokens]);
        }
      }
    } catch (error) {
      logger.error(error, 'Error sending message to user:');
    }
  }

  /**
   * Sends a notification to multiple users
   */
  static async sendToUsers(
    userIds: string[],
    title: string,
    body: string,
    data?: Record<string, string>
  ): Promise<void> {
    if (userIds.length === 0) return;

    const tokensResult = await pool.query(
      'SELECT token FROM user_fcm_tokens WHERE user_id = ANY($1)',
      [userIds]
    );
    const tokens = tokensResult.rows.map((row) => row.token);

    if (tokens.length === 0) return;

    if (!isFirebaseInitialized() || !messaging) {
      logger.info(`[MOCK NOTIFICATION] To Users ${userIds.join(', ')}: ${title} - ${body}`);
      return;
    }

    try {
      const message = {
        notification: {
          title,
          body,
        },
        data: data || {},
        tokens,
      };

      const response = await messaging.sendMulticast(message);
      // Handle failures similarly...
    } catch (error) {
      logger.error(error, 'Error sending message to users:');
    }
  }
}
