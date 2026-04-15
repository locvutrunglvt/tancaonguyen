/**
 * excelExportUtils.js
 * Core Excel export engine — maps PocketBase data → Excel templates
 * Uses SheetJS (xlsx) library
 */
import * as XLSX from 'xlsx';

const FMT = 'dd/mm/yyyy';

// ── Helpers ────────────────────────────────────────────────────────────────────
const fmtVND = (n) => n != null ? Number(n).toLocaleString('vi-VN') : '0';
const fmtDate = (d) => {
    if (!d) return '';
    const dt = new Date(d);
    return dt.toLocaleDateString('vi-VN');
};
const safeVal = (v) => (v == null || v === '') ? '' : v;

// ── Excel export engine ───────────────────────────────────────────────────────
export async function exportModelExcel({ model, farmerName, initialLabor, initialInput, coffeeLabor, coffeeInputs, icLabor, icInputs, coffeeRevenues, icRevenues }) {
    const wb = XLSX.utils.book_new();

    // Sheet 1: Năm đầu tiên
    const ws1 = buildInitialYearSheet(initialLabor, initialInput, farmerName);
    const sheet1 = XLSX.utils.json_to_sheet([]);
    // Apply ws1 manually via sheet manipulation
    const sheetData1 = [
        ['NĂM ĐẦU TIÊN'],
        [],
        ['A.', 'NHÂN CÔNG'],
        ['THÁNG', 'MÔ TẢ', 'ĐƠN VỊ', 'SỐ LƯỢNG', 'ĐƠN GIÁ', 'TỔNG CỘNG', 'GHI CHÚ'],
        ['Dọn dẹp', '', '', '', '', '=SUM(F6:F13)', ''],
        ...initialLabor.filter(r => r.investment_type === 'Labour').map(r => [
            '', r.item || r.sub_type || '', r.unit || 'Công', r.quantity || '', r.unit_price || '', r.total_cost || '', r.remarks || ''
        ]),
    ];
    const allRows1 = [];
    allRows1.push(['NĂM ĐẦU TIÊN']);
    allRows1.push([]);
    allRows1.push(['A.', 'NHÂN CÔNG']);
    allRows1.push(['THÁNG', 'MÔ TẢ', 'ĐƠN VỊ', 'SỐ LƯỢNG', 'ĐƠN GIÁ', 'TỔNG CỘNG', 'GHI CHÚ']);
    allRows1.push(['Dọn dẹp', '', '', '', '', '=SUM(F6:F13)', '']);
    initialLabor.filter(r => r.investment_type === 'Labour').forEach(r => {
        allRows1.push(['', r.item || r.sub_type || '', r.unit || 'Công', r.quantity || '', r.unit_price || '', r.total_cost || '', r.remarks || '']);
    });
    allRows1.push([]);
    allRows1.push(['TỔNG A', '', '', '', '', initialLabor.filter(r => r.investment_type === 'Labour').reduce((s, r) => s + (Number(r.total_cost) || 0), 0), '']);
    allRows1.push([]);
    allRows1.push(['B.', 'ĐẦU TƯ VẬT TƯ']);
    allRows1.push(['NGÀY THÁNG', 'VẬT TƯ', 'ĐƠN VỊ', 'SỐ LƯỢNG', 'ĐƠN GIÁ', 'SỐ TIỀN', 'GHI CHÚ']);
    initialInput.forEach(r => {
        allRows1.push([fmtDate(r.record_date), r.item || r.sub_type || '', r.unit || '', r.quantity || '', r.unit_price || '', r.total_cost || '', r.remarks || '']);
    });
    allRows1.push(['TỔNG B', '', '', '', '', initialInput.reduce((s, r) => s + (Number(r.total_cost) || 0), 0), '']);
    allRows1.push([]);
    allRows1.push(['…………..ngày……..tháng……….năm 20……', '', '', 'TRƯỞNG CÂU LẠC BỘ', '', '', 'CHỦ HỘ']);

    const s1 = XLSX.utils.aoa_to_sheet(allRows1);
    XLSX.utils.book_append_sheet(wb, s1, 'Năm đầu tiên');

    // Sheet 2: Cà phê
    const coffeeRows = [];
    coffeeRows.push(['NĂM ....']);
    coffeeRows.push([]);
    coffeeRows.push(['THÔNG TIN VƯỜN']);
    coffeeRows.push(['Loại cây', '', 'Số cây', 'Năm 1', 'Năm 2', 'Năm 3', 'Năm 4', '4+']);
    coffeeRows.push(['', '', '', 'Năm 1', 'Năm 2', 'Năm 3', 'Năm 4', '4+']);
    coffeeRows.push(['Cà phê']);
    coffeeRows.push([]);
    coffeeRows.push(['A. CHI PHÍ NHÂN CÔNG']);
    coffeeRows.push(['Ngày tháng', 'Mô tả', 'Đơn vị', 'Số lượng', 'Đơn giá công', 'Số tiền', 'Ghi chú']);
    coffeeLabor.forEach(r => {
        coffeeRows.push([fmtDate(r.record_date), r.cost_subtype || r.item || '', r.unit || 'Công', r.quantity || '', r.unit_price || '', r.total_cost || '', r.remarks || '']);
    });
    coffeeRows.push(['TỔNG A', '', '', '', '', coffeeLabor.reduce((s, r) => s + (Number(r.total_cost) || 0), 0), '']);
    coffeeRows.push([]);
    coffeeRows.push(['B. CHI PHÍ VẬT TƯ']);
    coffeeRows.push(['Ngày tháng', 'Thiết bị/phụ tùng', 'Loại', 'Đơn vị', 'Số lượng', 'Đơn giá', 'Số tiền', 'Ghi chú']);
    coffeeInputs.forEach(r => {
        coffeeRows.push([fmtDate(r.record_date), r.item || '', r.brand || '', r.unit || '', r.quantity || '', r.unit_price || '', r.total_cost || '', r.remarks || '']);
    });
    coffeeRows.push(['TỔNG B', '', '', '', '', '', coffeeInputs.reduce((s, r) => s + (Number(r.total_cost) || 0), 0), '']);
    coffeeRows.push([]);
    coffeeRows.push(['C. DOANH THU CÀ PHÊ']);
    coffeeRows.push(['Ngày tháng', 'Điểm thu mua/Tổ chức thu mua', 'Đơn vị', 'Số lượng', 'Đơn giá', 'Số tiền', 'Ghi chú']);
    coffeeRevenues.filter(r => r.revenue_source === 'Coffee').forEach(r => {
        coffeeRows.push([fmtDate(r.sale_date), r.purchasing_agent || '', 'Kg', r.quantity_kg || '', r.unit_price || '', r.total_revenue || '', r.coffee_form || '']);
    });
    const totalC = coffeeRevenues.filter(r => r.revenue_source === 'Coffee').reduce((s, r) => s + (Number(r.total_revenue) || 0), 0);
    coffeeRows.push(['TỔNG C', '', '', '', '', totalC, '']);
    coffeeRows.push([]);
    const totalA = coffeeLabor.reduce((s, r) => s + (Number(r.total_cost) || 0), 0);
    const totalB = coffeeInputs.reduce((s, r) => s + (Number(r.total_cost) || 0), 0);
    coffeeRows.push(['D. LỢI NHUẬN']);
    coffeeRows.push(['STT', 'Hạng mục', '', '', '', 'Số tiền', 'Ghi chú']);
    coffeeRows.push([1, 'TỔNG DOANH THU (C)', '', '', '', totalC, '']);
    coffeeRows.push([2, 'TỔNG CHI PHÍ (A + B)', '', '', '', totalA + totalB, '']);
    coffeeRows.push([3, 'LỢI NHUẬN (C - A - B)', '', '', '', totalC - totalA - totalB, '']);

    const s2 = XLSX.utils.aoa_to_sheet(coffeeRows);
    XLSX.utils.book_append_sheet(wb, s2, 'Cà phê');

    // Sheet 3: Trồng xen
    const icRows = [];
    icRows.push(['NĂM ....']);
    icRows.push([]);
    icRows.push(['A. CHI PHÍ NHÂN CÔNG - TRỒNG XEN']);
    icRows.push(['Ngày tháng', 'Mô tả', 'Đơn vị', 'Số lượng', 'Đơn giá công', 'Số tiền', 'Ghi chú']);
    icLabor.forEach(r => {
        icRows.push([fmtDate(r.record_date), r.cost_subtype || r.item || '', 'Công', r.quantity || '', r.unit_price || '', r.total_cost || '', r.remarks || '']);
    });
    icRows.push(['TỔNG A', '', '', '', '', icLabor.reduce((s, r) => s + (Number(r.total_cost) || 0), 0), '']);
    icRows.push([]);
    icRows.push(['B. CHI PHÍ VẬT TƯ']);
    icRows.push(['Ngày tháng', 'Thiết bị/phụ tùng', 'Loại', 'Đơn vị', 'Số lượng', 'Đơn giá', 'Số tiền', 'Ghi chú']);
    icInputs.forEach(r => {
        icRows.push([fmtDate(r.record_date), r.item || '', r.brand || '', r.unit || 'Kg', r.quantity || '', r.unit_price || '', r.total_cost || '', r.remarks || '']);
    });
    icRows.push(['TỔNG B', '', '', '', '', '', icInputs.reduce((s, r) => s + (Number(r.total_cost) || 0), 0), '']);
    icRows.push([]);
    icRows.push(['C. DOANH THU']);
    icRows.push(['Ngày tháng', 'Điểm thu mua', 'Đơn vị', 'Số lượng', 'Đơn giá', 'Số tiền', 'Ghi chú']);
    icRevenues.forEach(r => {
        icRows.push([fmtDate(r.sale_date), r.purchasing_agent || '', 'Kg', r.quantity_kg || '', r.unit_price || '', r.total_revenue || '', r.intercrop_type || '']);
    });
    const totalICRev = icRevenues.reduce((s, r) => s + (Number(r.total_revenue) || 0), 0);
    icRows.push(['TỔNG C', '', '', '', '', totalICRev, '']);
    icRows.push([]);
    const totalICA = icLabor.reduce((s, r) => s + (Number(r.total_cost) || 0), 0);
    const totalICB = icInputs.reduce((s, r) => s + (Number(r.total_cost) || 0), 0);
    icRows.push(['D. LỢI NHUẬN']);
    icRows.push(['STT', 'Hạng mục', '', '', '', 'Số tiền', 'Ghi chú']);
    icRows.push([1, 'TỔNG DOANH THU (C)', '', '', '', totalICRev, '']);
    icRows.push([2, 'TỔNG CHI PHÍ (A + B)', '', '', '', totalICA + totalICB, '']);
    icRows.push([3, 'LỢI NHUẬN (C - A - B)', '', '', '', totalICRev - totalICA - totalICB, '']);

    const s3 = XLSX.utils.aoa_to_sheet(icRows);
    XLSX.utils.book_append_sheet(wb, s3, 'Trồng xen');

    // Apply Arial font to all cells
    const range2d = (ws) => {
        try { return XLSX.utils.decode_range(ws['!ref']); } catch { return null; }
    };

    [s1, s2, s3].forEach(ws => {
        try {
            const ref = ws['!ref'];
            if (!ref) return;
            ws['!cols'] = ws['!cols'] || [];
            // Set column widths
            ws['!cols'] = [
                { wch: 15 }, { wch: 30 }, { wch: 12 }, { wch: 12 },
                { wch: 15 }, { wch: 18 }, { wch: 20 }, { wch: 15 }
            ];
        } catch (e) { /* non-critical */ }
    });

    // Save
    const filename = `260311_${model?.name || 'Model'}_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, filename);
    return filename;
}

// ── Export Form 2: Consolidated Data Template (260323) ─────────────────────
export async function exportConsolidatedExcel({ models, farmBackgrounds, initialInvestments, coffeeCosts, icCosts, revenues, intercrops }) {
    const wb = XLSX.utils.book_new();

    // Helper: build data rows from records
    function makeDataRows(records, fields) {
        return records.map(rec => fields.map(f => {
            const v = rec[f.key] || '';
            if (f.date && v) return fmtDate(v);
            return v;
        }));
    }

    // Sheet 1: THÔNG TIN VƯỜN
    const bgRows = [['STT', 'Năm', 'Mô hình (Tên nông dân)', 'Diện tích vườn',
        '#Cà phê_Năm1', '#Cà phê_Năm2', '#Cà phê_Năm3', '#Cà phê_Năm4', '#Cà phê_Trên 4 năm',
        '#Sầu riêng_Năm1', '#Sầu riêng_Năm2', '#Sầu riêng_Năm3', '#Sầu riêng_Năm4', '#Sầu riêng_Trên 4 năm',
        '#Macadamia_Năm1', '#Macadamia_Năm2', '#Macadamia_Năm3', '#Macadamia_Năm4', '#Macadamia_Trên 4 năm']];
    farmBackgrounds.forEach((bg, i) => {
        bgRows.push([
            i + 1, bg.year || '', bg.expand?.farmer_id?.full_name || '',
            bg.farm_size_ha || '',
            bg.coffee_yr1 || 0, bg.coffee_yr2 || 0, bg.coffee_yr3 || 0, bg.coffee_yr4 || 0, bg.coffee_yr4plus || 0,
            bg.durian_yr1 || 0, bg.durian_yr2 || 0, bg.durian_yr3 || 0, bg.durian_yr4 || 0, bg.durian_yr4plus || 0,
            bg.maca_yr1 || 0, bg.maca_yr2 || 0, bg.maca_yr3 || 0, bg.maca_yr4 || 0, bg.maca_yr4plus || 0,
        ]);
    });
    const sBg = XLSX.utils.aoa_to_sheet(bgRows);
    sBg['!cols'] = [{ wch: 6 }, { wch: 8 }, { wch: 22 }, { wch: 15 },
        ...Array(16).fill({ wch: 10 })];
    XLSX.utils.book_append_sheet(wb, sBg, 'THÔNG TIN VƯỜN');

    // Sheet 2: DỮ LIỆU CHI PHÍ CÀ PHÊ
    const ccRows = [['STT', 'Ngày tháng', 'Mô hình (Tên nông dân)', 'Loại chi phí', 'Loại con chi phí',
        'Đợt phân bổ chi phí', 'Hạng mục', 'Thương hiệu', 'Đơn vị', 'Số lượng', 'Đơn giá', 'Tổng chi phí', '', 'Năm']];
    let seq = 0;
    coffeeCosts.forEach(rec => {
        seq++;
        ccRows.push([
            seq, fmtDate(rec.record_date), rec.expand?.model_id?.expand?.farmer_id?.full_name || '',
            rec.cost_type || '', rec.cost_subtype || '', rec.allocated_round || '',
            rec.item || '', rec.brand || '', rec.unit || '', rec.quantity || '',
            rec.unit_price || '', rec.total_cost || '', '', rec.crop_year || ''
        ]);
    });
    const sCC = XLSX.utils.aoa_to_sheet(ccRows);
    sCC['!cols'] = [{ wch: 6 }, { wch: 12 }, { wch: 22 }, { wch: 12 }, { wch: 18 },
        { wch: 12 }, { wch: 20 }, { wch: 15 }, { wch: 8 }, { wch: 10 }, { wch: 12 }, { wch: 15 }, { wch: 8 }, { wch: 8 }];
    XLSX.utils.book_append_sheet(wb, sCC, 'DỮ LIỆU CHI PHÍ CÀ PHÊ');

    // Sheet 3: DỮ LIỆU CHI PHÍ TRỒNG XEN
    const icRows2 = [['STT', 'Ngày tháng', 'Mô hình (Tên nông dân)', 'Loại chi phí', 'Loại con chi phí',
        'Đợt phân bổ chi phí', 'Hạng mục', 'Thương hiệu', 'Đơn vị', 'Số lượng', 'Đơn giá', 'Tổng chi phí', '', 'Năm', 'Cây xen']];
    seq = 0;
    icCosts.forEach(rec => {
        seq++;
        icRows2.push([
            seq, fmtDate(rec.record_date), rec.expand?.model_id?.expand?.farmer_id?.full_name || '',
            rec.cost_type || '', rec.cost_subtype || '', rec.allocated_round || '',
            rec.item || '', rec.brand || '', rec.unit || '', rec.quantity || '',
            rec.unit_price || '', rec.total_cost || '', '', rec.crop_year || '', rec.intercrop_type || ''
        ]);
    });
    const sIC = XLSX.utils.aoa_to_sheet(icRows2);
    sIC['!cols'] = [{ wch: 6 }, { wch: 12 }, { wch: 22 }, { wch: 12 }, { wch: 18 },
        { wch: 12 }, { wch: 20 }, { wch: 15 }, { wch: 8 }, { wch: 10 }, { wch: 12 }, { wch: 15 }, { wch: 8 }, { wch: 8 }, { wch: 12 }];
    XLSX.utils.book_append_sheet(wb, sIC, 'DỮ LIỆU CHI PHÍ TRỒNG XEN');

    // Sheet 4: DỮ LIỆU DOANH THU
    const revRows = [['STT', 'Ngày tháng', 'Mô hình (Tên nông dân)', 'Điểm thu mua/Tổ chức thu mua',
        'Nguồn doanh thu', 'Dạng sản phẩm', 'Đơn vị', 'Số lượng', 'Đơn giá', 'Tổng doanh thu', '', 'Năm', 'Đơn vị quy đổi', 'SL quy đổi', 'Giá quy đổi']];
    seq = 0;
    revenues.forEach(rec => {
        seq++;
        revRows.push([
            seq, fmtDate(rec.sale_date), rec.expand?.farmer_id?.full_name || '',
            rec.purchasing_agent || '', rec.revenue_source || '',
            rec.coffee_form || rec.intercrop_type || '', 'Kg',
            rec.quantity_kg || '', rec.unit_price || '', rec.total_revenue || '',
            '', rec.crop_year || '', rec.coffee_form || '',
            rec.qty_fresh_cherry_equiv || '', rec.price_fresh_cherry_equiv || ''
        ]);
    });
    const sRev = XLSX.utils.aoa_to_sheet(revRows);
    sRev['!cols'] = [{ wch: 6 }, { wch: 12 }, { wch: 22 }, { wch: 22 }, { wch: 15 },
        { wch: 15 }, { wch: 8 }, { wch: 12 }, { wch: 12 }, { wch: 15 }, { wch: 8 }, { wch: 8 }, { wch: 15 }, { wch: 12 }, { wch: 12 }];
    XLSX.utils.book_append_sheet(wb, sRev, 'DỮ LIỆU DOANH THU');

    const filename = `260323_Consolidated_Data_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, filename);
    return filename;
}
