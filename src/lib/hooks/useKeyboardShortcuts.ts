// Keyboard Shortcuts Hook for Order Submission Operations
// Provides comprehensive keyboard shortcuts for improved user efficiency

'use client'

import { useEffect, useCallback, useRef } from 'react'
import { toast } from 'sonner'

export interface KeyboardShortcut {
  key: string
  ctrlKey?: boolean
  shiftKey?: boolean
  altKey?: boolean
  metaKey?: boolean
  description: string
  action: () => void
  category: string
  enabled?: boolean
}

export interface KeyboardShortcutsConfig {
  enableGlobalShortcuts: boolean
  enableModalShortcuts: boolean
  enableTableShortcuts: boolean
  showHelpOnStartup: boolean
  customShortcuts: Partial<Record<string, KeyboardShortcut>>
}

export interface UseKeyboardShortcutsProps {
  shortcuts: KeyboardShortcut[]
  config?: Partial<KeyboardShortcutsConfig>
  context?: string // For context-specific shortcuts
  onShortcutExecuted?: (shortcut: KeyboardShortcut) => void
}

export interface UseKeyboardShortcutsReturn {
  shortcuts: KeyboardShortcut[]
  enableShortcut: (key: string) => void
  disableShortcut: (key: string) => void
  executeShortcut: (key: string) => void
  showHelp: () => void
  hideHelp: () => void
  isHelpVisible: boolean
  registerShortcut: (shortcut: KeyboardShortcut) => void
  unregisterShortcut: (key: string) => void
}

const DEFAULT_CONFIG: KeyboardShortcutsConfig = {
  enableGlobalShortcuts: true,
  enableModalShortcuts: true,
  enableTableShortcuts: true,
  showHelpOnStartup: false,
  customShortcuts: {}
}

// Common order submission shortcuts
export const createOrderSubmissionShortcuts = (actions: {
  submitAll?: () => void
  submitSelected?: () => void
  selectAll?: () => void
  clearSelection?: () => void
  deleteSelected?: () => void
  exportData?: () => void
  showHistory?: () => void
  toggleBackgroundProcessing?: () => void
  openBatchOperations?: () => void
  retryFailed?: () => void
}): KeyboardShortcut[] => [
  // Submission operations
  {
    key: 'Enter',
    ctrlKey: true,
    description: 'Submit all eligible orders',
    action: actions.submitAll || (() => {}),
    category: 'Submission',
    enabled: !!actions.submitAll
  },
  {
    key: 'Enter',
    ctrlKey: true,
    shiftKey: true,
    description: 'Submit selected orders only',
    action: actions.submitSelected || (() => {}),
    category: 'Submission',
    enabled: !!actions.submitSelected
  },
  {
    key: 'r',
    ctrlKey: true,
    description: 'Retry failed submissions',
    action: actions.retryFailed || (() => {}),
    category: 'Submission',
    enabled: !!actions.retryFailed
  },

  // Selection operations
  {
    key: 'a',
    ctrlKey: true,
    description: 'Select all items',
    action: actions.selectAll || (() => {}),
    category: 'Selection',
    enabled: !!actions.selectAll
  },
  {
    key: 'a',
    ctrlKey: true,
    shiftKey: true,
    description: 'Clear all selections',
    action: actions.clearSelection || (() => {}),
    category: 'Selection',
    enabled: !!actions.clearSelection
  },

  // Data operations
  {
    key: 'e',
    ctrlKey: true,
    description: 'Export data',
    action: actions.exportData || (() => {}),
    category: 'Data',
    enabled: !!actions.exportData
  },
  {
    key: 'h',
    ctrlKey: true,
    description: 'Show submission history',
    action: actions.showHistory || (() => {}),
    category: 'Data',
    enabled: !!actions.showHistory
  },

  // UI operations
  {
    key: 'b',
    ctrlKey: true,
    description: 'Toggle background processing',
    action: actions.toggleBackgroundProcessing || (() => {}),
    category: 'UI',
    enabled: !!actions.toggleBackgroundProcessing
  },
  {
    key: 'o',
    ctrlKey: true,
    description: 'Open batch operations panel',
    action: actions.openBatchOperations || (() => {}),
    category: 'UI',
    enabled: !!actions.openBatchOperations
  },

  // Deletion operations
  {
    key: 'Delete',
    ctrlKey: true,
    description: 'Delete selected items',
    action: actions.deleteSelected || (() => {}),
    category: 'Deletion',
    enabled: !!actions.deleteSelected
  },

  // Navigation
  {
    key: '?',
    description: 'Show keyboard shortcuts help',
    action: () => {}, // Will be handled by the hook
    category: 'Help',
    enabled: true
  },
  {
    key: 'Escape',
    description: 'Cancel current operation / Close dialogs',
    action: () => {}, // Will be handled by specific components
    category: 'Navigation',
    enabled: true
  }
]

export function useKeyboardShortcuts({
  shortcuts,
  config = {},
  context = 'global',
  onShortcutExecuted
}: UseKeyboardShortcutsProps): UseKeyboardShortcutsReturn {
  const mergedConfig = { ...DEFAULT_CONFIG, ...config }
  const shortcutsRef = useRef<Map<string, KeyboardShortcut>>(new Map())
  const isHelpVisibleRef = useRef(false)

  // Create unique key for shortcut
  const createShortcutKey = useCallback((shortcut: KeyboardShortcut): string => {
    const modifiers = []
    if (shortcut.ctrlKey) modifiers.push('ctrl')
    if (shortcut.shiftKey) modifiers.push('shift')
    if (shortcut.altKey) modifiers.push('alt')
    if (shortcut.metaKey) modifiers.push('meta')
    return `${modifiers.join('+')}_${shortcut.key.toLowerCase()}`
  }, [])

  // Help system
  const showHelp = useCallback(() => {
    isHelpVisibleRef.current = true
    
    // Create help modal content
    const categories = shortcuts.reduce((acc, shortcut) => {
      if (!acc[shortcut.category]) {
        acc[shortcut.category] = []
      }
      acc[shortcut.category].push(shortcut)
      return acc
    }, {} as Record<string, KeyboardShortcut[]>)

    const helpContent = Object.entries(categories)
      .map(([category, shortcuts]) => {
        const shortcutList = shortcuts
          .filter(s => s.enabled !== false)
          .map(s => {
            const modifiers = []
            if (s.ctrlKey) modifiers.push('Ctrl')
            if (s.shiftKey) modifiers.push('Shift')
            if (s.altKey) modifiers.push('Alt')
            if (s.metaKey) modifiers.push('Cmd')
            
            const keyCombo = modifiers.length > 0 
              ? `${modifiers.join('+')}+${s.key}`
              : s.key

            return `${keyCombo}: ${s.description}`
          })
          .join('\n')
        
        return `${category}:\n${shortcutList}`
      })
      .join('\n\n')

    // Show help in a toast or modal (implementation depends on UI library)
    toast.info('Keyboard Shortcuts', {
      description: helpContent,
      duration: 10000,
      position: 'top-center'
    })
  }, [shortcuts])

  // Initialize shortcuts
  useEffect(() => {
    shortcuts.forEach(shortcut => {
      const key = createShortcutKey(shortcut)
      shortcutsRef.current.set(key, shortcut)
    })
  }, [shortcuts, createShortcutKey])

  // Check if shortcut matches event
  const matchesShortcut = useCallback((event: KeyboardEvent, shortcut: KeyboardShortcut): boolean => {
    return (
      event.key.toLowerCase() === shortcut.key.toLowerCase() &&
      !!event.ctrlKey === !!shortcut.ctrlKey &&
      !!event.shiftKey === !!shortcut.shiftKey &&
      !!event.altKey === !!shortcut.altKey &&
      !!event.metaKey === !!shortcut.metaKey
    )
  }, [])

  // Handle keyboard events
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // Skip if typing in input fields
    const target = event.target as HTMLElement
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.contentEditable === 'true') {
      return
    }

    // Special handling for help shortcut
    if (event.key === '?' && !event.ctrlKey && !event.shiftKey && !event.altKey) {
      event.preventDefault()
      showHelp()
      return
    }

    // Find matching shortcut
    for (const shortcut of shortcutsRef.current.values()) {
      if (shortcut.enabled !== false && matchesShortcut(event, shortcut)) {
        event.preventDefault()
        event.stopPropagation()
        
        try {
          shortcut.action()
          onShortcutExecuted?.(shortcut)
          
          // Show toast notification
          toast.success(`Executed: ${shortcut.description}`, {
            duration: 2000,
            position: 'bottom-right'
          })
        } catch (error) {
          console.error('Shortcut execution failed:', error)
          toast.error(`Failed to execute: ${shortcut.description}`)
        }
        break
      }
    }
  }, [matchesShortcut, onShortcutExecuted, showHelp])

  // Enable/disable shortcuts
  const enableShortcut = useCallback((key: string) => {
    const shortcut = shortcutsRef.current.get(key)
    if (shortcut) {
      shortcut.enabled = true
    }
  }, [])

  const disableShortcut = useCallback((key: string) => {
    const shortcut = shortcutsRef.current.get(key)
    if (shortcut) {
      shortcut.enabled = false
    }
  }, [])

  // Execute shortcut programmatically
  const executeShortcut = useCallback((key: string) => {
    const shortcut = shortcutsRef.current.get(key)
    if (shortcut && shortcut.enabled !== false) {
      shortcut.action()
      onShortcutExecuted?.(shortcut)
    }
  }, [onShortcutExecuted])

  // Help system
  const hideHelp = useCallback(() => {
    isHelpVisibleRef.current = false
  }, [])

  // Register/unregister shortcuts dynamically
  const registerShortcut = useCallback((shortcut: KeyboardShortcut) => {
    const key = createShortcutKey(shortcut)
    shortcutsRef.current.set(key, shortcut)
  }, [createShortcutKey])

  const unregisterShortcut = useCallback((key: string) => {
    shortcutsRef.current.delete(key)
  }, [])

  // Set up event listeners
  useEffect(() => {
    if (mergedConfig.enableGlobalShortcuts) {
      document.addEventListener('keydown', handleKeyDown)
      return () => {
        document.removeEventListener('keydown', handleKeyDown)
      }
    }
  }, [handleKeyDown, mergedConfig.enableGlobalShortcuts])

  // Show help on startup if configured
  useEffect(() => {
    if (mergedConfig.showHelpOnStartup) {
      const timer = setTimeout(showHelp, 1000)
      return () => clearTimeout(timer)
    }
  }, [mergedConfig.showHelpOnStartup, showHelp])

  return {
    shortcuts: Array.from(shortcutsRef.current.values()),
    enableShortcut,
    disableShortcut,
    executeShortcut,
    showHelp,
    hideHelp,
    isHelpVisible: isHelpVisibleRef.current,
    registerShortcut,
    unregisterShortcut
  }
}

// Hook for order submission specific shortcuts
export function useOrderSubmissionShortcuts(actions: {
  submitAll?: () => void
  submitSelected?: () => void
  selectAll?: () => void
  clearSelection?: () => void
  deleteSelected?: () => void
  exportData?: () => void
  showHistory?: () => void
  toggleBackgroundProcessing?: () => void
  openBatchOperations?: () => void
  retryFailed?: () => void
}) {
  const shortcuts = createOrderSubmissionShortcuts(actions)
  
  return useKeyboardShortcuts({
    shortcuts,
    context: 'order-submission',
    onShortcutExecuted: (shortcut) => {
      // console.log(`Executed order submission shortcut: ${shortcut.description}`)
    }
  })
} 