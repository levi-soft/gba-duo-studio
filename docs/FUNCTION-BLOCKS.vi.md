# Thẻ nhân vật và bảng chỉ số

Bấm **Khối chức năng** trên thanh công cụ. Chọn khung chứa và vị trí đầu/cuối
khung, cấu hình dữ liệu rồi bấm **Chèn khối chức năng**. Một lần chèn là một
bước Hoàn tác. Các chữ, ảnh, hàng và thanh sau khi chèn vẫn chỉnh được bằng
trình soạn thảo thường; không có định dạng pack mới.

## Thẻ nhân vật

- Chọn trường tên có sẵn trong companion.
- Có thể thêm cấp độ và thay nhãn của nó.
- Ảnh có thể lấy từ trường dữ liệu hoặc ảnh có sẵn trong tài nguyên. Cũng có
  thể bỏ ảnh nếu game/bộ đọc không cung cấp.
- Có thể thêm thanh hiện tại/tối đa với hai trường số cùng phạm vi. Nhãn tự
  đặt, ví dụ HP, đạn hoặc năng lượng. Không cần dùng tên trường của game FE.

## Bảng chỉ số

Chọn từ 1 đến 24 dòng. Mỗi dòng có một trường dữ liệu và nhãn riêng; nhãn có
thể nhập tiếng Việt. Các nút lên/xuống/bỏ dòng thay đổi cấu hình trước khi chèn.
Nhãn ban đầu lấy từ tên dễ hiểu của trường nếu bạn chưa nhập nhãn.

Mỗi dòng có **Nguồn nhãn**: tự nhập hoặc lấy từ một trường dữ liệu. Dùng nguồn
dữ liệu khi tên chỉ số thay đổi theo nhân vật/chế độ, ví dụ `Str` / `Mag` do bộ
đọc cung cấp. Chọn trường ở **Trường dữ liệu nhãn**; không cần gõ cú pháp binding.
Giá trị nhãn được giữ nguyên như bộ đọc trả về, không tự dịch hay đoán loại chỉ số.

Khối kế thừa màu và font; không thay bảng màu hay các style có sẵn của dự án.
Không tạo/sửa Lua, địa chỉ RAM, tài nguyên hay dữ liệu mẫu.

## Lưu cấu hình để dùng lại

Trong **Khối chức năng**, mở mục **Cấu hình khối đã lưu**:

1. Thiết lập thẻ/bảng như bình thường, nhập **Tên cấu hình** bằng tiếng Việt,
   rồi bấm **Lưu cấu hình mới**. Tên cần khác các mục đang có.
2. Nếu đã chèn khối bằng thư viện, chọn khối hoặc một thành phần bên trong nó,
   mở lại thư viện rồi bấm **Lấy cấu hình từ khối đang chọn**. Cơ chế này nhận
   thẻ/bảng còn giữ cấu trúc tạo khối; khung tự dựng khác không tự chuyển thành mẫu.
3. Ở dự án khác, chọn một mục đã lưu rồi bấm **Nạp cấu hình**. Chọn khung chứa,
   kiểm tra lại các trường và ảnh, sửa phần còn thiếu rồi chèn. Nạp cấu hình chưa
   thay đổi dự án; việc chèn vẫn là một bước Hoàn tác như trước.
4. Dùng **Xuất cấu hình JSON** để sao lưu/chuyển máy, và **Nhập cấu hình JSON**
   để thêm các mục vào thư viện đang có. Mục trùng hoàn toàn được bỏ qua; xung
   đột tên/mã sẽ báo lỗi và giữ nguyên thư viện. **Bỏ cấu hình** có nút hoàn tác
   trong phiên mở thư viện hiện tại.

Thư viện lưu trong trình duyệt này, tách khỏi bản nháp dự án. Giới hạn 50 mục và
tệp JSON 512 KiB. Hãy xuất JSON trước khi xóa dữ liệu trình duyệt hoặc đổi địa chỉ
chạy Studio. Khi trình duyệt không lưu được, Studio báo lỗi và giữ các mục đã có.

Mỗi cấu hình chỉ chứa cách tạo khối: loại, nhãn, tên trường và nguồn ảnh tham
chiếu. Nó không mang theo CSS/style chỉnh thủ công, ảnh, dữ liệu mẫu hay Lua.
Ảnh có sẵn phải tồn tại trong dự án đích; các trường phải do bộ đọc của dự án đích
cung cấp. Không tìm/suy đoán địa chỉ RAM hoặc sao chép bộ đọc giữa các game.

Có thể thử bằng [hai cấu hình mẫu](block-presets.example.json). Thẻ trạng thái
dùng các trường của dự án Studio khởi đầu; bảng tài nguyên cần chọn lại trường
nếu dự án của bạn không có năng lượng, dung lượng và tiền. JSON này là thư viện
cấu hình, không phải gói companion để nhập vào giả lập.

## Quy trình dùng chung cho nhiều game

1. Mở companion đã có bộ đọc, hoặc dự án do tác giả bộ đọc chuẩn bị.
2. Vào **Khối chức năng**, chọn khung chứa và loại khối cần thêm.
3. Chọn các trường theo tên dễ hiểu. Ví dụ một game có phi công: thẻ lấy tên
   phi công và hạng; thanh lấy năng lượng hiện tại và dung lượng tối đa.
4. Với bảng tài nguyên, chọn từng trường và tự nhập nhãn tiếng Việt. Nếu nhãn
   đổi theo đối tượng, chọn **Nguồn nhãn → Lấy từ trường dữ liệu**, rồi chọn
   trường chứa tên loại tài nguyên. Không cần gõ tên trường bằng tiếng Anh.
5. Xem trước, chèn khối và chỉnh các thành phần như bình thường. Khi đổi khung
   chứa, chọn lại trường để tránh dùng nhầm phạm vi danh sách/nhân vật.
6. Dùng **Xuất pack ZIP** để kiểm tra gói rồi xuất. Nếu cần đóng gói qua Builder,
   lưu dự án `.gbastudio.json`, khai báo đúng mã game và CRC32, rồi dùng luồng
   **Use my Studio project** của Builder với ROM tương ứng. Luồng này không cần
   game nằm trong danh mục tự động. Dự án cần sinh Lua computed/graphics/pulse
   phải xuất bằng Studio; Builder sẽ báo lỗi thay vì bỏ qua phần sinh mã.

Các tên trường và loại tài nguyên do bộ đọc của game cung cấp. Ví dụ năng lượng
không đồng nghĩa Studio đã biết địa chỉ RAM của một game phi công bất kỳ.

## Xem trước và giới hạn

Khung xem trước dùng dữ liệu mẫu hoặc lần đọc trực tiếp đã được Studio kiểm
tra danh tính. Ở mẫu lặp, nó chỉ xem dòng đầu của từng danh sách bao ngoài;
không rút ngắn danh sách thật. Khối vẫn được chèn vào đúng phạm vi đã chọn.
Với danh sách trống, cần một dòng mẫu đại diện để chọn trường an toàn.

Xem trước độc lập giúp kiểm tra dữ liệu/bố cục khối, không tái hiện đầy đủ vị
trí và mọi style kế thừa từ cha sau khi chèn. Ảnh do Lua tạo chỉ có thể hiện khi
có dữ liệu ảnh phù hợp; hãy kiểm tra bản xuất trên thiết bị.

Game chưa có bộ đọc vẫn cần được nghiên cứu và cấu hình trước. Hai khối dùng
được với game GBA khác nếu bộ đọc cung cấp các trường đã chọn; chúng không tự
tìm địa chỉ RAM hay dự đoán cơ chế game.

## Mã dùng chung với Builder

`src/lib/studio/function-blocks.js` được giữ giống bản
`ui/function-blocks.js` của Companion Builder. Chúng chỉ tạo cây thành phần
native từ ID, đường dẫn dữ liệu và nhãn được truyền vào. Builder sinh bản
script trình duyệt từ nguồn này; không cần thay 15 bộ đọc hiện có để dùng
các khối trong một dự án tùy chỉnh.
