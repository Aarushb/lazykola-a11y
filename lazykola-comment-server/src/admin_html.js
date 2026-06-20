export const adminHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>lazykola - Comments Administration</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&family=Plus+Jakarta+Sans:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg-primary: #0b0f19;
      --bg-secondary: #161f30;
      --bg-card: rgba(22, 31, 48, 0.7);
      --accent: #4f46e5;
      --accent-hover: #4338ca;
      --text-primary: #f3f4f6;
      --text-secondary: #9ca3af;
      --border: rgba(255, 255, 255, 0.08);
      
      --color-success: #10b981;
      --color-danger: #ef4444;
      --color-warning: #f59e0b;
      
      --font-title: 'Outfit', sans-serif;
      --font-body: 'Plus Jakarta Sans', sans-serif;
    }

    [data-theme="light"] {
      --bg-primary: #f8fafc;
      --bg-secondary: #ffffff;
      --bg-card: rgba(255, 255, 255, 0.9);
      --accent: #4f46e5;
      --accent-hover: #4338ca;
      --text-primary: #0f172a;
      --text-secondary: #64748b;
      --border: rgba(0, 0, 0, 0.08);
      
      --color-success: #10b981;
      --color-danger: #ef4444;
      --color-warning: #d97706;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: var(--font-body);
      background-color: var(--bg-primary);
      color: var(--text-primary);
      transition: background-color 0.3s ease, color 0.3s ease;
      line-height: 1.6;
      padding: 2rem 1rem;
    }

    .container {
      max-width: 1000px;
      margin: 0 auto;
    }

    header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 2rem;
      border-bottom: 1px solid var(--border);
      padding-bottom: 1.5rem;
    }

    h1 {
      font-family: var(--font-title);
      font-weight: 700;
      font-size: 2rem;
      background: linear-gradient(135deg, var(--text-primary) 30%, var(--accent));
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }

    .theme-toggle {
      background: none;
      border: 1px solid var(--border);
      color: var(--text-primary);
      padding: 0.5rem 1rem;
      border-radius: 9999px;
      cursor: pointer;
      font-size: 0.9rem;
      font-weight: 500;
      transition: all 0.2s ease;
    }

    .theme-toggle:hover {
      background-color: var(--bg-secondary);
      border-color: var(--accent);
    }

    /* Tabs */
    .tabs {
      display: flex;
      gap: 0.5rem;
      margin-bottom: 2rem;
      background: var(--bg-secondary);
      padding: 0.4rem;
      border-radius: 12px;
      border: 1px solid var(--border);
      max-width: fit-content;
    }

    .tab-btn {
      background: none;
      border: none;
      color: var(--text-secondary);
      padding: 0.6rem 1.5rem;
      border-radius: 8px;
      cursor: pointer;
      font-family: var(--font-title);
      font-weight: 600;
      font-size: 0.95rem;
      transition: all 0.2s ease;
    }

    .tab-btn:hover {
      color: var(--text-primary);
    }

    .tab-btn.active {
      background-color: var(--accent);
      color: white;
    }

    .tab-btn span {
      display: inline-block;
      margin-left: 0.4rem;
      font-size: 0.8rem;
      background: rgba(0, 0, 0, 0.2);
      padding: 0.1rem 0.5rem;
      border-radius: 9999px;
    }

    /* Comment Cards */
    .comments-list {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }

    .comment-card {
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: 16px;
      padding: 1.5rem;
      backdrop-filter: blur(12px);
      transition: transform 0.2s ease, opacity 0.3s ease, border-color 0.2s ease;
      position: relative;
    }

    .comment-card:hover {
      border-color: rgba(79, 70, 229, 0.4);
    }

    .comment-card.removing {
      opacity: 0;
      transform: scale(0.95);
    }

    .comment-header {
      display: flex;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 1rem;
      margin-bottom: 1rem;
      border-bottom: 1px solid var(--border);
      padding-bottom: 0.75rem;
    }

    .author-info {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .avatar {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: var(--bg-secondary);
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: bold;
      border: 1px solid var(--border);
    }

    .author-name {
      font-weight: 600;
      font-family: var(--font-title);
      color: var(--text-primary);
    }

    .author-meta {
      font-size: 0.85rem;
      color: var(--text-secondary);
    }

    .author-meta a {
      color: var(--accent);
      text-decoration: none;
    }

    .author-meta a:hover {
      text-decoration: underline;
    }

    .post-link {
      font-size: 0.85rem;
      color: var(--accent);
      text-decoration: none;
      font-weight: 500;
    }

    .post-link:hover {
      text-decoration: underline;
    }

    .comment-body {
      font-size: 0.95rem;
      color: var(--text-primary);
      white-space: pre-wrap;
      margin-bottom: 1.5rem;
    }

    .comment-actions {
      display: flex;
      gap: 0.75rem;
      flex-wrap: wrap;
    }

    .btn {
      padding: 0.5rem 1.2rem;
      border-radius: 8px;
      font-family: var(--font-title);
      font-weight: 600;
      font-size: 0.85rem;
      cursor: pointer;
      border: none;
      transition: all 0.2s ease;
      display: flex;
      align-items: center;
      gap: 0.4rem;
    }

    .btn-approve {
      background-color: var(--color-success);
      color: white;
    }

    .btn-approve:hover {
      background-color: #059669;
    }

    .btn-spam {
      background-color: var(--color-warning);
      color: white;
    }

    .btn-spam:hover {
      background-color: #d97706;
    }

    .btn-delete {
      background-color: var(--color-danger);
      color: white;
    }

    .btn-delete:hover {
      background-color: #dc2626;
    }

    .btn-reply {
      background-color: var(--bg-secondary);
      border: 1px solid var(--border);
      color: var(--text-primary);
    }

    .btn-reply:hover {
      background-color: var(--accent);
      color: white;
      border-color: var(--accent);
    }

    /* Reply Form */
    .reply-form {
      margin-top: 1rem;
      padding-top: 1rem;
      border-top: 1px dashed var(--border);
      display: none;
    }

    .reply-form.active {
      display: block;
      animation: slideDown 0.2s ease-out;
    }

    .reply-form textarea {
      width: 100%;
      min-height: 100px;
      background: var(--bg-secondary);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 0.75rem;
      color: var(--text-primary);
      font-family: inherit;
      margin-bottom: 0.75rem;
      resize: vertical;
    }

    .reply-form textarea:focus {
      outline: none;
      border-color: var(--accent);
    }

    .reply-actions {
      display: flex;
      gap: 0.5rem;
    }

    .empty-state {
      text-align: center;
      padding: 4rem 2rem;
      background: var(--bg-card);
      border: 1px dashed var(--border);
      border-radius: 16px;
      color: var(--text-secondary);
    }

    .empty-state h3 {
      font-family: var(--font-title);
      color: var(--text-primary);
      margin-bottom: 0.5rem;
    }

    /* Status Banner */
    .status-toast {
      position: fixed;
      bottom: 2rem;
      right: 2rem;
      background: var(--accent);
      color: white;
      padding: 0.75rem 1.5rem;
      border-radius: 8px;
      box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.3);
      transform: translateY(150%);
      transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
      z-index: 100;
    }

    .status-toast.visible {
      transform: translateY(0);
    }

    @keyframes slideDown {
      from { opacity: 0; transform: translateY(-5px); }
      to { opacity: 1; transform: translateY(0); }
    }

    @media (max-width: 640px) {
      .comment-header {
        flex-direction: column;
        align-items: flex-start;
      }
      .comment-actions {
        width: 100%;
      }
      .btn {
        flex: 1;
        justify-content: center;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>lazykola Comments</h1>
      <button class="theme-toggle" id="themeToggle" aria-label="Toggle light/dark theme">Theme</button>
    </header>

    <div class="tabs" role="tablist">
      <button class="tab-btn active" id="tab-pending" role="tab" aria-selected="true" onclick="switchTab('pending')">Pending <span id="count-pending">0</span></button>
      <button class="tab-btn" id="tab-approved" role="tab" aria-selected="false" onclick="switchTab('approved')">Approved <span id="count-approved">0</span></button>
      <button class="tab-btn" id="tab-spam" role="tab" aria-selected="false" onclick="switchTab('spam')">Spam <span id="count-spam">0</span></button>
    </div>

    <main class="comments-list" id="commentsList" aria-live="polite">
      <!-- Loaded dynamically -->
      <div class="empty-state">
        <h3>Loading comments...</h3>
        <p>Fetching the latest data from D1 Database.</p>
      </div>
    </main>
  </div>

  <div class="status-toast" id="toast" role="alert">Action completed successfully</div>

  <script>
    let currentFilter = 'pending';
    let comments = [];

    // Theme Management
    function initTheme() {
      const savedTheme = localStorage.getItem('admin-theme') || (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
      document.documentElement.setAttribute('data-theme', savedTheme);
      updateThemeButton(savedTheme);
    }

    function toggleTheme() {
      const current = document.documentElement.getAttribute('data-theme');
      const next = current === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      localStorage.setItem('admin-theme', next);
      updateThemeButton(next);
    }

    function updateThemeButton(theme) {
      document.getElementById('themeToggle').textContent = theme === 'dark' ? '☀️ Light Mode' : '🌙 Dark Mode';
    }

    document.getElementById('themeToggle').addEventListener('click', toggleTheme);
    initTheme();

    // Fetch and Display Comments
    async function loadComments() {
      try {
        const res = await fetch('/admin/api/comments');
        if (!res.ok) {
          if (res.status === 401) {
            document.getElementById('commentsList').innerHTML = \`
              <div class="empty-state">
                <h3>Authentication Required</h3>
                <p>Please reload and log in with your admin credentials.</p>
              </div>
            \`;
            return;
          }
          throw new Error('Failed to fetch');
        }
        comments = await res.json();
        updateCounts();
        renderComments();
      } catch (err) {
        document.getElementById('commentsList').innerHTML = \`
          <div class="empty-state" style="border-color: var(--color-danger);">
            <h3>Error Loading Comments</h3>
            <p>\${err.message}</p>
          </div>
        \`;
      }
    }

    function updateCounts() {
      const pending = comments.filter(c => c.status === 'pending').length;
      const approved = comments.filter(c => c.status === 'approved').length;
      const spam = comments.filter(c => c.status === 'spam').length;

      document.getElementById('count-pending').textContent = pending;
      document.getElementById('count-approved').textContent = approved;
      document.getElementById('count-spam').textContent = spam;
    }

    function switchTab(filter) {
      currentFilter = filter;
      document.querySelectorAll('.tab-btn').forEach(btn => {
        const isActive = btn.id === \`tab-\${filter}\`;
        btn.classList.toggle('active', isActive);
        btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
      });
      renderComments();
    }

    function showToast(message) {
      const toast = document.getElementById('toast');
      toast.textContent = message;
      toast.classList.add('visible');
      setTimeout(() => toast.classList.remove('visible'), 3000);
    }

    async function moderate(commentId, action) {
      const card = document.getElementById(\`comment-\${commentId}\`);
      if (card) card.classList.add('removing');
      
      try {
        const res = await fetch('/admin/api/moderate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: commentId, status: action })
        });
        
        if (!res.ok) throw new Error('Failed to moderate');
        
        // Remove locally
        comments = comments.filter(c => c.id !== commentId);
        updateCounts();
        
        setTimeout(() => {
          renderComments();
          showToast(\`Comment \${action === 'deleted' ? 'deleted' : 'marked as ' + action}\`);
        }, 200);

      } catch (err) {
        if (card) card.classList.remove('removing');
        showToast('Error: ' + err.message);
      }
    }

    function toggleReplyForm(id) {
      const form = document.getElementById(\`reply-form-\${id}\`);
      form.classList.toggle('active');
      if (form.classList.contains('active')) {
        form.querySelector('textarea').focus();
      }
    }

    async function submitReply(e, parentId, postUrl) {
      e.preventDefault();
      const textarea = document.getElementById(\`reply-text-\${parentId}\`);
      const content = textarea.value.trim();
      if (!content) return;

      const submitBtn = e.target.querySelector('button[type="submit"]');
      submitBtn.disabled = true;
      submitBtn.textContent = 'Sending...';

      try {
        const res = await fetch('/comments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            post_url: postUrl,
            author_name: 'Admin',
            author_email: '', // empty is fine for admin
            content: content,
            parent_id: parentId,
            website_url: '' // honeypot
          })
        });

        if (!res.ok) throw new Error('Failed to send reply');

        showToast('Reply published successfully');
        toggleReplyForm(parentId);
        textarea.value = '';
        
        // Auto-approve since it's the admin posting
        loadComments();
      } catch (err) {
        showToast('Error: ' + err.message);
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Send Reply';
      }
    }

    function renderComments() {
      const container = document.getElementById('commentsList');
      const filtered = comments.filter(c => c.status === currentFilter);

      if (filtered.length === 0) {
        container.innerHTML = \`
          <div class="empty-state">
            <h3>No \${currentFilter} comments</h3>
            <p>You're all caught up!</p>
          </div>
        \`;
        return;
      }

      container.innerHTML = filtered.map(c => {
        const gravatarUrl = c.gravatar_hash 
          ? \`https://www.gravatar.com/avatar/\${c.gravatar_hash}?d=mp\`
          : 'https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp';
        
        const date = new Date(c.created_at).toLocaleString();
        
        return \`
          <article class="comment-card" id="comment-\${c.id}">
            <div class="comment-header">
              <div class="author-info">
                <img class="avatar" src="\${gravatarUrl}" alt="" aria-hidden="true" />
                <div>
                  <div class="author-name">\${escapeHtml(c.author_name)}</div>
                  <div class="author-meta">
                    \${c.author_email ? \`<span>\${escapeHtml(c.author_email)}</span>\` : ''}
                    \${c.author_website ? \` | <a href="\${escapeHtml(c.author_website)}" target="_blank" rel="noopener noreferrer">Website</a>\` : ''}
                    | <span>\${date}</span>
                  </div>
                </div>
              </div>
              <a class="post-link" href="\${escapeHtml(c.post_url)}" target="_blank">View Post</a>
            </div>
            
            <div class="comment-body">\${escapeHtml(c.content)}</div>
            
            <div class="comment-actions">
              \${c.status === 'pending' ? \`
                <button class="btn btn-approve" onclick="moderate(\${c.id}, 'approved')">Approve</button>
                <button class="btn btn-spam" onclick="moderate(\${c.id}, 'spam')">Spam</button>
              \` : ''}
              \${c.status === 'approved' ? \`
                <button class="btn btn-reply" onclick="toggleReplyForm(\&quot;\${c.id}\&quot;)">Reply</button>
                <button class="btn btn-spam" onclick="moderate(\${c.id}, 'spam')">Spam</button>
              \` : ''}
              \${c.status === 'spam' ? \`
                <button class="btn btn-approve" onclick="moderate(\${c.id}, 'approved')">Approve</button>
              \` : ''}
              <button class="btn btn-delete" onclick="moderate(\${c.id}, 'deleted')">Delete</button>
            </div>

            <div class="reply-form" id="reply-form-\${c.id}">
              <form onsubmit="submitReply(event, \${c.id}, '\${c.post_url}')">
                <textarea id="reply-text-\${c.id}" placeholder="Write your reply as admin..." required></textarea>
                <div class="reply-actions">
                  <button type="submit" class="btn btn-approve">Send Reply</button>
                  <button type="button" class="btn btn-reply" onclick="toggleReplyForm('\${c.id}')">Cancel</button>
                </div>
              </form>
            </div>
          </article>
        \`;
      }).join('');
    }

    function escapeHtml(str) {
      if (!str) return '';
      return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
    }

    // Initial Load
    loadComments();
  </script>
</body>
</html>`;
