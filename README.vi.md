# GBA Duo Studio

Đợt cập nhật công cụ tạo companion ngày **28/10/2026** giữ phiên bản
**0.3.0-beta.1**: sửa gói có hướng dẫn, khối dữ liệu tái sử dụng, thay ảnh/font
và kiểm tra chung với Builder. Xem [ghi chú thay đổi](CHANGELOG.md) và
[phạm vi đã kiểm thử](docs/TRIAL-READINESS.vi.md).

Studio tập trung vào Design, Code và Test. Codex sửa tệp trong thư mục dự án,
Studio đọc lại để chỉnh tiếp bằng giao diện.

Bản phát triển đã có [công cụ xem ROM/đồ họa](docs/ROM-GRAPHICS.vi.md) và block ảnh
đọc tài nguyên từ ROM của người chơi, không cần đóng gói PNG của game.

Công cụ thiết kế companion bằng kéo thả cho GBA Duo. Giao diện mặc định tiếng Anh, có thể đổi sang tiếng Việt. Đây là công cụ cộng đồng, không phải bản phát hành chính thức của GBA Duo.

## Chạy Studio

Tải mã nguồn:

```sh
git clone https://github.com/levi-soft/gba-duo-studio.git
cd gba-duo-studio
```

Cài Node.js 22.17 trở lên. Trên Windows, chạy `Run-Studio.bat`. Hoặc chạy:

```sh
npm ci
npm run dev -- --host 127.0.0.1
```

Chỉ chạy trên máy cục bộ, không mở server ra mạng.

Mở địa chỉ Vite hiển thị, thường là `http://127.0.0.1:5173`. Trên Windows, dùng `Stop-Studio.bat` để dừng server do launcher mở; nếu chạy bằng terminal, bấm Ctrl+C. Lần đầu cần mạng để cài thư viện; thiết kế bằng dữ liệu mẫu không cần kết nối máy chơi game.

Đọc [hướng dẫn đầy đủ bằng tiếng Việt](docs/USER-GUIDE.vi.md) hoặc [English user guide](docs/USER-GUIDE.md). Tài liệu và giao diện mặc định là tiếng Anh; có thể chọn Tiếng Việt trên thanh menu.

## Hỗ trợ GBA Duo Plus

[GBA Duo Plus](https://github.com/levi-soft/gba-duo-plus) là bản giả lập Android do chúng tôi phát triển tiếp từ GBA Duo. Studio **hỗ trợ Studio Connection của Plus** để đọc RAM và xem dữ liệu thật của companion đang được gán qua USB/ADB. Tải [Plus 0.1.6](https://github.com/levi-soft/gba-duo-plus/releases/tag/plus-v0.1.6), bật Studio Connection trong game rồi làm theo [hướng dẫn kết nối](docs/USER-GUIDE.vi.md#kết-nối-máy-chơi-game-để-đọc-ram).

Quy trình: **thiết kế trong Studio → xuất Pack ZIP → nhập/gán trong Plus → kiểm tra trên thiết bị**. Pack theo định dạng gốc cũng có thể dùng với GBA Duo chính thức tương thích; chỉ tính năng cần hỗ trợ riêng của Plus, như bridge đọc RAM, mới yêu cầu Plus.

## Thiết kế companion

1. Tạo dự án từ mẫu trung lập; chọn kích thước màn hình thiết kế.
2. Kéo thành phần vào Scene/canvas. Inspector có Content, Appearance và Behavior.
3. Thêm ảnh/font của bạn, dữ liệu mẫu, tab, danh sách và điều kiện hiển thị.
4. Data dùng để sửa dữ liệu xem thử. Cấu hình trường RAM đã biết nằm trong mục Nâng cao.
5. Sửa Lua, manifest, layout và CSS trong Code hoặc bằng Codex trong thư mục nguồn. Chọn script gốc bằng thao tác riêng.
6. Nhập mã game trong Project, xuất ZIP và nhập ZIP vào GBA Duo. Kiểm tra trên thiết bị thật.

Studio không tự suy ra địa chỉ RAM hoặc cơ chế của mọi game. Người tạo companion vẫn cần tìm địa chỉ và viết logic riêng khi cần. RAM Inspector hỗ trợ đọc dữ liệu qua ADB với bản giả lập có cầu nối tương thích.

GBA Duo chính thức có thể dùng pack theo định dạng gốc. Kết nối RAM trực tiếp và điều khiển đặc thù phụ thuộc tính năng mà bản giả lập hỗ trợ; không phải yêu cầu bắt buộc của mọi pack.

## Kiểm tra và chuẩn bị mã nguồn

```sh
npm run verify
npm run source:zip
```

Lệnh thứ hai tạo ZIP mã nguồn trong `.studio-runtime/distribution/`, không chứa lịch sử Git, dự án private, dữ liệu thiết bị hoặc `node_modules`.

Có thể chạy thêm `npm run test:ui` để kiểm tra trọn luồng bằng trình duyệt thật.
Xem [cách chạy và giới hạn](docs/AUTHOR-FLOW-TESTS.vi.md) và
[trạng thái bản dùng thử cục bộ](docs/TRIAL-READINESS.vi.md).

Giấy phép: GPL-3.0-only. Xem [NOTICE.md](NOTICE.md) để biết nguồn CSS tương thích và thư viện. Giấy phép Studio không thay đổi quyền sở hữu asset hay companion do bạn tạo.

Studio do [levi-soft](https://github.com/levi-soft) duy trì, tạo companion cho [GBA Duo của khumam](https://github.com/khumam/gba-duo). Xin cảm ơn tác giả và các cộng tác viên GBA Duo đã phát triển giả lập và định dạng companion gốc. Đây là công cụ cộng đồng độc lập, không phải giả lập hay simulator chính thức.
