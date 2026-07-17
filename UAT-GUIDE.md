# UAT Guide — Dance School Management System

Thank you for testing! This build contains **demo data only** (fictional students,
teachers, and payments), so feel free to click, edit, and delete anything.

## Getting it running (one-time, ~5 minutes)

Requires [Node.js](https://nodejs.org) 20 or newer on Windows or Mac.

```
npm install
npm run dev
```

Then open **http://localhost:3000** in your browser.
(The demo database ships pre-loaded; no other steps needed. To reset the demo data at
any time, run `npm run db:seed`.)

## Sign-in accounts

| Try this role | Email | Password |
|---|---|---|
| Admin (full access) | admin@dance.school | Admin1234! |
| Manager | manager@dance.school | Manager1234! |
| Front-desk staff | staff@dance.school | Staff1234! |
| Teacher (Mandy Chan) | mandy@dance.school | Teacher1234! |

## Suggested test walkthrough (15–20 min)

1. **Dashboard** — check the numbers and the amber alert banners make sense.
2. **Students** — search/filter the list; open a student; add a new student; edit one;
   try saving a student with no name (you should get a clear error).
3. **Payments** — record a tuition payment; record one as *Pending* and watch it appear
   in Outstanding; use *Mark paid*; try *Void* and confirm it disappears from totals.
4. **Classes** — open a class; enroll a student; try enrolling the same student twice
   (should be blocked); drop a student.
5. **Attendance** — pick a class and today's date, mark statuses, save, reload the same
   date to confirm it remembered.
6. **Work Hours** — as manager/admin, approve or reject the pending records.
7. **Payroll** — generate drafts for this month; open a record; add an allowance with a
   reason; approve it; mark it paid with a payment date.
8. **Reports** — download a few Excel reports and open them in Excel; check totals.
9. **Roles** — sign out and back in as staff@ and mandy@ to confirm each role sees only
   what they should.
10. **Audit Log** (admin) — confirm everything you just did was recorded.

## Recording feedback

For each issue, please note: the page, what you did, what you expected, and what
happened instead. Screenshots help a lot.
