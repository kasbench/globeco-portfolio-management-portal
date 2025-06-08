'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRoleStore } from '@/store/roleStore'
import RoleSelector from './RoleSelector'

interface MenuItemConfig {
  href: string
  label: string
  allowedRoles: string[]
}

const MENU_ITEMS: MenuItemConfig[] = [
  {
    href: '/',
    label: 'Home',
    allowedRoles: ['admin', 'internal', 'partner', 'customer']
  },
  {
    href: '/model-management',
    label: 'Model Management',
    allowedRoles: ['admin', 'internal', 'partner']
  },
  {
    href: '/order-generation',
    label: 'Order Generation',
    allowedRoles: ['admin', 'internal', 'partner']
  },
  {
    href: '/order-management',
    label: 'Order Management',
    allowedRoles: ['admin', 'internal']
  },
  {
    href: '/trading',
    label: 'Trading',
    allowedRoles: ['admin', 'internal']
  },
  {
    href: '/dashboard',
    label: 'Dashboard',
    allowedRoles: ['admin', 'internal', 'partner', 'customer']
  },
  {
    href: '/administration',
    label: 'Administration',
    allowedRoles: ['admin']
  }
]

export default function Header() {
  const { currentRole, hasAccess } = useRoleStore()
  const [isClient, setIsClient] = useState(false)

  // Only show role-filtered menu after hydration to avoid SSR mismatch
  useEffect(() => {
    setIsClient(true)
  }, [])

  // Show all menu items during SSR, role-filtered items after hydration
  const visibleMenuItems = isClient 
    ? MENU_ITEMS.filter(item => hasAccess(item.allowedRoles as any))
    : MENU_ITEMS

  return (
    <header className="globeco-gradient relative z-50">
      <div className="absolute inset-0 bg-black/20" />
      <div className="relative z-10">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* Logo and Brand */}
            <Link href="/" className="flex items-center space-x-3 group">
              <Image
                src="/images/globeco-logo.png"
                alt="GlobeCo"
                width={40}
                height={40}
                className="transition-transform group-hover:scale-105"
              />
              <div className="hidden sm:block">
                <h1 className="text-white font-bold text-lg">GlobeCo</h1>
                <p className="text-white/80 text-xs -mt-0.5">Portfolio Management</p>
              </div>
            </Link>

            {/* Navigation - Desktop */}
            <nav className="hidden lg:flex items-center space-x-1">
              {visibleMenuItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="text-white/90 hover:text-white hover:bg-white/10 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200"
                >
                  {item.label}
                </Link>
              ))}
            </nav>

            {/* Mobile Navigation Button & Role Selector */}
            <div className="flex items-center space-x-4">
              {/* Mobile Menu Button */}
              <div className="lg:hidden">
                <details className="group">
                  <summary className="flex items-center space-x-2 px-3 py-2 rounded-lg bg-white/10 backdrop-blur-sm border border-white/20 hover:bg-white/20 transition-all duration-200 cursor-pointer list-none">
                    <span className="text-white text-sm font-medium">Menu</span>
                    <svg className="w-4 h-4 text-white/70 group-open:rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </summary>
                  
                  {/* Mobile Dropdown */}
                  <div className="absolute top-full right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
                    <div className="p-2">
                      <div className="text-xs font-medium text-gray-500 uppercase tracking-wide px-2 py-1 mb-1">
                        Navigation
                      </div>
                      {visibleMenuItems.map((item) => (
                        <Link
                          key={item.href}
                          href={item.href}
                          className="block px-3 py-2 text-gray-900 hover:bg-gray-50 rounded-md text-sm font-medium transition-colors"
                        >
                          {item.label}
                        </Link>
                      ))}
                    </div>
                    
                    {isClient && (
                      <div className="border-t border-gray-100 px-2 py-2">
                        <p className="text-xs text-gray-400 px-2">
                          Current Role: <span className="font-medium text-gray-600">{currentRole}</span>
                        </p>
                      </div>
                    )}
                  </div>
                </details>
              </div>

              {/* Role Selector */}
              <RoleSelector />
            </div>
          </div>
        </div>
      </div>
    </header>
  )
} 