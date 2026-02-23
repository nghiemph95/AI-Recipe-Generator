# Hướng dẫn deploy AI Recipe Generator

Ứng dụng gồm **frontend (Vite/React)** và **backend (Express)**. Có thể deploy:
- **Toàn bộ trên Render** (backend + frontend, đều free tier), hoặc
- **Backend Railway/Render + Frontend Vercel**.

---

## Deploy toàn bộ lên Render (Backend + Frontend)

Cả backend và frontend đều host trên Render; không cần Vercel.

### Bước 1: Deploy Backend (Web Service)

1. Vào [render.com](https://render.com) → đăng nhập (GitHub) → **Dashboard** → **New +** → **Web Service**.
2. **Connect repository**: chọn repo của project (GitHub/GitLab).
3. Cấu hình:
   - **Name**: đặt tên (vd: `ai-recipe-api`).
   - **Region**: chọn gần bạn (vd: Singapore).
   - **Root Directory**: nhập `backend` (chỉ deploy thư mục backend).
   - **Runtime**: **Node**.
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
4. **Instance type**: chọn **Free** (backend sẽ sleep sau 15 phút không có request; lần gọi sau có thể chờ ~30s–1 phút để wake).
5. **Environment** (Environment Variables): thêm từng biến:
   - `NODE_ENV` = `production`
   - `DATABASE_URL` = connection string PostgreSQL (Neon hoặc Render PostgreSQL)
   - `JWT_SECRET` = chuỗi bí mật dài (random)
   - `GOOGLE_API_KEY` = API key Gemini  
   (Render tự set `PORT`; không cần set.)
6. **Create Web Service** → đợi deploy xong.
7. Copy **URL** của service (vd: `https://ai-recipe-api.onrender.com`). Đây là **Backend URL**.

### Bước 2: Deploy Frontend (Static Site)

1. Trên Render Dashboard → **New +** → **Static Site**.
2. **Connect** cùng repo.
3. Cấu hình:
   - **Name**: vd `ai-recipe-app`.
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Publish Directory**: `dist`
4. **Environment**:
   - `VITE_API_URL` = `https://<backend-url-của-bạn>/api`  
     Ví dụ: `https://ai-recipe-api.onrender.com/api`
5. **Create Static Site** → đợi build xong.
6. Render sẽ cho URL frontend (vd: `https://ai-recipe-app.onrender.com`).

### Lưu ý khi dùng Render Free

- **Backend Free**: service **tự tắt sau 15 phút không có request**. Lần mở app hoặc gọi API sau đó có thể chậm ~30s–1 phút (cold start).
- **Frontend Static Site**: free, không sleep.
- **Database**: dùng **Neon** (free tier) hoặc tạo PostgreSQL trên Render (free DB có giới hạn thời gian). Trong mọi trường hợp set đúng `DATABASE_URL` cho backend.

### Giảm hiện tượng sleep (keep-alive / “fake request”)

Backend đã có route **GET `/health`** trả về JSON nhẹ. Bạn có thể dùng **dịch vụ bên ngoài** gửi request định kỳ tới URL này để Render coi như “có traffic” và không tắt service sau 15 phút.

**Cách làm (không cần sửa code backend):**

1. **UptimeRobot** (miễn phí): [uptimerobot.com](https://uptimerobot.com)  
   - Add Monitor → **HTTP(s)** → URL: `https://<backend-url-của-bạn>/health` (vd: `https://ai-recipe-api.onrender.com/health`).  
   - Check interval: **5 phút** (free tier thường cho phép 5 phút).  
   - Mục đích: mỗi 5 phút gửi 1 request → backend không bị idle 15 phút.

2. **cron-job.org** (miễn phí): [cron-job.org](https://cron-job.org)  
   - Tạo job gọi `GET https://<backend-url>/health` với tần suất **mỗi 10 phút** (hoặc 14 phút, miễn là &lt; 15 phút).

3. **Frontend (tùy chọn)**: Khi user đang mở app, frontend có thể gọi `GET /health` mỗi vài phút để giữ backend thức trong lúc có người dùng (ví dụ mỗi 5 phút). Cách này chỉ có tác dụng khi có người dùng; khi không ai mở app thì vẫn cần UptimeRobot/cron bên ngoài.

**Lưu ý:** Render free tier vẫn giới hạn **750 giờ/tháng**. Keep-alive chỉ tránh cold start khi có user; không làm tăng giới hạn giờ.

---

## 1. Deploy Backend (Railway hoặc Render) — dùng kèm Vercel

Backend cần chạy liên tục (Express + PostgreSQL). Không deploy backend lên Vercel.

### 1.1. Railway (gợi ý)

1. Đăng nhập [railway.app](https://railway.app), tạo project mới.
2. **Add Service** → **GitHub Repo** → chọn repo, **Root Directory** chọn `backend`.
3. **Variables** (Settings → Variables): thêm từng biến (hoặc kéo file `.env`):
   - `PORT` — Railway tự gán, có thể để trống hoặc `8000`
   - `DATABASE_URL` — connection string PostgreSQL (Neon hoặc Railway Postgres)
   - `JWT_SECRET` — chuỗi bí mật dài, random
   - `GOOGLE_API_KEY` — API key Gemini (AI)
   - `NODE_ENV` = `production`
4. **Deploy**: Railway build bằng `npm install` và chạy `npm start` (script `start` trong `package.json`).
5. Sau khi deploy xong: **Settings** → **Networking** → **Generate Domain** → copy URL (vd: `https://xxx.up.railway.app`). Đây là **Backend URL** dùng cho bước 2.

### 1.2. Render (chỉ backend, frontend deploy Vercel)

1. [render.com](https://render.com) → **New** → **Web Service**.
2. Kết nối repo, **Root Directory**: `backend`.
3. **Build Command**: `npm install` — **Start Command**: `npm start`.
4. **Environment**: thêm `DATABASE_URL`, `JWT_SECRET`, `GOOGLE_API_KEY`, `NODE_ENV=production`.
5. Deploy xong lấy URL (vd: `https://your-app.onrender.com`). Nếu dùng **toàn bộ trên Render**, xem mục **Deploy toàn bộ lên Render** ở đầu file.

---

## 2. Deploy Frontend lên Vercel

1. Đăng nhập [vercel.com](https://vercel.com), **Add New** → **Project**.
2. Import repo GitHub/GitLab/Bitbucket.
3. Cấu hình:
   - **Root Directory**: chọn `frontend` (bấm **Edit**).
   - **Framework Preset**: Vite (Vercel tự nhận).
   - **Build Command**: `npm run build` (mặc định).
   - **Output Directory**: `dist` (mặc định).
4. **Environment Variables** (quan trọng):
   - `VITE_API_URL` = URL backend đã deploy ở bước 1 (phải kết thúc bằng `/api`).
     - Ví dụ Railway: `https://xxx.up.railway.app/api`
     - Ví dụ Render: `https://your-app.onrender.com/api`
5. **Deploy**. Sau khi xong bạn có URL frontend (vd: `https://your-app.vercel.app`).

---

## 3. CORS (nếu cần)

Backend hiện dùng `cors()` mặc định (cho phép mọi origin). Nếu muốn giới hạn:

- Trong backend, có thể đọc biến môi trường `FRONTEND_URL` (vd: `https://your-app.vercel.app`) và cấu hình `cors({ origin: process.env.FRONTEND_URL })`. Không bắt buộc nếu bạn tạm chấp nhận mọi origin.

---

## 4. Checklist trước khi deploy

| Việc cần làm | Frontend (Vercel hoặc Render Static) | Backend (Railway/Render) |
|--------------|--------------------------------------|---------------------------|
| Root directory | `frontend` | `backend` |
| Biến môi trường | `VITE_API_URL` = `https://<backend-domain>/api` | `DATABASE_URL`, `JWT_SECRET`, `GOOGLE_API_KEY`, `NODE_ENV=production` |
| File `.env` | Không commit; chỉ dùng env trên hosting | Không commit; chỉ dùng env trên hosting |

---

## 5. Sau khi deploy

- Mở URL Vercel (frontend) → đăng ký/đăng nhập và dùng app. Frontend sẽ gọi API qua `VITE_API_URL`.
- Nếu lỗi “network” hoặc CORS: kiểm tra `VITE_API_URL` đúng URL backend và backend đã chạy (mở `https://<backend-url>/health` xem có trả về JSON không).
