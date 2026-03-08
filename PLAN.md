# KE HOACH XAY DUNG HE THONG QUAN LY MO HINH TRINH DIEN TCN

## HIEN TRANG

### Du lieu hien co (Backup Excel)
- 6 ma mo hinh: GL01-XP(58), GL02-XP(65), GL04-XP(70), GL05-XP(70), GL06-XP(75), GL07-XP(60)
- Tong: 398 nong ho, 1105 thanh vien, 912 manh dat, 216 chung nhan, 420 anh
- 3 ma du lieu day du: **GL01-XP, GL05-XP, GL07-XP** (188 nong ho)
- Thieu 3 ma: GL03-XP, GL08-XP, GL09-XP (chua co trong Excel)

### App hien tai
- 6 PB collections: farmers, farm_baselines, coffee_models, annual_activities, training_records, financial_records
- Luong: Farmer -> Farm -> Model -> Activities (phan cap)
- Chua co: Luong mo hinh lam trung tam, Inspection, EUDR, Polygon, Nhat ky, Tieu hao

---

## THIET KE MOI: MO HINH LÀ TRUNG TAM

### A. CẤU TRÚC POCKETBASE COLLECTIONS (Mới + Cập nhật)

#### 1. `demo_models` (BẢNG TRUNG TÂM - 9 mô hình)
Mở app -> Thấy 9 mô hình -> Bấm vào -> Xem tất cả dữ liệu liên quan

| Field | Type | Mô tả |
|-------|------|-------|
| model_code | text* | GL01-XP, GL02-XP... GL09-XP |
| model_name | text* | Tên mô hình trình diễn |
| description | text | Mô tả chi tiết mô hình |
| commune | text | Xã |
| village | text | Thôn/làng |
| district | text | Huyện |
| province | text | Tỉnh (Gia Lai) |
| target_area | number | Diện tích mục tiêu (ha) |
| target_trees | number | Số cây mục tiêu |
| coffee_type | text | Robusta/Arabica |
| start_date | date | Ngày bắt đầu mô hình |
| status | select | planning/active/completed |
| data_status | select | full/partial/pending (3 đầy đủ, 5 sơ bộ, 1 chưa) |
| farmer_id | relation→farmers | Nông hộ chủ mô hình (1 hộ - 1 MH) |
| farm_id | relation→farm_baselines | Trang trại tham gia MH |
| gps_polygon | json | Polygon tọa độ ranh giới |
| photo | file | Ảnh đại diện |
| notes | text | Ghi chú |
| created/updated | autodate | |

#### 2. `farmers` (Giữ nguyên + Bổ sung)
Thêm fields từ Excel Backup:

| Field bổ sung | Type | Mô tả (từ Excel Section A) |
|---------------|------|---------------------------|
| ethnicity | text | Dân tộc |
| economic_class | select | Nghèo/Cận nghèo/Bình thường/Khá |
| cooperative_member | bool | Tham gia HTX? |
| coffee_years | number | Số năm trồng cà phê |
| education | text | Học vấn cao nhất |
| total_farms | number | Tổng số mảnh đất (>= 2 farm) |

#### 3. `farm_baselines` (Giữ nguyên, đã đủ)
Đã có: farmer_id, farm_name, total_area, coffee_area, intercrop_area, gps_lat, gps_long, elevation, soil_type, soil_ph, slope, water_source...

#### 4. `household_members` (MỚI - từ Excel HH_members)
| Field | Type | Mô tả |
|-------|------|-------|
| farmer_id | relation→farmers* | Thuộc hộ nào |
| member_name | text* | Tên thành viên |
| gender | select | Nam/Nữ |
| birth_year | number | Năm sinh |
| relation_to_head | text | Quan hệ với chủ hộ |
| education | text | Học vấn |
| coffee_participation | bool | Có tham gia SX cà phê? |
| production_stages | text | Công đoạn tham gia |

#### 5. `land_plots` (MỚI - từ Excel LAND_PLOTS)
| Field | Type | Mô tả |
|-------|------|-------|
| farmer_id | relation→farmers* | Thuộc hộ nào |
| plot_name | text | Tên mảnh |
| area_ha | number* | Diện tích (ha) |
| forest_area | number | DT rừng trên mảnh |
| tree_count | number | Số gốc cà phê |
| intercrop | bool | Có trồng xen? |
| intercrop_species | text | Loài cây xen |
| harvest_area | number | DT cho thu hoạch |
| yield_2025 | number | Sản lượng năm nay |
| ownership_type | text | Hình thức sở hữu |
| start_year | number | Năm bắt đầu trồng |
| latest_planting | number | Năm trồng gần nhất |
| previous_crop | text | Cây trồng trước |
| forest_distance | number | KC đến rừng (km) |
| gps_mapped | bool | Đã lập bản đồ? |

#### 6. `income_records` (MỚI - từ Excel Section B)
| Field | Type | Mô tả |
|-------|------|-------|
| farmer_id | relation→farmers* | |
| year | number* | Năm ghi nhận |
| total_income | number | Tổng thu nhập ròng |
| agri_income_ratio | number | Tỷ trọng NN |
| coffee_revenue | number | Thu nhập từ cà phê |
| coffee_cost | number | Chi phí đầu tư cà phê |
| coffee_net | number | Thu nhập ròng cà phê |
| rice_income | number | Thu từ lúa |
| fruit_income | number | Thu từ cây ăn trái |
| livestock_income | number | Thu từ chăn nuôi |
| salary_income | number | Thu từ lao động |
| business_income | number | Thu từ kinh doanh |
| other_income | number | Thu khác |
| production_tons | number | Sản lượng (tấn) |
| production_value | number | Giá trị (triệu đồng) |

#### 7. `model_inspections` (MỚI - Chuyến thăm kiểm tra)
| Field | Type | Mô tả |
|-------|------|-------|
| model_id | relation→demo_models* | Mô hình nào |
| inspector_id | relation→users | Người kiểm tra |
| inspection_date | date* | Ngày kiểm tra |
| inspection_type | select* | quarterly/monthly/adhoc (Quý/Tháng/Đột xuất) |
| quarter | text | Q1/Q2/Q3/Q4 |
| growth_quality | select | poor/fair/good/excellent |
| pest_status | select | none/minor/moderate/severe |
| pest_details | text | Chi tiết sâu bệnh |
| soil_condition | select | poor/fair/good/excellent |
| water_status | select | drought/adequate/excess |
| tree_health_pct | number | % cây khỏe |
| fruit_quality | select | poor/fair/good/excellent |
| recommendations | text | Khuyến nghị |
| follow_up_actions | text | Hành động tiếp theo |
| photos | file[] | Ảnh kiểm tra |
| notes | text | Ghi chú |

#### 8. `model_diary` (MỚI - Nhật ký canh tác mô hình)
| Field | Type | Mô tả |
|-------|------|-------|
| model_id | relation→demo_models* | Mô hình |
| author_id | relation→users | Người ghi (nông dân/TCN) |
| diary_date | date* | Ngày |
| activity_type | select* | fertilize/pesticide/irrigate/prune/weed/harvest/tree_care/other |
| description | text* | Mô tả hoạt động |
| material_name | text | Vật tư sử dụng |
| material_amount | number | Lượng dùng |
| material_unit | text | Đơn vị |
| labor_hours | number | Giờ công lao động |
| labor_cost | number | Chi phí nhân công |
| material_cost | number | Chi phí vật tư |
| gcp_compliant | bool | Tuân thủ GCP? |
| weather | text | Thời tiết |
| photos | file[] | Ảnh minh chứng |
| notes | text | Ghi chú |

#### 9. `model_consumables` (MỚI - Tiêu hao mô hình)
| Field | Type | Mô tả |
|-------|------|-------|
| model_id | relation→demo_models* | Mô hình |
| record_date | date* | Ngày |
| category | select* | electricity/water/fertilizer/pesticide/labor/fuel/other |
| item_name | text* | Tên hạng mục |
| quantity | number | Số lượng |
| unit | text | Đơn vị |
| unit_price | number | Đơn giá |
| total_cost | number | Thành tiền |
| notes | text | Ghi chú |

#### 10. `sustainability_certs` (MỚI - từ Excel SUBTAINABLE_AGRI)
| Field | Type | Mô tả |
|-------|------|-------|
| farmer_id | relation→farmers* | |
| cert_type | text* | Loại chứng chỉ |
| family_knows | bool | Gia đình biết? |
| who_knows_most | text | Ai biết nhiều nhất |
| is_beneficial | bool | Có hữu ích? |
| practiced_on_land | bool | Có áp dụng trên đất? |
| is_certified | bool | Đã được chứng nhận? |
| who_practices | text | Ai thực hành |

#### 11. Giữ nguyên: `training_records`, `financial_records`
(Đã đủ cho ghi nhận đào tạo và tài chính chung)

---

### B. CẤU TRÚC NAVIGATION MỚI (Model-Centric)

```
Trang chủ: Lưới 9 ô mô hình (GL01-XP ... GL09-XP)
│
├── Bấm vào 1 mô hình (VD: GL01-XP)
│   ├── Tổng quan mô hình (info, status, polygon, ảnh)
│   ├── Nông hộ chủ mô hình (thông tin hộ, thành viên)
│   ├── Trang trại (baseline, mảnh đất, thổ nhưỡng)
│   ├── Nhật ký canh tác (diary - nông dân ghi)
│   ├── Kiểm tra định kỳ (inspections - TCN ghi)
│   ├── Tiêu hao (điện, nước, phân, công)
│   ├── Đầu tư & Chi phí (tổng hợp)
│   ├── Ảnh & Media
│   └── Xuất báo cáo (PDF)
│
├── Menu phụ (sidebar)
│   ├── Tất cả nông hộ (quản lý chung 398 hộ)
│   ├── Đào tạo
│   ├── Tài chính tổng
│   ├── Sao lưu (Admin)
│   └── Quản trị (Admin)
```

### C. PHÂN QUYỀN ACCOUNT (3 loại)

| Role | Mô tả | Quyền |
|------|--------|-------|
| **Admin (TCN)** | Quản lý dự án, tư vấn, thiết lập target | Toàn quyền: CRUD tất cả, tạo inspection, xem tất cả MH, xuất báo cáo, quản trị user |
| **Sponsor (Nhà tài trợ)** | Ghé thăm, xem tiến độ | Chỉ XEM: Xem mô hình, xem báo cáo, xem inspection. Không sửa/xóa |
| **Farmer (Người dân)** | Chủ mô hình, ghi nhật ký | Xem MH của mình, GHI diary/consumables, KHÔNG sửa dữ liệu quá khứ, cập nhật ảnh |

### D. KẾ HOẠCH THỰC HIỆN THEO GIAI ĐOẠN

#### GIAI ĐOẠN 1: Database + Import (Ưu tiên cao nhất)
1. Tạo 6 PB collections mới: demo_models, household_members, land_plots, income_records, model_inspections, model_diary, model_consumables, sustainability_certs
2. Cập nhật farmers thêm fields mới
3. Viết script import 398 nông hộ + 1105 thành viên + 912 mảnh đất từ Excel
4. Tạo 9 bản ghi demo_models (6 có dữ liệu, 3 placeholder)
5. Liên kết farmer → demo_model cho mỗi mô hình

#### GIAI ĐOẠN 2: UI Trang chủ mới (Model-Centric)
1. Thay HomeView thành lưới 9 mô hình (card lớn, ảnh, status badge)
2. Tạo ModelDetailView - trang chi tiết khi bấm vào 1 mô hình
3. ModelDetailView có tabs: Tổng quan | Nông hộ | Trang trại | Nhật ký | Kiểm tra | Tiêu hao | Đầu tư
4. Giữ sidebar menu cũ cho quản lý tổng (tất cả nông hộ, đào tạo, tài chính)

#### GIAI ĐOẠN 3: Nhật ký & Kiểm tra
1. Component ModelDiary - nông dân ghi chép hàng ngày
2. Component ModelInspection - TCN kiểm tra quý/tháng/đột xuất
3. Trigger nhắc nhở kiểm tra 3 tháng/lần
4. Dashboard hiển thị "Sắp đến hạn kiểm tra" cho Admin

#### GIAI ĐOẠN 4: Tiêu hao & Đầu tư
1. Component ModelConsumables - ghi điện, nước, phân, công
2. Tổng hợp chi phí đầu tư theo mô hình
3. So sánh đầu tư giữa các mô hình

#### GIAI ĐOẠN 5: Phân quyền mới + Account nông hộ
1. Thêm role "Sponsor" và "Farmer"
2. Farmer login → chỉ thấy MH của mình
3. Farmer ghi diary nhưng không sửa được dữ liệu cũ
4. Sponsor login → chỉ đọc, xem báo cáo

#### GIAI ĐOẠN 6: Báo cáo & Nâng cao
1. Xuất PDF báo cáo mô hình
2. EUDR compliance tracking
3. Polygon vẽ ranh giới trên bản đồ
4. Video/media gallery
5. Dashboard thống kê tổng hợp

---

### E. QUAN HỆ DỮ LIỆU

```
demo_models (9 mô hình) ──┬── farmer_id → farmers
                           ├── farm_id → farm_baselines
                           ├── model_inspections (N)
                           ├── model_diary (N)
                           └── model_consumables (N)

farmers (398 hộ) ──┬── household_members (N)
                   ├── land_plots (N)
                   ├── income_records (N)
                   ├── sustainability_certs (N)
                   ├── farm_baselines (N, hộ có >= 2 farm)
                   └── training_records (N)

Lưu ý: 1 hộ có thể có >2 farm, nhưng chỉ 1 farm tham gia 1 mô hình.
demo_models.farm_id chỉ đến farm cụ thể tham gia MH đó.
```
