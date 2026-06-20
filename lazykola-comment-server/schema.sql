-- Database schema for lazykola-comments
CREATE TABLE IF NOT EXISTS comments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  post_url TEXT NOT NULL,
  author_name TEXT NOT NULL,
  author_email TEXT NOT NULL,
  author_website TEXT,
  content TEXT NOT NULL,
  parent_id INTEGER DEFAULT NULL,
  status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'spam'
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (parent_id) REFERENCES comments(id) ON DELETE CASCADE
);

-- Index for fast retrieval of comments by post URL
CREATE INDEX IF NOT EXISTS idx_comments_post_url ON comments (post_url);

-- Index for moderation dashboard filtering by status
CREATE INDEX IF NOT EXISTS idx_comments_status ON comments (status);
