import React, { useState } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { FontRegular, FontBold } from './fonts/roboto-base64';

// Label maps with 3 languages: vi, en, ede
const ACTIVITY_LABELS = {
    fertilize: { vi: 'Bón phân', en: 'Fertilize', ede: 'Mdung' },
    pesticide: { vi: 'Phun thuốc', en: 'Pesticide', ede: 'Pur aseh' },
    irrigate: { vi: 'Tưới nước', en: 'Irrigate', ede: 'Ea hnhao' },
    prune: { vi: 'Tỉa cành', en: 'Prune', ede: 'Kueh' },
    weed: { vi: 'Làm cỏ', en: 'Weed', ede: 'Mkra' },
    harvest: { vi: 'Thu hoạch', en: 'Harvest', ede: 'Pioh' },
    transport: { vi: 'Vận chuyển', en: 'Transport', ede: 'Djam' },
    drying: { vi: 'Phơi cà phê', en: 'Drying', ede: 'Phui' },
    milling: { vi: 'Xay cà phê', en: 'Milling', ede: 'Poh' },
    tree_care: { vi: 'Chăm cây', en: 'Tree Care', ede: 'Kiih ana' },
    other: { vi: 'Khác', en: 'Other', ede: 'Mkra' },
};

const INSPECT_TYPE_LABELS = {
    quarterly: { vi: 'Hàng quý', en: 'Quarterly', ede: 'Tlam' },
    monthly: { vi: 'Hàng tháng', en: 'Monthly', ede: 'Mlan' },
    adhoc: { vi: 'Đột xuất', en: 'Ad-hoc', ede: 'Bhian' },
};

const QUALITY_LABELS = { poor: { vi: 'Kém', en: 'Poor', ede: 'Jhat' }, fair: { vi: 'TB', en: 'Fair', ede: 'Hdai' }, good: { vi: 'Tốt', en: 'Good', ede: 'Jia' }, excellent: { vi: 'Rất tốt', en: 'Excellent', ede: 'Siam' } };
const WATER_LABELS = { drought: { vi: 'Hạn', en: 'Drought', ede: 'Khuah' }, adequate: { vi: 'Đủ', en: 'Adequate', ede: 'Djap' }, excess: { vi: 'Thừa', en: 'Excess', ede: 'Lu' } };
const PEST_LABELS = { none: { vi: 'Không', en: 'None', ede: 'Ka' }, minor: { vi: 'Nhẹ', en: 'Minor', ede: 'Djet' }, moderate: { vi: 'TB', en: 'Moderate', ede: 'Hdai' }, severe: { vi: 'Nặng', en: 'Severe', ede: 'Dluh' } };

const CATEGORY_LABELS = {
    fertilizer: { vi: 'Phân bón', en: 'Fertilizer', ede: 'Mdung' },
    pesticide: { vi: 'Thuốc BVTV', en: 'Pesticide', ede: 'Aseh' },
    labor: { vi: 'Nhân công', en: 'Labor', ede: 'Mnuih' },
    fuel: { vi: 'Nhiên liệu', en: 'Fuel', ede: 'Pui' },
    electricity: { vi: 'Điện', en: 'Electricity', ede: 'Klet' },
    water_irrigation: { vi: 'Tưới nước', en: 'Irrigation', ede: 'Ea' },
    harvest_equip: { vi: 'Dụng cụ thu hoạch', en: 'Harvest Equip.', ede: 'Mna' },
    transport: { vi: 'Vận chuyển', en: 'Transport', ede: 'Djam' },
    drying: { vi: 'Phơi cà phê', en: 'Drying', ede: 'Phui' },
    milling: { vi: 'Xay cà phê', en: 'Milling', ede: 'Poh' },
    ppe: { vi: 'Bảo hộ LĐ', en: 'PPE', ede: 'Ao brei' },
    depreciation: { vi: 'Khấu hao', en: 'Depreciation', ede: 'Roh' },
    loan_interest: { vi: 'Lãi vay', en: 'Loan Interest', ede: 'Kmlan' },
    other: { vi: 'Khác', en: 'Other', ede: 'Mkra' },
};

const today = () => new Date().toISOString().split('T')[0];
const firstOfYear = () => `${new Date().getFullYear()}-01-01`;

// Month names for dd-mmm-yyyy format
const MONTH_NAMES = {
    vi: ['Th01', 'Th02', 'Th03', 'Th04', 'Th05', 'Th06', 'Th07', 'Th08', 'Th09', 'Th10', 'Th11', 'Th12'],
    en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    ede: ['Bl01', 'Bl02', 'Bl03', 'Bl04', 'Bl05', 'Bl06', 'Bl07', 'Bl08', 'Bl09', 'Bl10', 'Bl11', 'Bl12'],
};

const fmtDate = (d, lang = 'vi') => {
    if (!d) return '';
    const s = d.split('T')[0] || d.split(' ')[0];
    const [y, m, dd] = s.split('-');
    const months = MONTH_NAMES[lang] || MONTH_NAMES.vi;
    return `${dd}-${months[parseInt(m, 10) - 1]}-${y}`;
};

const fmtNum = (n) => n != null ? Number(n).toLocaleString('vi-VN') : '';

const filterByDate = (records, dateField, from, to) => {
    return records.filter(r => {
        const d = r[dateField]?.split('T')[0] || r[dateField]?.split(' ')[0];
        return d && d >= from && d <= to;
    });
};

const labelFor = (map, key, lang) => map[key]?.[lang] || map[key]?.vi || key || '';

// Load image as base64 for jsPDF
const loadImage = (url) => new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        canvas.getContext('2d').drawImage(img, 0, 0);
        resolve({ data: canvas.toDataURL('image/png'), width: img.width, height: img.height });
    };
    img.onerror = () => resolve(null);
    img.src = url;
});

// PDF text labels in 3 languages (now with proper diacritics thanks to Roboto font)
const PDF_LABELS = {
    vi: {
        reportTitle: 'BÁO CÁO MÔ HÌNH',
        reportSubtitle: 'TRÌNH DIỄN CÀ PHÊ THÍCH ỨNG BIẾN ĐỔI KHÍ HẬU',
        sponsor: 'Tài trợ bởi Tchibo | Thực hiện bởi NKG Việt Nam',
        modelCode: 'Mã mô hình',
        name: 'Tên',
        farmer: 'Nông hộ',
        location: 'Vị trí',
        area: 'Diện tích',
        period: 'Thời gian',
        diaryTitle: 'NHẬT KÝ CANH TÁC',
        inspectTitle: 'KIỂM TRA ĐỊNH KỲ',
        consumTitle: 'CHI PHÍ TIÊU HAO',
        costSummary: 'TỔNG HỢP CHI PHÍ',
        date: 'Ngày',
        activity: 'Hoạt động',
        description: 'Mô tả',
        material: 'Vật tư',
        qty: 'SL',
        laborCost: 'CP nhân công',
        matCost: 'CP vật tư',
        gcp: 'GCP',
        type: 'Loại',
        growth: 'Sinh trưởng',
        pests: 'Sâu bệnh',
        soil: 'Đất',
        water: 'Nước',
        healthPct: 'SK cây %',
        recomm: 'Khuyến nghị',
        category: 'Danh mục',
        item: 'Tên hạng mục',
        unit: 'ĐV',
        price: 'Đơn giá',
        total: 'Thành tiền',
        notes: 'Ghi chú',
        totalLabor: 'Tổng CP nhân công',
        totalMat: 'Tổng CP vật tư',
        totalAll: 'Tổng cộng',
        catCol: 'Hạng mục',
        amountCol: 'Thành tiền (VND)',
        laborDiary: 'Nhân công (nhật ký)',
        matDiary: 'Vật tư (nhật ký)',
        grandTotal: 'TỔNG CỘNG',
        sigOwner: 'Chủ mô hình',
        sigInspector: 'Cán bộ kiểm tra',
        sigApproval: 'Xác nhận dự án',
        sigNote: 'Ký, ghi rõ họ tên',
        footer: 'Báo cáo được tạo tự động bởi phần mềm Tân Cao Nguyên',
        noData: 'Không có dữ liệu trong khoảng thời gian này',
        ha: 'ha',
    },
    en: {
        reportTitle: 'MODEL REPORT',
        reportSubtitle: 'CLIMATE-ADAPTED COFFEE DEMONSTRATION',
        sponsor: 'Sponsored by Tchibo | Implemented by NKG Viet Nam',
        modelCode: 'Model code',
        name: 'Name',
        farmer: 'Farmer',
        location: 'Location',
        area: 'Area',
        period: 'Period',
        diaryTitle: 'FARM DIARY',
        inspectTitle: 'INSPECTIONS',
        consumTitle: 'CONSUMABLES / COSTS',
        costSummary: 'COST SUMMARY',
        date: 'Date',
        activity: 'Activity',
        description: 'Description',
        material: 'Material',
        qty: 'Qty',
        laborCost: 'Labor Cost',
        matCost: 'Mat. Cost',
        gcp: 'GCP',
        type: 'Type',
        growth: 'Growth',
        pests: 'Pests',
        soil: 'Soil',
        water: 'Water',
        healthPct: 'Health %',
        recomm: 'Recomm.',
        category: 'Category',
        item: 'Item',
        unit: 'Unit',
        price: 'Price',
        total: 'Total',
        notes: 'Notes',
        totalLabor: 'Total Labor',
        totalMat: 'Total Material',
        totalAll: 'Total',
        catCol: 'Category',
        amountCol: 'Amount (VND)',
        laborDiary: 'Labor (diary)',
        matDiary: 'Material (diary)',
        grandTotal: 'GRAND TOTAL',
        sigOwner: 'Model Owner',
        sigInspector: 'Inspector',
        sigApproval: 'Project Approval',
        sigNote: 'Sign & print name',
        footer: 'Report auto-generated by Tan Cao Nguyen software',
        noData: 'No data in this date range',
        ha: 'ha',
    },
    ede: {
        reportTitle: 'HDRŬO KLEI HRA',
        reportSubtitle: 'HDRUÔM KAPHÊ MLĂN YANG',
        sponsor: 'Bi Tchibo dua | NKG Việt Nam ngă',
        modelCode: 'Kud hdrŭo',
        name: 'Anăn',
        farmer: 'Mnuih hma',
        location: 'Anôk',
        area: 'Prŏng',
        period: 'Mông',
        diaryTitle: 'HDRO HMA',
        inspectTitle: 'DLĂNG HRUÊ',
        consumTitle: 'PRĂK MNGA',
        costSummary: 'PRĂK ABŎH',
        date: 'Hruê',
        activity: 'Bruă',
        description: 'Klei',
        material: 'Mnă',
        qty: 'SL',
        laborCost: 'CP mnuih',
        matCost: 'CP mnă',
        gcp: 'GCP',
        type: 'Mtă',
        growth: 'Đuôn',
        pests: 'Hngah',
        soil: 'Lăn',
        water: 'Êa',
        healthPct: 'SK %',
        recomm: 'Kčah',
        category: 'Mtă',
        item: 'Anăn',
        unit: 'ĐV',
        price: 'Mlăn',
        total: 'Prăk',
        notes: 'Klei',
        totalLabor: 'Prăk mnuih',
        totalMat: 'Prăk mnă',
        totalAll: 'Abŏh',
        catCol: 'Mtă',
        amountCol: 'Prăk (VND)',
        laborDiary: 'Mnuih (hdro)',
        matDiary: 'Mnă (hdro)',
        grandTotal: 'ABŎH PRĂK',
        sigOwner: 'Khua hdrŭo',
        sigInspector: 'Pô dlăng',
        sigApproval: 'Pô bi sĭt',
        sigNote: 'Čih anăn',
        footer: 'Hdrŭo mơ̆ng Tân Cao Nguyên',
        noData: 'Ka mâo klei hra',
        ha: 'ha',
    },
};

// UI dialog labels (with diacritics for screen display)
const DIALOG_LABELS = {
    vi: {
        title: 'Xuất báo cáo PDF',
        dateRange: 'Khoảng thời gian',
        from: 'Từ ngày',
        to: 'Đến ngày',
        sections: 'Nội dung báo cáo',
        diary: 'Nhật ký canh tác',
        inspect: 'Kiểm tra định kỳ',
        consum: 'Chi phí tiêu hao',
        generate: 'Xuất PDF',
        cancel: 'Hủy',
        generating: 'Đang tạo...',
    },
    en: {
        title: 'Export PDF Report',
        dateRange: 'Date Range',
        from: 'From',
        to: 'To',
        sections: 'Report Sections',
        diary: 'Farm Diary',
        inspect: 'Inspections',
        consum: 'Consumables/Costs',
        generate: 'Export PDF',
        cancel: 'Cancel',
        generating: 'Generating...',
    },
    ede: {
        title: 'Mă hdrŭo PDF',
        dateRange: 'Mông',
        from: 'Mơ̆ng',
        to: 'Truh',
        sections: 'Klei hra',
        diary: 'Hdro hma',
        inspect: 'Dlăng hruê',
        consum: 'Prăk mnga',
        generate: 'Mă PDF',
        cancel: 'Hĭn',
        generating: 'Dôk ngă...',
    },
};

const LANG_SUFFIX = { vi: '_VN', en: '_EN', ede: '_ED' };

const ModelReport = ({ show, onClose, model, farmer, diary = [], inspections = [], consumables = [], appLang = 'vi' }) => {
    const [dateFrom, setDateFrom] = useState(firstOfYear());
    const [dateTo, setDateTo] = useState(today());
    const [includeDiary, setIncludeDiary] = useState(true);
    const [includeInspect, setIncludeInspect] = useState(true);
    const [includeConsum, setIncludeConsum] = useState(true);
    const [generating, setGenerating] = useState(false);

    if (!show) return null;

    const DL = DIALOG_LABELS[appLang] || DIALOG_LABELS.vi;

    const generatePDF = async () => {
        setGenerating(true);
        try {
            const lang = appLang;
            const P = PDF_LABELS[lang] || PDF_LABELS.vi;
            const doc = new jsPDF('p', 'mm', 'a4');
            const pageW = doc.internal.pageSize.getWidth();
            const pageH = doc.internal.pageSize.getHeight();
            const margin = 15;
            const contentW = pageW - margin * 2;
            let y = margin;

            // Register Roboto font for Vietnamese diacritics
            doc.addFileToVFS('Roboto-Regular.ttf', FontRegular);
            doc.addFont('Roboto-Regular.ttf', 'Roboto', 'normal');
            doc.addFileToVFS('Roboto-Bold.ttf', FontBold);
            doc.addFont('Roboto-Bold.ttf', 'Roboto', 'bold');
            doc.setFont('Roboto');

            // --- HEADER: Logo centered at top, 1/4 page width ---
            let logoResult = null;
            try {
                logoResult = await loadImage(import.meta.env.BASE_URL + 'logo-report.png');
            } catch { /* no logo */ }

            if (logoResult) {
                const logoW = pageW / 4; // 1/4 page width
                const aspectRatio = logoResult.height / logoResult.width;
                const logoH = logoW * aspectRatio;
                const logoX = (pageW - logoW) / 2; // centered
                doc.addImage(logoResult.data, 'PNG', logoX, y, logoW, logoH);
                y += logoH + 4;
            }

            // Title - centered below logo
            doc.setFontSize(16);
            doc.setFont('Roboto', 'bold');
            doc.text(P.reportTitle, pageW / 2, y, { align: 'center' });
            y += 6;
            doc.setFontSize(10);
            doc.text(P.reportSubtitle, pageW / 2, y, { align: 'center' });
            y += 5;

            // Sponsor line
            doc.setFontSize(8);
            doc.setFont('Roboto', 'normal');
            doc.text(P.sponsor, pageW / 2, y, { align: 'center' });
            y += 8;

            // Model info - left aligned
            doc.setFontSize(9);
            doc.setFont('Roboto', 'normal');
            const infoPairs = [
                [P.modelCode, model.model_code || ''],
                [P.name, model.name || model.model_name || ''],
                [P.farmer, farmer?.full_name || '---'],
            ];
            const location = [model.village, model.commune, model.district, model.province].filter(Boolean).join(', ')
                || [farmer?.village, farmer?.commune, farmer?.province].filter(Boolean).join(', ');
            if (location) infoPairs.push([P.location, location]);
            if (model.target_area) infoPairs.push([P.area, `${model.target_area} ${P.ha}`]);
            infoPairs.push([P.period, `${fmtDate(dateFrom, lang)} - ${fmtDate(dateTo, lang)}`]);

            infoPairs.forEach(([label, val]) => {
                doc.setFont('Roboto', 'bold');
                doc.text(`${label}: `, margin, y);
                const labelW = doc.getTextWidth(`${label}: `);
                doc.setFont('Roboto', 'normal');
                doc.text(val, margin + labelW, y);
                y += 5;
            });
            y += 2;

            // Divider
            doc.setDrawColor(120, 120, 120);
            doc.setLineWidth(0.5);
            doc.line(margin, y, pageW - margin, y);
            y += 6;

            // --- Filter data ---
            const diaryData = includeDiary ? filterByDate(diary, 'diary_date', dateFrom, dateTo) : [];
            const inspectData = includeInspect ? filterByDate(inspections, 'inspection_date', dateFrom, dateTo) : [];
            const consumData = includeConsum ? filterByDate(consumables, 'record_date', dateFrom, dateTo) : [];

            let sectionNum = 0;

            const ensureSpace = (needed) => {
                if (y + needed > pageH - 30) {
                    doc.addPage();
                    y = margin;
                }
            };

            // --- SECTION 1: DIARY ---
            if (includeDiary) {
                sectionNum++;
                ensureSpace(20);
                doc.setFontSize(11);
                doc.setFont('Roboto', 'bold');
                doc.text(`${sectionNum}. ${P.diaryTitle} (${diaryData.length})`, margin, y);
                y += 3;

                if (diaryData.length === 0) {
                    doc.setFontSize(9);
                    doc.setFont('Roboto', 'normal');
                    doc.text(P.noData, margin + 5, y + 5);
                    y += 10;
                } else {
                    autoTable(doc, {
                        startY: y,
                        margin: { left: margin, right: margin },
                        styles: { fontSize: 7, cellPadding: 2, font: 'Roboto' },
                        headStyles: { fillColor: [93, 64, 55], textColor: 255, fontStyle: 'bold' },
                        head: [[P.date, P.activity, P.description, P.material, P.qty, P.laborCost, P.matCost, P.gcp]],
                        body: diaryData.map(d => [
                            fmtDate(d.diary_date, lang),
                            labelFor(ACTIVITY_LABELS, d.activity_type, lang),
                            (d.description || '').substring(0, 50),
                            d.material_name || '',
                            d.material_amount ? `${d.material_amount} ${d.material_unit || ''}` : '',
                            fmtNum(d.labor_cost),
                            fmtNum(d.material_cost),
                            d.gcp_compliant ? 'V' : '',
                        ]),
                        columnStyles: {
                            0: { cellWidth: 22 },
                            1: { cellWidth: 20 },
                            2: { cellWidth: 'auto' },
                            3: { cellWidth: 18 },
                            4: { cellWidth: 16 },
                            5: { cellWidth: 20, halign: 'right' },
                            6: { cellWidth: 20, halign: 'right' },
                            7: { cellWidth: 10, halign: 'center' },
                        },
                    });
                    y = doc.lastAutoTable.finalY + 4;

                    const diaryLaborTotal = diaryData.reduce((s, d) => s + (d.labor_cost || 0), 0);
                    const diaryMatTotal = diaryData.reduce((s, d) => s + (d.material_cost || 0), 0);
                    doc.setFontSize(8);
                    doc.setFont('Roboto', 'bold');
                    doc.text(`${P.totalLabor}: ${fmtNum(diaryLaborTotal)} | ${P.totalMat}: ${fmtNum(diaryMatTotal)} | ${P.totalAll}: ${fmtNum(diaryLaborTotal + diaryMatTotal)} VND`, margin + 5, y);
                    y += 8;
                }
            }

            // --- SECTION 2: INSPECTIONS ---
            if (includeInspect) {
                sectionNum++;
                ensureSpace(20);
                doc.setFontSize(11);
                doc.setFont('Roboto', 'bold');
                doc.text(`${sectionNum}. ${P.inspectTitle} (${inspectData.length})`, margin, y);
                y += 3;

                if (inspectData.length === 0) {
                    doc.setFontSize(9);
                    doc.setFont('Roboto', 'normal');
                    doc.text(P.noData, margin + 5, y + 5);
                    y += 10;
                } else {
                    autoTable(doc, {
                        startY: y,
                        margin: { left: margin, right: margin },
                        styles: { fontSize: 7, cellPadding: 2, font: 'Roboto' },
                        headStyles: { fillColor: [30, 64, 175], textColor: 255, fontStyle: 'bold' },
                        head: [[P.date, P.type, P.growth, P.pests, P.soil, P.water, P.healthPct, P.recomm]],
                        body: inspectData.map(i => [
                            fmtDate(i.inspection_date, lang),
                            labelFor(INSPECT_TYPE_LABELS, i.inspection_type, lang),
                            labelFor(QUALITY_LABELS, i.growth_quality, lang),
                            labelFor(PEST_LABELS, i.pest_status, lang),
                            labelFor(QUALITY_LABELS, i.soil_condition, lang),
                            labelFor(WATER_LABELS, i.water_status, lang),
                            i.tree_health_pct != null ? `${i.tree_health_pct}%` : '',
                            (i.recommendations || '').substring(0, 60),
                        ]),
                        columnStyles: {
                            0: { cellWidth: 22 },
                            1: { cellWidth: 18 },
                            7: { cellWidth: 'auto' },
                        },
                    });
                    y = doc.lastAutoTable.finalY + 8;
                }
            }

            // --- SECTION 3: CONSUMABLES ---
            if (includeConsum) {
                sectionNum++;
                ensureSpace(20);
                doc.setFontSize(11);
                doc.setFont('Roboto', 'bold');
                doc.text(`${sectionNum}. ${P.consumTitle} (${consumData.length})`, margin, y);
                y += 3;

                if (consumData.length === 0) {
                    doc.setFontSize(9);
                    doc.setFont('Roboto', 'normal');
                    doc.text(P.noData, margin + 5, y + 5);
                    y += 10;
                } else {
                    autoTable(doc, {
                        startY: y,
                        margin: { left: margin, right: margin },
                        styles: { fontSize: 7, cellPadding: 2, font: 'Roboto' },
                        headStyles: { fillColor: [133, 77, 14], textColor: 255, fontStyle: 'bold' },
                        head: [[P.date, P.category, P.item, P.qty, P.unit, P.price, P.total, P.notes]],
                        body: consumData.map(c => [
                            fmtDate(c.record_date, lang),
                            labelFor(CATEGORY_LABELS, c.category, lang),
                            c.item_name || '',
                            fmtNum(c.quantity),
                            c.unit || '',
                            fmtNum(c.unit_price),
                            fmtNum(c.total_cost),
                            (c.notes || '').substring(0, 40),
                        ]),
                        columnStyles: {
                            0: { cellWidth: 22 },
                            1: { cellWidth: 22 },
                            5: { cellWidth: 18, halign: 'right' },
                            6: { cellWidth: 20, halign: 'right' },
                        },
                    });
                    y = doc.lastAutoTable.finalY + 4;

                    // --- COST SUMMARY ---
                    const byCat = {};
                    consumData.forEach(c => {
                        const cat = labelFor(CATEGORY_LABELS, c.category, lang);
                        byCat[cat] = (byCat[cat] || 0) + (c.total_cost || 0);
                    });
                    const consumTotal = consumData.reduce((s, c) => s + (c.total_cost || 0), 0);

                    const diaryFiltered = includeDiary ? filterByDate(diary, 'diary_date', dateFrom, dateTo) : [];
                    const diaryLaborSum = diaryFiltered.reduce((s, d) => s + (d.labor_cost || 0), 0);
                    const diaryMatSum = diaryFiltered.reduce((s, d) => s + (d.material_cost || 0), 0);

                    ensureSpace(40);
                    doc.setFontSize(11);
                    doc.setFont('Roboto', 'bold');
                    doc.text(P.costSummary, margin, y + 6);
                    y += 9;

                    const summaryRows = Object.entries(byCat).map(([cat, total]) => [cat, fmtNum(total)]);
                    if (diaryLaborSum > 0) summaryRows.push([P.laborDiary, fmtNum(diaryLaborSum)]);
                    if (diaryMatSum > 0) summaryRows.push([P.matDiary, fmtNum(diaryMatSum)]);
                    const grandTotal = consumTotal + diaryLaborSum + diaryMatSum;
                    summaryRows.push([
                        { content: P.grandTotal, styles: { fontStyle: 'bold' } },
                        { content: fmtNum(grandTotal) + ' VND', styles: { fontStyle: 'bold' } }
                    ]);

                    autoTable(doc, {
                        startY: y,
                        margin: { left: margin + 20, right: margin + 20 },
                        styles: { fontSize: 9, cellPadding: 3, font: 'Roboto' },
                        headStyles: { fillColor: [46, 125, 50], textColor: 255 },
                        head: [[P.catCol, P.amountCol]],
                        body: summaryRows,
                        columnStyles: {
                            1: { halign: 'right', cellWidth: 40 },
                        },
                    });
                    y = doc.lastAutoTable.finalY + 8;
                }
            }

            // --- SIGNATURE BLOCK ---
            const sigHeight = 45;
            if (y + sigHeight > pageH - 15) {
                doc.addPage();
                y = margin;
            }
            y = Math.max(y + 10, pageH - sigHeight - 15);

            doc.setDrawColor(180, 180, 180);
            doc.setLineWidth(0.3);
            doc.line(margin, y, pageW - margin, y);
            y += 8;

            const colW = contentW / 3;
            const sigCols = [
                { title: P.sigOwner, name: farmer?.full_name || '' },
                { title: P.sigInspector, name: model.inspector_name || '' },
                { title: P.sigApproval, name: '' },
            ];

            sigCols.forEach((col, i) => {
                const x = margin + i * colW;
                const centerX = x + colW / 2;

                doc.setFontSize(9);
                doc.setFont('Roboto', 'bold');
                doc.text(col.title, centerX, y, { align: 'center' });

                doc.setFontSize(8);
                doc.setFont('Roboto', 'normal');
                doc.text(`(${P.sigNote})`, centerX, y + 5, { align: 'center' });

                doc.setLineWidth(0.2);
                doc.line(x + 10, y + 22, x + colW - 10, y + 22);

                if (col.name) {
                    doc.setFont('Roboto', 'normal');
                    doc.setFontSize(8);
                    doc.text(col.name, centerX, y + 27, { align: 'center' });
                }
            });

            // Footer
            doc.setFontSize(7);
            doc.setFont('Roboto', 'normal');
            doc.setTextColor(150, 150, 150);
            doc.text(P.footer, pageW / 2, pageH - 8, { align: 'center' });
            doc.setTextColor(0, 0, 0);

            // --- SAVE with language suffix ---
            const fromStr = dateFrom.replace(/-/g, '');
            const toStr = dateTo.replace(/-/g, '');
            const suffix = LANG_SUFFIX[lang] || '_VN';
            doc.save(`BaoCao_${model.model_code || 'model'}_${fromStr}_${toStr}${suffix}.pdf`);

        } catch (err) {
            console.error('PDF generation error:', err);
            alert('Error generating PDF: ' + err.message);
        } finally {
            setGenerating(false);
        }
    };

    const inputStyle = {
        width: '100%', padding: '10px 12px', border: '1.5px solid var(--gray-200, #e2e8f0)',
        borderRadius: '10px', fontSize: '14px', background: 'var(--cream-light, #f8fafc)',
        outline: 'none', boxSizing: 'border-box',
    };

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1000,
            background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center'
        }} onClick={onClose}>
            <div style={{
                background: 'var(--white, #fff)', borderRadius: '20px', width: '90%', maxWidth: '480px',
                padding: '28px', boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
                animation: 'fadeInUp 0.3s ease',
            }} onClick={e => e.stopPropagation()}>
                {/* Title */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: 'var(--coffee-dark)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <i className="fas fa-file-pdf" style={{ color: '#dc2626' }}></i>
                        {DL.title}
                    </h3>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '20px', color: '#94a3b8', cursor: 'pointer' }}>
                        <i className="fas fa-times"></i>
                    </button>
                </div>

                {/* Model info banner */}
                <div style={{
                    background: 'linear-gradient(135deg, var(--coffee-primary), var(--coffee-medium, #795548))',
                    borderRadius: '12px', padding: '12px 16px', color: 'white', marginBottom: '20px'
                }}>
                    <div style={{ fontSize: '15px', fontWeight: 800 }}>{model.model_code} - {model.name || model.model_name}</div>
                    <div style={{ fontSize: '11px', opacity: 0.9, marginTop: '2px' }}>{farmer?.full_name || '---'}</div>
                </div>

                {/* Date range */}
                <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--gray-700)', marginBottom: '6px' }}>
                        <i className="fas fa-calendar-alt" style={{ marginRight: '6px' }}></i>{DL.dateRange}
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                        <div>
                            <span style={{ fontSize: '10px', color: 'var(--gray-700)' }}>{DL.from}</span>
                            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={inputStyle} />
                        </div>
                        <div>
                            <span style={{ fontSize: '10px', color: 'var(--gray-700)' }}>{DL.to}</span>
                            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} style={inputStyle} />
                        </div>
                    </div>
                </div>

                {/* Section toggles */}
                <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--gray-700)', marginBottom: '8px' }}>
                        <i className="fas fa-list-check" style={{ marginRight: '6px' }}></i>{DL.sections}
                    </label>
                    {[
                        { checked: includeDiary, set: setIncludeDiary, label: DL.diary, icon: 'fa-book', color: '#166534', count: diary.length },
                        { checked: includeInspect, set: setIncludeInspect, label: DL.inspect, icon: 'fa-clipboard-check', color: '#1e40af', count: inspections.length },
                        { checked: includeConsum, set: setIncludeConsum, label: DL.consum, icon: 'fa-receipt', color: '#854d0e', count: consumables.length },
                    ].map((s, i) => (
                        <label key={i} style={{
                            display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 12px',
                            background: s.checked ? 'var(--cream, #f5f5f5)' : 'transparent',
                            borderRadius: '10px', cursor: 'pointer', marginBottom: '4px',
                            border: s.checked ? '1.5px solid var(--coffee-primary)' : '1.5px solid transparent',
                            transition: 'all 0.2s',
                        }}>
                            <input type="checkbox" checked={s.checked} onChange={e => s.set(e.target.checked)}
                                style={{ width: '16px', height: '16px', accentColor: 'var(--coffee-primary)' }} />
                            <i className={`fas ${s.icon}`} style={{ color: s.color, width: '16px' }}></i>
                            <span style={{ flex: 1, fontSize: '13px', fontWeight: 600, color: 'var(--coffee-dark)' }}>{s.label}</span>
                            <span style={{ fontSize: '11px', color: 'var(--gray-700)', fontWeight: 700 }}>{s.count}</span>
                        </label>
                    ))}
                </div>

                {/* Buttons */}
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button onClick={onClose} style={{
                        flex: 1, padding: '12px', border: '1.5px solid var(--gray-200, #e2e8f0)',
                        borderRadius: '12px', background: 'var(--white, #fff)', fontSize: '14px',
                        fontWeight: 600, cursor: 'pointer', color: '#64748b'
                    }}>{DL.cancel}</button>
                    <button onClick={generatePDF} disabled={generating || (!includeDiary && !includeInspect && !includeConsum)} style={{
                        flex: 1, padding: '12px', border: 'none', borderRadius: '12px',
                        background: generating ? '#94a3b8' : '#dc2626', color: 'white',
                        fontSize: '14px', fontWeight: 700, cursor: generating ? 'wait' : 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                        opacity: (!includeDiary && !includeInspect && !includeConsum) ? 0.5 : 1,
                    }}>
                        <i className={generating ? 'fas fa-spinner fa-spin' : 'fas fa-file-pdf'}></i>
                        {generating ? DL.generating : DL.generate}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ModelReport;
