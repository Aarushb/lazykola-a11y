# lazykola-a11y

`lazykola-a11y` is a modern, highly accessible, and user-optimized theme for the [Nikola](https://getnikola.com/) static site generator. Inheriting from `bootstrap4` and building upon standard accessibility principles, it implements cleaner HTML structures and helpful client-side behaviors out-of-the-box.

---

## Why?

I wanted to build a flexible, lightweight personal website, and Nikola was the one I reached for due to its simplicity, lightweight nature, and my general familiarity with Pythonic workflows. While working on these custom styles, I realized that there were some things that *should* be there (for proper accessibility) and others that *could* be there (to make the site feel cooler) but required editing low-level templates. After tweaking it for my own website, I pulled the code out into a reusable theme so others can skip the learning curve of Nikola's internals and just build a clean website.

---

## Key Features

### 1. Accessibility (A11y) Improvements
- **Proper Current Page Indicators**: Replaces the generic active class markup with `aria-current="page"` on menu links and dropdown items, allowing screen readers to accurately identify the active page. By default, Bootstrap 4 hardcodes the word 'active' as plain text next to the link. While that visually highlights the page, my detail-oriented mind was unhappy with this WCAG accessibility violation.
- **Removed Heading Self-Links**: Strips the redundant `<a>` anchor link from post/page `<h1>` title headings when viewing that specific post or page. There is no clear visual purpose to linking to the page you are already on, and from a screen reader perspective, hearing "link same page" repeatedly is highly redundant and annoying.
- **Smart Logo Alt Text**: Adds support for custom theme-specific logo alternative text (`LOGO_ALT_TEXT`). Previously, Nikola forced the logo image's alt text to fall back to the site title. We updated it so you can describe your actual brand logo properly.
- **Hidden Text Redundancy**: Hides the textual logo/blog title via `aria-hidden="true"` if a visual brand logo is already enabled and has an alternative description. Previously, a screen reader would read both the logo's alt text *and* the adjacent text title. Now, only the descriptive logo alt text is read, keeping navigation clean.
- **Optimized Footer Hierarchy**: Placed `<footer id="footer">` directly under the root container for cleaner structural landmark navigation.

### 2. Client-Local Timezone Conversion
- **Supplementary Time Stamps**: Automatically appends the user's localized time of day and timezone in parentheses directly next to the post's default build date and time (e.g., `"June 9, 2026 12:00 PM UTC (6:00 PM MDT)"`).
- **Client-Side Processing**: Uses a lightweight JavaScript snippet that converts dates dynamically when the page loads, leaving the default static dates as a fallback if JavaScript is disabled.

### 3. Clean Blog Title Layouts
- **Distinct Browser Titles**: Automatically updates the `<title>` tag for the `/blog` section to read `Blog | <Site Title>` instead of showing a generic landing name. Previously, visiting the blog page would set the browser tab title to just the site's default name, making tab navigation confusing.

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

## Configuration Options

To customize the logo and navigation behavior of this theme, specify the following parameters in your `conf.py` under the `THEME_CONFIG` dictionary:

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
    }
}
```

---

## License
This theme is open-source and licensed under the [MIT License](LICENSE).
