import React, { useState, useEffect } from 'react'
import pb from './pbClient'
import Login from './Login'
import Dashboard from './Dashboard'
import './App.css'

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(pb.authStore.isValid)
  const [devUser, setDevUser] = useState(() => {
    const stored = localStorage.getItem('devUser');
    return stored ? JSON.parse(stored) : null;
  })

  useEffect(() => {
    const unsubscribe = pb.authStore.onChange(() => {
      setIsLoggedIn(pb.authStore.isValid)
    })

    return () => unsubscribe()
  }, [])

  const handleDevLogin = (user) => {
    console.log("APP_DEV_LOGIN_RECEIVED: ", user);
    localStorage.setItem('devUser', JSON.stringify(user));
    setDevUser(user)
  }

  const handleLogout = async () => {
    pb.authStore.clear()
    localStorage.removeItem('devUser');
    setDevUser(null)
    setIsLoggedIn(false)
  }

  return (
    <div className="App">
      {!isLoggedIn && !devUser ? (
        <Login onDevLogin={handleDevLogin} />
      ) : (
        <Dashboard devUser={devUser} onLogout={handleLogout} />
      )}
    </div>
  )
}

export default App
