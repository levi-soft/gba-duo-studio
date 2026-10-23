# Tạo companion từ block dữ liệu, không viết code

[English](DATA-BLOCKS.md)

Studio có thể tạo companion đọc chỉ số từ địa chỉ RAM đã biết bằng biểu mẫu.
Luồng này dùng trường dữ liệu gốc trong manifest của GBA Duo, không cần viết Lua,
JSON hay CSS.

## Dùng profile game đã có

1. Tạo dự án **Trang trống**, chọn khung chứa của trang trong Scene.
2. Vào **RAM Thor → Nhập profile dữ liệu**, chọn file profile JSON đã chuẩn bị.
   Bạn không cần sửa nội dung JSON. Profile cung cấp bộ lọc ROM và các block số.
3. Trong **Tạo thanh chỉ số từ block**, chọn block hiện tại và block tối đa, rồi
   bấm **Tạo thanh chỉ số**. Thanh được thêm vào khung đang chọn và hiện ở tab 2D.
4. Bật Studio Connection trong Plus, kết nối USB, chọn nguồn xem trước **Thor trực
   tiếp · trường RAM**. Đối chiếu số liệu với màn hình game.
5. Chỉnh hình thức trong Inspector, xuất ZIP rồi nhập và gán cho game trong GBA
   Duo. Khi chơi, companion tự đọc dữ liệu; không cần Studio hoặc USB.

Nếu đã biết địa chỉ, có thể nhập qua **Data → Trường đọc từ RAM** và đặt mã game,
CRC32 trong **Project**. Nhập profile sẽ từ chối khóa trùng, bộ lọc ROM không khớp
và dự án dùng Lua tùy chỉnh để tránh thay đổi âm thầm logic đang có. Profile xuất
ra chỉ gồm tên, phiên bản, bộ lọc game và cấu hình trường RAM.

## Tìm block bằng lời

Trong **RAM Thor → Tìm block dữ liệu**, nhập “Tìm HP của unit”, “tìm máu của nhân
vật” hoặc “Find unit health”. Bản đầu hỗ trợ yêu cầu HP, tiếng Việt có/không dấu
và tên gọi khác trong profile. Kết quả tìm trong trường số đã nạp, không gọi AI
trực tuyến và chưa tự dò RAM. Cặp phù hợp có nút **Tạo thanh HP từ các block này**.

Người tạo profile dùng **Dữ liệu → Mô tả block để tìm bằng lời** để chọn HP hiện
tại/tối đa, đối tượng/nhóm dùng chung, unit cố định hay đang chọn, tên hiển thị và
đánh dấu đã đối chiếu trong game. Các mô tả được giữ khi xuất/nhập profile và dự
án. Sửa địa chỉ hoặc cấu hình đọc làm mất trạng thái kiểm chứng cũ; xóa trường
cũng xóa mô tả tương ứng.

Yêu cầu “unit đang chọn” chỉ được dùng với cặp block mà profile ghi rõ theo unit
đang chọn và người tạo đã đánh dấu kiểm chứng. Unit cố định hoặc chưa rõ đối
tượng không được thay thế cho yêu cầu đó. Công cụ không suy ra ý nghĩa này chỉ
từ địa chỉ hay con trỏ. Không tự ghép HP của hai đối tượng hoặc chọn bừa khi có
nhiều ứng viên. Dấu kiểm chứng là thông tin do người tạo profile khai báo, không
phải kết luận mà ô tìm kiếm tự chứng minh.

## Tìm dữ liệu của game chưa có profile

Kết nối máy trong RAM Thor. Chọn vùng RAM và kiểu số, nhập giá trị đã biết hoặc để
trống nếu chưa biết, rồi bấm **Dò mới**. Thay đổi chỉ số qua thao tác chơi bình
thường, dùng **Chụp và lọc** với điều kiện bằng giá trị, đã giảm, đã tăng, đã đổi
hoặc không đổi. Lặp lại để thu hẹp, chọn ứng viên, đặt khóa block và lưu.

Mỗi lần lọc so sánh với lần chụp thành công ngay trước đó. Kết quả chỉ là ứng viên;
cần kiểm chứng nhiều lần trước khi xác nhận ý nghĩa. Công cụ chỉ đọc RAM, không
đưa bản chụp vào project hay ZIP. Đổi phiên game làm kết quả cũ mất hiệu lực; lỗi
đọc vẫn giữ bản chụp thành công gần nhất. Màn hình chỉ hiện 100 ứng viên đầu.

## Giới hạn

- Hỗ trợ số có dấu/không dấu 8/16/32-bit trong EWRAM và IWRAM của GBA.
- Địa chỉ của một slot nhân vật không tự trở thành dữ liệu của nhân vật đang được
  trỏ tới. Profile cần ghi rõ trường thuộc đối tượng nào.
- Có thể nhập hoặc chỉnh trường con trỏ + offset qua biểu mẫu. Công cụ chưa tự
  tìm chuỗi con trỏ hoặc hiểu luật game.
- Lỗi đọc không được thay thành số 0. Số 0 trong dữ liệu mẫu của block mới chỉ dùng
  để thiết kế, không phải kết quả xác nhận từ game.
- Profile không mang ảnh, script hoặc bản chụp RAM. Các tài nguyên khác trong dự
  án vẫn cần được kiểm tra riêng trước khi chia sẻ công khai.
