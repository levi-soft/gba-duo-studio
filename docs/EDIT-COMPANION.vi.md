# Sửa companion có sẵn

Bấm **Sửa companion** trên thanh trên cùng. Không cần nhập địa chỉ RAM hay viết
Lua để sửa nhãn, phần chữ quanh dữ liệu và màu trực tiếp của giao diện.

Để thay ảnh/font, dùng **Ảnh / font** trên thanh công cụ hoặc **Thay ảnh hoặc
font…** sau khi chọn thành phần trong hướng dẫn này.

1. **Mở companion của bạn:** chọn ZIP đang dùng, hoặc tiếp tục dự án đã mở.
   Studio giữ nguyên ZIP gốc và mở bản sao trong trình soạn thảo.
2. **Chọn phần cần sửa:** tìm chữ đang thấy trên companion, chọn thành phần rồi
   sửa chữ hoặc màu. Nhãn lấy từ dữ liệu game được đánh dấu; hướng dẫn không
   thay binding của chúng. Chọn **Mở trong trình soạn thảo** để chỉnh bố cục,
   kích thước, ảnh và các thuộc tính khác.
   Dùng **Gắn giá trị hoặc thêm thành phần dữ liệu** để chọn trường bằng tên và
   tạo chữ, thanh chỉ số hoặc danh sách mà không sửa Lua. Xem [hướng dẫn gắn dữ liệu](CONNECT-DATA.vi.md).
3. **Kiểm tra và lưu bản sao:** xem thử, lưu dự án để sửa tiếp, hoặc xuất ZIP
   mới. Nhập và gán bản sao trong giả lập để kiểm tra với game thật.

Mỗi lần áp dụng chữ/màu dùng lịch sử Hoàn tác hiện có. Lua, các module, tài
nguyên, cấu hình bộ đọc và dữ liệu game không bị tạo lại bởi hướng dẫn này.
Khi đang có bản nháp trong Mã nguồn, hãy áp dụng hoặc bỏ bản nháp trước khi
chỉnh hay xuất để không vô tình bỏ qua nội dung đang viết.

## Thay ảnh hoặc font có xem trước

1. Chọn thành phần trong Scene rồi bấm **Ảnh / font**, hoặc tìm thành phần trong
   **Sửa companion** rồi bấm **Thay ảnh hoặc font…**.
2. Chọn **Phần cần đổi**: ảnh, trạng thái ảnh nút/tab, font thành phần hoặc font
   tên tab. Mỗi trạng thái Bình thường, Đang nhấn, Đang chọn được sửa riêng.
3. Chọn tài nguyên có sẵn, hoặc **Chọn tệp mới → Chọn tệp ảnh/font…**. Tìm theo
   tên để thu hẹp thư viện. Ảnh hỗ trợ PNG/JPG/JPEG/WebP/GIF tĩnh; font hỗ trợ
   TTF/OTF để dùng trong companion Android. Hãy chuyển SVG sang PNG và chọn font
   gốc TTF/OTF thay cho WOFF/WOFF2. Tệp phải có dữ liệu và không quá 32 MiB.
   Các tệp SVG/WOFF có sẵn vẫn được giữ khi nhập dự án. Kiểm tra trước khi xuất
   chỉ rõ nơi đang tham chiếu định dạng đó để bạn thay dần; tệp không dùng không
   gây cảnh báo định dạng.
4. Chờ ảnh hoặc mẫu chữ tiếng Việt hiện trong khung xem trước. Nếu trình duyệt
   không đọc được tệp, nút Áp dụng vẫn bị khóa để bạn chọn lại.
5. Bấm **Áp dụng tài nguyên**. Nếu mở từ Sửa companion, Studio trở lại hướng dẫn
   và chọn lại thành phần đó. Dùng Xem thử để kiểm tra toàn bộ giao diện rồi lưu
   dự án hoặc xuất bản sao ZIP như bình thường.

PNG được kiểm tra cấu trúc/chunk checksum trước khi xem trước và áp dụng: có
ảnh hỏng vẫn xem được trong trình duyệt nhưng không hiện trên Android. Nếu gặp
thông báo PNG bị hỏng, hãy xuất lại ảnh bằng trình sửa ảnh rồi chọn lại; không
chỉ đổi tên phần mở rộng. Việc kiểm tra này không thay thế giải mã ảnh trên
thiết bị và không tự sửa tệp gốc trong dự án.

Ảnh đang lấy từ dữ liệu game chỉ được đổi sang tệp tĩnh khi bạn chọn **Dùng ảnh
tĩnh thay cho ảnh từ dữ liệu game này**. Thao tác đó đổi nguồn ảnh của riêng
thành phần đã chọn; dữ liệu mẫu và Lua vẫn được giữ. Nếu muốn ảnh tiếp tục đổi
theo nhân vật hoặc trạng thái game, dùng Gắn dữ liệu để chọn trường ảnh phù hợp.

Font mặc định chỉ áp dụng cho thành phần đã chọn. Chọn **Áp dụng font cho cả
nội dung bên trong thành phần này** khi muốn đổi cả cây nội dung con. Style theo
điều kiện, font riêng của nội dung con hoặc cách hỗ trợ font trên thiết bị có
thể ảnh hưởng kết quả; mẫu chữ trong cửa sổ này không thay thế Xem thử toàn bộ
companion và kiểm tra bản xuất trên thiết bị.

Chọn tệp và xem trước chưa sửa dự án. Hủy, lỗi đọc tệp hoặc tệp bị thay thế khi
đang đọc không tạo thay đổi. Khi áp dụng, tệp mới trùng tên được lưu riêng;
tệp cũ, Lua và tài nguyên dùng ở chỗ khác giữ nguyên. Tệp giống hệt đã có có thể
được dùng lại. Mỗi lần áp dụng là một bước Hoàn tác; phần xem trước font được
dọn khi đóng cửa sổ. Nếu có bản nháp Mã nguồn, cần áp dụng hoặc bỏ bản nháp
trước khi thay tài nguyên.

## Sửa phần chữ quanh giá trị dữ liệu

Chọn một dòng chữ, nhãn nút hoặc nhãn thanh chỉ số đang có dữ liệu, ví dụ
`HP {hp}/{maxHp}`. Mục **Sửa chữ quanh dữ liệu game** tách thành các ô:

- Chữ trước dữ liệu 1: đổi `HP ` thành `Sinh lực `.
- Giá trị `{hp}` được giữ nguyên, không cần nhập lại.
- Chữ trước dữ liệu 2: đổi `/` thành ` trên `.
- Giá trị `{maxHp}` được giữ nguyên; có thể thêm chữ sau giá trị cuối.

Xem **Chuỗi sẽ lưu**, rồi bấm **Áp dụng phần chữ**. Kết quả là
`Sinh lực {hp} trên {maxHp}`. Một lần áp dụng là một bước Hoàn tác trong dự án.
Tên trường, số lần xuất hiện và thứ tự dữ liệu giữ nguyên, kể cả số thứ tự dòng
hoặc trạng thái UI. Đổi ngôn ngữ Studio giữ phần chữ đang nhập.

Công cụ không cho chèn binding mới vào ô chữ. Muốn đổi nguồn dữ liệu, dùng
**Gắn giá trị**; muốn thêm/bớt trường hoặc sắp xếp lại chúng, dùng trình soạn
thảo đầy đủ. Mẫu trên 16.384 ký tự hoặc trên 32 vị trí dữ liệu cũng cần trình
soạn thảo đầy đủ. Chọn sang thành phần khác bỏ phần chữ chưa áp dụng của thành
phần trước; dự án chỉ đổi khi bấm Áp dụng.

Những ô này sửa nhãn của giao diện, không sửa tên nhân vật hay nội dung mà Lua
trả về. Kiểm tra kết quả bằng Xem thử và bản ZIP trên thiết bị như các sửa đổi
giao diện khác.

Màu ở đây là màu trực tiếp ở trạng thái thường của thành phần. Style theo điều
kiện hoặc vỏ ảnh có thể ghi đè; hãy dùng trình soạn thảo đầy đủ cho các trường
hợp đó. Xem trước trên trình duyệt dùng dữ liệu mẫu/live được cung cấp, không
thực thi Lua và không chứng minh bộ đọc đúng trên mọi ROM.

Dự án không có bộ đọc game được báo rõ. Mẫu minh họa không tự trở thành dữ liệu
game thật khi xuất ZIP. Việc tạo bộ đọc cho game mới vẫn cần tìm hiểu cấu trúc
dữ liệu và kiểm chứng trên đúng ROM.
