#!/usr/bin/env node
/**
 * Debug script: Calls the external Device API directly and logs RAW response.
 * Use this to debug device API issues (e.g. "No device found", status "error").
 *
 * Uses credentials from backend/.env
 * Run from backend dir: node src/scripts/debug-device-api.js [device_id]
 *
 * Example: node src/scripts/debug-device-api.js 861352062995520
 *
 * NOTE: Device must be registered in the environment pointed to by EXTERNAL_API_BASE_URL.
 * If you see "No device found", the device exists in LifeStation DB but not in that API env.
 */

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const axios = require('axios');

const DEVICE_ID = process.argv[2] || '861352062995520';
const ID_TYPE = 'imei';

function normalizeBaseURL(baseUrl) {
  if (!baseUrl) throw new Error('EXTERNAL_API_BASE_URL is not set');
  baseUrl = baseUrl.replace(/^https?:\/\//, '');
  const hostname = baseUrl.split('/')[0];
  let normalized = hostname.replace(/\/$/, '');
  if (!normalized.includes('.alertmessage.com')) {
    normalized = `${normalized}.alertmessage.com`;
  }
  return `https://${normalized}`;
}

async function getToken() {
  const baseURL = normalizeBaseURL(process.env.EXTERNAL_API_BASE_URL);
  const username = process.env.EXTERNAL_API_USERNAME;
  const password = process.env.EXTERNAL_API_PASSWORD;
  const clientId = 'brighton-api';

  if (!username || !password) {
    throw new Error('EXTERNAL_API_USERNAME and EXTERNAL_API_PASSWORD must be set in .env');
  }

  const formData = new URLSearchParams();
  formData.append('grant_type', 'password');
  formData.append('username', username);
  formData.append('password', password);
  formData.append('client_id', clientId);

  const res = await axios.post(`${baseURL}/token`, formData.toString(), {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    timeout: 15000,
  });
  return res.data.access_token;
}

async function main() {
  console.log('\n=== Device API Debug Script ===\n');
  console.log('Config:');
  console.log('  EXTERNAL_API_BASE_URL:', process.env.EXTERNAL_API_BASE_URL);
  console.log(
    '  EXTERNAL_API_USERNAME:',
    process.env.EXTERNAL_API_USERNAME ? '***set***' : 'NOT SET',
  );
  console.log('  Device ID:', DEVICE_ID);
  console.log('  ID Type:', ID_TYPE);
  console.log('');

  try {
    const baseURL = normalizeBaseURL(process.env.EXTERNAL_API_BASE_URL);
    console.log('Resolved base URL:', baseURL);

    console.log('\n1. Getting OAuth token...');
    const token = await getToken();
    console.log('   Token obtained successfully');

    const authHeader = { Authorization: `Bearer ${token}` };

    console.log('\n2. GET /device/imei/' + DEVICE_ID + ' (Device Read)');
    const deviceRes = await axios.get(`${baseURL}/device/${ID_TYPE}/${DEVICE_ID}`, {
      headers: authHeader,
      timeout: 15000,
    });
    console.log('\n--- RAW Device Read Response ---');
    console.log(JSON.stringify(deviceRes.data, null, 2));
    console.log('\n--- Status field ---');
    console.log('  Device_Status:', deviceRes.data.Device_Status);
    console.log('  status:', deviceRes.data.status);
    console.log('  (Used by normalizeDevice: Device_Status || status || "unknown")');

    console.log('\n3. GET /device/imei/' + DEVICE_ID + '/recent (Device Recent)');
    const recentRes = await axios.get(`${baseURL}/device/${ID_TYPE}/${DEVICE_ID}/recent`, {
      headers: authHeader,
      timeout: 15000,
    });
    console.log('\n--- RAW Device Recent Response ---');
    console.log(JSON.stringify(recentRes.data, null, 2));
    console.log('\n--- Status-related fields ---');
    console.log('  Device_Status:', recentRes.data.Device_Status);
    console.log('  status:', recentRes.data.status);
    console.log('  signal:', recentRes.data.signal ? '(present)' : '(absent)');

    console.log('\n=== Debug complete ===\n');
  } catch (err) {
    console.error('\n!!! Error !!!');
    if (err.response) {
      console.error('Status:', err.response.status);
      console.error('Response:', JSON.stringify(err.response.data, null, 2));
    } else {
      console.error(err.message);
    }
    process.exit(1);
  }
}

main();
