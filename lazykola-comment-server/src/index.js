import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { basicAuth } from 'hono/basic-auth';
import { adminHtml } from './admin_html.js';

const app = new Hono();

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
    const { results } = await c.env.DB.prepare(
      'SELECT id, author_name, author_website, author_email, content, parent_id, created_at FROM comments WHERE post_url = ? AND status = "approved" ORDER BY created_at ASC'
    )
    .bind(postUrl)
    .all();

    // Map through results to include gravatar_hash and obscure raw emails for client privacy
    const safeComments = await Promise.all(results.map(async (row) => {
      const hash = await getGravatarHash(row.author_email);
      return {
        id: row.id,
        author_name: row.author_name,
        author_website: row.author_website || '',
        gravatar_hash: hash,
        content: row.content,
        parent_id: row.parent_id,
        created_at: row.created_at,
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

  const urls = urlsQuery.split(',').map(u => u.trim()).filter(Boolean);
  if (urls.length === 0) {
    return c.json({});
  }

  try {
    // Dynamically build placeholders for SQL IN clause
    const placeholders = urls.map(() => '?').join(',');
    const query = `SELECT post_url, COUNT(*) as count FROM comments WHERE status = "approved" AND post_url IN (${placeholders}) GROUP BY post_url`;
    
    const statement = c.env.DB.prepare(query);
    const { results } = await statement.bind(...urls).all();

    // Create a mapping of { post_url: count }
    const counts = {};
    urls.forEach(u => counts[u] = 0); // initialize all to 0
    results.forEach(row => {
      counts[row.post_url] = row.count;
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

    // 3. Turnstile spam protection check (if secret key is set)
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

    // 4. Set comment status based on config
    const status = c.env.AUTO_APPROVE === 'true' ? 'approved' : 'pending';

    // 5. Insert comment
    const emailStr = author_email ? author_email.trim() : '';
    const websiteStr = author_website ? author_website.trim() : '';
    
    const insertRes = await c.env.DB.prepare(
      'INSERT INTO comments (post_url, author_name, author_email, author_website, content, parent_id, status) VALUES (?, ?, ?, ?, ?, ?, ?)'
    )
    .bind(postUrlClean(post_url), author_name.trim(), emailStr, websiteStr, content.trim(), parent_id || null, status)
    .run();

    // 6. Send Discord Notification if Webhook is set and it needs moderation
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
      await c.env.DB.prepare('DELETE FROM comments WHERE id = ?').bind(id).run();
      return c.json({ success: true, action: 'deleted' });
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
