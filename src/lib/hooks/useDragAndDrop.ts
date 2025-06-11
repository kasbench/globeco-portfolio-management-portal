// Drag and Drop Hook for Order Prioritization
// Provides drag-and-drop functionality for reordering portfolios and orders

'use client'

import { useCallback, useRef, useState, useEffect } from 'react'
import { toast } from 'sonner'

export interface DragItem {
  id: string
  type: string
  index: number
  data: any
}

export interface DropTarget {
  id: string
  type: string
  accepts: string[]
  index?: number
}

export interface DragDropConfig {
  enableSorting: boolean
  enableCrossTypeDrops: boolean
  showDropIndicators: boolean
  autoScroll: boolean
  scrollSpeed: number
  dragDelay: number
  dragThreshold: number
}

export interface DragDropCallbacks {
  onDragStart?: (item: DragItem) => void
  onDragEnd?: (item: DragItem) => void
  onDrop?: (dragItem: DragItem, dropTarget: DropTarget) => void
  onReorder?: (items: any[], fromIndex: number, toIndex: number) => void
  onMove?: (item: any, fromContainer: string, toContainer: string, index: number) => void
}

export interface UseDragDropProps {
  config?: Partial<DragDropConfig>
  callbacks?: DragDropCallbacks
  items?: any[]
  containerId?: string
}

export interface UseDragDropReturn {
  dragRef: (element: HTMLElement | null) => void
  dropRef: (element: HTMLElement | null) => void
  isDragging: boolean
  isOver: boolean
  dragItem: DragItem | null
  dropTarget: DropTarget | null
  dragPreview: React.RefObject<HTMLDivElement>
  startDrag: (item: DragItem, event: React.MouseEvent | React.TouchEvent) => void
  endDrag: () => void
  handleDrop: (target: DropTarget) => void
}

const DEFAULT_CONFIG: DragDropConfig = {
  enableSorting: true,
  enableCrossTypeDrops: false,
  showDropIndicators: true,
  autoScroll: true,
  scrollSpeed: 20,
  dragDelay: 150,
  dragThreshold: 5
}

export function useDragAndDrop({
  config = {},
  callbacks = {},
  items = [],
  containerId = 'default'
}: UseDragDropProps = {}): UseDragDropReturn {
  const mergedConfig = { ...DEFAULT_CONFIG, ...config }
  
  // State
  const [isDragging, setIsDragging] = useState(false)
  const [isOver, setIsOver] = useState(false)
  const [dragItem, setDragItem] = useState<DragItem | null>(null)
  const [dropTarget, setDropTarget] = useState<DropTarget | null>(null)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  
  // Refs
  const dragElementRef = useRef<HTMLElement | null>(null)
  const dropElementRef = useRef<HTMLElement | null>(null)
  const dragPreviewRef = useRef<HTMLDivElement>(null)
  const dragStartPosition = useRef({ x: 0, y: 0 })
  const dragTimer = useRef<NodeJS.Timeout | null>(null)
  const autoScrollTimer = useRef<NodeJS.Timeout | null>(null)

  // Start drag operation
  const startDrag = useCallback((item: DragItem, event: React.MouseEvent | React.TouchEvent) => {
    const clientX = 'touches' in event ? event.touches[0].clientX : event.clientX
    const clientY = 'touches' in event ? event.touches[0].clientY : event.clientY
    
    dragStartPosition.current = { x: clientX, y: clientY }
    
    // Add delay before starting drag
    dragTimer.current = setTimeout(() => {
      setDragItem(item)
      setIsDragging(true)
      callbacks.onDragStart?.(item)
      
      // Create drag preview
      if (dragPreviewRef.current && dragElementRef.current) {
        const rect = dragElementRef.current.getBoundingClientRect()
        const preview = dragPreviewRef.current
        
        preview.style.display = 'block'
        preview.style.position = 'fixed'
        preview.style.left = `${rect.left}px`
        preview.style.top = `${rect.top}px`
        preview.style.width = `${rect.width}px`
        preview.style.height = `${rect.height}px`
        preview.style.pointerEvents = 'none'
        preview.style.zIndex = '9999'
        preview.style.opacity = '0.8'
        preview.style.transform = 'rotate(5deg)'
        preview.style.boxShadow = '0 10px 30px rgba(0,0,0,0.3)'
        preview.style.background = 'white'
        preview.style.border = '2px solid #3b82f6'
        preview.style.borderRadius = '8px'
        
        // Copy content
        preview.innerHTML = dragElementRef.current.innerHTML
      }
      
      // Add global styles for dragging
      document.body.style.userSelect = 'none'
      document.body.style.cursor = 'grabbing'
      
      toast.info(`Dragging: ${item.type} ${item.id}`, {
        duration: 1000,
        position: 'bottom-right'
      })
    }, mergedConfig.dragDelay)
  }, [callbacks, mergedConfig.dragDelay])

  // End drag operation
  const endDrag = useCallback(() => {
    if (dragTimer.current) {
      clearTimeout(dragTimer.current)
      dragTimer.current = null
    }
    
    if (autoScrollTimer.current) {
      clearTimeout(autoScrollTimer.current)
      autoScrollTimer.current = null
    }
    
    setIsDragging(false)
    setIsOver(false)
    setDragOffset({ x: 0, y: 0 })
    
    if (dragItem) {
      callbacks.onDragEnd?.(dragItem)
    }
    
    setDragItem(null)
    setDropTarget(null)
    
    // Hide drag preview
    if (dragPreviewRef.current) {
      dragPreviewRef.current.style.display = 'none'
    }
    
    // Reset global styles
    document.body.style.userSelect = ''
    document.body.style.cursor = ''
  }, [dragItem, callbacks])

  // Handle drop
  const handleDrop = useCallback((target: DropTarget) => {
    if (!dragItem || !target) return
    
    // Check if drop is allowed
    if (!target.accepts.includes(dragItem.type)) {
      toast.error(`Cannot drop ${dragItem.type} on ${target.type}`)
      endDrag()
      return
    }
    
    // Handle reordering within same container
    if (mergedConfig.enableSorting && target.type === dragItem.type && target.index !== undefined) {
      callbacks.onReorder?.(items, dragItem.index, target.index)
      toast.success(`Reordered ${dragItem.type} from position ${dragItem.index + 1} to ${target.index + 1}`)
    }
    // Handle moving between containers
    else if (mergedConfig.enableCrossTypeDrops) {
      callbacks.onMove?.(dragItem.data, dragItem.type, target.type, target.index || 0)
      toast.success(`Moved ${dragItem.type} to ${target.type}`)
    }
    
    callbacks.onDrop?.(dragItem, target)
    endDrag()
  }, [dragItem, mergedConfig, items, callbacks, endDrag])

  // Mouse/touch event handlers
  const handleMouseMove = useCallback((event: MouseEvent | TouchEvent) => {
    if (!isDragging || !dragPreviewRef.current) return
    
    const clientX = 'touches' in event ? event.touches[0].clientX : event.clientX
    const clientY = 'touches' in event ? event.touches[0].clientY : event.clientY
    
    const newOffset = {
      x: clientX - dragStartPosition.current.x,
      y: clientY - dragStartPosition.current.y
    }
    
    setDragOffset(newOffset)
    
    // Update preview position
    const preview = dragPreviewRef.current
    const rect = dragElementRef.current?.getBoundingClientRect()
    if (rect) {
      preview.style.left = `${rect.left + newOffset.x}px`
      preview.style.top = `${rect.top + newOffset.y}px`
    }
    
    // Auto scroll
    if (mergedConfig.autoScroll) {
      const scrollContainer = document.documentElement
      const scrollThreshold = 100
      const { innerHeight } = window
      
      if (clientY < scrollThreshold) {
        // Scroll up
        if (autoScrollTimer.current) clearTimeout(autoScrollTimer.current)
        autoScrollTimer.current = setTimeout(() => {
          scrollContainer.scrollTop -= mergedConfig.scrollSpeed
        }, 16)
      } else if (clientY > innerHeight - scrollThreshold) {
        // Scroll down
        if (autoScrollTimer.current) clearTimeout(autoScrollTimer.current)
        autoScrollTimer.current = setTimeout(() => {
          scrollContainer.scrollTop += mergedConfig.scrollSpeed
        }, 16)
      }
    }
  }, [isDragging, mergedConfig])

  const handleMouseUp = useCallback(() => {
    endDrag()
  }, [endDrag])

  // Drag ref function
  const dragRef = useCallback((element: HTMLElement | null) => {
    dragElementRef.current = element
    
    if (element) {
      element.style.cursor = 'grab'
      
      const handleMouseDown = (event: MouseEvent) => {
        const item: DragItem = {
          id: element.dataset.dragId || '',
          type: element.dataset.dragType || '',
          index: parseInt(element.dataset.dragIndex || '0'),
          data: element.dataset.dragData ? JSON.parse(element.dataset.dragData) : null
        }
        startDrag(item, event)
      }
      
      const handleTouchStart = (event: TouchEvent) => {
        const item: DragItem = {
          id: element.dataset.dragId || '',
          type: element.dataset.dragType || '',
          index: parseInt(element.dataset.dragIndex || '0'),
          data: element.dataset.dragData ? JSON.parse(element.dataset.dragData) : null
        }
        startDrag(item, event)
      }
      
      element.addEventListener('mousedown', handleMouseDown)
      element.addEventListener('touchstart', handleTouchStart)
      
      return () => {
        element.removeEventListener('mousedown', handleMouseDown)
        element.removeEventListener('touchstart', handleTouchStart)
      }
    }
  }, [startDrag])

  // Drop ref function
  const dropRef = useCallback((element: HTMLElement | null) => {
    dropElementRef.current = element
    
    if (element) {
      const handleMouseEnter = () => {
        if (isDragging) {
          setIsOver(true)
          const target: DropTarget = {
            id: element.dataset.dropId || '',
            type: element.dataset.dropType || '',
            accepts: (element.dataset.dropAccepts || '').split(','),
            index: element.dataset.dropIndex ? parseInt(element.dataset.dropIndex) : undefined
          }
          setDropTarget(target)
          
          if (mergedConfig.showDropIndicators) {
            element.style.backgroundColor = '#e0f2fe'
            element.style.border = '2px dashed #0284c7'
          }
        }
      }
      
      const handleMouseLeave = () => {
        setIsOver(false)
        setDropTarget(null)
        
        if (mergedConfig.showDropIndicators) {
          element.style.backgroundColor = ''
          element.style.border = ''
        }
      }
      
      const handleMouseUp = () => {
        if (isDragging && dropTarget) {
          handleDrop(dropTarget)
        }
      }
      
      element.addEventListener('mouseenter', handleMouseEnter)
      element.addEventListener('mouseleave', handleMouseLeave)
      element.addEventListener('mouseup', handleMouseUp)
      
      return () => {
        element.removeEventListener('mouseenter', handleMouseEnter)
        element.removeEventListener('mouseleave', handleMouseLeave)
        element.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [isDragging, dropTarget, handleDrop, mergedConfig.showDropIndicators])

  // Global event listeners
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('touchmove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      document.addEventListener('touchend', handleMouseUp)
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('touchmove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
        document.removeEventListener('touchend', handleMouseUp)
      }
    }
  }, [isDragging, handleMouseMove, handleMouseUp])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (dragTimer.current) clearTimeout(dragTimer.current)
      if (autoScrollTimer.current) clearTimeout(autoScrollTimer.current)
    }
  }, [])

  return {
    dragRef,
    dropRef,
    isDragging,
    isOver,
    dragItem,
    dropTarget,
    dragPreview: dragPreviewRef,
    startDrag,
    endDrag,
    handleDrop
  }
}

// Hook for order prioritization specific drag and drop
export function useOrderPrioritization(
  orders: any[],
  onReorder: (orders: any[]) => void,
  onPriorityChange?: (orderId: string, newPriority: number) => void
) {
  const reorderOrders = useCallback((items: any[], fromIndex: number, toIndex: number) => {
    const newOrders = [...items]
    const [removed] = newOrders.splice(fromIndex, 1)
    newOrders.splice(toIndex, 0, removed)
    
    // Update priority based on new position
    const updatedOrders = newOrders.map((order, index) => ({
      ...order,
      priority: index + 1
    }))
    
    onReorder(updatedOrders)
    
    // Notify of priority change if callback provided
    if (onPriorityChange) {
      onPriorityChange(removed.id, toIndex + 1)
    }
    
    toast.success(`Moved order to position ${toIndex + 1}`)
  }, [onReorder, onPriorityChange])

  return useDragAndDrop({
    config: {
      enableSorting: true,
      enableCrossTypeDrops: false,
      showDropIndicators: true,
      autoScroll: true
    },
    callbacks: {
      onReorder: reorderOrders,
      onDragStart: (item) => {
        toast.info(`Dragging order ${item.id}`)
      }
    },
    items: orders,
    containerId: 'order-list'
  })
} 