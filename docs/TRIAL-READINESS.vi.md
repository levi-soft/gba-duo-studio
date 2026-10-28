# Trạng thái bản dùng thử Studio–Builder

Đợt cập nhật mã nguồn dùng thử ngày 28/10/2026. Studio giữ **0.3.0-beta.1**,
Builder giữ **1.1.5**. Xem [ghi chú thay đổi](../CHANGELOG.md) và các hướng dẫn
bên dưới để sử dụng lại luồng đã kiểm thử.

## Những luồng đã có

- Sửa companion có sẵn: tìm thành phần, sửa nhãn/màu, sửa phần chữ quanh dữ liệu
  và thay ảnh/font có xem trước. Các thay đổi dùng lịch sử Hoàn tác.
- Gắn dữ liệu bằng tên vào chữ, ảnh, thanh chỉ số và danh sách. Có khối chức
  năng tái sử dụng, nhãn theo dữ liệu và ghép trường khi đổi nguồn danh sách.
- Kiểm tra trước khi xuất chỉ rõ thành phần, thuộc tính, trường và tệp cần sửa.
  Studio và Builder dùng chung quy tắc tham chiếu; lưu ý về Lua/mẫu chưa đủ
  không tự biến thành lỗi bộ đọc.
- Builder đóng gói dự án Studio cho đúng ROM hoặc tạo giao diện từ bộ đọc đã
  có. Giữ Lua/tài nguyên và đưa ZIP trở lại Studio để chỉnh tiếp, giữ canvas/lưới.

## Kiểm tra cục bộ đã qua

| Kiểm tra | Kết quả | Bằng chứng |
|---|---|---|
| Studio: mã nguồn, kiểu dữ liệu, component/helper và build | 244 test, 0 lỗi/cảnh báo Svelte | `.studio-runtime/png-integrity-verify.log` |
| Liên thông với Builder thực tế | 7 test | `.studio-runtime/png-integrity-interop.log` |
| Builder: test và đóng gói bộ công cụ | 150 test | `reports/android-assets-check.log` trong Builder |
| Chrome: luồng tác giả ở 1440×1000 và 390×844 | 2 luồng, có font thật | `.studio-runtime/png-integrity-browser.log`, `browser-results/` |
| Dependency audit ở ngưỡng moderate | Qua; còn 4 mục low trong chuỗi build hiện có | `.studio-runtime/author-flow-audit.log` |

Kiểm tra Chrome gồm nhập ZIP → sửa chữ/font/ảnh/dữ liệu → Hoàn tác/Làm lại →
xem thử → tải JSON/ZIP → tạo lại qua Builder → mở lại và khôi phục bản lưu.
Kết quả giữ nguyên Lua, dữ liệu mẫu và tài nguyên gốc; không thấy lỗi JavaScript
hay tràn ngang ở hai khung nhìn đã thử. Ảnh chụp đã được xem trực tiếp.

Đã sửa thao tác quá sớm lúc Studio chưa khôi phục xong dự án, một số thông báo
kiểm tra bị lỗi mã hóa tiếng Việt và cách xếp checkbox trong cửa sổ tài nguyên.
Checkbox chọn dự án Studio ở Builder cũng đã được căn cùng dòng với nhãn.

Đối chiếu mã renderer Android phát hiện SVG và font web WOFF/WOFF2 xem được trên
trình duyệt nhưng không dùng được qua bộ giải mã companion hiện tại. Phần thay
tài nguyên nay chỉ áp dụng ảnh PNG/JPEG/WebP/GIF tĩnh và font TTF/OTF, giải thích
cách thay khi chọn định dạng còn lại. Dự án nhập vẫn giữ các tệp gốc; kiểm tra
Studio và Builder cảnh báo tại tham chiếu SVG/WOFF/WOFF2 đang dùng, kể cả ảnh
nút/tab, nguồn ảnh mẫu và CSS. Tệp không được tham chiếu không bị cảnh báo này.

## Phạm vi kiểm tra Android

Đã chụp companion Android trên Thor với FE7 Việt `AE7E / 32CD990D`, Plus
`0.1.8-plus.4`, gói `studio-assets-device-test`: dòng chữ được gán TTF hiển thị
đủ dấu tiếng Việt, chân dung Lyn, HP 20/20 và các nhãn/số đều hiện. Mười trường
của Lyn khớp với RAM trong cùng phiên. Phạm vi này không xác nhận mọi font/ROM;
các cải tiến không tự tìm địa chỉ RAM cho game mới.

Đã chuẩn bị gói riêng **Studio Assets Device Test** cho FE7 Việt
`AE7E / 32CD990D`, chép đến `Download/Studio-Assets-Device-Test.zip` trên Thor và
đối chiếu SHA-256. Gói dùng font TTF/ảnh PNG từ bản xuất được thao tác qua Chrome,
giữ nguyên 869 tệp tài nguyên/bộ đọc và dữ liệu mẫu của gói thử trước. Có trang
**Ảnh / font** để kiểm tra font tiếng Việt, ảnh tĩnh và chân dung/HP từ game;
trang **Companion cũ** giữ giao diện thử trước.

Lượt thật phát hiện ảnh PNG mẫu được tạo cho kiểm thử có checksum IDAT sai:
Chrome vẫn đọc được nhưng ô ảnh trên Android trống. Đã tạo lại fixture bằng
Pillow và kiểm tra độc lập, thêm kiểm tra cấu trúc/chunk CRC PNG ở phần thay
tài nguyên trước khi xem trước/áp dụng. Trình duyệt nay thử cả PNG hỏng rồi
ảnh hợp lệ. Tệp nhập có sẵn vẫn được giữ; đây không phải kiểm tra toàn bộ
định dạng nén của mọi ảnh trong gói.

Bản sửa là `Download/Studio-Assets-Device-Test-Fixed.zip`, cùng ID và phiên bản,
đã đối chiếu SHA-256. Sau khi người dùng cập nhật, ảnh chụp Thor xác nhận ô PNG
vàng đã hiện cùng font tiếng Việt, chân dung Lucius, HP 18/18 và nhãn Mag 7.
Mười trường Lucius khớp RAM trong cùng phiên; trước đó cũng đã đối chiếu Lyn
(Str). Không thấy cắt chữ ở trang được chụp. Như vậy lượt kiểm tra ảnh/font và
dữ liệu của gói thử trên Thor đã hoàn tất trong phạm vi ROM/ảnh/font đã nêu;
không suy rộng cho mọi game/font. Bằng chứng riêng tư được lưu trong
`.studio-runtime/studio-assets-device-2026-10-28/final-verification.json` ở kho
companion riêng. Tệp ROM, gói thử và ảnh chụp thiết bị không nằm trong mã nguồn
công khai.

Hướng dẫn sử dụng: [Sửa companion](EDIT-COMPANION.vi.md),
[Gắn dữ liệu](CONNECT-DATA.vi.md), [Kiểm tra gói](PACK-CHECKS.vi.md).
Chạy lại quy trình: [Kiểm thử trọn luồng](AUTHOR-FLOW-TESTS.vi.md).
