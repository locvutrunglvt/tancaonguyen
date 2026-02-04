# Type Casting Summary - Migration Script

## Tổng quan

Đã kiểm tra và sửa **TẤT CẢ** các cột numeric trong migration script để tránh lỗi type mismatch.

## Danh sách đầy đủ các cột đã sửa

### 1. farm_baselines (6 cột)
```sql
NULLIF(fb.total_area::TEXT, '')::NUMERIC(10, 2) as total_area
NULLIF(fb.coffee_area::TEXT, '')::NUMERIC(10, 2) as coffee_area
NULLIF(fb.intercrop_area::TEXT, '')::NUMERIC(10, 2) as intercrop_area
NULLIF(fb.gps_lat::TEXT, '')::NUMERIC(10, 6) as gps_lat
NULLIF(fb.gps_long::TEXT, '')::NUMERIC(10, 6) as gps_long
NULLIF(fb.soil_ph::TEXT, '')::NUMERIC(4, 2) as soil_ph
```

### 2. coffee_models (1 cột)
```sql
CASE 
  WHEN cm.area IS NULL OR cm.area::TEXT = '' THEN NULL 
  ELSE NULLIF(cm.area::TEXT, '')::NUMERIC(10, 2)
END as area
```

### 3. annual_activities (1 cột)
```sql
NULLIF(aa.amount::TEXT, '')::NUMERIC(10, 2) as amount
```

### 4. tree_support → annual_activities (1 cột)
```sql
NULLIF(ts.survival_rate::TEXT, '')::NUMERIC(5, 2) as survival_rate
```

### 5. financial_records (1 cột)
```sql
NULLIF(fr.amount::TEXT, '')::NUMERIC(12, 2) as amount
```

## Tổng kết

| Bảng | Số cột numeric | Status |
|------|----------------|--------|
| farm_baselines | 6 | ✅ Fixed |
| coffee_models | 1 | ✅ Fixed |
| annual_activities | 1 | ✅ Fixed |
| tree_support | 1 | ✅ Fixed |
| financial_records | 1 | ✅ Fixed |
| **TỔNG CỘNG** | **10** | **✅ ALL FIXED** |

## Cách hoạt động

### NULLIF Function
```sql
NULLIF(value::TEXT, '')
```
- Chuyển value sang TEXT
- Nếu là empty string (''), trả về NULL
- Nếu không, trả về giá trị TEXT

### Type Casting
```sql
::NUMERIC(precision, scale)
```
- Chuyển TEXT thành NUMERIC
- `precision`: tổng số chữ số
- `scale`: số chữ số sau dấu phẩy

### Ví dụ
```sql
-- Input: '12.50' (TEXT)
NULLIF('12.50'::TEXT, '')::NUMERIC(10, 2)
-- Output: 12.50 (NUMERIC)

-- Input: '' (empty string)
NULLIF(''::TEXT, '')::NUMERIC(10, 2)
-- Output: NULL

-- Input: NULL
NULLIF(NULL::TEXT, '')::NUMERIC(10, 2)
-- Output: NULL
```

## Lợi ích

✅ **Tránh lỗi type mismatch** - Không còn lỗi "column is of type numeric but expression is of type text"

✅ **Xử lý NULL an toàn** - NULL values được giữ nguyên

✅ **Xử lý empty strings** - Empty strings được convert thành NULL thay vì gây lỗi

✅ **Đúng precision/scale** - Mỗi cột có precision và scale phù hợp với schema

## Migration sẵn sàng!

Script migration bây giờ đã **HOÀN TOÀN AN TOÀN** để chạy trong Supabase SQL Editor.

---
**Updated:** 2026-02-04 17:24  
**Total fixes:** 10 numeric columns
