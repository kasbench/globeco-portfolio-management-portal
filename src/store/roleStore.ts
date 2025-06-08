import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { UserRole, DEFAULT_ROLE } from '@/types/user'

interface RoleStore {
  currentRole: UserRole
  setRole: (role: UserRole) => void
  isRole: (role: UserRole) => boolean
  hasAccess: (requiredRoles: UserRole[]) => boolean
}

// Get role from URL params on client side
const getRoleFromURL = (): UserRole | null => {
  if (typeof window === 'undefined') return null
  
  const urlParams = new URLSearchParams(window.location.search)
  const roleParam = urlParams.get('role') as UserRole
  
  if (roleParam && ['admin', 'internal', 'partner', 'customer'].includes(roleParam)) {
    return roleParam
  }
  
  return null
}

export const useRoleStore = create<RoleStore>()(
  persist(
    (set, get) => ({
      currentRole: DEFAULT_ROLE,
      
      setRole: (role: UserRole) => {
        set({ currentRole: role })
        
        // Update URL parameter without page reload
        if (typeof window !== 'undefined') {
          const url = new URL(window.location.href)
          url.searchParams.set('role', role)
          window.history.replaceState({}, '', url.toString())
        }
      },
      
      isRole: (role: UserRole) => get().currentRole === role,
      
      hasAccess: (requiredRoles: UserRole[]) => {
        const currentRole = get().currentRole
        return requiredRoles.includes(currentRole)
      },
    }),
    {
      name: 'globeco-user-role',
    }
  )
)

// Initialize role from URL on client-side
if (typeof window !== 'undefined') {
  const urlRole = getRoleFromURL()
  if (urlRole) {
    useRoleStore.getState().setRole(urlRole)
  }
} 