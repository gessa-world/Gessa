GESSA social profile upgrade

Included:
- profile.html: individual member profile and timeline page.
- app.js: public author identity/avatar links in the public feed.
- home.html: profile shortcut beside the composer and profile navigation.
- config.js + assets/app.css: profile shortcut in shared navigation and 3D pink oval navigation buttons with blue text.
- database/05_public_profiles.sql: safe public profile projection (username, display name, avatar, cover, bio only) and profile-media storage policies.

IMPORTANT INSTALL ORDER:
1) In Supabase Dashboard > SQL Editor, run database/05_public_profiles.sql ONCE.
2) Upload the updated project files to the GitHub repository root, preserving all existing folders.
3) Keep index.html unchanged. The external login page file in this package was not edited.
4) Hard-refresh the website (Ctrl+F5).

Profile images are uploaded to the Supabase Storage bucket `profile-media` (5 MB max; JPG/PNG/WebP).
The public_profiles table intentionally contains no phone number or date of birth.
