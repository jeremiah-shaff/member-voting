const nodemailer = require('nodemailer');
const { ConfidentialClientApplication, PublicClientApplication } = require('@azure/msal-node');

// Keys we read frequently
const BASE_SMTP_KEYS = [
  'smtp_url', 'smtp_host', 'smtp_port', 'smtp_secure', 'smtp_user', 'smtp_pass', 'from_email',
  'oauth_enabled', 'oauth_mode', 'oauth_tenant_id', 'oauth_client_id', 'oauth_client_secret', 'oauth_user', 'oauth_scope', 'oauth_authority'
];
const GRAPH_KEYS = [
  'use_graph_email', 'graph_tenant_id', 'graph_client_id', 'graph_client_secret', 'graph_user', 'graph_authority'
];

async function readSettingsMap(pool, keys) {
  const map = {};
  try {
    const res = await pool.query(`SELECT key, value FROM settings WHERE key = ANY($1)`, [keys]);
    for (const row of res.rows) map[row.key] = row.value;
  } catch (e) {
    // ignore; return empty defaults
  }
  return map;
}

function flag(val) {
  return String(val || '').toLowerCase() === 'true';
}

function getAuthority(authorityBase, tenantId) {
  const base = (authorityBase || 'https://login.microsoftonline.com').trim();
  const tenant = (tenantId || 'common').trim();
  return `${base}/${tenant}`;
}

// MSAL cache plugin backed by settings table under a given key
function createDbCachePlugin(pool, settingsKey) {
  return {
    beforeCacheAccess: async (cacheContext) => {
      try {
        const res = await pool.query(`SELECT value FROM settings WHERE key = $1`, [settingsKey]);
        const json = res.rows[0]?.value || '';
        if (json) {
          await cacheContext.tokenCache.deserialize(json);
        }
      } catch (e) {
        // ignore
      }
    },
    afterCacheAccess: async (cacheContext) => {
      if (cacheContext.cacheHasChanged) {
        try {
          const json = await cacheContext.tokenCache.serialize();
          await pool.query(
            `INSERT INTO settings(key, value) VALUES($1, $2)
             ON CONFLICT(key) DO UPDATE SET value = EXCLUDED.value`,
            [settingsKey, json]
          );
        } catch (e) {
          // ignore
        }
      }
    },
  };
}

async function acquireGraphAppToken(pool, settings) {
  const tenantId = (settings.graph_tenant_id || settings.oauth_tenant_id || '').trim();
  const clientId = (settings.graph_client_id || settings.oauth_client_id || '').trim();
  const clientSecret = (settings.graph_client_secret || settings.oauth_client_secret || '').trim();
  const authorityBase = (settings.graph_authority || settings.oauth_authority || 'https://login.microsoftonline.com').trim();
  if (!tenantId || !clientId || !clientSecret) {
    throw new Error('Graph app settings missing (tenantId, clientId, or clientSecret).');
  }
  const cca = new ConfidentialClientApplication({
    auth: {
      clientId,
      clientSecret,
      authority: getAuthority(authorityBase, tenantId),
    },
  });
  const token = await cca.acquireTokenByClientCredential({ scopes: ['https://graph.microsoft.com/.default'] });
  if (!token?.accessToken) throw new Error('Failed to acquire Graph access token.');
  return token.accessToken;
}

async function sendViaGraph(pool, settings, msg) {
  const accessToken = await acquireGraphAppToken(pool, settings);
  const user = (settings.graph_user || settings.oauth_user || '').trim();
  if (!user) throw new Error('Graph user (sender) not configured.');
  const fetch = (...args) => import('node-fetch').then(({ default: f }) => f(...args));
  const url = `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(user)}/sendMail`;
  const body = {
    message: {
      subject: msg.subject || '',
      body: {
        contentType: msg.html ? 'HTML' : 'Text',
        content: msg.html || msg.text || '',
      },
      toRecipients: (Array.isArray(msg.to) ? msg.to : [msg.to]).filter(Boolean).map(t => ({ emailAddress: { address: t } })),
      // Do not set 'from' explicitly; Graph will send as the path user
    },
    saveToSentItems: true,
  };
  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Graph sendMail failed (${resp.status}): ${text}`);
  }
  return { success: true };
}

async function acquireDelegatedSmtpToken(pool, settings) {
  const tenantId = (settings.oauth_tenant_id || '').trim();
  const clientId = (settings.oauth_client_id || '').trim();
  const authorityBase = (settings.oauth_authority || 'https://login.microsoftonline.com').trim();
  if (!tenantId || !clientId) throw new Error('Delegated OAuth settings missing (tenantId or clientId).');
  const cachePlugin = createDbCachePlugin(pool, 'smtp_oauth_cache');
  const pca = new PublicClientApplication({
    auth: { clientId, authority: getAuthority(authorityBase, tenantId) },
    cache: { cachePlugin },
  });
  const scopes = (settings.oauth_scope && settings.oauth_scope.trim())
    ? settings.oauth_scope.trim().split(/[\s,]+/)
    : ['offline_access', 'openid', 'profile', 'email', 'https://outlook.office365.com/SMTP.Send'];

  // Try silent first using cached account; prefer settings.oauth_user
  const cache = pca.getTokenCache();
  const accounts = await cache.getAllAccounts();
  let account = null;
  const preferred = (settings.oauth_user || '').toLowerCase();
  if (preferred) {
    account = accounts.find(a => (a.username || '').toLowerCase() === preferred);
  }
  if (!account && accounts.length > 0) account = accounts[0];
  if (!account) {
    throw new Error('No delegated OAuth account found. Run the device code flow to sign in.');
  }
  const token = await pca.acquireTokenSilent({ account, scopes });
  if (!token?.accessToken) throw new Error('Failed to acquire delegated access token silently.');
  return { accessToken: token.accessToken, username: account.username };
}

async function createSmtpTransportFromSettings(settings, delegatedToken) {
  // Priority: smtp_url -> host config
  if (settings.smtp_url && settings.smtp_url.trim()) {
    return nodemailer.createTransport(settings.smtp_url.trim());
  }
  const host = (settings.smtp_host || '').trim();
  if (!host) return nodemailer.createTransport({ jsonTransport: true });
  const port = Number(settings.smtp_port || '587');
  const secure = flag(settings.smtp_secure);
  const base = {
    host,
    port: isNaN(port) ? 587 : port,
    secure,
  };
  if (delegatedToken && settings.oauth_user) {
    return nodemailer.createTransport({
      ...base,
      requireTLS: !secure,
      auth: {
        type: 'OAuth2',
        user: settings.oauth_user,
        accessToken: delegatedToken,
      },
    });
  }
  const user = (settings.smtp_user || '').trim();
  const pass = (settings.smtp_pass || '').trim();
  return nodemailer.createTransport({
    ...base,
    auth: user ? { user, pass } : undefined,
  });
}

async function sendViaSmtp(pool, settings, msg) {
  let delegated = false;
  let accessToken = null;
  if (flag(settings.oauth_enabled)) {
    const mode = (settings.oauth_mode || '').toLowerCase();
    const clientSecretPresent = !!(settings.oauth_client_secret && settings.oauth_client_secret.trim());
    // Prefer delegated if mode says so, or when no client secret is present.
    if (mode === 'delegated' || !clientSecretPresent) {
      const token = await acquireDelegatedSmtpToken(pool, settings);
      accessToken = token.accessToken;
      delegated = true;
    } else {
      // Note: App-only tokens do NOT work with SMTP AUTH XOAUTH2. We warn and fall back.
      throw new Error('SMTP with app-only OAuth is not supported by Exchange Online. Enable delegated OAuth (device code) or use Microsoft Graph.');
    }
  }
  const transporter = await createSmtpTransportFromSettings(settings, delegated ? accessToken : null);
  const info = await transporter.sendMail({
    from: msg.from,
    to: msg.to,
    subject: msg.subject,
    text: msg.text,
    html: msg.html,
  });
  return { success: true, messageId: info?.messageId };
}

async function sendEmail(pool, message) {
  const settings = {
    ...(await readSettingsMap(pool, [...BASE_SMTP_KEYS, ...GRAPH_KEYS])),
  };
  const useGraph = flag(settings.use_graph_email);
  // Determine from email default
  const fromEmail = settings.from_email || process.env.FROM_EMAIL || 'no-reply@member-voting';
  const msg = { ...message, from: message.from || fromEmail };
  if (useGraph) return sendViaGraph(pool, settings, msg);
  return sendViaSmtp(pool, settings, msg);
}

// Start Device Code flow (delegated SMTP). Returns device code details immediately and completes in background.
async function startDelegatedDeviceCodeFlow(pool) {
  const settings = await readSettingsMap(pool, BASE_SMTP_KEYS);
  const tenantId = (settings.oauth_tenant_id || '').trim();
  const clientId = (settings.oauth_client_id || '').trim();
  const authorityBase = (settings.oauth_authority || 'https://login.microsoftonline.com').trim();
  if (!tenantId || !clientId) throw new Error('Missing OAuth settings (tenant id, client id).');
  const cachePlugin = createDbCachePlugin(pool, 'smtp_oauth_cache');
  const pca = new PublicClientApplication({
    auth: { clientId, authority: getAuthority(authorityBase, tenantId) },
    cache: { cachePlugin },
  });
  const scopes = (settings.oauth_scope && settings.oauth_scope.trim())
    ? settings.oauth_scope.trim().split(/[\s,]+/)
    : ['offline_access', 'openid', 'profile', 'email', 'https://outlook.office365.com/SMTP.Send'];

  let deviceInfo = null;
  // Kick off flow and return device code right away
  const promise = pca.acquireTokenByDeviceCode({
    scopes,
    deviceCodeCallback: (info) => { deviceInfo = info; },
  })
    .then(async (resp) => {
      // Persist preferred oauth_user
      const username = resp?.account?.username || '';
      if (username) {
        await pool.query(
          `INSERT INTO settings(key, value) VALUES('oauth_user', $1)
           ON CONFLICT(key) DO UPDATE SET value = EXCLUDED.value`,
          [username]
        );
      }
      return resp;
    })
    .catch((err) => {
      // Log; nothing else
      console.error('Device code flow failed:', err?.message || err);
    });
  // Store device code details for UI convenience
  if (deviceInfo) {
    try {
      const payload = JSON.stringify({
        userCode: deviceInfo.userCode,
        verificationUri: deviceInfo.verificationUri || deviceInfo.verificationUriComplete,
        message: deviceInfo.message,
        expiresOn: deviceInfo.expiresOn,
      });
      await pool.query(
        `INSERT INTO settings(key, value) VALUES('smtp_device_code_info', $1)
         ON CONFLICT(key) DO UPDATE SET value = EXCLUDED.value`,
        [payload]
      );
    } catch {}
  }
  return { started: true, device: deviceInfo || null };
}

module.exports = {
  sendEmail,
  startDelegatedDeviceCodeFlow,
  // Helper to check delegated token availability without exposing token
  tryDelegatedSmtpSilent: async (pool) => {
    const settings = await readSettingsMap(pool, BASE_SMTP_KEYS);
    try {
      const { accessToken, username } = await acquireDelegatedSmtpToken(pool, settings);
      return { success: !!accessToken, username: username || settings.oauth_user || '' };
    } catch (e) {
      return { success: false, error: e?.message };
    }
  },
  // Helper to verify Graph app-only auth
  verifyGraphAuth: async (pool) => {
    const settings = await readSettingsMap(pool, [...BASE_SMTP_KEYS, ...GRAPH_KEYS]);
    try {
      await acquireGraphAppToken(pool, settings);
      return { success: true };
    } catch (e) {
      return { success: false, error: e?.message };
    }
  },
};
