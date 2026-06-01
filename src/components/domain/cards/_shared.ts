import * as React from 'react'

export interface CardAction {
  icon: React.ReactNode
  label: string
  onClick: () => void
  variant?: 'default' | 'accent' | 'danger'
}
