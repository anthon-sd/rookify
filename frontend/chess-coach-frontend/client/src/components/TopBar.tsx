import { Bell, Crown } from "lucide-react"
import { Button } from "./ui/button"
import { ThemeToggle } from "./ui/theme-toggle"
import { useAuth } from "@/contexts/AuthContext"
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar"
import { Badge } from "./ui/badge"

export function TopBar() {
  const { user } = useAuth()

  return (
    <header className="fixed top-0 right-0 left-0 md:left-64 z-50 h-16 glass-effect border-b border-white/20">
      <div className="flex h-full items-center justify-between px-4 md:px-6">
        <div className="flex items-center gap-3">
          <Crown className="h-6 w-6 text-yellow-500" />
          <span className="font-bold text-lg bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Rookify
          </span>
        </div>
        
        <div className="flex items-center gap-3">
          <Badge variant="secondary" className="hidden sm:flex">
            Rating: 1847
          </Badge>
          
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-5 w-5" />
            <span className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full text-xs"></span>
          </Button>
          
          <ThemeToggle />
          
          <Avatar className="h-8 w-8">
                            <AvatarImage src="/placeholder-avatar.svg" alt="User Avatar" />
            <AvatarFallback className="bg-gradient-to-r from-blue-500 to-purple-600 text-white">
              {user?.email?.charAt(0).toUpperCase() || 'U'}
            </AvatarFallback>
          </Avatar>
        </div>
      </div>
    </header>
  )
}