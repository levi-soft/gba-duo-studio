const en = {
  project:'My Companion',title:'YOUR GAME',chapter:'Chapter 01 · Beginning',character:'Sample character',role:'Warrior',
  heading:'Character Status',journey:'Your Journey',inventory:'INVENTORY',collect:'COLLECTED ITEMS',level:'Level {level} · {role}',
  items:['Iron sword','Healing potion','Key'],text:'New text',button:'View Details',empty:'No data',tabs:['Character','Inventory','Information'],
};
const vi = {
  project:'Companion của tôi',title:'GAME CỦA BẠN',chapter:'Chương 01 · Khởi đầu',character:'Nhân vật mẫu',role:'Chiến binh',
  heading:'Thông tin nhân vật',journey:'Hành trình của bạn',inventory:'TÚI ĐỒ',collect:'VẬT PHẨM THU THẬP',level:'Cấp {level} · {role}',
  items:['Kiếm sắt','Bình hồi phục','Chìa khóa'],text:'Nội dung mới',button:'Xem chi tiết',empty:'Chưa có dữ liệu',tabs:['Nhân vật','Túi đồ','Thông tin'],
};
/** @param {string} [language] */
export function templateCopy(language = 'en') { return language === 'vi' ? vi : en; }
