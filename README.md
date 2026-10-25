# Shin - Học tiếng Anh

Shin là ứng dụng học tiếng Anh cá nhân, giao diện tiếng Việt, chạy trực tiếp trên trình duyệt và có thể cài như một ứng dụng trên máy tính hoặc điện thoại.

Ứng dụng được thiết kế theo hướng **offline-first**:

- Vẫn học và lưu dữ liệu khi không có mạng.
- Dữ liệu được lưu cục bộ bằng IndexedDB.
- Có thể đồng bộ dữ liệu giữa máy tính và điện thoại qua Supabase khi đăng nhập và có mạng.
- Có chức năng xuất/nhập dữ liệu để sao lưu thủ công.

## Link sử dụng

Ứng dụng được phát hành miễn phí bằng GitHub Pages:

<https://twngvi.github.io/languagelearningapp/>

## Tính năng hiện tại

### Trang chủ

- Xem tổng quan số từ đã lưu.
- Xem số từ cần ôn.
- Xem số từ đã học.
- Xem bộ từ gần đây.
- Xem buổi học gần nhất.
- Xem thống kê lượt ôn, tỷ lệ trả lời đúng và thời gian học.
- Có thông báo chào mừng có thể đóng.

### Từ vựng

- Thêm, sửa và xóa từ vựng.
- Lưu nghĩa tiếng Việt, phiên âm, câu ví dụ, ghi chú và chủ đề.
- Đánh dấu yêu thích, từ khó và đã ghi nhớ.
- Tìm kiếm theo từ, nghĩa hoặc ghi chú.
- Lọc theo bộ từ, chủ đề, yêu thích, từ khó và từ cần ôn.
- Nhập nhiều từ cùng lúc theo mẫu `từ tiếng Anh - nghĩa tiếng Việt`.
- Tra cứu từ tiếng Anh qua Dictionary API khi có mạng.
- Phát âm từ vựng bằng giọng đọc của trình duyệt.

### Bộ từ

- Tạo bộ từ riêng.
- Thêm hoặc xóa từ khỏi bộ.
- Sửa tên và mô tả bộ từ.
- Xóa bộ từ.
- Chọn bộ từ khi bắt đầu học.

### Học tập

Các chế độ học hiện có:

- Flashcard.
- Listen and Choose.
- Listen and Type.
- Fill in the Blank.
- Ôn các từ đã đến lịch.

Trong mỗi buổi học, app lưu:

- Chế độ học.
- Số thẻ.
- Đáp án đúng/sai.
- Đánh giá mức độ ghi nhớ.
- Thời gian học.
- Các từ đã học.

### Luyện nói

- Lưu câu tiếng Anh và bản dịch tiếng Việt.
- Thêm chủ đề, ghi chú và đánh dấu yêu thích.
- Tìm kiếm và lọc câu.
- Nhập nhiều câu theo mẫu `câu tiếng Anh - bản dịch tiếng Việt`.
- Các chế độ Listen and Repeat, Shadowing và Recall the Sentence.
- Ghi âm giọng nói nếu trình duyệt hỗ trợ.
- Theo dõi số lần đã luyện.
- Có thể tiếp tục buổi luyện đang dở.

### Tiến độ

- Tổng số từ đã lưu.
- Tổng số từ đã học.
- Tỷ lệ trả lời đúng.
- Số lượt ôn.
- Thời gian học.
- Số câu giao tiếp.
- Danh sách từ cần ôn.
- Lịch sử buổi học.
- Danh sách từ khó.

### Cài đặt

- Kiểm tra trạng thái database nội bộ.
- Chọn giọng đọc mặc định.
- Chọn tốc độ đọc từ `0.5x` đến `2.0x`.
- Nghe thử giọng đọc và tốc độ.
- Lưu lựa chọn giọng đọc cho các lần phát âm sau.
- Đăng nhập Supabase bằng email magic link.
- Đồng bộ dữ liệu giữa nhiều thiết bị.
- Xuất toàn bộ dữ liệu JSON.
- Xuất từ vựng CSV.
- Nhập dữ liệu JSON theo hai chế độ:
  - **Gộp dữ liệu:** giữ dữ liệu hiện tại và cập nhật bản ghi trùng ID.
  - **Thay thế dữ liệu:** xóa dữ liệu trong các kho có trong file rồi nhập dữ liệu mới.

## Lưu trữ dữ liệu

### Khi không có mạng

App vẫn hoạt động nhờ IndexedDB trên thiết bị:

- Từ vựng.
- Câu giao tiếp.
- Bộ từ.
- Lịch sử học.
- Cài đặt.
- Tiến độ luyện nói.

Mỗi trình duyệt và mỗi thiết bị có vùng dữ liệu riêng. Dữ liệu trên điện thoại không tự xuất hiện trên máy tính nếu chưa bật đồng bộ Supabase hoặc chưa chuyển bằng file JSON.

### Khi có mạng và đã đăng nhập

App có thể đồng bộ dữ liệu qua Supabase:

```text
Điện thoại ─┐
            ├── Supabase PostgreSQL
Máy tính ───┘
```

App ưu tiên lưu local trước, sau đó đồng bộ bản ghi lên Supabase khi thiết bị có mạng. Vì vậy mất mạng không làm gián đoạn việc học.

## Thiết lập Supabase

Tính năng đồng bộ cần một project Supabase. File schema nằm tại:

[supabase-schema.sql](./supabase-schema.sql)

### Tạo bảng đồng bộ

1. Mở Supabase Dashboard.
2. Vào **SQL Editor**.
3. Tạo query mới.
4. Copy toàn bộ nội dung trong `supabase-schema.sql`.
5. Bấm **Run**.

Schema tạo bảng `app_records` và bật Row Level Security để mỗi tài khoản chỉ đọc và ghi được dữ liệu của chính mình.

### Cấu hình đăng nhập email

Trong Supabase:

1. Vào **Authentication → Providers → Email** và bật Email provider.
2. Vào **Authentication → URL Configuration**.
3. Đặt Site URL là link GitHub Pages của ứng dụng.
4. Thêm link GitHub Pages vào Redirect URLs.

Trong ứng dụng:

1. Mở **Cài đặt**.
2. Nhập email dùng chung trên máy tính.
3. Bấm **Gửi link đăng nhập**.
4. Mở email và bấm magic link.
5. Lặp lại với cùng email trên điện thoại.
6. Bấm **Đồng bộ ngay** khi cần tải dữ liệu mới nhất.

> Supabase có giới hạn gửi email ở gói miễn phí. Không nên bấm gửi magic link liên tục. Nếu gặp lỗi `email rate limit exceeded`, hãy chờ giới hạn được reset và kiểm tra cả thư mục Spam.

## Sao lưu và chuyển dữ liệu

Nên xuất backup định kỳ:

1. Vào **Cài đặt**.
2. Chọn phạm vi dữ liệu.
3. Bấm **Xuất toàn bộ JSON**.
4. Lưu file ở nơi an toàn.

Để chuyển dữ liệu thủ công sang thiết bị khác:

1. Xuất file JSON trên thiết bị cũ.
2. Gửi file cho chính mình qua Drive, email hoặc ứng dụng nhắn tin.
3. Mở app trên thiết bị mới.
4. Vào **Cài đặt**.
5. Chọn file JSON.
6. Bấm **Gộp dữ liệu**.

Bản ghi âm không nằm trong file JSON và chỉ được lưu cục bộ trên thiết bị tạo bản ghi.

## Cài đặt như ứng dụng

Shin là PWA và có thể cài trên thiết bị.

### Máy tính

1. Mở link ứng dụng bằng Chrome hoặc Edge.
2. Chọn biểu tượng **Cài đặt ứng dụng** trên thanh địa chỉ.
3. Xác nhận cài đặt.

### Điện thoại

1. Mở link bằng Chrome hoặc Safari.
2. Chọn **Thêm vào màn hình chính**.
3. Mở Shin từ biểu tượng trên màn hình.

## Chạy ở máy local

Ứng dụng là web tĩnh, không cần build và không cần package manager.

Từ thư mục dự án, chạy:

```powershell
python -m http.server 8000 --bind 127.0.0.1
```

Sau đó mở:

<http://127.0.0.1:8000/>

Không nên mở trực tiếp file `index.html` bằng `file://` vì module JavaScript, IndexedDB, Service Worker và chức năng ghi âm cần môi trường HTTP hoặc HTTPS.

## Cấu trúc chính

```text
index.html              Giao diện HTML gốc và menu điều hướng
css/style.css           Giao diện, responsive và theme
js/app.js               Khởi động app và router
js/db.js                IndexedDB local database
js/speech.js            Phát âm và cài đặt giọng đọc
js/sync.js              Đồng bộ dữ liệu với Supabase
js/supabase.js          Kết nối và đăng nhập Supabase
js/backup.js            Xuất/nhập dữ liệu
pages/                  Template các trang trong ứng dụng
data/                   Dữ liệu mẫu
assets/icons/           Icon PWA
service-worker.js       Cache offline và cập nhật PWA
supabase-schema.sql     Schema database đồng bộ
```

## Công nghệ

- HTML5.
- CSS3.
- JavaScript ES Modules.
- IndexedDB.
- Service Worker.
- Progressive Web App (PWA).
- Supabase PostgreSQL và Supabase Auth.
- Web Speech API.
- MediaRecorder API.
- GitHub Pages.

## Lưu ý bảo mật

- Không đưa `service_role key` của Supabase vào mã frontend.
- Chỉ sử dụng publishable/anon key ở phía trình duyệt.
- Không chia sẻ file backup JSON nếu file có dữ liệu cá nhân.
- Nếu chỉ dùng một mình, nên bật Row Level Security như schema mẫu.
- GitHub Pages chỉ phục vụ mã nguồn; dữ liệu học được lưu ở IndexedDB hoặc Supabase, không nằm trong repository.
