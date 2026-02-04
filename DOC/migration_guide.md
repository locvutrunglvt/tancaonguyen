# Database Migration Guide

## Tổng quan

Script migration này tái cấu trúc cơ sở dữ liệu để có quan hệ khóa ngoại đúng đắn, với `farmers` làm bảng cha chính.

## Cấu trúc mới

```
farmers (Bảng cha)
├── farm_baselines (Thông tin trang trại)
├── coffee_models (Mô hình cà phê)
│   ├── annual_activities (Hoạt động canh tác + hỗ trợ cây giống)
│   └── financial_records (Ghi nhận tài chính)
└── training_records (Ghi nhận tập huấn)
```

## Các thay đổi chính

### 1. Bảng `farmers` (MỚI)
- Bảng cha chính chứa thông tin nông dân
- Mỗi nông dân có mã duy nhất: `FAR-0001`, `FAR-0002`, ...

### 2. Bảng `farm_baselines` (CẬP NHẬT)
- Thêm khóa ngoại `farmer_id` → `farmers.id`
- Mỗi trang trại có mã: `FARM-0001`, `FARM-0002`, ...

### 3. Bảng `coffee_models` (CẬP NHẬT)
- Thay đổi từ `user_id` sang `farmer_id` → `farmers.id`
- Thêm `farm_id` → `farm_baselines.id` (tùy chọn)
- Mỗi mô hình có mã: `MDL-0001`, `MDL-0002`, ...

### 4. Bảng `annual_activities` (CẬP NHẬT)
- Hợp nhất dữ liệu từ `tree_support` vào đây
- `activity_type = 'tree_support'` cho các bản ghi hỗ trợ cây giống
- Mỗi hoạt động có mã: `ACT-0001`, `ACT-TS-0001`, ...

### 5. Bảng `tree_support` (XÓA)
- Dữ liệu được chuyển vào `annual_activities`
- Bảng cũ sẽ bị xóa sau khi migration

### 6. Bảng `training_records` (CẬP NHẬT)
- Thay đổi từ `user_id` sang `farmer_id`
- Mỗi khóa tập huấn có mã: `TRN-0001`, `TRN-0002`, ...

### 7. Bảng `financial_records` (CẬP NHẬT)
- Liên kết với `model_id` thay vì `user_id`
- Mỗi ghi nhận tài chính có mã: `FIN-0001`, `FIN-0002`, ...

## Cách chạy Migration

### Bước 1: Backup Database
```bash
# Trong Supabase Dashboard
# Settings > Database > Backups > Create Backup
```

### Bước 2: Chạy Migration Script
1. Mở Supabase SQL Editor
2. Copy toàn bộ nội dung file `002_restructure_database.sql`
3. Paste vào SQL Editor
4. Click "Run"

### Bước 3: Kiểm tra kết quả
Script sẽ tự động chạy các câu lệnh verification ở cuối để kiểm tra:
- Số lượng bản ghi trong mỗi bảng
- Quan hệ khóa ngoại

## Lưu ý quan trọng

### ⚠️ Backup Tables
Script tự động tạo các bảng backup:
- `farm_baselines_backup`
- `coffee_models_backup`
- `annual_activities_backup`
- `training_records_backup`
- `financial_records_backup`
- `tree_support_backup`

**Không xóa các bảng này** cho đến khi bạn chắc chắn migration thành công!

### ⚠️ Data Mapping
Migration script cố gắng map dữ liệu dựa trên:
- `email` khớp giữa `profiles` và `farmers`
- `full_name` khớp giữa `profiles` và `farmers`

Nếu không tìm thấy match, dữ liệu sẽ **KHÔNG** được migrate. Kiểm tra kỹ sau khi chạy!

### ⚠️ Foreign Key Constraints
Sau migration, bạn không thể:
- Xóa `farmer` nếu còn `farm_baselines`, `coffee_models`, hoặc `training_records` liên quan
- Xóa `coffee_model` nếu còn `annual_activities` hoặc `financial_records` liên quan

Sử dụng `ON DELETE CASCADE` để tự động xóa các bản ghi con.

## Views mới

### `v_farmer_complete`
Xem tổng quan về nông dân với số liệu thống kê:
```sql
SELECT * FROM v_farmer_complete;
```

### `v_model_activities`
Xem tổng hợp hoạt động theo mô hình:
```sql
SELECT * FROM v_model_activities;
```

## Rollback (Khôi phục)

Nếu cần rollback:

```sql
-- 1. Drop new tables
DROP TABLE IF EXISTS financial_records CASCADE;
DROP TABLE IF EXISTS annual_activities CASCADE;
DROP TABLE IF EXISTS training_records CASCADE;
DROP TABLE IF EXISTS coffee_models CASCADE;
DROP TABLE IF EXISTS farm_baselines CASCADE;
DROP TABLE IF EXISTS farmers CASCADE;

-- 2. Restore from backup
ALTER TABLE farm_baselines_backup RENAME TO farm_baselines;
ALTER TABLE coffee_models_backup RENAME TO coffee_models;
ALTER TABLE annual_activities_backup RENAME TO annual_activities;
ALTER TABLE training_records_backup RENAME TO training_records;
ALTER TABLE financial_records_backup RENAME TO financial_records;
ALTER TABLE tree_support_backup RENAME TO tree_support;
```

## Cập nhật Frontend Code

Sau khi migration, bạn cần cập nhật code frontend:

### 1. FarmerManagement.jsx
- Sử dụng bảng `farmers` thay vì `profiles`
- Thêm các trường mới: `farmer_code`, `village`, `status`, etc.

### 2. FarmProfiles.jsx
- Thêm dropdown chọn `farmer_id`
- Hiển thị `farm_code`

### 3. ModelManagement.jsx
- Thay `user_id` bằng `farmer_id`
- Thêm dropdown chọn `farm_id` (optional)

### 4. AnnualActivities.jsx
- Hỗ trợ `activity_type = 'tree_support'`
- Hiển thị các trường mới: `tree_species`, `tree_quantity`, etc.

### 5. TrainingCenter.jsx
- Thay `user_id` bằng `farmer_id`

## Hỗ trợ

Nếu gặp vấn đề trong quá trình migration, vui lòng:
1. Kiểm tra console logs trong Supabase
2. Chạy verification queries
3. Kiểm tra backup tables
4. Liên hệ team development

---
**Ngày tạo:** 2026-02-04  
**Phiên bản:** 1.0  
**Tác giả:** Tân Cao Nguyên Development Team
