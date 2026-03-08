// Date formatting utilities for TCN app
// Default format: dd/mm/yyyy — configurable via Settings

const STORAGE_DATE_FORMAT = 'tcn_date_format';

export const DATE_FORMATS = [
    { id: 'dd/mm/yyyy', label: '31/12/2026', example: 'dd/mm/yyyy' },
    { id: 'mm/dd/yyyy', label: '12/31/2026', example: 'mm/dd/yyyy' },
    { id: 'yyyy-mm-dd', label: '2026-12-31', example: 'yyyy-mm-dd' },
    { id: 'dd-mm-yyyy', label: '31-12-2026', example: 'dd-mm-yyyy' },
    { id: 'dd.mm.yyyy', label: '31.12.2026', example: 'dd.mm.yyyy' },
];

export const getDateFormat = () => localStorage.getItem(STORAGE_DATE_FORMAT) || 'dd/mm/yyyy';
export const setDateFormat = (fmt) => localStorage.setItem(STORAGE_DATE_FORMAT, fmt);

/**
 * Format a date string or Date object to the configured display format.
 * Handles ISO strings (2026-01-15T...), date-only strings (2026-01-15), Date objects.
 */
export const formatDate = (d, format) => {
    if (!d) return '';
    const fmt = format || getDateFormat();

    let y, m, dd;
    if (typeof d === 'string') {
        // Strip time part: "2026-01-15T10:30:00Z" → "2026-01-15"
        const s = d.replace(/[T ].*/g, '');
        const parts = s.split('-');
        if (parts.length !== 3) return d;
        [y, m, dd] = parts;
    } else if (d instanceof Date) {
        y = String(d.getFullYear());
        m = String(d.getMonth() + 1).padStart(2, '0');
        dd = String(d.getDate()).padStart(2, '0');
    } else {
        return String(d);
    }

    if (!y || !m || !dd) return String(d);

    switch (fmt) {
        case 'dd/mm/yyyy': return `${dd}/${m}/${y}`;
        case 'mm/dd/yyyy': return `${m}/${dd}/${y}`;
        case 'yyyy-mm-dd': return `${y}-${m}-${dd}`;
        case 'dd-mm-yyyy': return `${dd}-${m}-${y}`;
        case 'dd.mm.yyyy': return `${dd}.${m}.${y}`;
        default: return `${dd}/${m}/${y}`;
    }
};

/**
 * Format a full datetime (date + time) for display.
 */
export const formatDateTime = (d, format) => {
    if (!d) return '';
    const fmt = format || getDateFormat();

    let dateObj;
    if (typeof d === 'number') {
        dateObj = new Date(d);
    } else if (typeof d === 'string') {
        dateObj = new Date(d);
    } else if (d instanceof Date) {
        dateObj = d;
    } else {
        return String(d);
    }

    if (isNaN(dateObj.getTime())) return String(d);

    const datePart = formatDate(dateObj, fmt);
    const h = String(dateObj.getHours()).padStart(2, '0');
    const min = String(dateObj.getMinutes()).padStart(2, '0');
    return `${datePart} ${h}:${min}`;
};
