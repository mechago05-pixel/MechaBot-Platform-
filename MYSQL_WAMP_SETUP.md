# Run MechaBot with WAMP and MySQL

This project now includes a PHP API in `api/` and the matching MySQL 8 schema in `mysql/schema.sql`. The PHP API uses secure server-side sessions; it does not expose database credentials to the React application.

## Setup

1. Start Apache and MySQL in WAMP.
2. In phpMyAdmin, import `mysql/schema.sql`. It creates and selects a database named `mechabot`.
   If the database already exists, import `mysql/upgrade_local_api.sql` as well.
3. Copy the project `api` folder to your Apache site, for example `C:\wamp64\www\mechabot\api`. Keep the included `.htaccess` file so API routes reach `index.php`.
4. Copy `api/.env.example` to `api/.env` and set your MySQL credentials. The default WAMP installation normally uses `root` with an empty password only for local development.
5. Create `.env.local` in the React project with:

   ```env
   VITE_API_BASE_URL=http://localhost/mechabot/api
   ```

6. Run the React app with `npm.cmd run dev`, or build it with `npm.cmd run build` and deploy `dist/` to Apache.

## Create an administrator

Register a normal account first, then promote it in phpMyAdmin (replace the email):

```sql
UPDATE users SET role = 'admin' WHERE email = 'admin@example.com';
INSERT IGNORE INTO user_roles (id, user_id, role)
SELECT UUID(), id, 'admin' FROM users WHERE email = 'admin@example.com';
```

Sign out and back in after the change. The administrator can approve or reject pending mechanic profiles from the Admin Panel.

## Migrated now

- account registration and login/logout
- browser-session authentication
- mechanic profile retrieval and registration
- mechanic profile image upload to `api/uploads/`
- client service-request creation, cancellation, and status lookup
- mechanic request acceptance and guarded status progression
- administrator mechanic approval/rejection

The client request, mechanic acceptance, mechanic status updates, and admin approval screens use the local PHP/MySQL API. They use 10-second polling instead of Supabase Realtime.

## Remaining Supabase work

Other, non-core screens still query Supabase directly: maps and locations, messages, notifications, voice diagnosis, password reset, and some voice/map components. They must be moved to explicit PHP endpoints before deleting the remaining Supabase client package and configuration.

MySQL does not provide Supabase Realtime. For WAMP, use short polling initially (for example every 10–15 seconds) or add a WebSocket/SSE service later.
