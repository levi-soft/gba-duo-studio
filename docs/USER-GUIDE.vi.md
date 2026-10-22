# Hướng dẫn GBA Duo Studio

[English](USER-GUIDE.md) · [Trang chủ tiếng Việt](../README.vi.md)

## Yêu cầu và cài đặt

Cần Node.js 22.17 trở lên và npm. Dùng Git để clone hoặc giải nén ZIP mã nguồn của repository. Chạy `npm ci`, sau đó `npm run dev -- --host 127.0.0.1`. Trên Windows có thể chạy `Run-Studio.bat`; launcher sẽ cài thư viện nếu thiếu và mở giao diện. Nếu chạy Vite bằng tay, giữ terminal đang chạy.

Mở địa chỉ hiển thị trong terminal, thường là `http://127.0.0.1:5173`. Chỉ dùng trên máy cục bộ, không đưa server ra Internet. Launcher Windows dùng cổng 5173 và không thay thế ứng dụng khác đang chiếm cổng. `Stop-Studio.bat` chỉ dừng đúng tiến trình do launcher mở; Ctrl+C dừng server chạy trong terminal.

## Ngôn ngữ và bố cục

Mặc định là tiếng Anh. Chọn **Tiếng Việt** ở menu trên cùng; trình duyệt ghi nhớ lựa chọn. Nội dung mẫu của dự án mới theo ngôn ngữ đã chọn. Đổi ngôn ngữ giao diện không dịch lại văn bản trong dự án đã có.

Bên trái là Scene, Components và Assets; giữa là canvas 2D, Preview và công cụ dữ liệu. Inspector ở bên phải: **Content** chỉnh nội dung, **Appearance** chỉnh hình thức, **Behavior** chỉnh tương tác. Cấu hình dữ liệu và script toàn dự án nằm trong **Project Tools**.

## Tạo, lưu và xuất companion

1. Tạo dự án hoặc chọn mẫu trung lập. Đặt tên, mã game và kích thước màn hình thiết kế trong Project.
2. Thêm container, chữ, ảnh, thanh progress, danh sách và nút. Kéo thành phần vào container, chỉnh kích thước, khoảng cách và hình thức trong Inspector. Thêm ảnh, SVG và font của bạn qua Assets.
3. Nhập dữ liệu mẫu, nối chữ với trường bằng `{field}`. Thanh progress và danh sách dùng các trường đã cấu hình. Preview cho phép thử chuyển trang/tab; chế độ 2D dùng để chọn và chỉnh thành phần.
4. Dùng **Save Project** để tải dự án có thể chỉnh sửa. Dữ liệu trình duyệt không thay thế bản sao lưu. Giữ dự án riêng ngoài thư mục mã nguồn Studio.
5. Xuất **Pack ZIP**, nhập vào GBA Duo và gán đúng game. File dự án để chỉnh sửa và pack chạy trong giả lập có mục đích khác nhau; nên giữ cả hai.
6. Kiểm tra kích thước màn hình thật, tên dài, dữ liệu thay đổi, cuộn, tab và thao tác chạm trên thiết bị. Preview đúng không bảo đảm pack chạy đúng trên mọi giả lập.

Có thể mở lại dự án hoặc nhập pack có sẵn. Lua và asset nhập vào được giữ lại; cần kiểm tra quyền sử dụng trước khi chia sẻ.

## Dữ liệu game và Lua

Studio không tự tìm ý nghĩa RAM. Trong Project Tools, khai báo địa chỉ đã xác minh hoặc con trỏ cộng offset, kiểu số, mask và shift. Pack đơn giản có thể dùng giá trị manifest gốc không cần Lua riêng. Với logic phức tạp, tạo/nhập Lua, chỉnh rồi chọn **Save and use this script**. Xem thêm [quy trình kỹ thuật bằng tiếng Anh](AUTHORING.md).

Preview không chạy ROM hay Lua tùy ý. Dữ liệu Lua trực tiếp lấy từ companion tương ứng đang chạy trong giả lập. RAM Inspector và trường RAM có sẵn hỗ trợ GBA EWRAM/IWRAM; không mặc định áp dụng cùng địa chỉ hoặc công cụ cho GB/GBC.

## Kết nối máy chơi game để đọc RAM

1. Cài [GBA Duo Plus 0.1.6](https://github.com/levi-soft/gba-duo-plus/releases/tag/plus-v0.1.6) hoặc bản có bridge tương thích. Pack theo định dạng gốc không bắt buộc dùng tính năng riêng của Plus.
2. Cài Android SDK Platform-Tools trên PC. Thêm `adb` vào PATH hoặc đặt `GBA_DUO_ADB` thành đường dẫn tuyệt đối tới file ADB trước khi mở Studio.
3. Bật USB debugging trên máy chơi game, nối USB và chấp nhận thông báo cấp quyền cho PC. `adb devices` phải hiển thị trạng thái `device`.
4. Mở game trong Plus, bật **Studio Connection** trong menu nhanh cho phiên hiện tại.
5. Trong công cụ RAM của Studio, làm mới danh sách, chọn thiết bị rồi kết nối. Đọc vùng địa chỉ đã biết, theo dõi giá trị hoặc chụp RAM để phân tích riêng. Bridge chỉ đọc dữ liệu.

Studio chuyển tiếp ADB cục bộ qua cổng 8787; không cung cấp lệnh shell tùy ý hay ghi RAM. Không chia sẻ ROM, thông tin tài khoản hoặc bản chụp RAM.

## Xử lý lỗi và giới hạn

| Hiện tượng | Cách kiểm tra |
|---|---|
| Không khởi động | Kiểm tra `node --version`, chạy `npm ci`, xem terminal hoặc `.studio-runtime/server-error.log`. |
| Cổng 5173 bị chiếm | Đóng phiên Studio cũ hoặc chạy Vite thủ công với cổng cục bộ khác; không dừng nhầm ứng dụng khác. |
| Không thấy thiết bị | Kiểm tra cáp, USB debugging, ADB và quyền kết nối trên thiết bị. |
| Không kết nối bridge | Giữ game đang chạy, bật lại Studio Connection cho phiên hiện tại và kiểm tra cổng 8787. |
| Có dữ liệu mẫu nhưng thiếu dữ liệu thật | Kiểm tra mã game, companion đã gán, địa chỉ RAM và nguồn dữ liệu; Studio không có adapter sẵn cho từng game. |
| Giao diện trên máy khác Preview | Kiểm tra tỉ lệ màn hình, widget/CSS gốc và thao tác riêng của giả lập; thử pack trên thiết bị đích. |

Đây là bản beta. Chạy `npm run verify` để kiểm tra tự động; `npm run source:zip` tạo gói mã nguồn theo danh sách cho phép. Các tài liệu kỹ thuật: [kết quả kiểm tra](VALIDATION-2026-10-22.md), [bảo mật](../SECURITY.md), [giấy phép/tri ân](../NOTICE.md), [đóng góp](../CONTRIBUTING.md). Báo lỗi tại [levi-soft/gba-duo-studio](https://github.com/levi-soft/gba-duo-studio/issues), không đính kèm dữ liệu game riêng.
