# Backend Code Review - Leader Notes

Ngay review: 2026-05-19

## Cap nhat sau refactor

Da thuc hien cac muc uu tien cao trong huong refactor:

- Go secret that khoi `.env.cicd.example` va thay bang placeholder.
- Tach `lint` va `lint:fix` de CI khong tu sua source.
- Chuan hoa CORS origin, bo trailing slash mac dinh.
- Them type cho `AuthenticatedUser`, `JwtPayload`, user document, auth token document va search document.
- Refactor auth: refresh token dang opaque, luu hash, rotate khi refresh, revoke khi logout/reset password.
- Refactor forgot/reset password: response generic cho forgot password, reset token luu hash thay vi plain text.
- Refactor search: loc access theo `DocumentCategory.accessLevel`, bo cac field khong co trong Prisma schema nhu `required_role_id`, `department_id`, `tags`.
- Siết validation `SearchDocumentDto` cho `page`, `limit`, `keyword`.
- Cap nhat e2e test root va health, mock database de test khong phu thuoc MongoDB that.

Ket qua verification sau refactor:

- `npm run build`: PASS.
- `npm run lint`: PASS.
- `npm test -- --runInBand`: PASS, 2 suites, 4 tests.
- `npm run test:e2e`: PASS, 1 suite, 2 tests.
- `npx prisma validate`: PASS.
- `npm audit --omit=dev --audit-level=moderate`: PASS, 0 vulnerabilities.

Con lai nen lam o dot tiep theo:

- Quyet dinh dung Prisma-first hay Mongo-native-first cho data access toan project.
- Bo hard-code ObjectId role, thay bang role `code`/stable key.
- Them migration/index script cho MongoDB: unique email, token hash index, TTL cho token, index search.
- Bo sung unit test AuthService va SearchService cho cac case phan quyen/expired token.

## Ket luan tong quan

Trang thai ban dau chua du sach va chua san sang de mo rong theo chuan production backend NestJS. Sau dot refactor nay, cac blocker ve secret example, lint, e2e, type-safety core, auth token va search permission da duoc xu ly. Kien truc van can mot dot chuan hoa data access lon hon de quyet dinh Prisma-first hay Mongo-native-first.

Danh gia nhanh:

- Build: PASS.
- Unit test: PASS, nhung coverage van mong.
- E2E test: PASS.
- Lint: PASS.
- Kien truc: da tot hon o auth/users/search, nhung van can chuan hoa chien luoc data access.
- Kha nang mo rong: trung binh; co nen tang type/test tot hon, nhung role/data-access/indexing can lam tiep.

## Blocker / High Priority

### 1. Lo secret that trong file dang duoc Git track

File: `.env.cicd.example`

Van de:

- Line 30 co JWT secret that/gan-that thay vi placeholder.
- Line 36-37 co Gmail email va app password.
- File nay dang duoc Git track (`git ls-files .env.cicd.example`).
- File example khong duoc chua credential that. Neu da push remote, can xem nhu secret da bi lo.

Tac dong:

- Co the bi chiem quyen gui mail.
- JWT secret bi lo co the lam gia token neu dang dung secret do o moi truong nao do.

De xuat:

- Rotate ngay Gmail app password va JWT secret.
- Doi `.env.cicd.example` ve placeholder.
- Kiem tra git history neu secret da tung duoc push.
- Them secret scanning vao CI.

### 2. Search public/private co nguy co sai phan quyen va sai schema

Files:

- `src/modules/search/search.controller.ts`
- `src/modules/search/search.service.ts`
- `src/modules/search/search.repository.ts`
- `prisma/schema.prisma`

Van de:

- Public endpoint `GET /search/documents` goi `searchDocuments(query)` khong co user.
- SearchService loc public bang `status = active` va `required_role_id in [null, undefined, '']`.
- Prisma model `KnowledgeDocument` khong co field `required_role_id`, `departmentId`, `department_id`, `description`, `tags`.
- Access level nam o `DocumentCategory.accessLevel`, nhung search khong join/lookup category de enforce `public/internal/restricted`.

Tac dong:

- Public search co the tra ve tai lieu noi bo/restricted neu document khong co `required_role_id`.
- Private search co the tra sai hoac rong vi query theo field khong ton tai trong schema.
- Khi mo rong RBAC, logic nay se kho debug vi contract DB khong ro rang.

De xuat:

- Dinh nghia lai contract cho search document: document co field nao, phan quyen nam o document hay category.
- Neu accessLevel nam o category, dung aggregation `$lookup` sang `document_categories` hoac denormalize `accessLevel` vao document.
- Bo cac field snake_case khong co trong schema, chuan hoa camelCase.
- Viet test cho 3 case: public chi thay public, user thuong chi thay dung scope, admin/BGD thay full.

### 3. E2E test dang fail va khong phan anh API hien tai

File: `test/app.e2e-spec.ts`

Lenh chay:

```bash
npm run test:e2e
```

Ket qua:

- Test expect body `'Hello World!'`.
- App hien tai tra object `{ name, status, apiVersion, author }`.

Tac dong:

- Pipeline e2e neu bat se fail.
- Chat luong regression test thap vi test mac dinh NestJS chua duoc cap nhat theo API that.

De xuat:

- Cap nhat e2e root endpoint theo response that.
- Bo sung e2e cho `/api/v1/health`, `/api/v1/auth/login`, `/api/v1/search/documents`.
- Test e2e can mock/stub DB hoac dung test database rieng, khong dung database production.

### 4. Lint fail nhieu loi type-safety va formatting

Lenh chay:

```bash
npx eslint "{src,apps,libs,test}/**/*.ts"
```

Ket qua:

- 128 errors, 10 warnings.
- Nhieu loi `no-unsafe-assignment`, `no-unsafe-member-access`, `no-unsafe-return`.
- Nhieu file bi Prettier complain.

Vi du:

- `src/modules/auth/auth.service.ts` dung `any` cho user, tokenDoc.
- `src/modules/users/users.repository.ts` dung `any` cho input create/update.
- `src/modules/search/search.service.ts` dung `any` cho filter va user.
- `src/common/decorators/current-user.decorator.ts` return `request.user` khong typed.

Tac dong:

- Code compile duoc nhung de vo runtime khi shape data thay doi.
- Moi nguoi trong team kho refactor vi TypeScript khong bao ve du.

De xuat:

- Tao interface/type rieng: `AuthenticatedUser`, `UserDocument`, `CreateUserInput`, `PasswordResetTokenDocument`, `SearchDocumentFilter`.
- Dung generic cua Mongo collection thay vi `collection<any>`.
- Doi lint script: CI nen chay lint khong `--fix`; local format/fix tach script rieng.

### 5. Auth flow tao refresh token nhung chua co revoke/rotate/endpoint refresh

File: `src/modules/auth/auth.service.ts`

Van de:

- `login()` tra `refresh_token`.
- Khong thay endpoint refresh token.
- Khong luu refresh token hash vao DB.
- Khong co revoke/logout/session management.
- `jwtRefreshSecret` co default `'refresh-secret-key'` trong config.

Tac dong:

- Refresh token bi leak thi khong co cach revoke.
- Default secret nguy hiem neu deploy thieu env.
- API contract gay hieu nham cho frontend vi co refresh token nhung backend chua support vong doi token.

De xuat:

- Hoac tam thoi bo `refresh_token` khoi response.
- Hoac implement day du refresh flow: store hashed refresh token, rotate token, logout revoke, expiry, device/session metadata.
- Bat buoc `JWT_REFRESH_SECRET` o production, khong default secret yeu.

## Medium Priority

### 6. Forgot password de lo email enumeration va token dang luu plain text

Files:

- `src/modules/auth/auth.service.ts`
- `src/modules/auth/auth.repository.ts`

Van de:

- `forgotPassword()` tra 404 neu email khong ton tai.
- Reset token luu plain text trong collection `password_reset_tokens`.
- Khong thay TTL index cho token het han.
- `resetPassword()` update password nhung khong invalidate session/token hien co.

Tac dong:

- Attacker co the do email ton tai trong he thong.
- Neu DB bi doc, token reset password co the dung truc tiep.
- Token cu co the ton lau neu khong duoc cleanup.

De xuat:

- Luon tra response generic cho forgot password.
- Luu hash cua reset token, so sanh hash khi reset.
- Tao TTL index tren `expiresAt`.
- Sau reset password, revoke refresh sessions neu co.

### 7. Validation cua SearchDocumentDto chua chat

File: `src/modules/search/dto/search-document.dto.ts`

Van de:

- `limit` va `page` khai bao number nhung khong co `@Type(() => Number)`, `@IsInt`, `@Min`, `@Max`.
- Global ValidationPipe co `transform: true` nhung DTO khong khai bao transform.
- `limit=abc`, `page=-10`, `limit=100000` co the di vao query.

Tac dong:

- Pagination sai, query nang, co nguy co lam cham DB.

De xuat:

- Ke thua `PaginationQueryDto` hoac them validation tuong tu.
- Gioi han `limit` toi da, vi du 100.
- Trim keyword va gioi han length keyword.

### 8. Repository native Mongo va Prisma schema dang song song nhung chua co contract ro

Files:

- `prisma/schema.prisma`
- `src/modules/*/*.repository.ts`

Van de:

- Project co Prisma schema day du nhung runtime repository dung native Mongo driver.
- Code comment noi "chuan Prisma" nhung insert/query truc tiep vao Mongo.
- Quan he, enum, field mapping trong Prisma khong duoc enforce khi dung native driver.

Tac dong:

- Schema drift: code query field A, Prisma model field B.
- Kho migrate, kho generate type, kho test.
- Khi mo module moi, dev co the khong biet nen dung Prisma hay Mongo native.

De xuat:

- Chon mot huong chinh:
  - Dung Prisma Client cho CRUD/RBAC schema-first.
  - Hoac bo Prisma runtime expectation, tao Mongo collection types/index scripts rieng.
- Neu van can native Mongo cho search/aggregation, chi dung o module can performance va co typed document contract.

### 9. Role ID hard-code trong source

File: `src/common/constants/role.constants.ts`

Van de:

- Role IDs hard-code theo du lieu Mongo hien tai.
- Seed role trong `prisma/seed.ts` tao role theo name, khong dam bao id khop voi constant.

Tac dong:

- Moi truong moi/seed moi co the login/register sai role.
- Kho maintain khi doi role.

De xuat:

- Lookup role theo stable key/name/code thay vi hard-code ObjectId.
- Them field `code` cho Role, unique.
- Register default role bang `code = USER` hoac config.

### 10. CORS default co trailing slash va dang hard-code domain

File: `src/config/app.config.ts`

Van de:

- Default origin co `'https://frontend-hto.vercel.app/'` co slash cuoi.
- Browser Origin header thuong khong co slash cuoi, co the mismatch.
- Production origin nen den tu env, khong hard-code trong source.

Tac dong:

- CORS production co the loi kho debug.

De xuat:

- Normalize origin bo slash cuoi.
- Production bat buoc set `CORS_ORIGINS`.
- Neu khong co env o production thi fail fast.

## Code Cleanliness / Maintainability

### Diem on

- Co module boundaries co ban: `AuthModule`, `UsersModule`, `SearchModule`, `DatabaseModule`, `MailModule`.
- Co global `ValidationPipe`, exception filter, response interceptor, request-id middleware.
- Co health endpoint ping DB.
- Co docs ve RBAC/project structure.
- Package/build sau khi cai dependency dung thi compile duoc.

### Diem chua sach

- Encoding/comment tieng Viet trong nhieu file bi mojibake, lam docs va log kho doc.
- Constructor formatting khong thong nhat, Prettier fail.
- Dung `any` o service/repository/controller qua nhieu.
- DTO con thieu validation va transform.
- AuthService dang lam nhieu viec: register, login, token signing, forgot/reset password, mail orchestration.
- Response shape Swagger chua match voi global `ResponseInterceptor`; docs API co the misleading.
- UsersController rong, tao surface API nhung khong co endpoint.
- Test coverage moi cham middleware/filter, chua cham auth/search/users.

## De xuat huong refactor de de mo rong

### Phase 1 - Lam sach blocker

- Remove secret khoi `.env.cicd.example`, rotate credentials.
- Fix e2e root test va them health test.
- Fix lint/prettier baseline, tach `lint` va `lint:fix`.
- Update `SearchDocumentDto` pagination validation.
- Fix CORS origin normalize.

### Phase 2 - Chuan hoa domain contract

- Tao typed Mongo documents/interfaces cho users, tokens, documents.
- Dinh nghia `AuthenticatedUser` va dung trong `CurrentUser`, `JwtStrategy`, `AuthController`.
- Bo `any` khoi service/repository core.
- Quyet dinh Prisma-first hay Mongo-native-first.
- Them index scripts: users email unique, password_reset_tokens token/hash unique, TTL expiresAt, documents search fields.

### Phase 3 - Auth/RBAC san sang production

- Doi forgot password response generic.
- Hash reset token.
- Them refresh token flow hoac bo refresh token.
- Them guards/decorators RBAC: `@Roles`, `@Permissions`, `@Public`.
- Khong hard-code ObjectId role; dung role code.

### Phase 4 - Test va CI

- Unit test AuthService: register duplicate email, inactive user login, reset expired token, reset success.
- Unit test SearchService: public/private/admin filtering.
- E2E test auth/search voi test DB.
- CI chay: `npm ci`, `npm run build`, `npm test`, `npm run test:e2e`, `npm run lint`, `npx prisma validate`, `npm audit --omit=dev`.

## Lenh da chay khi review

```bash
npm ci --no-audit --no-fund
npm run build
npm test -- --runInBand
npx prisma validate
npm run test:e2e
npx eslint "{src,apps,libs,test}/**/*.ts"
npm audit --omit=dev --audit-level=moderate
```

Ket qua tom tat:

- `npm run build`: pass sau khi `npm ci`.
- `npm test -- --runInBand`: pass, 2 suites, 4 tests.
- `npx prisma validate`: pass.
- `npm run test:e2e`: fail do expected `'Hello World!'` khong con dung.
- `npx eslint ...`: fail 128 errors, 10 warnings.
- `npm audit --omit=dev --audit-level=moderate`: 0 vulnerabilities.
