# Gắn dữ liệu của companion vào giao diện

Mở companion đang dùng rồi bấm **Gắn dữ liệu** trên thanh công cụ, hoặc mở
**Sửa companion → Gắn giá trị hoặc thêm thành phần dữ liệu**.

1. Chọn thêm thành phần mới hoặc gắn vào chữ/ảnh/thanh chỉ số/danh sách có sẵn.
2. Với thành phần mới, chọn đúng khung chứa và vị trí đầu/cuối khung.
3. Chọn cách hiển thị: chữ/con số, ảnh từ dữ liệu, thanh hiện tại/tối đa hoặc
   danh sách lặp.
4. Tìm trường bằng tên. Thanh chỉ số cần hai trường số khác nhau, cùng phạm vi.
   Ví dụ: **HP hiện tại** và **HP tối đa**. Có thể đặt nhãn bằng tiếng Việt.
5. Áp dụng, xem thử, lưu dự án và xuất bản sao ZIP. Nhập bản sao vào giả lập để
   kiểm tra với dữ liệu thật. Một lần áp dụng tương ứng một bước Hoàn tác.

Nếu đang chọn chữ, ảnh, thanh chỉ số hoặc danh sách khi mở hướng dẫn, Studio ưu tiên chế độ
gắn vào chính thành phần đó. Binding nhận diện được sẽ được nạp vào danh sách
chọn. Việc nạp này chưa thay đổi dự án; chỉ **Áp dụng dữ liệu** mới sửa thành phần.
ID, vị trí trong cây, kích thước, style, điều kiện và hành động của nó được giữ.

Với ảnh, chọn một trường chữ chứa nguồn ảnh do bộ đọc cung cấp, ví dụ chân dung
hoặc biểu tượng. Studio chỉ đổi nguồn dữ liệu của ảnh; không tạo ảnh, đọc ROM để
tìm ảnh hay mang tài nguyên từ dự án khác sang. Ảnh tĩnh chưa có binding cần
được chọn trường nguồn trước khi áp dụng. Khi gắn trong danh sách lặp, nguồn
ảnh của dòng được phân biệt với trường cùng tên ở phạm vi toàn cục.

Với thanh chỉ số đã dùng hai trường, **Giữ định dạng nhãn đang có** được bật sẵn.
Khi đổi trường hiện tại/tối đa, các tham chiếu tương ứng trong nhãn đổi theo;
phần chữ và các tham chiếu khác vẫn giữ. Nếu thanh cũ dùng giá trị cố định hoặc
trùng trường gây mơ hồ, đặt nhãn mới thay vì suy đoán ý nghĩa của các con số.

Chữ đơn giản như `Nhãn: {trường}` được nạp cả nhãn và trường. Với mẫu chữ có nhiều
giá trị hoặc phần chữ xung quanh, Studio bật sẵn **Giữ mẫu chữ đang có** nếu nhận
diện được các tham chiếu. Mỗi trường có một ô chọn riêng; không cần gõ cú pháp
binding. Ví dụ `HP {hp}/{maxHp} · Cấp {level}` cho phép chọn nguồn mới cho HP,
HP tối đa và cấp độ mà giữ dấu `/`, dấu `·`, phần chữ và xuống dòng.

Các chỗ dùng cùng một trường đổi cùng nhau; đổi chéo hai trường cũng không làm
thay nhầm lần thứ hai. Số thứ tự dòng và tham chiếu trạng thái `ui.*` được giữ
nguyên. Xem trước ghi rõ là **Chữ với dữ liệu mẫu**; giá trị chưa có hoặc trạng
thái giao diện chưa biết được hiển thị bằng `…`, không được coi là dữ liệu game
đã đọc thành công. Nguồn trong danh sách lặp dùng dòng mẫu đầu, tách khỏi nguồn
toàn cục cùng tên.

Nếu trường cũ chưa có trong dữ liệu, cần chọn trường thay thế có sẵn trước khi
áp dụng. Trường đích có thể là chữ, số hoặc trạng thái; danh sách không được dùng
thay một giá trị chữ. Style, ID, điều kiện và hành động của thành phần được giữ;
chỉ nội dung tham chiếu được đổi. Một lần áp dụng là một bước Hoàn tác.

Có thể bỏ chọn giữ mẫu để chủ động thay toàn bộ bằng nhãn và một trường đơn.
Dùng trình soạn thảo đầy đủ nếu cần sửa phần chữ xung quanh hoặc mẫu chưa được
hỗ trợ. Hướng dẫn hỗ trợ tối đa 24 trường khác nhau và 16.384 ký tự cho mẫu chữ
sau thay thế; không tự đổi tên dữ liệu mẫu, tạo Lua hay dò RAM.

Danh sách trường lấy từ dữ liệu mẫu, các giá trị native đã cấu hình và khai báo
`manifest.studioDataFields` của tác giả. Studio không phân tích Lua để đoán địa
chỉ RAM. Nhãn dễ hiểu không phải chứng nhận bộ đọc đúng cho mọi ROM.

Với gói cũ có giá trị mẫu `"---"`, cấu hình thanh chỉ số có sẵn vẫn cung cấp
kiểu số cho trường hiện tại/tối đa. Studio giữ nguyên mẫu `"---"` và đánh dấu
kiểu là khai báo; không tự điền HP hoặc coi đây là một lần đọc game thành công.

Trong mẫu lặp, trường của mỗi dòng được tách khỏi trường toàn cục. Nếu cùng
tên, trường của dòng được ưu tiên theo quy tắc bộ hiển thị. Với danh sách
trống, thêm một dòng mẫu đại diện trong Dữ liệu trước để tránh gắn nhầm phạm vi.
Danh sách mới hiện hỗ trợ dòng là đối tượng và chọn một trường đơn của dòng.

## Đổi nguồn của danh sách đang có

Chọn danh sách trong cây giao diện, mở **Gắn dữ liệu**, rồi chọn nguồn ở
**Trường dữ liệu**. Khi không bật ghép trường, Studio chỉ đổi nguồn danh sách.
Giữ cấu trúc mẫu dòng, ID, ảnh, thanh chỉ số, nút và style; không cần dựng lại
mẫu dòng hay chọn một trường chữ để thay thế nó.

Nếu nguồn mới dùng tên trường khác, bật **Ghép trường của mẫu dòng**:

1. Chọn trường tương ứng cho mỗi trường đang dùng. Ví dụ `name` → `displayName`,
   `portrait` → `picture`, `hp` → `current` và `id` → `unitId`. Ô chọn ghi tên
   hiển thị của tác giả nếu có, đường dẫn và giá trị mẫu để đối chiếu.
2. Các chỗ dùng cùng một trường trong cùng phạm vi sẽ đổi cùng nhau: chữ,
   nguồn ảnh, thanh chỉ số/nhãn, điều kiện, style động và tham số hành động.
   Phần chữ, dấu câu, ID thành phần, style tĩnh và tên hành động được giữ.
3. Với danh sách lồng, ghép nguồn danh sách con trước nếu cần; sau đó ghép các
   trường bên trong. Hai danh sách con cùng dùng trường `name` có ô chọn riêng.
   Nguồn tham chiếu toàn cục, `ui.*` và số thứ tự dòng không bị tự đổi tên.
4. Khi mọi kiểm tra đều đạt, bấm **Áp dụng dữ liệu**, rồi **Xem thử**. Các giá trị
   bên cạnh ô chọn chỉ là dữ liệu mẫu, không phải kết quả đọc game trực tiếp.

Đổi nguồn hoặc thành phần sẽ đặt lại phần ghép đang chọn. **Đặt lại ghép
trường** chỉ bỏ các lựa chọn trong hướng dẫn; chưa sửa dự án. Có thể tắt ghép
trường để trở về cách chỉ đổi nguồn. Một lần áp dụng gồm cả nguồn và tham chiếu
trong mẫu dòng là một bước Hoàn tác.

Studio đối chiếu các trường mà mẫu dòng dùng với dữ liệu mẫu của nguồn mới:

- Cần ít nhất một dòng mẫu đại diện ở cả nguồn cũ và nguồn mới. Dòng đầu của
  nguồn cũ là mẫu đối chiếu; mọi dòng của nguồn mới đều được kiểm tra trong
  giới hạn độ phức tạp của hướng dẫn.
- Nếu thiếu trường, sai kiểu dữ liệu hoặc trường đổi giữa phạm vi mỗi dòng và
  toàn cục, hướng dẫn báo tên trường/dòng gặp lỗi và chưa cho áp dụng. Ví dụ,
  dòng thứ hai thiếu nguồn chân dung vẫn bị phát hiện dù dòng đầu đã đủ.
- Các trường dùng cho ảnh, thanh chỉ số, điều kiện, style động và tham số hành
  động cũng được kiểm tra. Nội dung JSON cố định trong hành động được giữ nguyên.
- Mẫu danh sách lồng được kiểm tra tiếp. Nguồn danh sách con mới có thể trống.
  Khi chỉnh một danh sách nằm trong danh sách khác, phạm vi được lấy từ các
  dòng mẫu đầu của những danh sách bao ngoài; hướng dẫn ghi rõ giới hạn này.
- Ô chọn ghép trường lấy các trường tương thích trong dòng mẫu mới đầu tiên
  có thể kiểm tra của từng phạm vi. Những dòng còn lại vẫn phải đạt kiểm tra;
  có trường ở dòng đầu không có nghĩa là đã phù hợp ở tất cả các dòng.

Đây là kiểm tra tương thích trên **dữ liệu mẫu**, không chạy Lua hay chứng nhận
bộ đọc đúng trên game thật. Chọn mẫu đại diện rồi dùng Xem thử và kiểm tra ZIP
trong giả lập. Ghép trường chỉ đổi các tham chiếu đã chọn, không đổi tên trường
trong dữ liệu mẫu hay cấu hình bộ đọc. Hướng dẫn không chuyển đổi đơn vị, công
thức hoặc tạo dữ liệu còn thiếu. Nếu nút truyền cả dòng/đối tượng vào Lua, cấu
trúc đối tượng mới vẫn phải phù hợp; không tự dựng bộ chuyển đổi tham số.

Với binding không nhận diện được, mẫu cũ chưa đủ dữ liệu đại diện hoặc mẫu vượt
giới hạn kiểm tra, cần dùng trình soạn thảo đầy đủ. Phần ghép giới hạn 128 trường
theo phạm vi; mẫu chữ được thay tham chiếu giới hạn 16.384 ký tự. Kiểm tra độ sâu
và khối lượng công việc vẫn có thể giới hạn mẫu nhỏ hơn. Bộ đọc và tài nguyên
của companion không bị sửa.

Giá trị xem thử ghi rõ là dữ liệu mẫu/khai báo, trực tiếp hoặc dữ liệu trực tiếp
cũ. Khi kết nối trực tiếp được bật, danh tính ROM và companion vẫn được kiểm tra
qua luồng kết nối hiện có. Dữ liệu trực tiếp không thay thế dữ liệu mẫu được lưu.
Lua, module, tài nguyên và cấu hình đọc RAM không bị sửa bởi thao tác gắn dữ liệu.

## Khai báo tên trường cho tác giả bộ đọc

Tên trường giữ nguyên giao thức mà bộ đọc xuất ra; tên hiển thị được tách riêng:

```json
{
  "studioDataFields": {
    "hp": {"kind":"number", "label":"Current HP", "labelVi":"HP hiện tại"},
    "maxHp": {"kind":"number", "label":"Maximum HP", "labelVi":"HP tối đa"},
    "party": {"kind":"list", "labelVi":"Đội hình"},
    "party[].hp": {"kind":"number", "labelVi":"HP của từng nhân vật"}
  }
}
```

Hỗ trợ `number`, `string`, `boolean`, `list`; `description` và `aliases` giúp
tìm kiếm. Khai báo chỉ cung cấp tên/kiểu, không tự tạo bộ đọc hoặc địa chỉ RAM.
