# Kiểm tra trước khi xuất companion

Bấm **Kiểm tra gói** để xem báo cáo bất kỳ lúc nào. Khi bấm **Xuất pack ZIP**,
Studio tự mở báo cáo nếu có lỗi hoặc lưu ý cần xem lại.

- **Lỗi chặn xuất:** thiếu Lua khởi chạy đã khai báo, thiếu ảnh/font tĩnh ở thành
  phần hiển thị thường, dự án không hợp lệ, thiếu thiết lập xuất hoặc đang có
  bản nháp Mã nguồn chưa áp dụng.
- **Lưu ý:** dự án chỉ có dữ liệu mẫu, binding chưa có trường trong mẫu/khai
  báo bộ đọc, hoặc ảnh thiếu ở nhánh có điều kiện hiển thị. Có thể xuất sau khi
  xem xét, nhưng nên kiểm tra nhánh đó trước khi bật hoặc sử dụng nó.
- **Trường cần kiểm tra với bộ đọc game:** trường chưa có trong mẫu nhưng có
  thể được Lua cung cấp lúc chạy. Nhóm này thu gọn riêng và không bị coi là lỗi
  thiếu dữ liệu. Với bộ đọc native chỉ khai báo các trường cụ thể, trường ngoài
  khai báo vẫn được báo lưu ý.

Mỗi mục ghi rõ ID thành phần (hoặc vị trí trong layout), thuộc tính, trường dữ
liệu và đường dẫn tệp nếu có. **Tới chỗ sửa** chọn đúng thành phần và mở nhóm
Nội dung, Giao diện hoặc Tương tác tương ứng. Tham chiếu trong CSS mở tệp
`style.css`; thiếu Lua khởi chạy mở đúng đường dẫn đã khai báo để bạn sửa.
Chuyển tệp trong Mã nguồn giữ nguyên bản nháp ở tệp khác, chưa tự áp dụng nó.
Báo cáo không tự sửa hoặc xóa tệp, không thay Lua,
không chạy game và không thay các giá trị mẫu.

Những kiểm tra này không chứng minh Lua đúng với ROM, mọi module phụ tồn tại,
ảnh giải mã được, CSS hợp lệ trong mọi trạng thái hay chỉ số dự đoán chính xác.
Studio và Builder dùng chung bộ quy tắc kiểm tra tham chiếu. Bộ kiểm tra xét
ảnh cục bộ ghi trực tiếp, URL tài nguyên trong CSS/style, các trạng thái skin,
tham chiếu trong nút và cả các trang chưa mở. Ảnh skin phải có đủ tệp ngay khi
biên dịch, kể cả nút đang ẩn. Ảnh lấy từ dữ liệu mẫu bị thiếu chỉ là lưu ý vì
Lua có thể tạo nguồn ảnh khác khi chạy. Danh sách trống có một lưu ý về dòng
mẫu, không tự suy ra mọi trường của dòng đều bị thiếu. Trường computed/ảnh ROM
do Studio sinh được nhận diện mà không thực thi chúng trong bước kiểm tra.

Báo cáo hiện tối đa 100 mục, ưu tiên lỗi chặn xuất; tổng số vẫn gồm cả các mục
chưa hiển thị. Không tải URL bên ngoài hay đọc ROM trong bước này. Việc tệp có
tồn tại vẫn chưa chứng minh ảnh/font giải mã được hoặc hiển thị đúng trên máy.

Nếu toàn bộ vấn đề chỉ là lưu ý, **Xuất bản sao companion** vẫn khả dụng.
Các lỗi chặn xuất cần được sửa trước. Bộ xuất cũng kiểm tra lại trạng thái
hiện tại khi bấm xuất để tránh dùng một báo cáo cũ.
