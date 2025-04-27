# Plan to Fix API Errors on Railway

## Background and Motivation
- Locally the API works but fails on Railway due to missing `tags.order` column in production DB.
- Migrations for this column were not applied on Railway.

## Project Status Board

## 1. Generate and Apply Migration
- [x] Create a new migration in `src/migrations` to add the `order` column to `tag` table.
- [ ] Commit and push the migration file.
- [ ] Verify migration presence in `dist/migrations` after build.

## 2. Run Migrations Automatically
- [ ] Update Dockerfile or entrypoint to execute `npm run typeorm migration:run` before starting the app.
- [ ] Confirm migrations run successfully in Railway logs.

## 3. Validate Schema Post-Deployment
- [ ] Run `verify-database-schema.ts` on the Railway environment to detect missing columns.
- [ ] Address any schema inconsistencies reported.

## 4. Environment and Configuration
- [ ] Compare local vs Railway environment variables; set any missing keys in Railway settings.
- [ ] Add debug logs for critical env vars (e.g., `API_URL`, `PORT`) in `main.ts`.

## 5. Testing and Verification
- [ ] Deploy to a staging Railway environment.
- [ ] Test key API endpoints (including scheduled tasks) to confirm no errors.

## 6. Monitoring and Alerts
- [ ] Monitor logs for `SchedulerService` errors (e.g., missing columns).
- [ ] Set up alert notifications for query failures.

## 7. Post-Deployment Checklist
- [ ] Confirm all endpoints return 200 for valid requests.
- [ ] Merge changes and remove temporary validation scripts if no longer needed.

## Executor's Feedback or Assistance Requests
- [x] Tag entity definition provided. Proceeding to generate migration for `order` column (integer, default 0, not nullable) on `tag` table.

## Lessons
- [ ] No lessons yet.