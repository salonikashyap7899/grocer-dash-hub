---
name: Admin access setup
description: How admin access is granted in the FreshCart web app and how to add more admins
---

The admin check in `artifacts/freshcart/src/routes/_authenticated/admin.tsx` uses `supabase.auth.getUser()` directly (not the `useAuth()` hook, to avoid race conditions) and checks against a `ADMIN_EMAILS` string array. It falls back to checking the `user_roles` table for users not in the list.

**Why:** The `useAuth()` hook's `user` state can be null on first render, causing the admin check to fire before the session is loaded. `getUser()` always returns the current server-verified user.

**How to apply:** To grant admin access to a new account, add their email (lowercase) to `ADMIN_EMAILS` in the `AdminLayout` function. To debug which email is active, temporarily add `user?.email` to the "Admin access required" UI, then remove it after confirming.

Note: The `user_metadata.email` field is also checked as a fallback for OAuth (Google) sign-ins where `user.email` might differ.
