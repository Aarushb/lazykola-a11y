# lazykola-a11y

`lazykola-a11y` is a modern, highly accessible, and user-optimized theme for the [Nikola](https://getnikola.com/) static site generator. Inheriting from `bootstrap4` and building upon standard accessibility principles, it implements cleaner HTML structures and helpful client-side behaviors out-of-the-box.

---

## Why?

I wanted to build a flexible, lightweight personal website, and Nikola was the one I reached for due to the aforementioned simplicity and lightweight nature, as well as my general familiarity with Pythonic workflows. The reason why this came into being is that while doing those customizations, I realized that there are some things that **should** be there and others that **could** be there to make it cooler but that required somewhat low-level editing. Thus, I did it for my website, then pulled the theme out, and now it's here for everyone who wants to not go through the time I did to learn the internal workings of this SSG and just make a website.

---

## Key Features

### 1. Accessibility (A11y) Improvements
- **Proper Current Page Indicators**: Replaces the generic active class markup with `aria-current="page"` on menu links and dropdown items, allowing screen readers to accurately identify the active page. I don't even know why Bootstrap 4 does this—it literally has "active" in plain text hardcoded. And while it worked, my annoyingly detail-oriented mind was very unhappy with this violation of WCAG.
- **Removed Heading Self-Links**: Strips the redundant `<a>` anchor link from post/page `<h1>` title headings when viewing that specific post or page. I don't know how this looked visually (I can't personally imagine what purpose it would serve to link to the page you are already on, but at least from a screen reader perspective it was very redundant and annoying to hear "link same page").
- **Smart Logo Alt Text**: Adds support for custom theme-specific logo alternative text (`LOGO_ALT_TEXT`). Previously, Nikola hardcoded the logo's alt text to fall back to the site title (`alt="${blog_title}"`).
  - *Before*: Screen reader reads: `"My Awesome Website!"` (just site title)
  - *Now*: Screen reader reads: `"My Awesome Website Logo: Me bent over a terminal with a lukewarm coffee sitting on the desk for the past six hours..."`
- **Hidden Text Redundancy**: As a follow-up to the previous change, it hides the textual logo/blog title via `aria-hidden="true"` if a visual brand logo is already enabled and has an alternative description.
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
- **Edge-Powered Discussion**: Connects your static site to an on-demand comment system powered by Cloudflare Workers and D1 database.
- **Privacy Hashing**: Uses SHA-256 to hash commenter emails for secure Gravatar avatars without exposing their raw email addresses to the public.
- **Embedded Moderation Panel**: Includes a clean, responsive password-protected admin dashboard served directly from your Worker.
- **Built-in Spam Blockers**: CSS honeypots, optional Cloudflare Turnstile CAPTCHA checks, and Discord webhook notifications for new comments.

---

## Installation

To use this theme in your Nikola website:

1. Clone or copy this repository into your website's `themes/` directory under the name `lazykola-a11y`:
   ```bash
   git clone https://github.com/aarushb/lazykola-a11y.git themes/lazykola-a11y
   ```
2. Open your website's `conf.py` configuration file.
3. Update or set the `THEME` variable:
   ```python
   THEME = "lazykola-a11y"
   ```
4. Build and deploy your website as usual:
   ```bash
   nikola build
   ```

---

## Serverless Comments Setup

To set up the database, deploy the edge Worker, and moderate comments, follow the detailed step-by-step instructions in the [Comment Server README](file:///d:/PROGRAMMING/projects/lazycola-a11y/lazykola-comment-server/README.md).

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
    "en": {
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
    }
}
```

---

## License
This theme is open-source and licensed under the [MIT License](LICENSE).

