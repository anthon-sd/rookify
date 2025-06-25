import { NavLink } from "react-router-dom"
import { Home, BarChart3, BookOpen, Target, User } from "lucide-react"

const navigationItems = [
  { to: "/", icon: Home, label: "Home" },
  { to: "/analyze", icon: BarChart3, label: "Analyze" },
  { to: "/learn", icon: BookOpen, label: "Learn" },
  { to: "/practice", icon: Target, label: "Practice" },
  { to: "/profile", icon: User, label: "Profile" },
]

export function BottomNavigation() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 glass-effect border-t border-white/20 z-50">
      <div className="flex items-center justify-around py-2">
        {navigationItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-all duration-200 ${
                isActive
                  ? "text-blue-600 dark:text-blue-400"
                  : "text-muted-foreground"
              }`
            }
          >
            <item.icon className="h-5 w-5" />
            <span className="text-xs font-medium">{item.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  )
}