'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ChevronDown } from 'lucide-react'
import { useRoleStore } from '@/store/roleStore'
import RoleSelector from './RoleSelector'

interface MenuItemConfig {
  href: string
  label: string
  allowedRoles: string[]
}

interface SubMenuItemConfig {
  href: string
  label: string
}

interface MenuItemWithSubmenuConfig {
  label: string
  allowedRoles: string[]
  submenu: SubMenuItemConfig[]
}

const MENU_ITEMS: MenuItemConfig[] = [
  {
    href: '/',
    label: 'Home',
    allowedRoles: ['admin', 'internal', 'partner', 'customer']
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

// Model Management submenu
const MODEL_MANAGEMENT_MENU: MenuItemWithSubmenuConfig = {
  label: 'Model Management',
  allowedRoles: ['admin', 'internal', 'partner'],
  submenu: [
    {
      href: '/model-management',
      label: 'Investment Model'
    },
    {
      href: '/model-management/rebalance-results',
      label: 'Rebalance Results'
    }
  ]
}

// Trading submenu
const TRADING_MENU: MenuItemWithSubmenuConfig = {
  label: 'Trading',
  allowedRoles: ['admin', 'internal', 'partner'],
  submenu: [
    {
      href: '/trading/trade-management',
      label: 'Trade Management'
    },
    {
      href: '/trading/execution-management',
      label: 'Execution Management'
    }
  ]
}

export default function Header() {
  const { currentRole, hasAccess } = useRoleStore()
  const [isClient, setIsClient] = useState(false)
  const [isModelMenuOpen, setIsModelMenuOpen] = useState(false)
  const [isTradingMenuOpen, setIsTradingMenuOpen] = useState(false)

  // Only show role-filtered menu after hydration to avoid SSR mismatch
  useEffect(() => {
    setIsClient(true)
  }, [])

  // Show all menu items during SSR, role-filtered items after hydration
  const visibleMenuItems = isClient 
    ? MENU_ITEMS.filter(item => hasAccess(item.allowedRoles as any))
    : MENU_ITEMS

  // Check if Model Management should be visible
  const isModelManagementVisible = isClient 
    ? hasAccess(MODEL_MANAGEMENT_MENU.allowedRoles as any)
    : true

  // Check if Trading should be visible
  const isTradingVisible = isClient 
    ? hasAccess(TRADING_MENU.allowedRoles as any)
    : true

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
              {visibleMenuItems.slice(0, 1).map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="text-white/90 hover:text-white hover:bg-white/10 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200"
                >
                  {item.label}
                </Link>
              ))}
              
              {/* Model Management Submenu */}
              {isModelManagementVisible && (
                <div className="relative">
                  <button
                    onClick={() => setIsModelMenuOpen(!isModelMenuOpen)}
                    className="flex items-center space-x-1 text-white/90 hover:text-white hover:bg-white/10 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200"
                  >
                    <span>{MODEL_MANAGEMENT_MENU.label}</span>
                    <ChevronDown 
                      className={`h-4 w-4 transition-transform duration-200 ${
                        isModelMenuOpen ? 'rotate-180' : ''
                      }`} 
                    />
                  </button>

                  {/* Model Management Dropdown */}
                  {isModelMenuOpen && (
                    <>
                      {/* Backdrop */}
                      <div 
                        className="fixed inset-0 z-10" 
                        onClick={() => setIsModelMenuOpen(false)}
                      />
                      
                      {/* Dropdown */}
                      <div className="absolute top-full left-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 z-20 overflow-hidden">
                        <div className="p-2">
                          {MODEL_MANAGEMENT_MENU.submenu.map((item) => (
                            <Link
                              key={item.href}
                              href={item.href}
                              onClick={() => setIsModelMenuOpen(false)}
                              className="block px-3 py-2 text-gray-900 hover:bg-gray-50 rounded-md text-sm font-medium transition-colors"
                            >
                              {item.label}
                            </Link>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Trading Submenu */}
              {isTradingVisible && (
                <div className="relative">
                  <button
                    onClick={() => setIsTradingMenuOpen(!isTradingMenuOpen)}
                    className="flex items-center space-x-1 text-white/90 hover:text-white hover:bg-white/10 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200"
                  >
                    <span>{TRADING_MENU.label}</span>
                    <ChevronDown 
                      className={`h-4 w-4 transition-transform duration-200 ${
                        isTradingMenuOpen ? 'rotate-180' : ''
                      }`} 
                    />
                  </button>

                  {/* Trading Dropdown */}
                  {isTradingMenuOpen && (
                    <>
                      {/* Backdrop */}
                      <div 
                        className="fixed inset-0 z-10" 
                        onClick={() => setIsTradingMenuOpen(false)}
                      />
                      
                      {/* Dropdown */}
                      <div className="absolute top-full left-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 z-20 overflow-hidden">
                        <div className="p-2">
                          {TRADING_MENU.submenu.map((item) => (
                            <Link
                              key={item.href}
                              href={item.href}
                              onClick={() => setIsTradingMenuOpen(false)}
                              className="block px-3 py-2 text-gray-900 hover:bg-gray-50 rounded-md text-sm font-medium transition-colors"
                            >
                              {item.label}
                            </Link>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}

              {visibleMenuItems.slice(1).map((item) => (
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
                      {visibleMenuItems.slice(0, 1).map((item) => (
                        <Link
                          key={item.href}
                          href={item.href}
                          className="block px-3 py-2 text-gray-900 hover:bg-gray-50 rounded-md text-sm font-medium transition-colors"
                        >
                          {item.label}
                        </Link>
                      ))}
                      
                      {/* Model Management Mobile Submenu */}
                      {isModelManagementVisible && (
                        <div className="border-l-2 border-gray-100 ml-2 pl-3 my-2">
                          <div className="text-xs font-medium text-gray-500 px-2 py-1 mb-1">
                            {MODEL_MANAGEMENT_MENU.label}
                          </div>
                          {MODEL_MANAGEMENT_MENU.submenu.map((item) => (
                            <Link
                              key={item.href}
                              href={item.href}
                              className="block px-3 py-2 text-gray-900 hover:bg-gray-50 rounded-md text-sm transition-colors"
                            >
                              {item.label}
                            </Link>
                          ))}
                        </div>
                      )}

                      {/* Trading Mobile Submenu */}
                      {isTradingVisible && (
                        <div className="border-l-2 border-gray-100 ml-2 pl-3 my-2">
                          <div className="text-xs font-medium text-gray-500 px-2 py-1 mb-1">
                            {TRADING_MENU.label}
                          </div>
                          {TRADING_MENU.submenu.map((item) => (
                            <Link
                              key={item.href}
                              href={item.href}
                              className="block px-3 py-2 text-gray-900 hover:bg-gray-50 rounded-md text-sm transition-colors"
                            >
                              {item.label}
                            </Link>
                          ))}
                        </div>
                      )}

                      {visibleMenuItems.slice(1).map((item) => (
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