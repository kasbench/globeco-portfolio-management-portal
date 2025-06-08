'use client'

import { useState, useEffect } from 'react'
import { ChevronDown, User } from 'lucide-react'
import { useRoleStore } from '@/store/roleStore'
import { USER_ROLES, UserRole } from '@/types/user'

export default function RoleSelector() {
  const { currentRole, setRole } = useRoleStore()
  const [isOpen, setIsOpen] = useState(false)
  const [mounted, setMounted] = useState(false)

  // Ensure component is mounted before accessing localStorage
  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <div className="flex items-center space-x-2 px-3 py-2 rounded-lg bg-white/10 backdrop-blur-sm border border-white/20">
        <User className="h-4 w-4 text-white/60" />
        <span className="text-white/60 text-sm">Loading...</span>
      </div>
    )
  }

  const currentRoleConfig = USER_ROLES[currentRole]

  const handleRoleChange = (newRole: UserRole) => {
    setRole(newRole)
    setIsOpen(false)
  }

  return (
    <div className="relative">
      {/* Current Role Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-3 py-2 rounded-lg bg-white/10 backdrop-blur-sm border border-white/20 hover:bg-white/20 transition-all duration-200"
        aria-label="Select user role"
      >
        <div className={`w-3 h-3 rounded-full ${currentRoleConfig.bgColor}`} />
        <span className="text-white font-medium text-sm">
          {currentRoleConfig.label}
        </span>
        <ChevronDown 
          className={`h-4 w-4 text-white/70 transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`} 
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Dropdown */}
          <div className="absolute top-full right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 z-20 overflow-hidden">
            <div className="p-2">
              <div className="text-xs font-medium text-gray-500 uppercase tracking-wide px-2 py-1 mb-1">
                Switch User Type
              </div>
              
              {Object.values(USER_ROLES).map((roleConfig) => (
                <button
                  key={roleConfig.role}
                  onClick={() => handleRoleChange(roleConfig.role)}
                  className={`w-full text-left px-3 py-2 rounded-md transition-colors duration-150 ${
                    currentRole === roleConfig.role
                      ? 'bg-gray-100 border border-gray-200'
                      : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className={`w-4 h-4 rounded-full ${roleConfig.bgColor} flex-shrink-0`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium text-gray-900 text-sm">
                          {roleConfig.label}
                        </span>
                        {currentRole === roleConfig.role && (
                          <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">
                            Current
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">
                        {roleConfig.description}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
            
            <div className="border-t border-gray-100 px-2 py-2">
              <p className="text-xs text-gray-400 px-2">
                Role changes are saved and persist across sessions
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  )
} 