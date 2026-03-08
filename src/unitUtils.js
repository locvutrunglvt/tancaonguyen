// Measurement unit utilities for TCN app
// All data stored in metric (kg, ha, m); display units are user-configurable

const STORAGE_WEIGHT = 'tcn_weight_unit';
const STORAGE_AREA = 'tcn_area_unit';

export const WEIGHT_UNITS = [
    { id: 'kg', label: 'Kilogram (kg)', symbol: 'kg', factor: 1 },
    { id: 'lb', label: 'Pound (lb)', symbol: 'lb', factor: 2.20462 },
    { id: 'ton', label: { vi: 'Tấn', en: 'Ton', ede: 'Tấn' }, symbol: { vi: 'tấn', en: 't', ede: 'tấn' }, factor: 0.001 },
];

export const AREA_UNITS = [
    { id: 'ha', label: 'Hectare (ha)', symbol: 'ha', factor: 1 },
    { id: 'acre', label: 'Acre', symbol: 'acre', factor: 2.47105 },
    { id: 'sao', label: { vi: 'Sào (Trung Bộ)', en: 'Sào (500m²)', ede: 'Sào' }, symbol: 'sào', factor: 20 },
];

export const getWeightUnit = () => localStorage.getItem(STORAGE_WEIGHT) || 'kg';
export const setWeightUnit = (u) => localStorage.setItem(STORAGE_WEIGHT, u);
export const getAreaUnit = () => localStorage.getItem(STORAGE_AREA) || 'ha';
export const setAreaUnit = (u) => localStorage.setItem(STORAGE_AREA, u);

const getUnitDef = (units, id) => units.find(u => u.id === id) || units[0];

/**
 * Convert from metric base (kg or ha) to display unit.
 */
export const convertWeight = (valueKg, targetUnit) => {
    if (valueKg == null || isNaN(valueKg)) return 0;
    const unit = getUnitDef(WEIGHT_UNITS, targetUnit || getWeightUnit());
    return Number(valueKg) * unit.factor;
};

export const convertArea = (valueHa, targetUnit) => {
    if (valueHa == null || isNaN(valueHa)) return 0;
    const unit = getUnitDef(AREA_UNITS, targetUnit || getAreaUnit());
    return Number(valueHa) * unit.factor;
};

/**
 * Get display symbol for a unit, optionally language-aware.
 */
export const getWeightSymbol = (lang) => {
    const u = getUnitDef(WEIGHT_UNITS, getWeightUnit());
    if (typeof u.symbol === 'object') return u.symbol[lang] || u.symbol.vi;
    return u.symbol;
};

export const getAreaSymbol = (lang) => {
    const u = getUnitDef(AREA_UNITS, getAreaUnit());
    if (typeof u.symbol === 'object') return u.symbol[lang] || u.symbol.vi;
    return u.symbol;
};

/**
 * Format a weight value with unit symbol.
 */
export const formatWeight = (valueKg, lang, targetUnit) => {
    const converted = convertWeight(valueKg, targetUnit);
    const symbol = targetUnit
        ? (getUnitDef(WEIGHT_UNITS, targetUnit).symbol)
        : getWeightSymbol(lang);
    const s = typeof symbol === 'object' ? (symbol[lang] || symbol.vi) : symbol;
    const frac = converted === Math.floor(converted) ? 0 : 2;
    return `${converted.toLocaleString('vi-VN', { maximumFractionDigits: frac })} ${s}`;
};

export const formatArea = (valueHa, lang, targetUnit) => {
    const converted = convertArea(valueHa, targetUnit);
    const symbol = targetUnit
        ? (getUnitDef(AREA_UNITS, targetUnit).symbol)
        : getAreaSymbol(lang);
    const s = typeof symbol === 'object' ? (symbol[lang] || symbol.vi) : symbol;
    const frac = converted === Math.floor(converted) ? 0 : 2;
    return `${converted.toLocaleString('vi-VN', { maximumFractionDigits: frac })} ${s}`;
};
