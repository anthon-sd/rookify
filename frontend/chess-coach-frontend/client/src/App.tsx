import { BrowserRouter as Router, Routes, Route } from "react-router-dom"
import { ThemeProvider } from "./components/ui/theme-provider"
import { Toaster } from "./components/ui/toaster"
import { AuthProvider } from "./contexts/AuthContext"
import { Login } from "./pages/Login"
import { Register } from "./pages/Register"
import { ProtectedRoute } from "./components/ProtectedRoute"
import { AppLayout } from "./components/AppLayout"
import { Home } from "./pages/Home"
import { Analyze } from "./pages/Analyze"
import { Learn } from "./pages/Learn"
import { Practice } from "./pages/Practice"
import { Profile } from "./pages/Profile"

function App() {
  return (
    <AuthProvider>
      <ThemeProvider defaultTheme="light" storageKey="ui-theme">
        <Router>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
              <Route index element={<Home />} />
              <Route path="analyze" element={<Analyze />} />
              <Route path="learn" element={<Learn />} />
              <Route path="practice" element={<Practice />} />
              <Route path="profile" element={<Profile />} />
            </Route>
          </Routes>
        </Router>
        <Toaster />
      </ThemeProvider>
    </AuthProvider>
  )
}

export default App