# Google OAuth Setup Guide

The frontend code for Google sign-in is already implemented in `login-form.tsx` and `register-form.tsx`. The only missing piece is configuring Google OAuth credentials in Supabase.

## Step 1: Create Google Cloud OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select (or create) a project for **écoleVersity**
3. Navigate to **APIs & Services → Credentials**
4. Click **Create Credentials → OAuth client ID**
5. Configure the **OAuth consent screen** first if prompted:
   - User Type: **External**
   - App name: **écoleVersity**
   - User support email: your support email
   - Developer contact email: your email
   - Scopes: add `.../auth/userinfo.email` and `.../auth/userinfo.profile`
   - Test users: add your own email for testing
6. Create the OAuth client ID:
   - Application type: **Web application**
   - Name: **écoleVersity Web**
   - Authorized JavaScript origins: `https://ecoleversity.com`
   - Authorized redirect URIs: `https://vhivhqfhpwhrlinjjfwa.supabase.co/auth/v1/callback`
7. Copy the **Client ID** and **Client Secret**

## Step 2: Configure Supabase Dashboard

1. Go to [Supabase Dashboard](https://supabase.com/dashboard/project/vhivhqfhpwhrlinjjfwa)
2. Navigate to **Authentication → Providers → Google**
3. Toggle **Enabled**
4. Paste:
   - **Client ID**: from Google Cloud Console
   - **Secret**: from Google Cloud Console
5. Click **Save**

## Step 3: Update Local Environment

Add to `.env.local`:

```env
SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET=your-client-secret
```

## Step 4: Verify

Run the verification script:

```bash
node scripts/setup-google-oauth.mjs
```

You should see `✅ google: true` in the output.

## Step 5: Test the Flow

1. Open the app in an incognito window
2. Go to **Register** or **Login**
3. Click **"Continuer avec Google"**
4. You should be redirected to Google, then back to the app
5. A new profile is created automatically via the `handle_new_user` trigger
6. If registering as a teacher, the role cookie ensures the profile gets `role = 'teacher'`

## How It Works

- **Frontend**: `login-form.tsx` and `register-form.tsx` call `supabase.auth.signInWithOAuth({ provider: "google" })`
- **Register flow**: Sets `ev_register_role` cookie before redirect → callback reads it and updates `profiles.role`
- **Callback**: `/api/auth/callback` exchanges the code for a session, then calls `getAuthRedirect()` for role-based routing
- **Profile creation**: The `handle_new_user` database trigger auto-creates a `profiles` row when a new `auth.users` row is inserted

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| "Provider is not enabled" | Go to Supabase Auth → Providers → Google and toggle it on |
| "redirect_uri_mismatch" | Ensure the Supabase callback URL is in Google Cloud Console redirect URIs |
| User lands on parent onboarding after teacher registration | Check that `ev_register_role` cookie is being set (HTTPS + SameSite=Lax) |
| Profile not created | Verify the `handle_new_user` trigger exists in Supabase SQL Editor |
