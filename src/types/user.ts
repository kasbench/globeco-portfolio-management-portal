export type UserRole = 'admin' | 'internal' | 'partner' | 'customer'

export interface UserRoleConfig {
  role: UserRole
  label: string
  description: string
  color: string
  bgColor: string
}

export const USER_ROLES: Record<UserRole, UserRoleConfig> = {
  admin: {
    role: 'admin',
    label: 'Admin',
    description: 'Complete system access with administrative privileges',
    color: 'text-teal-700',
    bgColor: 'bg-teal-600',
  },
  internal: {
    role: 'internal',
    label: 'Internal',
    description: 'Full platform access for internal team members',
    color: 'text-primary-700',
    bgColor: 'bg-primary-600',
  },
  partner: {
    role: 'partner',
    label: 'Partner',
    description: 'Specialized access for external partners',
    color: 'text-gold-700',
    bgColor: 'bg-gold-600',
  },
  customer: {
    role: 'customer',
    label: 'Customer',
    description: 'Tailored interface for institutional investors',
    color: 'text-slate-700',
    bgColor: 'bg-slate-600',
  },
}

export const DEFAULT_ROLE: UserRole = 'internal' 