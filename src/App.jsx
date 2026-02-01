import React, { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import Login from './Login'
import Dashboard from './Dashboard'
import './App.css'

function App() {
  const [session, setSession] = useState(null)
  const [devUser, setDevUser] = useState(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  const handleDevLogin = (user) => {
    console.log("APP_DEV_LOGIN_RECEIVED: ", user);
    setDevUser(user)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setDevUser(null)
  }

  return (
    <div className="App">
      {!session && !devUser ? (
        <Login onDevLogin={handleDevLogin} />
      ) : (
        <Dashboard devUser={devUser} onLogout={handleLogout} />
      )}
    </div>
  )
}

export default App
