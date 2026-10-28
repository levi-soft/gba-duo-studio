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
- Hỗ trợ tile 4bpp tuần tự, con trỏ ROM một cấp và tối đa 32 mảnh tile thô.
  Ảnh tuần tự từ ROM vẫn hỗ trợ LZ77. Tilemap, chuỗi con trỏ, hoạt ảnh và tự
  nhận dạng tài nguyên game là các bước phát triển riêng.
- Mỗi lần đọc tối đa 64 KiB. Tile và palette của một ảnh được đọc trong cùng
  phản hồi để tránh lệch frame. Sai ROM, đổi phiên, thiếu dữ liệu, nén lỗi hoặc
  vượt vùng nhớ sẽ báo lỗi. Đọc lại thất bại vẫn giữ ảnh cũ, đánh dấu không còn
  khớp cấu hình và không cho thêm với nguồn đã đổi.
- Bridge chỉ đọc, bật theo từng phiên qua ADB; không cho thực thi script gửi từ
  PC hoặc lấy thông tin tài khoản.

## Duyệt ảnh liên tiếp

Chọn kích thước ảnh không nén và palette, rồi bấm **Duyệt các ảnh liên tiếp**. Studio hiện tối đa 16 ảnh để bấm chọn nguồn và thêm block ảnh. Đổi cấu hình hoặc phiên game sẽ khóa kết quả cũ cho tới khi đọc lại. Công cụ dành cho bảng ảnh cùng kích thước, cùng palette; chưa tự tìm địa chỉ hay nhận dạng portrait.

Dùng **Trang trước / Trang sau** để chuyển cả nhóm ảnh và **Bảng màu trước / Bảng màu sau** để dịch một palette 16 màu (32 byte). Sau khi chọn ảnh, chuyển trang vẫn tính từ đầu nhóm. Đọc lỗi sẽ giữ cấu hình và kết quả cũ. Công cụ chưa tự xác định palette nào thuộc về ảnh nào.

**So sánh 8 bảng màu** đọc nguồn tile hiện tại và tám palette liên tiếp trong cùng một lần chụp. Bấm ảnh có màu đúng để chọn palette rồi thêm block ảnh. Hỗ trợ tile không nén và tile ROM nén LZ77; chưa tự nhận biết màu đúng. Nếu vượt cuối ROM hoặc vùng nhớ, thao tác sẽ báo lỗi. Ảnh xem trước không được lưu vào gói companion.

## Đọc qua con trỏ ROM

Bật **Địa chỉ tile chứa con trỏ ROM** hoặc tùy chọn tương ứng cho palette.
Địa chỉ đó là nơi chứa một con trỏ 32-bit little-endian. Độ lệch tính theo byte
được cộng sau khi đọc con trỏ; nếu không bật con trỏ, độ lệch được cộng vào
địa chỉ trực tiếp. Cả nơi chứa con trỏ và đích đều phải nằm trong ROM. Công cụ
chỉ theo một cấp, chưa tự tìm bảng portrait hoặc phân giải ID nhân vật.

Studio đọc con trỏ, rồi kiểm tra lại các byte con trỏ trong cùng lần đọc tile
và palette. Đổi con trỏ, ROM, phiên game hoặc thiết bị sẽ hủy kết quả. Giới hạn
đọc được kiểm tra theo kích thước ROM thật. Lua xuất ra giữ cấu hình nguồn,
đọc `mem.u32`, kiểm tra cửa sổ ROM rồi gọi API ảnh. Khi thêm block ảnh vào dự
án mới chỉ lọc mã game, Studio bổ sung CRC32 của ROM vừa đọc.

## Ghép sprite / portrait từ tile thô

Chọn **Ghép mảnh · tile 1D**, đặt khung ảnh là bội số 8, tối đa 256×256.
Thêm tối đa 32 mảnh. Mỗi mảnh có X/Y, rộng/cao 8/16/32/64, số tile đầu,
bank palette 0–15, lật ngang và lật dọc. Mỗi tile chiếm 32 byte; mỗi bank
palette cũng chiếm 32 byte. Tile trong từng mảnh được xếp tuần tự theo hàng
(1D). Mảnh trước nằm trên mảnh sau; màu số 0 trong suốt. Tọa độ âm cắt phần
nằm ngoài khung. **Đưa lên trước** đổi chỗ mảnh với mảnh ngay trước nó.
Sheet 2D cần chia thành các mảnh theo từng hàng, trong giới hạn 32 mảnh;
chưa có bộ tự nhận biết cách ghép của từng game.

Ảnh xem trước theo đúng `gfx.sprite`, Lua xuất ra cũng gọi API này. Giả lập
cần có `gfx.sprite` như mã nguồn official/Plus hiện tại. API ghép mảnh chưa
nhận LZ77: portrait nén cần sắp xếp nhiều mảnh chưa xuất được theo luồng này;
ảnh tuần tự vẫn giải nén được. Chế độ con trỏ/ghép mảnh khóa duyệt ảnh liên
tiếp và so sánh palette, vì hai thao tác đó dành cho ảnh tuần tự trực tiếp.
Giới hạn mỗi lần đọc vẫn là 64 KiB / 64 vùng; các vùng mảnh trùng nhau được
gộp. Project/ZIP chỉ lưu cấu hình, không tự lưu pixel game đã giải mã.
