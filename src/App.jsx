import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import './App.css'

function App() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    try {
      setLoading(true)
      // Thử lấy dữ liệu từ một bảng bất kỳ (Ví dụ: 'profiles' hoặc 'test')
      // Bạn cần thay 'profiles' bằng tên bảng thực tế trong Supabase của bạn
      const { data, error } = await supabase
        .from('profiles')
        .select('*')

      if (error) throw error
      setData(data)
    } catch (error) {
      console.error('Lỗi khi lấy dữ liệu:', error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="App">
      <header className="App-header">
        <h1>Daklack Webapp + Supabase</h1>
        <p>Trạng thái kết nối: {loading ? 'Đang kiểm tra...' : 'Sẵn sàng'}</p>

        <div className="card">
          <h2>Dữ liệu từ Supabase:</h2>
          {data.length > 0 ? (
            <ul>
              {data.map((item, index) => (
                <li key={index}>{JSON.stringify(item)}</li>
              ))}
            </ul>
          ) : (
            <p>Chưa có dữ liệu hoặc bảng 'profiles' chưa tồn tại.</p>
          )}
        </div>

        <div className="setup-guide">
          <h3>Hướng dẫn tiếp theo:</h3>
          <ol>
            <li>Mở file <code>.env</code> và dán URL/Key của Supabase vào.</li>
            <li>Tạo một bảng tên là <code>profiles</code> trong Supabase và thêm vài dòng dữ liệu.</li>
            <li>Chạy lệnh <code>npm run dev</code> để xem kết quả.</li>
          </ol>
        </div>
      </header>
    </div>
  )
}

export default App
