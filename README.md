# lazykola-a11y

`lazykola-a11y` is a modern, highly accessible, and user-optimized theme for the [Nikola](https://getnikola.com/) static site generator. Inheriting from `bootstrap4` and building upon standard accessibility principles, it implements cleaner HTML structures and helpful client-side behaviors out-of-the-box.

---

## Why?

I wanted to build a flexible, lightweight personal website, and Nikola was the one I reached for due to the aforementioned simplicity and lightweight nature, as well as my general familiarity with Pythonic workflows. The reason why this came into being is that while doing those customizations, I realized that there are some things that **should** be there and others that **could** be there to make it cooler but that required somewhat low-level editing. Thus, I did it for my website, then pulled the theme out, and now it's here for everyone who wants to not go through the time I did to learn the internal workings of this SSG and just make a website.

I also blessedly, did not have to do this from the ground up. Thanks to [Carter Temm](https://github.com/cartertemm) for inspiring this, by building a variant of the theme bootstrap4 called bootstrap4_accessible. This is where the very first feature comes from.

---

## Key Features

### 1. Accessibility (A11y) Improvements
- **Proper Current Page Indicators**: Replaces the generic active class markup with `aria-current="page"` on menu links and dropdown items allowing screen readers to accurately identify the active page. Bootstrap4 had hardcoded the word "active", not sure why the workaround when there is a perfectly viable [WCAG](https://www.w3.org/WAI/standards-guidelines/wcag/) solution.
- **Removed Heading Self-Links**: Strips the redundant `<a>` anchor link from post/page title headings when viewing that specific post or page. I don't know how this looked visually (I can't personally imagine what purpose it would serve to link to the page you are already on, but at least from a screen reader perspective it was very annoying to hear "link same page").
- **Corrected Heading Hierarchy**: The site's own name/logo in the navbar is the page's real `<h1>`; post/page titles render as `<h2>` underneath it. A small client-side script then auto-normalizes each post's own content headings so the shallowest one always lands at `<h3>`, regardless of whether you start writing a post at `#`, `##`, or anywhere else; it always nests correctly under the title with no gaps in the outline. You never have to think about what heading level to start at.
- **WCAG AA Color Contrast**: Audited the full theme (and the comment widget) with an automated accessibility scanner and fixed every contrast failure inherited from Bootstrap 4's defaults: nav links, body links, tag badges, and footer text all now meet the 4.5:1 minimum. Links inside body text are also underlined by default, not distinguished by color alone.
- **Automatic Dark Mode**: The whole theme, including the comment widget, follows the visitor's OS/browser dark-mode preference (`prefers-color-scheme`) automatically: no toggle, no configuration. (Code blocks intentionally keep their light syntax-highlighting theme; see [Configuration Options](#configuration-options) if you'd like a dark-friendly Pygments style instead.)
- **Smart Logo Alt Text**: Adds support for custom theme-specific logo alternative text (`LOGO_ALT_TEXT`). Previously, Nikola hardcoded the logo's alt text to fall back to the site title (`alt="${blog_title}"`).
  - *Before*: Screen reader reads: `"My Awesome Website!"` (just site title)
  - *Now*: Screen reader reads: `"My Awesome Website Logo: Me bent over a terminal with a lukewarm coffee sitting on the desk for the past six hours..."`
- **No More Redundant Title Text**: As a follow-up to the previous change, the textual blog title is no longer rendered at all once a visual brand logo (`LOGO_URL`) is configured, rather than being kept in the DOM and merely hidden from assistive tech via `aria-hidden="true"`. The logo's `alt` text is the single source of truth for what gets announced.
  - *Before*: Screen reader reads: `"My Awesome Website Logo: Me bent over a terminal... My Awesome Website!"`
  - *Now*: Screen reader reads: `"My Awesome Website Logo: Me bent over a terminal..."`
- **Optimized Footer Hierarchy**: Placed `<footer id="footer">` directly under the root container for cleaner structural landmark navigation.

### 2. Client-Local Timezone Conversion
- **Supplementary Time Stamps**: Automatically appends the user's localized time of day and timezone in parentheses directly next to the post's default build date and time (e.g., `"June 9, 2026 12:00 PM UTC (6:00 PM MDT)"`).
- **Client-Side Processing**: Uses a lightweight JavaScript snippet that converts dates dynamically when the page loads, leaving the default static dates as a fallback if JavaScript is disabled.

### 3. Clean Blog Title Layouts
- **Distinct Browser Titles**: Automatically updates the `<title>` tag for the `/blog` section to read `Blog | <Site Title>` instead of showing a generic landing name.
  - *Before*: Browser tab title says: `"My Personal Awesome Website!"`
  - *Now*: Browser tab title says: `"Blog | My Personal Awesome Website!"`

### 4. Zero-Maintenance Serverless Comments
My biggest hesitation when switching from a CMS like WordPress to an SSG was the fact that I couldn't easily allow people to leave comments (feedback is important!). Every system Nikola supported was too much maintenance for someone that just wants to have a site. Especially the ones requiring you to host your own comment server. I already host enough VPS apps that I'm notoriously bad at keeping track of. Plus, running active server applications defeats the static purpose anyway.

So, I built an out-of-the-box (or dirty hack, depending on the perspective) system that deploys in 3 minutes and adds zero overhead by relying on **Cloudflare's** free edge database and Workers.

- Edge-Powered Discussion: Dynamically loads and posts comments via a lightweight API connected to a serverless Cloudflare D1 SQL database.
- Threaded Replies: Supports nested replies of any depth; the theme collapses threads past 3 levels behind a "Show more replies" toggle so long conversations stay readable.
- Privacy-First Email Hashing: Hashes commenter emails on the server using SHA-256 to load Gravatar avatars, keeping raw emails hidden from public browsers.
- Self-Hosted Administration: Serves a clean, password-protected moderation dashboard directly from your Worker at `/admin` (approve/reject/spam comments in one click).
- Multi-layered Spam Blockers: Uses a silent CSS-hidden honeypot to trap bots, server-side rate limits, and supports optional Cloudflare Turnstile checks and Discord alerts for pending comments.

### 5. Copy-to-Clipboard Code Blocks
- **One-Click Copying**: Automatically wraps every `<pre>` code block with a "Copy" button, letting readers copy a snippet without manually selecting text.
- **Accessible by Default**: The button is a real, keyboard-focusable `<button>` with an `aria-label="Copy code to clipboard"`, and its text changes to "Copied!" (with a distinct visual style) for a couple of seconds after use to confirm the action for sighted and screen-reader users alike.
- **Zero Configuration**: Ships as a small, dependency-free `copy.js`/`copy.css` pair that's automatically included by the theme; no setup required.

### 6. Design Presets
- **One-Line Restyling**: A single `"PRESET"` key in `THEME_CONFIG` swaps the accent color, corner rounding, spacing, heading typeface, and card style as one coordinated set, each pre-checked for WCAG AA contrast in both light and dark mode. Five presets ship with the theme, described in plain language so you can pick one without needing to see it. See [Design Presets](#design-presets) below.

Used by developers building portfolio sites, blogs, and more. See [who's using it](#sites-using-this-theme).

## Installation

**Fastest path**, from nothing to a running site with this theme, using [uv](https://docs.astral.sh/uv/) (a fast Python package/environment manager):

```bash
uv venv
uv pip install "Nikola[extras]"
source .venv/bin/activate  # Windows: .venv\Scripts\activate
nikola init mysite
cd mysite
git clone https://github.com/Aarushb/lazykola-a11y.git themes/lazykola-a11y
```

Then open `conf.py`, set `THEME = "lazykola-a11y"`, and run `nikola build`.

Already have a Nikola site? Skip straight to the clone step: drop the repo into your `themes/` folder, set `THEME` in `conf.py`, and build.

<details>
<summary>Step by step, if you'd rather understand each part</summary>

1. Set up a Nikola site (skip this if you already have one):
   ```bash
   uv venv
   uv pip install "Nikola[extras]"
   source .venv/bin/activate  # Windows: .venv\Scripts\activate
   nikola init mysite
   cd mysite
   ```
2. Clone or copy this repository into your website's `themes/` directory under the name `lazykola-a11y`:
   ```bash
   git clone https://github.com/Aarushb/lazykola-a11y.git themes/lazykola-a11y
   ```
3. Open your website's `conf.py` configuration file.
4. Update or set the `THEME` variable:
   ```python
   THEME = "lazykola-a11y"
   ```
5. Build and deploy your website as usual:
   ```bash
   nikola build
   ```

</details>

---

## Serverless Comments Setup

From inside `lazykola-comment-server/`, run `node setup.js` and it handles the database, schema, and deployment for you, stopping only to ask for an admin password. Full details, including the manual step-by-step version and optional extras like Turnstile and Discord alerts, are in the [Comment Server README](lazykola-comment-server/README.md).

Once deployed, enable comments in your Nikola `conf.py`:
```python
COMMENT_SYSTEM = "lazykola"
COMMENT_SYSTEM_ID = "https://your-comments-worker.yourname.workers.dev"
```

---

## Configuration Options

To customize the logo, navigation behavior, and comments verification, specify the parameters in your `conf.py` under the `THEME_CONFIG` dictionary:

```python
THEME_CONFIG = {
    DEFAULT_LANG: {
        # Path to your custom brand logo image file
        "LOGO_URL": "/assets/images/logo.png",
        
        # Custom alternative text for screen readers; falls back to the site name if not specified
        "LOGO_ALT_TEXT": "Your Brand Logo Description",
        
        # Set to True to use Bootstrap's light navbar stylesheet; defaults to dark if false/unset
        "navbar_light": False,
        
        # Custom background color class for the navbar (e.g., bg-primary, bg-warning, bg-info)
        "navbar_custom_bg": "bg-dark",

        # Optional: Cloudflare Turnstile site key for comments form validation
        "comment_turnstile_site_key": "your-turnstile-site-key",

        # Optional: a named design preset (accent color, corner rounding, spacing,
        # heading typeface, card style). See "Design Presets" below for the five
        # available names and what each one looks like
        "PRESET": "blog",
    }
}
```

Code blocks keep Nikola's default light syntax-highlighting theme even in dark mode, so copied/pasted code always looks the same regardless of the reader's OS setting. If you'd rather your code blocks match dark mode, set a dark-friendly [Pygments style](https://pygments.org/styles/) in `conf.py`, e.g.:

```python
PYGMENTS_STYLE = "monokai"
```

---

## Design Presets

Not everyone building a site with this theme can see what it looks like. Before presets, the only styling knobs were the navbar color, the background class, and the logo, which isn't much surface to make one site look meaningfully different from another, and it's not something you can use to build trust in a look you can't check yourself. A preset is a named bundle of accent color, corner rounding, spacing, and card style, picked as a set and already checked for WCAG contrast in both light and dark mode, so you can choose one by describing the kind of site you're building rather than by eye, and trust that what you get holds together.

Every description below assumes the same shared shape, whatever preset you pick:

> Every page in this theme has the same basic shape, whatever preset you pick: a strip across the top holds the site name and menu, like the header on a piece of letterhead. Below that, everything sits in one column down the middle, wide enough to read comfortably. Individual pieces of content, a comment, a code sample, sit in their own card, stacked one after another like a stack of index cards, each with a visible edge you could trace with a finger. What changes between presets is the shape and spacing of that same stack, and the one accent color used throughout for anything clickable.

Each preset below only describes how it differs from that shared shape.

### Portfolio
*For individual creatives and professionals showcasing their own work.*

The corners of every card and button are noticeably rounded, closer to a smartphone's edge than a sharp picture frame. There's generous room around each item, like artwork spaced out on a gallery wall rather than packed onto a shelf. The accent color used on every link and button is violet, a color that's carried an association with imagination and craft for a long time, part of why design studios and creative agencies reach for it. It fits someone putting their own personal work on display.

### Professional Business Site
*For companies, consultancies, and formal organizational sites.*

Corners are sharp, almost square, with barely any rounding, and there's less open space between elements than in the other presets, more like a tightly formatted business letter than a spread-out brochure. Cards lose their traceable edge entirely, just a very faint shift in shade from the page around them, like a page in a notebook rather than a card pulled out of a stack. The accent color is a clear, restrained blue. Blue has become something like a default color for institutions that want to seem dependable and calm rather than exciting, which is why you'll see it used by so many banks, insurers, and established companies. It's a safe, well-tested choice for a site that needs to be taken seriously.

### Personal Blog
*For a writing-first, editorial, personality-forward site.*

Headings are set in a typeface with small decorative strokes at the end of each letter, called a serif, while the rest of the text stays in a plain, unadorned typeface for easy reading. That contrast, an ornamented heading over plain body text, is the same choice newspapers and printed books have used for centuries, because it reads as considered and literary without slowing the actual reading down. The accent color is a warm, reddish orange, the color of sun-baked clay or a terracotta flowerpot. It's warm rather than corporate, which suits a site that's about one person's voice rather than an organization.

### Documentation / Technical
*For docs sites, project pages, and technical reference material.*

Corners are sharp and spacing is tight, the same as the business preset, because someone reading documentation is usually scanning for one specific answer rather than settling in, and tighter spacing fits more reference material on screen. Cards have no traceable edge or shadow either, just a faint shift in shade from the page, keeping the focus on the content instead of the container. The accent color is teal, a blue-green that shows up constantly in programming tools, terminal color schemes, code editors, API documentation, because it stays calm and easy to read against both very light and very dark backgrounds, and doesn't clash with the colors already used to highlight code. It's a color chosen by developers, for developers.

### Community / Nonprofit
*For community groups, nonprofits, and volunteer-run organizations.*

Corners are the roundest of any preset, and every card looks like it's gently resting on top of the page rather than painted flat onto it, similar to a coin sitting on a table rather than a pattern printed directly onto it. The accent color is green, one of the most widely recognized colors for growth, nature, and community, the same association behind a plant, a "go" traffic light, or the branding of environmental and community groups. The overall effect aims to feel like an invitation rather than a formal announcement.

### Using a preset

Set `PRESET` under `THEME_CONFIG` in your `conf.py`:

```python
THEME_CONFIG = {
    DEFAULT_LANG: {
        "PRESET": "portfolio",  # or "business", "blog", "docs", "community"
    }
}
```

Any other `THEME_CONFIG` key you set explicitly (`navbar_light`, `navbar_custom_bg`, etc.) still overrides whatever a preset implies, so you can start from a preset and keep customizing on top of it.

### Technical reference

For anyone who wants the exact values instead of the description above:

| Preset | Accent (light) | Accent (dark) | Radius | Density | Card style |
|---|---|---|---|---|---|
| `portfolio` | `#5540d6` | `#b4a5fb` | `0.5rem` | comfortable (default) | bordered (default) |
| `business` | `#1d4ed8` | `#93b7f9` | `0.125rem` | compact | flat |
| `blog` | `#b8460e` | `#fb923c` | `0.375rem` | comfortable (default) | bordered (default) |
| `docs` | `#0f766e` | `#5eead4` | `0.125rem` | compact | flat |
| `community` | `#15803d` | `#4ade80` | `0.75rem` | comfortable (default) | shadowed |

`blog` also sets `--site-font-heading` to `Georgia, 'Times New Roman', Times, serif`; every other preset keeps the theme's default sans-serif fonts for both headings and body text. All five presets clear the 4.5:1 WCAG AA contrast minimum in both light and dark mode, and as white text on their solid-fill accent color.

---

## Sites Using This Theme

If you've built a site with this theme, I'd genuinely like to see it. Part of what motivates me to get up in the morning is being able to make the lives of other people just a little bit better, so if this has helped you, please share, it would make my day to hear. Plus, potential users will hear it from people other than myself if the theme is any good.

Open a PR adding a link to your site (and, if you want, what preset you used) to the list below.

- [aarushb.github.io](https://aarushb.github.io): portfolio preset

---

## License
This theme is open-source and licensed under the [MIT License](LICENSE).

