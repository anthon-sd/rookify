import { NavLink } from "react-router-dom"
import { Home, BarChart3, BookOpen, Target, User, LogOut } from "lucide-react"
import { Button } from "./ui/button"
import { useAuth } from "@/contexts/AuthContext"
import { useNavigate } from "react-router-dom"
import { Separator } from "./ui/separator"

const navigationItems = [
  { to: "/", icon: Home, label: "Home" },
  { to: "/analyze", icon: BarChart3, label: "Analyze" },
  { to: "/learn", icon: BookOpen, label: "Learn" },
  { to: "/practice", icon: Target, label: "Practice" },
  { to: "/profile", icon: User, label: "Profile" },
]

export function Sidebar() {
  const { logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate("/login")
  }

  return (
    <aside className="fixed left-0 top-0 h-full w-64 glass-effect border-r border-white/20 z-40">
      <div className="flex flex-col h-full p-6">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">R</span>
          </div>
          <span className="font-bold text-xl bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Rookify
          </span>
        </div>

        <nav className="flex-1 space-y-2">
          {navigationItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                  isActive
                    ? "bg-gradient-to-r from-blue-500/20 to-purple-600/20 text-blue-600 dark:text-blue-400 border border-blue-500/30"
                    : "hover:bg-white/10 text-muted-foreground hover:text-foreground"
                }`
              }
            >
              <item.icon className="h-5 w-5" />
              <span className="font-medium">{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <Separator className="my-4" />
        
        <Button
          variant="ghost"
          onClick={handleLogout}
          className="justify-start gap-3 text-muted-foreground hover:text-foreground"
        >
          <LogOut className="h-5 w-5" />
          Logout
        </Button>
      </div>
    </aside>
  )
}