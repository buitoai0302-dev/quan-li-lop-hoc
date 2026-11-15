import { logger } from '../utils/logger';
import { google } from 'googleapis';
import pool from '../db';
import fs from 'fs';

import { config } from '../utils/config';
import { ERROR_CODES, ROLES } from '../utils/constants';
import { AuthenticationError } from '../utils/errors';
import { GoogleSyncService } from './google-sync.service';
import { CodeChallengeMethod } from 'google-auth-library';

const oauth2Client = new google.auth.OAuth2(
  config.google.clientId(),
  config.google.clientSecret(),
  config.google.redirectUri()
);

export const getAuthUrl = (state: string, includeDrive: boolean, codeChallenge: string) => {
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: [
      'https://www.googleapis.com/auth/calendar.events',
      ...(includeDrive ? ['https://www.googleapis.com/auth/drive.file'] : []),
    ],
    state: state,
    code_challenge: codeChallenge,
    code_challenge_method: CodeChallengeMethod.S256,
    prompt: 'consent', // Để luôn trả về refresh_token
  });
};

export const handleCallback = async (
  code: string,
  userId: string,
  tenantId: string,
  sessionVersion: number,
  codeVerifier: string
) => {
  const { tokens } = await oauth2Client.getToken({ code, codeVerifier });

  const result = await pool.query(
    `UPDATE users u SET google_access_token = $1,
       google_refresh_token = $2, google_connection_version = u.google_connection_version + 1
     FROM tenants t
     WHERE u.id = $3 AND u.tenant_id = $4 AND u.session_version = $5
       AND t.id = u.tenant_id AND u.is_active = true AND (t.is_active = true OR u.role = $6)
     RETURNING u.id`,
    [tokens.access_token, tokens.refresh_token, userId, tenantId, sessionVersion, ROLES.SUPER_ADMIN]
  );
  if (result.rowCount !== 1) {
    throw new AuthenticationError(
      'Google connection session revoked',
      ERROR_CODES.GOOGLE_OAUTH_INVALID_STATE
    );
  }
};

export const syncAllSessionsToGoogle = (userId: string, tenantId: string) =>
  GoogleSyncService.createJob(tenantId, userId);

export const uploadBackupToDrive = async (
  userId: string,
  folderName: string,
  filePath: string,
  fileName: string
) => {
  const result = await pool.query(
    'SELECT google_access_token, google_refresh_token FROM users WHERE id = $1',
    [userId]
  );

  const user = result.rows[0];
  if (!user || (!user.google_access_token && !user.google_refresh_token)) {
    throw new Error('Google Drive not connected');
  }

  const client = new google.auth.OAuth2(config.google.clientId(), config.google.clientSecret());
  client.setCredentials({
    access_token: user.google_access_token,
    refresh_token: user.google_refresh_token,
  });

  const drive = google.drive({ version: 'v3', auth: client });

  // Find or create folder
  let folderId = null;
  try {
    const res = await drive.files.list({
      q: `mimeType='application/vnd.google-apps.folder' and name='${folderName}' and trashed=false`,
      fields: 'files(id, name)',
      spaces: 'drive',
    });
    if (res.data.files && res.data.files.length > 0) {
      folderId = res.data.files[0].id;
    } else {
      const folderRes = await drive.files.create({
        requestBody: {
          name: folderName,
          mimeType: 'application/vnd.google-apps.folder',
        },
        fields: 'id',
      });
      folderId = folderRes.data.id;
    }
  } catch (err) {
    logger.error(err, 'Error finding/creating folder:');
    throw err;
  }

  // Upload file
  try {
    const fileMetadata = {
      name: fileName,
      parents: folderId ? [folderId] : [],
    };
    const media = {
      mimeType: 'application/zip',
      body: fs.createReadStream(filePath),
    };

    const file = await drive.files.create({
      requestBody: fileMetadata,
      media: media,
      fields: 'id',
    });
    return file.data.id;
  } catch (err) {
    logger.error(err, 'Error uploading file to Drive:');
    throw err;
  }
};
