import { createClass } from './src/controllers/class.controller';
import { Request, Response } from 'express';
import pool from './src/db';
require('dotenv').config({ path: '.env' });

async function run() {
  try {
    const branchRes = await pool.query('SELECT id FROM branches LIMIT 1');
    const branch_id = branchRes.rows[0].id;

    const req = {
      tenantId: '00000000-0000-0000-0000-000000000002',
      body: {
        name: 'Test Class ' + Date.now(),
        max_capacity: 30,
        branch_id: branch_id,
        teacher_id: null,
        subject_id: "",
        start_date: null,
        end_date: null,
        status: "active"
      }
    } as any;

    const res = {
      status: (code: number) => {
        console.log('Status:', code);
        return res;
      },
      json: (data: any) => {
        console.log('JSON:', data);
        return res;
      }
    } as any;

    const next = (err: any) => {
      console.error('NEXT CALLED WITH ERROR:', err);
    };

    await createClass(req, res, next);
  } catch (err) {
    console.error('UNCAUGHT ERROR:', err);
  } finally {
    pool.end();
  }
}

run();
