import PocketBase from 'pocketbase'

// Use current page origin (nginx proxies /api/ to PocketBase)
const pbUrl = typeof window !== 'undefined' ? window.location.origin : (import.meta.env.VITE_PB_URL || 'http://127.0.0.1:8090')
const pb = new PocketBase(pbUrl)

// Auto-cancel duplicate requests
pb.autoCancellation(false)

// Global interceptor to strip default timezone times appended by PocketBase for pure Date fields
const originalSend = pb.send.bind(pb);
pb.send = async function (path, options) {
    const res = await originalSend(path, options);
    if (res) {
        const stripDate = (obj) => {
            if (typeof obj === 'string') {
                return obj.replace(/\s(?:12|00):00:00\.000Z$/, '');
            } else if (Array.isArray(obj)) {
                return obj.map(stripDate);
            } else if (obj !== null && typeof obj === 'object') {
                for (const key of Object.keys(obj)) {
                    obj[key] = stripDate(obj[key]);
                }
            }
            return obj;
        };
        return stripDate(res);
    }
    return res;
};

export default pb
