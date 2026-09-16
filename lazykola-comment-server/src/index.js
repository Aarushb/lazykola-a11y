import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { basicAuth } from 'hono/basic-auth';
import { adminHtml } from './admin_html.js';

const app = new Hono();

// Spam mitigation tuning
const RATE_LIMIT_MAX_SUBMISSIONS = 5;
const RATE_LIMIT_WINDOW_MINUTES = 10;

// Anti-abuse-only safety net for reply nesting (not a UX limit -- the client
// collapses deep threads visually well before this is ever reached).
const MAX_REPLY_DEPTH_SANITY = 20;

// Shown in place of a removed comment's real content so replies underneath it stay in context
const REMOVED_PLACEHOLDER = '[comment removed]';

// Enable CORS for all origins since it's a public comments API
// We'll configure CORS options specifically to allow POST and GET
app.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  exposeHeaders: ['Content-Length'],
  maxAge: 600,
}));

// Utility function to compute SHA-256 for Gravatar
async function getGravatarHash(email) {
  if (!email) return '';
  const emailClean = email.trim().toLowerCase();
  const msgUint8 = new TextEncoder().encode(emailClean);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// ----------------------------------------------------
// Public Endpoints
// ----------------------------------------------------

// Fetch approved comments for a specific post URL
app.get('/comments', async (c) => {
  const postUrl = c.req.query('post_url');
  if (!postUrl) {
    return c.json({ error: 'Missing post_url parameter' }, 400);
  }

  try {
    // Include deleted/spam rows too (redacted below) so their approved replies
    // don't get orphaned to top-level once the parent is no longer visible.
    const { results } = await c.env.DB.prepare(
      'SELECT id, author_name, author_website, author_email, content, parent_id, status, created_at FROM comments WHERE post_url = ? AND status IN ("approved", "deleted", "spam") ORDER BY created_at ASC'
    )
    .bind(postUrlClean(postUrl))
    .all();

    // Map through results to include gravatar_hash and obscure raw emails for client privacy
    const safeComments = await Promise.all(results.map(async (row) => {
      const removed = row.status === 'deleted' || row.status === 'spam';
      const hash = removed ? '' : await getGravatarHash(row.author_email);
      return {
        id: row.id,
        author_name: removed ? REMOVED_PLACEHOLDER : row.author_name,
        author_website: removed ? '' : (row.author_website || ''),
        gravatar_hash: hash,
        content: removed ? REMOVED_PLACEHOLDER : row.content,
        parent_id: row.parent_id,
        created_at: row.created_at,
        removed,
      };
    }));

    return c.json(safeComments);
  } catch (err) {
    return c.json({ error: 'Database error', details: err.message }, 500);
  }
});

// Fetch bulk comment counts for multiple post URLs
app.get('/comments/count', async (c) => {
  const urlsQuery = c.req.query('urls');
  if (!urlsQuery) {
    return c.json({ error: 'Missing urls parameter' }, 400);
  }

  const rawUrls = urlsQuery.split(',').map(u => u.trim()).filter(Boolean);
  if (rawUrls.length === 0) {
    return c.json({});
  }
  // Map cleaned URL -> original, so results can be keyed back to what the caller sent
  const cleanedToOriginal = new Map(rawUrls.map(u => [postUrlClean(u), u]));
  const urls = [...cleanedToOriginal.keys()];

  try {
    // Dynamically build placeholders for SQL IN clause
    const placeholders = urls.map(() => '?').join(',');
    const query = `SELECT post_url, COUNT(*) as count FROM comments WHERE status = "approved" AND post_url IN (${placeholders}) GROUP BY post_url`;

    const statement = c.env.DB.prepare(query);
    const { results } = await statement.bind(...urls).all();

    // Create a mapping of { original_post_url: count }
    const counts = {};
    rawUrls.forEach(u => counts[u] = 0); // initialize all to 0
    results.forEach(row => {
      const original = cleanedToOriginal.get(row.post_url);
      if (original !== undefined) counts[original] = row.count;
    });

    return c.json(counts);
  } catch (err) {
    return c.json({ error: 'Database error', details: err.message }, 500);
  }
});

// Add a new comment
app.post('/comments', async (c) => {
  try {
    const body = await c.req.json();
    const { post_url, author_name, author_email, author_website, content, parent_id, turnstile_token, website_url } = body;

    // 1. Honeypot check (website_url is a hidden spam field in the client form)
    if (website_url) {
      // Silently accept spam comments to make bots think they succeeded
      return c.json({ success: true, status: 'pending' }, 201);
    }

    // 2. Input Validation
    if (!post_url || !author_name || !content) {
      return c.json({ error: 'Missing required fields' }, 400);
    }

    if (author_name.length > 100 || content.length > 5000) {
      return c.json({ error: 'Input exceeds maximum length' }, 400);
    }

    // 3. Rate limiting (per-IP submission cap)
    const clientIp = c.req.header('CF-Connecting-IP') || 'unknown';
    const { results: rateRows } = await c.env.DB.prepare(
      `SELECT COUNT(*) as count FROM rate_limits WHERE ip = ? AND created_at > datetime('now', '-${RATE_LIMIT_WINDOW_MINUTES} minutes')`
    ).bind(clientIp).all();

    if (rateRows[0].count >= RATE_LIMIT_MAX_SUBMISSIONS) {
      return c.json({ error: 'Too many comments submitted recently. Please try again later.' }, 429);
    }

    // 4. Turnstile spam protection check (if secret key is set)
    if (c.env.TURNSTILE_SECRET_KEY) {
      if (!turnstile_token) {
        return c.json({ error: 'Missing security token' }, 400);
      }
      
      const verifyRes = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `secret=${encodeURIComponent(c.env.TURNSTILE_SECRET_KEY)}&response=${encodeURIComponent(turnstile_token)}`
      });

      const outcome = await verifyRes.json();
      if (!outcome.success) {
        return c.json({ error: 'Spam verification failed' }, 400);
      }
    }

    // 5. Set comment status based on config
    const status = c.env.AUTO_APPROVE === 'true' ? 'approved' : 'pending';

    // 6. Resolve reply nesting depth (flattens replies beyond MAX_REPLY_DEPTH onto the deepest allowed ancestor)
    const resolvedParentId = await resolveReplyParent(c.env.DB, parent_id || null);

    // 7. Insert comment
    const emailStr = author_email ? author_email.trim() : '';
    const websiteStr = author_website ? author_website.trim() : '';

    const insertRes = await c.env.DB.prepare(
      'INSERT INTO comments (post_url, author_name, author_email, author_website, content, parent_id, status) VALUES (?, ?, ?, ?, ?, ?, ?)'
    )
    .bind(postUrlClean(post_url), author_name.trim(), emailStr, websiteStr, content.trim(), resolvedParentId, status)
    .run();

    // 8. Record this submission for rate limiting, then send Discord notification if needed
    await c.env.DB.prepare('INSERT INTO rate_limits (ip) VALUES (?)').bind(clientIp).run();

    if (c.env.DISCORD_WEBHOOK_URL && status === 'pending') {
      c.executionCtx.waitUntil(
        sendDiscordAlert(c.env.DISCORD_WEBHOOK_URL, {
          author_name,
          author_email: emailStr,
          author_website: websiteStr,
          content,
          post_url
        })
      );
    }

    return c.json({ success: true, status }, 201);

  } catch (err) {
    return c.json({ error: 'Server error', details: err.message }, 500);
  }
});

// Resolves the actual parent_id a new reply should attach to. Nesting is left
// uncapped for the UI (the client collapses deep threads instead of flattening
// them), but MAX_REPLY_DEPTH_SANITY still bounds it server-side against abuse.
async function resolveReplyParent(db, requestedParentId) {
  if (!requestedParentId) return null;

  const { results } = await db.prepare(`
    WITH RECURSIVE chain(id, parent_id, depth) AS (
      SELECT id, parent_id, 1 FROM comments WHERE id = ?
      UNION ALL
      SELECT p.id, p.parent_id, chain.depth + 1
      FROM comments p
      INNER JOIN chain ON p.id = chain.parent_id
    )
    SELECT id, depth FROM chain ORDER BY depth ASC
  `).bind(requestedParentId).all();

  if (results.length === 0) return null; // requested parent doesn't exist; fall back to top-level

  const targetDepth = results[results.length - 1].depth; // real depth of the requested parent, root = 1
  if (targetDepth < MAX_REPLY_DEPTH_SANITY) {
    return requestedParentId; // normal nesting, still within the sanity cap
  }

  // Already at (or somehow beyond) the sanity cap: attach as a sibling under the deepest allowed ancestor instead
  const capAncestor = results.find(r => r.depth === MAX_REPLY_DEPTH_SANITY - 1);
  return capAncestor ? capAncestor.id : null;
}

// Helper to normalize URLs (strip query params, trailing slashes, etc.)
function postUrlClean(url) {
  try {
    const u = new URL(url);
    // Keep pathname and host, drop queries and hashes
    let cleaned = u.origin + u.pathname;
    if (cleaned.endsWith('/')) {
      cleaned = cleaned.slice(0, -1);
    }
    return cleaned;
  } catch (e) {
    // If not a full URL, return trimmed string
    let cleaned = url.trim();
    if (cleaned.endsWith('/')) {
      cleaned = cleaned.slice(0, -1);
    }
    return cleaned;
  }
}

// Discord integration payload sender
async function sendDiscordAlert(webhookUrl, data) {
  const contentSnippet = data.content.length > 250 ? data.content.slice(0, 247) + '...' : data.content;
  
  const payload = {
    embeds: [{
      title: '💬 New Comment Pending Moderation',
      url: data.post_url,
      color: 5192415, // Indigo accent
      fields: [
        { name: 'Author', value: data.author_name, inline: true },
        { name: 'Email', value: data.author_email || 'Not provided', inline: true },
        { name: 'Website', value: data.author_website || 'None', inline: true },
        { name: 'Comment', value: `\`\`\`\n${contentSnippet}\n\`\`\`` }
      ],
      timestamp: new Date().toISOString()
    }]
  };

  try {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  } catch (e) {
    console.error('Failed to send Discord webhook alert:', e);
  }
}

// ----------------------------------------------------
// Administration Endpoints (Password Protected)
// ----------------------------------------------------

// Basic authentication middleware configuration
const getAdminPassword = (c) => c.env.ADMIN_PASSWORD || 'admin';

const authMiddleware = async (c, next) => {
  const auth = basicAuth({
    username: 'admin',
    password: getAdminPassword(c),
  });
  return auth(c, next);
};

// Serve Dashboard HTML
app.get('/admin', authMiddleware, (c) => {
  return c.html(adminHtml);
});

// Fetch all comments (moderation dashboard view)
app.get('/admin/api/comments', authMiddleware, async (c) => {
  try {
    const { results } = await c.env.DB.prepare(
      'SELECT id, post_url, author_name, author_email, author_website, content, parent_id, status, created_at FROM comments ORDER BY created_at DESC'
    )
    .all();

    // Map through comments and append SHA-256 Gravatar hashes for the avatar display
    const formatted = await Promise.all(results.map(async (row) => {
      const hash = await getGravatarHash(row.author_email);
      return {
        ...row,
        gravatar_hash: hash,
      };
    }));

    return c.json(formatted);
  } catch (err) {
    return c.json({ error: 'Database error', details: err.message }, 500);
  }
});

// Moderate comment status (approve, spam, delete)
app.post('/admin/api/moderate', authMiddleware, async (c) => {
  try {
    const { id, status } = await c.req.json();

    if (!id || !status) {
      return c.json({ error: 'Missing id or status' }, 400);
    }

    if (status === 'deleted') {
      // Default is to preserve replies: soft-delete (tombstone) instead of a hard DELETE,
      // which would otherwise cascade-remove every reply underneath via the FK constraint.
      const preserveReplies = c.env.PRESERVE_REPLIES_ON_DELETE !== 'false';
      if (preserveReplies) {
        await c.env.DB.prepare("UPDATE comments SET status = 'deleted' WHERE id = ?").bind(id).run();
      } else {
        await c.env.DB.prepare('DELETE FROM comments WHERE id = ?').bind(id).run();
      }
      return c.json({ success: true, action: 'deleted' });
    }

    if (status === 'purged') {
      // Explicit permanent deletion of an already soft-deleted comment; always a hard DELETE.
      await c.env.DB.prepare('DELETE FROM comments WHERE id = ?').bind(id).run();
      return c.json({ success: true, action: 'purged' });
    }

    if (status === 'approved' || status === 'spam') {
      await c.env.DB.prepare('UPDATE comments SET status = ? WHERE id = ?')
        .bind(status, id)
        .run();
      return c.json({ success: true, action: status });
    }

    return c.json({ error: 'Invalid action status' }, 400);
  } catch (err) {
    return c.json({ error: 'Database error', details: err.message }, 500);
  }
});

export default app;
