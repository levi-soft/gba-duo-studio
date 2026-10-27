> Historical documentation: discovery, profile-import and automatic bar-generation tools described below were removed from the current workspace. Use Code for source files, Data for preview values and verified fields, and Device for read-only inspection.

# Tìm HP theo từng bước

[English](HP-DISCOVERY.md)

Trong **RAM Thor**, kết nối game đã bật Studio Connection rồi dùng **Tìm HP nhân vật — từng bước**.

1. Nhập HP đang thấy của một nhân vật rồi chụp.
2. Cho đúng nhân vật đó mất máu hoặc hồi máu, nhập HP mới rồi chụp lại. Tiếp tục nếu còn nhiều ứng viên. Studio tự thử số không dấu 8-bit và 16-bit căn hàng trong EWRAM và IWRAM.
3. Chọn ứng viên, bấm **Theo dõi ứng viên này** và đối chiếu HP với game khi máu thay đổi. Chỉ địa chỉ đã chọn được đọc mỗi 750 ms, không chụp toàn bộ RAM liên tục.
4. Nhập HP tối đa, tên nhân vật nếu muốn, rồi đánh dấu đã đối chiếu. Bấm **Tạo thanh HP**. Studio tự đặt khóa dữ liệu và thêm trường RAM cùng thanh máu trong một thao tác có thể hoàn tác.
5. Xuất ZIP như bình thường. Khi chơi, giả lập đọc RAM từ manifest; không cần Studio hay Lua tùy chỉnh.

HP tối đa hiện là số cố định do người tạo nhập, chưa tự tăng khi lên cấp. Trường tìm được dùng địa chỉ trực tiếp, chưa tự theo nhân vật đang chọn và có thể đổi vị trí sau khi đổi cảnh, đổi đội hình hoặc nạp save. Cần thử các trường hợp này trước khi chia sẻ. Dữ liệu mã hóa, số có dấu, số 16-bit không căn hàng, 32-bit và con trỏ cần công cụ nâng cao. Phải chụp ít nhất hai HP khác nhau mới được chọn ứng viên; khớp hai giá trị vẫn chưa chứng minh đó là HP thật.

Bản chụp chỉ giữ tạm, không nằm trong ZIP. Rời tab RAM hoặc tải lại Studio sẽ mất lần dò, nên hoàn tất trước khi chuyển tab. Đổi phiên game sẽ khóa lọc và tạo thanh cho đến khi dò lại. Khi mất kết nối, giá trị cuối vẫn được giữ và ghi rõ là lần đọc cuối; phải theo dõi lại mới tạo được thanh. Dự án có Lua tùy chỉnh được giữ nguyên; hãy dùng dự án riêng cho luồng này.
