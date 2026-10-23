# Xem ROM và đồ họa game trực tiếp

[English](ROM-GRAPHICS.md)

Bản phát triển này cần Plus có `bridgeVersion: 2` và capability `inspect`. Bật
Studio Connection trong phiên game rồi kết nối ở **RAM Thor**. Máy dùng bridge
cũ vẫn dùng được công cụ RAM, nhưng cần cập nhật Plus để xem ảnh.

## Xem và thêm block ảnh

1. Vào **RAM Thor → Xem ROM và đồ họa game**, chọn cấu hình khởi đầu OBJ VRAM,
   BG VRAM hoặc ROM. Đây là bộ nhớ tile thô, chưa tự nhận dạng portrait/sprite.
2. Chọn địa chỉ tile và palette, chiều rộng/cao là bội số 8, tối đa 256. Đánh dấu
   LZ77 nếu nguồn tile ROM dùng kiểu nén tương ứng của GBA.
3. Bấm **Xem ảnh từ game**. Studio đọc dữ liệu cục bộ qua USB/ADB, giải mã 4bpp
   với palette 16 màu và màu số 0 trong suốt, khớp `gfx.decode` của giả lập.
4. Đặt khóa block ảnh, chọn khung chứa trong Scene rồi bấm **Thêm ảnh liên kết**.
5. Xuất ZIP và nhập vào giả lập như bình thường. Studio sinh Lua gọi `gfx.decode`
   từ ROM/bộ nhớ đồ họa của người chơi; có thể dùng chung với các block chỉ số.

## Dữ liệu được lưu và giới hạn

- Project/ZIP chỉ lưu cấu hình địa chỉ, kích thước và nén. Pixel xem trước nằm
  tạm trong editor, không được thêm vào assets hoặc dữ liệu mẫu. Mở lại Studio,
  chọn **Nguồn ảnh đã lưu**, đọc lại rồi bấm **Làm mới ảnh liên kết**. Asset có sẵn
  từ pack nhập vào vẫn cần kiểm tra riêng.
- Bridge mới phục vụ lúc thiết kế; pack xuất ra dùng API `gfx.decode` có sẵn khi
  chơi, không cần kết nối PC.
- VRAM và palette RAM dùng để xem bộ nhớ đồ họa trực tiếp. Block xuất ra hiện yêu cầu
  tile và palette cùng nằm trong ROM, vì cache của `gfx.decode` chưa bảo đảm cập
  nhật hoạt ảnh khi nội dung VRAM thay đổi.
- Không tự thay Lua tùy chỉnh. Luồng block ảnh trực quan từ chối dự án có script
  riêng để tránh làm mất hoặc bỏ qua logic của người tạo.
- Bản đầu hỗ trợ tile 4bpp tuần tự, palette 16 màu và LZ77 từ ROM. Công cụ ghép
  portrait/sprite nhiều phần, bố cục tilemap, nguồn ảnh theo con trỏ và tự nhận
  dạng tài nguyên game chưa nằm trong bước này.
- Mỗi lần đọc tối đa 64 KiB. Tile và palette của một ảnh được đọc trong cùng
  phản hồi để tránh lệch frame. Sai ROM, đổi phiên, thiếu dữ liệu, nén lỗi hoặc
  vượt vùng nhớ sẽ báo lỗi. Đọc lại thất bại vẫn giữ ảnh cũ, đánh dấu không còn
  khớp cấu hình và không cho thêm với nguồn đã đổi.
- Bridge chỉ đọc, bật theo từng phiên qua ADB; không cho thực thi script gửi từ
  PC hoặc lấy thông tin tài khoản.
