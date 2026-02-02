/**
 * One-off script: check that a user exists and has device(s) linked.
 * Usage: cd backend && node src/scripts/check-user-device.js
 * Loads .env.dev from backend/ so DB creds are used from there.
 * Uses raw pg with a short timeout so it fails fast instead of hanging.
 */
const path = require('path');
const { Client } = require('pg');

// Load .env.dev before connecting
require('dotenv').config({ path: path.join(__dirname, '../../.env.dev') });

const EMAIL = 'qa-test-senior-1769790691@test.lifestation.com';
const IMEI = '861352063777182';
const CONNECT_TIMEOUT_MS = 10000; // 10s - fail fast if DB unreachable
const QUERY_TIMEOUT_MS = 15000; // 15s per query

async function run() {
  const client = new Client({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT, 10) || 5432,
    database: process.env.DB_NAME,
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    connectionTimeoutMillis: CONNECT_TIMEOUT_MS,
  });

  try {
    console.log('DB host:', process.env.DB_HOST);
    console.log('DB name:', process.env.DB_NAME);
    console.log('Connecting (timeout %ds)...', CONNECT_TIMEOUT_MS / 1000);

    await client.connect();
    await client.query('SET statement_timeout = $1', [String(QUERY_TIMEOUT_MS)]);
    console.log('Connected (query timeout %ds).\n', QUERY_TIMEOUT_MS / 1000);

    // 1) User
    console.log('1) User:', EMAIL);
    const userRes = await client.query(
      'SELECT id, email, name, user_type FROM users WHERE email = $1',
      [EMAIL],
    );
    if (userRes.rows.length === 0) {
      console.log('   USER NOT FOUND.');
      return;
    }
    const user = userRes.rows[0];
    console.log('   Found:', user);

    // 2) User's device mappings
    console.log('\n2) User–device mappings for this user:');
    const mapRes = await client.query(
      `SELECT udm.id, udm.user_id, udm.device_id, udm.external_device_id, udm.id_type,
              d.device_id AS d_device_id, d.id_type AS d_id_type, d.name, d.status
       FROM user_device_mapping udm
       JOIN devices d ON d.id = udm.device_id
       WHERE udm.user_id = $1`,
      [user.id],
    );
    console.log('   Count:', mapRes.rows.length);
    mapRes.rows.forEach((r, i) => {
      console.log(
        '   [' +
          (i + 1) +
          '] device_id=' +
          r.d_device_id +
          ' id_type=' +
          r.d_id_type +
          ' (devices.id=' +
          r.device_id +
          ')',
      );
    });

    // 3) Device by IMEI
    console.log('\n3) Device IMEI', IMEI, 'in devices table:');
    const devRes = await client.query(
      'SELECT id, device_id, id_type, name, status FROM devices WHERE device_id = $1 AND id_type = $2',
      [IMEI, 'imei'],
    );
    if (devRes.rows.length === 0) {
      console.log('   NOT FOUND.');
    } else {
      console.log('   Found:', devRes.rows[0]);
    }

    // 4) Who is linked to that device
    if (devRes.rows.length > 0) {
      const deviceId = devRes.rows[0].id;
      console.log('\n4) User(s) linked to device id', deviceId, '(user_device_mapping):');
      const whoRes = await client.query(
        `SELECT udm.user_id, u.email, u.user_type
         FROM user_device_mapping udm
         JOIN users u ON u.id = udm.user_id
         WHERE udm.device_id = $1`,
        [deviceId],
      );
      console.log('   Count:', whoRes.rows.length);
      whoRes.rows.forEach(r =>
        console.log('   user_id=' + r.user_id + ' email=' + r.email + ' user_type=' + r.user_type),
      );
    }
  } catch (err) {
    console.error('\nError:', err.message);
    if (err.code === 'ETIMEDOUT' || err.code === 'ECONNREFUSED') {
      console.error(
        'DB unreachable (timeout or refused). Check VPN, firewall, or run from a machine that can reach',
        process.env.DB_HOST,
      );
    }
    process.exit(1);
  } finally {
    await client.end();
  }
}

run();
