# 🎄 Cây Thông Noel Tương Tác Sang Trọng

Trải nghiệm cây thông Noel 3D chất lượng cao với điều khiển bằng cử chỉ tay, hiệu ứng biến đổi từ hỗn loạn thành cây hoàn chỉnh, và phong cách thẩm mỹ xanh ngọc lục bảo kết hợp vàng kim sang trọng.

## 📝 Prompt Gốc

Gemini 3 trong Google AI Studio và Claude 4.5 Sonnet trong Cursor:

```
THIẾT LẬP VAI TRÒ:
Bạn là một chuyên gia phát triển 3D sáng tạo, tinh thông React 19, TypeScript và Three.js (React Three Fiber – R3F).

MỤC TIÊU NHIỆM VỤ:
Xây dựng một ứng dụng Web 3D độ trung thực cao có tên “Cây Thông Noel Tương Tác Xa Hoa (Grand Luxury Interactive Christmas Tree)”.
Phong cách thị giác mang cảm giác xa hoa kiểu Trump, với tông màu chủ đạo là xanh lục bảo đậm (deep emerald green) và vàng ánh kim nổi bật, kèm hiệu ứng phát sáng điện ảnh (cinematic glow).

CÔNG NGHỆ SỬ DỤNG:
- React 19
- TypeScript
- React Three Fiber
- Drei
- Postprocessing
- Tailwind CSS

LOGIC CỐT LÕI & KIẾN TRÚC:

1. MÁY TRẠNG THÁI (STATE MACHINE):
Bao gồm hai trạng thái:
- CHAOS (Hỗn loạn, phân tán)
- FORMED (Kết tụ thành cây)
Các phần tử có thể biến hình động qua lại giữa hai trạng thái.

2. HỆ TỌA ĐỘ KÉP (DUAL-POSITION SYSTEM):
Mỗi phần tử (lá kim, đồ trang trí…) khi khởi tạo đều có hai vị trí:
- ChaosPosition: tọa độ ngẫu nhiên trong không gian hình cầu
- TargetPosition: tọa độ mục tiêu tạo thành hình nón của cây thông

Trong useFrame, nội suy (Lerp) giữa hai vị trí dựa trên tiến trình animation.

CHI TIẾT TRIỂN KHAI:

1. HỆ THỐNG LÁ KIM (FOLIAGE):
- Sử dụng THREE.Points
- ShaderMaterial tùy chỉnh
- Render số lượng lớn particle

2. ĐỒ TRANG TRÍ (ORNAMENTS):
- Sử dụng InstancedMesh để tối ưu hiệu năng
- Các loại:
  + Hộp quà nhiều màu (nặng)
  + Quả cầu trang trí nhiều màu (nhẹ)
  + Đèn trang trí điểm (rất nhẹ)
- Mỗi loại có trọng số lực đẩy vật lý khác nhau
- Dùng Lerp để tạo animation quay về vị trí mượt mà

3. HẬU KỲ (POST-PROCESSING):
- Bloom:
  + Threshold: 0.8
  + Intensity: 1.2
- Tạo hào quang vàng sang trọng

CẤU HÌNH CẢNH (SCENE SETUP):
- Camera position: [0, 4, 20]
- Environment light: Lobby HDRI

TRANG TRÍ BỔ SUNG:
- Thêm nhiều ảnh trang trí kiểu Polaroid treo trên cây

TƯƠNG TÁC BẰNG CỬ CHỈ:
- Dùng camera nhận diện tay
- Tay mở: unleash (CHAOS)
- Tay nắm: trở về cây thông (FORMED)
- Di chuyển tay để điều chỉnh góc nhìn camera
```

## 🛠️ Cài Đặt

1. **Clone repository:**
   ```bash
   git clone <repository-url>
   cd grand-luxury-interactive-christmas-tree
   ```

2. **Cài đặt dependencies:**
   ```bash
   npm install
   ```

3. **Chạy server phát triển:**
   ```bash
   npm run dev
   ```
   
   > 📝 Lưu ý: Chế độ dev local sử dụng localStorage để chia sẻ (chỉ hoạt động trong cùng trình duyệt)
   > Để chia sẻ qua cloud, xem bước 4

4. **Cấu hình Cloudflare (Tùy chọn - để chia sẻ qua cloud):**
   - Làm theo hướng dẫn chi tiết trong `cloudflare-setup.md`
   - Sao chép `env.example` thành `.env.local` và điền thông tin Cloudflare của bạn
   - Sử dụng `npm run dev:vercel` để test với môi trường Vercel đầy đủ

5. **Mở trình duyệt:**
   - Truy cập `http://localhost:3010`
   - Cho phép truy cập camera để điều khiển bằng cử chỉ
   - Nhấn "上传照片" để tải ảnh lên


## 🎯 Hướng Dẫn Sử Dụng

### Tải Ảnh & Chia Sẻ

1. **Tải ảnh lên:**
   - Nhấn nút "上传照片" để chọn tối đa 22 ảnh
   - Ảnh sẽ xuất hiện dưới dạng polaroid trên cây thông

2. **Tạo link chia sẻ:**
   - Sau khi tải ảnh, nhấn "生成分享链接"
   - Đợi 2-3 giây để hoàn tất tải lên
   - Sao chép link và chia sẻ với bạn bè

3. **Xem ảnh được chia sẻ:**
   - Bạn bè có thể mở link chia sẻ trên bất kỳ trình duyệt nào
   - Ảnh sẽ tự động tải lên cây thông
   - Không cần đăng nhập hay cài đặt ứng dụng
   - Link hết hạn sau 30 ngày

### Điều Khiển Bằng Cử Chỉ Tay

1. **Đặt tay** trước webcam (hiển thị ở góc trên bên phải)
2. **Di chuyển tay** để điều khiển góc camera:
   - Trái/Phải: Xoay ngang
   - Lên/Xuống: Nghiêng dọc
3. **Xòe tay** (mở rộng tất cả ngón tay): Kích hoạt chế độ hỗn loạn
4. **Nắm tay**: Khôi phục cây về trạng thái hoàn chỉnh

### Điều Khiển Bằng Chuột

Khi không phát hiện tay, bạn có thể:
- **Nhấn và kéo** để xoay góc nhìn
- **Cuộn chuột** để phóng to/thu nhỏ
- **Nhấn chuột phải và kéo** để di chuyển (mặc định bị tắt)

## 🏗️ Công Nghệ Sử Dụng

### Frontend
- React 19 với TypeScript
- React Three Fiber (R3F) cho render 3D
- Three.js cho đồ họa WebGL
- @react-three/drei cho các helper
- @react-three/postprocessing cho hiệu ứng hình ảnh
- MediaPipe cho nhận diện cử chỉ tay
- Tailwind CSS cho styling

### Backend (Chia sẻ ảnh)
- Vercel Serverless Functions
- Cloudflare R2 (lưu trữ object tương thích S3)
- Cloudflare KV (lưu trữ key-value)
- AWS SDK S3 Client để tích hợp R2

### Tính Năng
- Điều khiển bằng cử chỉ tay qua webcam
- Chuyển đổi trạng thái động (HỖN LOẠN ↔ HOÀN CHỈNH)
- Tải ảnh và chia sẻ qua cloud
- Link chia sẻ tạm thời (hết hạn sau 30 ngày)
- Instanced rendering để tối ưu hiệu suất
- Hiệu ứng Bloom và post-processing

## 🎅 Chúc Mừng Giáng Sinh!

Chúc code của bạn luôn vui vẻ và rực rỡ! 🎄✨
