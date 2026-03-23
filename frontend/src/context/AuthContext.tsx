import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

type AuthContextType = {
  token: string | null
  setToken: (t: string | null) => void
  loading: boolean
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setTokenState] = useState<string | null>(() => localStorage.getItem('token') || 'bypass')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setTokenState(localStorage.getItem('token'))
    setLoading(false)
  }, [])

  const setToken = (t: string | null) => {
    if (t) localStorage.setItem('token', t)
    else localStorage.removeItem('token')
    setTokenState(t)
  }

  return (
    <AuthContext.Provider value={{ token, setToken, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
