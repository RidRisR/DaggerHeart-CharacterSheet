"use client"

import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'

interface FadeNotificationProps {
  message: string
  type?: 'success' | 'error' | 'info'
  duration?: number
  position?: 'top' | 'middle'  // 新增位置参数
}

interface NotificationState {
  id: string
  message: string
  type: 'success' | 'error' | 'info'
  duration: number
  position: 'top' | 'middle'  // 新增位置参数
}

// 全局通知状态管理
let notificationId = 0
const notifications: NotificationState[] = []
const listeners: ((notifications: NotificationState[]) => void)[] = []

function notifyListeners() {
  listeners.forEach(listener => listener([...notifications]))
}

export function showFadeNotification(props: FadeNotificationProps) {
  const id = `notification-${++notificationId}`
  const notification: NotificationState = {
    id,
    message: props.message,
    type: props.type || 'info',
    duration: props.duration || 2000,
    position: props.position || 'top'  // 默认为顶部
  }

  notifications.push(notification)
  notifyListeners()
  
  // 自动移除通知
  setTimeout(() => {
    const index = notifications.findIndex(n => n.id === id)
    if (index > -1) {
      notifications.splice(index, 1)
      notifyListeners()
    }
  }, notification.duration)
}

// 单个通知组件
function FadeNotificationItem({ notification }: { notification: NotificationState }) {
  const [isVisible, setIsVisible] = useState(false)
  const [shouldRender, setShouldRender] = useState(true)
  
  useEffect(() => {
    // 立即显示
    const showTimeout = setTimeout(() => setIsVisible(true), 10)
    
    // 开始淡出
    const fadeTimeout = setTimeout(() => setIsVisible(false), notification.duration - 500)
    
    // 完全移除
    const removeTimeout = setTimeout(() => setShouldRender(false), notification.duration)
    
    return () => {
      clearTimeout(showTimeout)
      clearTimeout(fadeTimeout)
      clearTimeout(removeTimeout)
    }
  }, [notification.duration])
  
  if (!shouldRender) return null
  
  const typeStyles = {
    success: 'bg-green-100 text-green-800 border-green-200',
    error: 'bg-red-100 text-red-800 border-red-200',
    info: 'bg-blue-100 text-blue-800 border-blue-200'
  }

  // 根据位置设置不同的 top 值
  const positionClass = notification.position === 'middle' ? 'top-1/2 -translate-y-1/2' : 'top-20'

  return (
    <div
      className={`
        fixed ${positionClass} left-1/2 transform -translate-x-1/2 z-[200]
        px-4 py-2 rounded-lg border shadow-md text-sm font-medium
        transition-all duration-500 ease-out
        ${typeStyles[notification.type]}
        ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'}
      `}
      style={{
        marginTop: `${notifications.findIndex(n => n.id === notification.id) * 60}px`
      }}
    >
      {notification.message}
    </div>
  )
}

// 通知容器组件
export function FadeNotificationContainer() {
  const [notificationList, setNotificationList] = useState<NotificationState[]>([])
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)

    listeners.push(setNotificationList)
    return () => {
      const index = listeners.indexOf(setNotificationList)
      if (index > -1) {
        listeners.splice(index, 1)
      }
    }
  }, [])

  if (!isMounted) {
    return null
  }

  return createPortal(
    <div className="pointer-events-none">
      {notificationList.map(notification => (
        <FadeNotificationItem key={notification.id} notification={notification} />
      ))}
    </div>,
    document.body
  )
}
