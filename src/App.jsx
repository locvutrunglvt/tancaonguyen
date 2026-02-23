import React, { useState, useEffect } from 'react'
import pb from './pbClient'
import Login from './Login'
import Dashboard from './Dashboard'
import './App.css'

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(pb.authStore.isValid)

  useEffect(() => {
    // Clean up any old dev bypass data
    localStorage.removeItem('devUser');

    const unsubscribe = pb.authStore.onChange(() => {
      setIsLoggedIn(pb.authStore.isValid)
    })

    return () => unsubscribe()
  }, [])

  const handleLogout = async () => {
    pb.authStore.clear()
    setIsLoggedIn(false)
  }

  return (
    <div className="App">
      {!isLoggedIn ? (
        <Login />
      ) : (
        <Dashboard onLogout={handleLogout} />
      )}
    </div>
  )
}

export default App
