import PocketBase from 'pocketbase'

// Use current page origin (nginx proxies /api/ to PocketBase)
const pbUrl = typeof window !== 'undefined' ? window.location.origin : (import.meta.env.VITE_PB_URL || 'http://127.0.0.1:8090')
const pb = new PocketBase(pbUrl)

// Auto-cancel duplicate requests
pb.autoCancellation(false)

export default pb
