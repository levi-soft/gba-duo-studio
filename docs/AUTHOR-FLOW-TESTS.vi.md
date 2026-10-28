# Kiểm thử trọn luồng tác giả companion

`npm run test:ui` mở trình duyệt thử riêng và thực hiện các thao tác trên giao
diện tiếng Việt. Không dùng phiên Chrome hay dự án đang mở của bạn.

## Chạy thử

Sau `npm ci`, cài trình duyệt kiểm thử một lần:

```sh
npx playwright install chromium
npm run test:ui
```

Hoặc dùng Chrome đã cài trên máy, trong PowerShell:

```powershell
$env:GBA_DUO_BROWSER_CHANNEL='chrome'
npm run test:ui
```

Để kiểm tra thêm tải và giải mã font thật, đặt đường dẫn tới tệp TTF cục bộ
trước khi chạy, ví dụ:

```powershell
$env:GBA_DUO_TEST_FONT='C:\Fonts\font-thu-cua-ban.ttf'
npm run test:ui
```

Không đặt biến font thì luồng chữ/ảnh/dữ liệu vẫn chạy, nhưng báo cáo ghi rõ
font chưa được kiểm tra. Font chỉ dùng trong kết quả thử cục bộ, không được
thêm vào mã nguồn. Hai khung nhìn mặc định là 1440×1000 và 390×844; khung nhìn
điện thoại không phải một máy Android thật.

## Luồng được kiểm tra

1. Chờ khôi phục dự án xong, chọn tiếng Việt và mở ZIP thử bằng nút Mở dự án.
2. Sửa nhãn tĩnh và phần chữ quanh dữ liệu trong Sửa companion.
3. Nếu có tệp font: nhập font, chờ trình duyệt giải mã, xem mẫu tiếng Việt và áp dụng.
4. Nhập SVG thay ảnh, giữ tài nguyên cũ khi trùng tên, thử Hoàn tác/Làm lại.
5. Gắn thanh chỉ số vào hai trường khác, giữ đúng giá trị mẫu bằng 0.
6. Xem thử toàn bộ, lưu JSON để sửa tiếp và tải ZIP qua nút trên giao diện.
7. Nếu có Builder cạnh Studio: chọn dự án tùy chỉnh, chọn ROM `TEST` tổng hợp,
   tạo ZIP bằng giao diện Builder rồi mở kết quả trong Studio.
8. Mở lại ZIP, tải lại trang để kiểm tra bản lưu trình duyệt, rồi xuất lại.

Luồng không nạp trạng thái nội bộ của ứng dụng bằng script. Tệp được nhập qua
file chooser/input và tải xuống qua nút/link thật. Sau xuất, kiểm tra lại chữ,
binding, ảnh/font, canvas/lưới, dữ liệu mẫu, Lua và mọi tài nguyên gốc.

Builder được tìm ở `../GBA-Duo-Companion-Builder` hoặc đường dẫn
`GBA_DUO_BUILDER_DIR`. Nếu không có bản nguồn Builder đã chuẩn bị, báo cáo ghi
rõ chỉ kiểm tra Studio. Mỗi công cụ vẫn có thể kiểm tra độc lập.

## Kết quả và giới hạn

Kết quả nằm trong `.studio-runtime/browser-results/`: ảnh các bước, JSON/ZIP
đã tải và `verification.json` của từng khung nhìn. Trace và ảnh lỗi được giữ
khi thất bại. Thư mục này bị loại khỏi Git và gói mã nguồn. Các máy chủ thử
chỉ nghe trên loopback ở cổng 4317/4318 và tự đóng khi kiểm tra kết thúc.

Đây là kiểm tra giao diện/render và đóng gói trong trình duyệt thật. Gói và ROM
`TEST` là dữ liệu tổng hợp. Kiểm tra không chạy Lua, không đọc RAM thiết bị và
không chứng minh font/bố cục hiển thị giống hệt trên Android. Dùng thêm
`npm run verify` và `npm run test:builder`; kiểm tra bản xuất trên thiết bị
trước khi chốt phát hành.
