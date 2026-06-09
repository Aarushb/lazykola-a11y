# lazykola-a11y

`lazykola-a11y` is a modern, highly accessible, and user-optimized theme for the [Nikola](https://getnikola.com/) static site generator. Inheriting from `bootstrap4` and building upon standard accessibility principles, it implements cleaner HTML structures and helpful client-side behaviors out-of-the-box.

---

## 🚀 Key Features

### ♿ 1. Accessibility (A11y) Improvements
- **Proper Current Page Indicators**: Replaces the generic active class markup with `aria-current="page"` on menu links and dropdown items, allowing screen readers to accurately identify the active page.
- **Removed Heading Self-Links**: Strips the redundant `<a>` anchor link from post/page `<h1>` title headings when viewing that specific post or page, removing unnecessary same-page focus targets.
- **Smart Logo Alt Text**: Adds support for custom theme-specific logo alternative text (`LOGO_ALT_TEXT`).
- **Hidden Text Redundancy**: Hides the textual logo/blog title via `aria-hidden="true"` if a visual brand logo is already enabled and has an alternative description, preventing repetitive screen reader announcements.
- **Optimized Footer Hierarchy**: Placed `<footer id="footer">` directly under the root container for cleaner structural landmark navigation.

### 🕒 2. Client-Local Timezone Conversion
- **Supplementary Time Stamps**: Automatically appends the user's localized time of day and timezone in parentheses directly next to the post's default build date and time (e.g., `"June 9, 2026 12:00 PM UTC (6:00 PM MDT)"`), ensuring reader clarity across regions without repeating date information.
- **Client-Side Processing**: Uses a lightweight JavaScript snippet that converts dates dynamically when the page loads, leaving the default static dates as a fallback if JavaScript is disabled.

### 🏷️ 3. Clean Blog Title Layouts
- **Distinct Browser Titles**: Automatically updates the `<title>` tag for the `/blog` section to read `Blog | <Site Title>` instead of showing a generic landing name.

---

## 🛠️ Installation

To use this theme in your Nikola website:

1. Clone or copy this repository into your website's `themes/` directory under the name `lazykola-a11y`:
   ```bash
   git clone https://github.com/yourusername/lazykola-a11y.git themes/lazykola-a11y
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

## 📝 Configuration Options

You can specify theme configurations in your `conf.py` under `THEME_CONFIG`:

```python
THEME_CONFIG = {
    "LOGO_URL": "/assets/images/logo.png",
    "LOGO_ALT_TEXT": "Your Brand Logo Description",
}
```

---

## 📄 License
This theme is open-source and licensed under the [MIT License](LICENSE).
