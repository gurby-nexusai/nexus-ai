import { useState, createContext, useContext, useEffect } from 'react'

const AuthContext = createContext(null)

export const useAuth = () => useContext(AuthContext)

// Simple database using localStorage
const DB = {
  getUsers: () => JSON.parse(localStorage.getItem('users') || '[]'),
  saveUser: (user) => {
    const users = DB.getUsers()
    users.push(user)
    localStorage.setItem('users', JSON.stringify(users))
  },
  findUser: (email) => DB.getUsers().find(u => u.email === email),
  updateUser: (email, updates) => {
    const users = DB.getUsers()
    const idx = users.findIndex(u => u.email === email)
    if (idx !== -1) {
      users[idx] = { ...users[idx], ...updates }
      localStorage.setItem('users', JSON.stringify(users))
    }
  },
  logEngagement: (email, action, data) => {
    const user = DB.findUser(email)
    if (user) {
      const engagement = {
        timestamp: new Date().toISOString(),
        action,
        data
      }
      user.engagements = user.engagements || []
      user.engagements.push(engagement)
      DB.updateUser(email, user)
    }
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)

  useEffect(() => {
    const saved = localStorage.getItem('currentUser')
    if (saved) setUser(JSON.parse(saved))
  }, [])

  const signup = (email, password, name) => {
    if (DB.findUser(email)) return { success: false, error: 'Email already exists' }
    
    const newUser = {
      email,
      password,
      name,
      createdAt: new Date().toISOString(),
      engagements: []
    }
    DB.saveUser(newUser)
    setUser(newUser)
    localStorage.setItem('currentUser', JSON.stringify(newUser))
    return { success: true }
  }

  const login = (email, password) => {
    const user = DB.findUser(email)
    if (!user || user.password !== password) {
      return { success: false, error: 'Invalid credentials' }
    }
    setUser(user)
    localStorage.setItem('currentUser', JSON.stringify(user))
    DB.logEngagement(email, 'login', {})
    return { success: true }
  }

  const logout = () => {
    if (user) DB.logEngagement(user.email, 'logout', {})
    setUser(null)
    localStorage.removeItem('currentUser')
  }

  const logAction = (action, data) => {
    if (user) DB.logEngagement(user.email, action, data)
  }

  return (
    <AuthContext.Provider value={{ user, signup, login, logout, logAction }}>
      {children}
    </AuthContext.Provider>
  )
}

export function AuthForm() {
  const [isSignup, setIsSignup] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const { signup, login } = useAuth()

  const handleSubmit = (e) => {
    e.preventDefault()
    setError('')
    
    const result = isSignup 
      ? signup(email, password, name)
      : login(email, password)
    
    if (!result.success) setError(result.error)
  }

  return (
    <div style={{ maxWidth: '400px', margin: '5rem auto', padding: '2rem', border: '1px solid #ddd', borderRadius: '8px', background: 'white' }}>
      <h2>{isSignup ? '🔐 Sign Up' : '🔐 Login'}</h2>
      {error && <div style={{ padding: '0.5rem', background: '#f8d7da', color: '#721c24', borderRadius: '4px', marginBottom: '1rem' }}>{error}</div>}
      
      <form onSubmit={handleSubmit}>
        {isSignup && (
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem' }}>Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
              required
            />
          </div>
        )}
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem' }}>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
            required
          />
        </div>
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem' }}>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
            required
          />
        </div>
        <button type="submit" style={{ width: '100%', padding: '0.75rem', background: '#646cff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', marginBottom: '1rem' }}>
          {isSignup ? 'Sign Up' : 'Login'}
        </button>
      </form>
      
      <button 
        onClick={() => setIsSignup(!isSignup)}
        style={{ width: '100%', padding: '0.5rem', background: 'transparent', border: '1px solid #ddd', borderRadius: '4px', cursor: 'pointer' }}
      >
        {isSignup ? 'Already have an account? Login' : "Don't have an account? Sign Up"}
      </button>
    </div>
  )
}
