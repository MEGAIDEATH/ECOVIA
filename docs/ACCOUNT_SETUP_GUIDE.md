# ECOVIA — How to Create Accounts (Specialist, Organization, Admin)

Live demo site: **https://ecovia-kappa.vercel.app**

The public site runs in **demonstration mode**: no SMS or email is sent. A test
code appears on the verification screen instead. That code works only for the
demo identities listed below. Any other phone number or CR number gets the
message «خدمة إرسال رمز التحقق غير مفعّلة حالياً…».

> This file contains no passwords or codes. The demo admin password and the demo
> codes are kept only in the private file
> `~/.config/ecovia/demo-credentials.env` on the project owner's machine.

---

## Demo identities

| Account type | Identities you can use |
| --- | --- |
| Specialist (phone number) | `0500000101`, `0500000102`, `0500000103` |
| Organization (CR number) | `7000000101`, `7000000102`, `7000000103` |

How each identity is used in the demo database right now:

| Identity | State |
| --- | --- |
| `0500000101` | Specialist, **approved**: the dashboard works |
| `0500000102`, `0500000103` | Free: can register a new specialist |
| `7000000101` | Organization, **approved**: the dashboard works |
| `7000000102`, `7000000103` | Organization registered, **pending approval** |

To register a brand-new account when all identities are taken, see
[Adding more demo identities](#adding-more-demo-identities).

---

## 1. Specialist account

1. Open the site and click **إنشاء حساب**, then choose the **specialist** (أخصائي) account type.
   You can also go straight to `/register/specialist`.
2. **Step 1, personal information**:
   - **الاسم الثلاثي**: a three-part name.
   - **رقم الهوية**: a national ID number. Use a fake one such as `1000000002`.
   - **رقم الجوال**: one of the demo phone numbers, for example `0500000102`.
3. **Step 2, license**:
   - **رقم المعاملة / الترخيص**: a license number, for example `DEMO-LIC-0002`.
   - **تاريخ الإصدار**: the issue date (optional).
   - The license document is optional: PDF or image, **4 MB maximum**.
4. Click **إرسال طلب التسجيل**. You reach the verification screen (أدخل رمز التحقق).
5. The screen shows **وضع العرض التجريبي** and **رمز تجريبي للاختبار فقط: ……**.
   Type that 6-digit code and click **تأكيد الدخول**.
6. Choose a password on the **set-password** screen.
7. You land on your own **CV page** (`/specialist/cv`) with a "pending approval" banner. You can
   complete and edit the CV and log out; everything else unlocks once an admin approves the
   account (see [Approving accounts](#4-approving-accounts)).
8. After approval, sign in at `/login`:
   - **البريد الإلكتروني أو رقم الجوال**: the phone number, for example `0500000102`.
   - **كلمة المرور**: the password from step 6.

---

## 2. Organization account

1. Open the site and click **إنشاء حساب**, then choose the **organization** (منشأة / جهة)
   account type. You can also go straight to `/register/organization`.
2. Fill in the form:
   - **رقم السجل التجاري**: one of the demo CR numbers, for example `7000000102`.
   - Click **جلب**. The demo lookup fills in **اسم المنشأة** (the field is read-only).
   - **رقم التواصل**: any contact number, for example `0500000000`.
   - **نبذة عن الجهة**: a short description.
   - The commercial registration document is optional: PDF or image, **4 MB maximum**.
3. Click **المتابعة للتحقق**. You reach the verification screen.
4. Type the 6-digit **test code** shown on the screen and click **تأكيد الدخول**.
5. Choose a password on the **set-password** screen.
6. You land on the **facility profile** (`/organization/profile`) with a "pending approval" banner;
   requests, chat and contracts unlock once an admin approves the organization.
7. After approval, sign in at `/login`:
   - **البريد الإلكتروني أو رقم الجوال**: `org_<CR number>@ecovia.local`,
     for example `org_7000000102@ecovia.local`.
   - **كلمة المرور**: the password from step 5.

> The organization's sign-in email is created automatically from its CR number:
> `org_<CR>@ecovia.local`.

---

## 3. Admin account

Admin accounts **cannot** be created through the website. This is deliberate: a
browser can never give itself the admin role.

### Signing in as the existing demo admin

1. Go to `/admin`. The **دخول الإدارة** panel appears.
2. Enter the demo admin email (`admin@ecovia.local`) and its password, then confirm.
   The password is in `~/.config/ecovia/demo-credentials.env` (`DEMO_ADMIN_PASSWORD`).

### Creating or resetting an admin (project owner, from the terminal)

Admins are created with the project's seed script, run against a specific Neon
branch. Use the **direct** (unpooled) connection string of that branch.

```bash
# 1. Write the branch's connection details to a private file
#    (use demo for the live site, or production for the real launch)
neon env pull --branch demo --file /tmp/ecovia-demo.env

# 2. Run the seed with the admin's email and a strong password.
#    The values stay in your shell and are not saved in the project.
DATABASE_URL_UNPOOLED="$(grep '^DATABASE_URL_UNPOOLED=' /tmp/ecovia-demo.env | cut -d= -f2- | tr -d '"')" \
ADMIN_EMAIL="you@your-company.sa" \
ADMIN_PASSWORD="choose-a-long-random-password" \
npm run db:seed

# 3. Delete the temporary file
rm /tmp/ecovia-demo.env
```

What the script does:

- It creates the account if the email doesn't exist yet and gives it `role=admin`.
- If the email already exists, it does **not** change the password. It only makes
  sure the role is `admin`.
- The password must be at least 8 characters.

For the **real launch**, run the same steps with `--branch production`. The
production database has no admin yet.

---

## 4. Approving accounts

New specialists and organizations stay **pending** until an admin approves them.

1. Sign in at `/admin`.
2. Open **اعتماد الأخصائيين** (specialists) or **اعتماد المنشآت** (organizations).
3. Review the details and the uploaded document, then click **اعتماد** to approve or
   reject it. Rejecting requires a reason (سبب الرفض).
4. Once approved, the user can sign in at `/login` and use the dashboard:
   - Specialists: `/specialist`
   - Organizations: `/organization`

---

## Limits and common messages

| Situation | What happens |
| --- | --- |
| Phone or CR number not in the demo list | «خدمة إرسال رمز التحقق غير مفعّلة حالياً…». The account can't be created. |
| Wrong code | «رمز التحقق غير صحيح!» |
| Code older than 5 minutes, or already used | «انتهت صلاحية رمز التحقق، اطلب رمزاً جديداً.» |
| 5 wrong attempts on one code | «تجاوزت عدد المحاولات المسموح بها…». Go back and request a new code. |
| More than 5 code requests for one identity within 15 minutes | «محاولات كثيرة…». Wait 15 minutes. |
| Registering an identity that already has an account | The existing account opens with its current status (pending or approved). |
| File larger than 4 MB, or not a real PDF or image | The upload is rejected. Registration still works without the file. |

---

## Adding more demo identities

The demo list is a server-side setting on Vercel. Only the project owner can change it.

1. Choose new **fake** identities, for example phone `0500000104` or CR `7000000104`.
   Organizations are listed by their sign-in email: `org_7000000104@ecovia.local`.
2. Update the Vercel variable `OTP_DEMO_ALLOWLIST` (comma-separated list):
   - Dashboard: **Vercel → ecovia → Settings → Environment Variables →
     `OTP_DEMO_ALLOWLIST` (Production) → Edit**.
   - Or from the terminal:
     ```bash
     vercel env add OTP_DEMO_ALLOWLIST --environment production --sensitive --force
     # paste the full list, for example:
     # 0500000101,0500000102,0500000103,0500000104,org_7000000101@ecovia.local,...,org_7000000104@ecovia.local
     ```
3. Redeploy so the new value takes effect: **Deployments → latest Production → Redeploy**,
   or run `vercel redeploy <latest-production-url> --target production`.

Never put real people's phone numbers or company CR numbers in the demo list.
Anyone who knows a demo identity can sign in as that account.
