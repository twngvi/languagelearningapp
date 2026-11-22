# Shin - Học tiếng Anh

Shin là ứng dụng học tiếng Anh cá nhân, giao diện tiếng Việt, có thể dùng trên máy tính và điện thoại.

## Link sử dụng

<https://twngvi.github.io/languagelearningapp/>

## Tính năng chính

- Lưu, sửa, xóa và tìm kiếm từ vựng.
- Tự động gợi ý và điền nghĩa tiếng Việt khi nhập từ tiếng Anh.
- Tự động gợi ý và điền bản dịch tiếng Việt khi nhập câu tiếng Anh.
- Có thể đổi chiều dịch để nhập tiếng Việt trước; dữ liệu vẫn được lưu và hiển thị theo tiếng Anh.
- Tạo bộ từ để học theo chủ đề.
- Nhập nhiều từ hoặc câu cùng lúc.
- Học bằng flashcard, trắc nghiệm và điền từ.
- Luyện nói với câu mẫu, phát âm và ghi âm.
- Theo dõi tiến độ, lịch sử học và các từ cần ôn.
- Chọn giọng đọc và tốc độ đọc mặc định trong phần **Cài đặt**.
- Giao diện responsive, dùng tốt trên máy tính và điện thoại.
- Có thể cài thành ứng dụng từ Chrome hoặc Edge.

## Lưu dữ liệu

Ứng dụng vẫn hoạt động khi không có mạng. Dữ liệu được lưu trên thiết bị bằng bộ nhớ trình duyệt.

Nếu muốn dùng chung dữ liệu trên máy tính và điện thoại:

1. Trong Supabase, cho phép `https://twngvi.github.io/languagelearningapp/#settings` ở **Authentication → URL Configuration → Redirect URLs**, rồi chạy tệp [`supabase-schema.sql`](./supabase-schema.sql) trong SQL Editor. Nếu bảng `app_records` đã được tạo trước đây, chạy lại phần thêm cột `deleted_at` trong tệp này.
2. Vào **Cài đặt**, nhập cùng một email trên mỗi thiết bị và mở link đăng nhập trên chính trình duyệt đang dùng ứng dụng.
3. Dữ liệu sẽ tự đồng bộ khi đăng nhập, khi mở lại ứng dụng hoặc khi ứng dụng được đưa về trước. Có thể bấm **Đồng bộ ngay** để cập nhật tức thì.

Bạn cũng có thể dùng **Xuất toàn bộ JSON** để sao lưu hoặc chuyển dữ liệu thủ công.

## Cài đặt trên thiết bị

### Máy tính

Mở link bằng Chrome hoặc Edge, chọn biểu tượng **Cài đặt ứng dụng** trên thanh địa chỉ.

### Điện thoại

Mở link bằng trình duyệt, chọn **Thêm vào màn hình chính**.

## Chạy trên máy local

Nếu có Python, chạy lệnh sau trong thư mục dự án:

```powershell
python -m http.server 8000 --bind 127.0.0.1
```

Sau đó mở:

<http://127.0.0.1:8000/>

## Công nghệ

- HTML, CSS, JavaScript.
- IndexedDB để lưu dữ liệu nội bộ.
- Supabase để đồng bộ dữ liệu giữa các thiết bị.
- PWA để cài ứng dụng và học offline.
