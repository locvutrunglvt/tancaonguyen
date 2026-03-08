// Currency conversion utilities for TCN app
// All data is stored in VND; display currency is user-configurable

export const SUPPORTED_CURRENCIES = [
    { code: 'VND', symbol: '₫', name: { vi: 'Đồng Việt Nam', en: 'Vietnamese Dong', ede: 'Prăk Việt Nam' } },
    { code: 'USD', symbol: '$', name: { vi: 'Đô la Mỹ', en: 'US Dollar', ede: 'Prăk Mỹ' } },
    { code: 'EUR', symbol: '€', name: { vi: 'Euro', en: 'Euro', ede: 'Euro' } },
    { code: 'GBP', symbol: '£', name: { vi: 'Bảng Anh', en: 'British Pound', ede: 'Prăk Anh' } },
    { code: 'JPY', symbol: '¥', name: { vi: 'Yên Nhật', en: 'Japanese Yen', ede: 'Prăk Nhật' } },
];

const STORAGE_DISPLAY = 'tcn_display_currency';
const STORAGE_RATES = 'tcn_exchange_rates';
const STORAGE_TS = 'tcn_exchange_rates_ts';
const CACHE_TTL = 6 * 60 * 60 * 1000; // 6 hours

export const getDisplayCurrency = () => localStorage.getItem(STORAGE_DISPLAY) || 'VND';
export const setDisplayCurrency = (code) => localStorage.setItem(STORAGE_DISPLAY, code);
export const getInputCurrency = () => 'VND';

export const getCachedRates = () => {
    try {
        const raw = localStorage.getItem(STORAGE_RATES);
        return raw ? JSON.parse(raw) : null;
    } catch { return null; }
};

export const getRatesTimestamp = () => {
    const ts = localStorage.getItem(STORAGE_TS);
    return ts ? parseInt(ts, 10) : null;
};

export const isCacheStale = () => {
    const ts = getRatesTimestamp();
    if (!ts) return true;
    return Date.now() - ts > CACHE_TTL;
};

export const fetchExchangeRates = async () => {
    const res = await fetch('https://open.er-api.com/v6/latest/VND');
    if (!res.ok) throw new Error('Failed to fetch exchange rates');
    const data = await res.json();
    if (data.result !== 'success') throw new Error('API error');
    const rates = data.rates; // { USD: 0.0000393, EUR: 0.0000362, ... }
    localStorage.setItem(STORAGE_RATES, JSON.stringify(rates));
    localStorage.setItem(STORAGE_TS, String(Date.now()));
    return rates;
};

export const convertFromVND = (amountVND, targetCurrency, rates) => {
    if (!amountVND || !rates) return amountVND || 0;
    if (targetCurrency === 'VND') return amountVND;
    const rate = rates[targetCurrency];
    if (!rate) return amountVND;
    return amountVND * rate;
};

export const formatCurrencyDisplay = (amountVND, targetCurrency, rates, lang) => {
    if (amountVND == null || isNaN(amountVND)) return '0 ₫';
    const cur = targetCurrency || 'VND';
    const converted = convertFromVND(Number(amountVND), cur, rates);

    const fractionDigits = (cur === 'VND' || cur === 'JPY') ? 0 : 2;
    const locale = lang === 'en' ? 'en-US' : 'vi-VN';

    try {
        return new Intl.NumberFormat(locale, {
            style: 'currency',
            currency: cur,
            maximumFractionDigits: fractionDigits,
            minimumFractionDigits: fractionDigits,
        }).format(converted);
    } catch {
        return `${converted.toLocaleString(locale)} ${cur}`;
    }
};

// Simple format: number + currency code (for compact display)
export const formatCompact = (amountVND, targetCurrency, rates) => {
    if (amountVND == null || isNaN(amountVND)) return '0';
    const cur = targetCurrency || 'VND';
    const converted = convertFromVND(Number(amountVND), cur, rates);
    const fractionDigits = (cur === 'VND' || cur === 'JPY') ? 0 : 2;
    return converted.toLocaleString('vi-VN', { maximumFractionDigits: fractionDigits }) + ' ' + cur;
};
