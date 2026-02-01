/**
 * Agronomy Utilities for TCN Application
 */

// List of compliant pesticides for coffee production (simplified for demo)
export const GCP_COMPLIANT_PESTICIDES = [
    'Abamectin',
    'Azoxystrobin',
    'Basillus thuringiensis',
    'Copper hydroxide',
    'Deltamethrin',
    'Etoprophos',
    'Imidacloprid',
    'Spinosad',
    'Sulfur'
];

/**
 * Check if a pesticide is compliant with GCP standards
 * @param {string} name 
 * @returns {boolean}
 */
export const isGCPCompliant = (name) => {
    if (!name) return true;
    return GCP_COMPLIANT_PESTICIDES.some(p => name.toLowerCase().includes(p.toLowerCase()));
};

/**
 * Get recommendations based on soil pH level
 * @param {number} ph 
 * @param {string} lang
 * @returns {string|null}
 */
export const getPHRecommendation = (ph, lang = 'vi') => {
    if (!ph) return null;
    const value = parseFloat(ph);
    if (lang === 'vi') {
        if (value < 4.0) {
            return "CẢNH BÁO: Độ pH quá thấp (< 4.0). Đề xuất: Bón vôi (Lime) ngay và tăng cường phân hữu cơ để cải thiện cấu trúc đất.";
        } else if (value < 5.0) {
            return "Lưu ý: Độ pH thấp. Đề xuất: Kiểm tra chế độ bón phân và bổ sung trung vi lượng.";
        } else if (value > 7.0) {
            return "Lưu ý: Đất kiềm. Cần kiểm tra lại nguồn nước và khả năng hấp thụ vi lượng.";
        }
        return "Độ pH lý tưởng cho sự phát triển của cà phê.";
    } else {
        if (value < 4.0) {
            return "WARNING: Soil pH is too low (< 4.0). Recommend: Apply lime immediately and increase organic fertilizer to improve soil structure.";
        } else if (value < 5.0) {
            return "Note: Low pH level. Recommend: Check fertilization regime and supplement secondary/micronutrients.";
        } else if (value > 7.0) {
            return "Note: Alkaline soil. Need to check water source and micronutrient absorption capability.";
        }
        return "Ideal soil pH for coffee growth.";
    }
};
