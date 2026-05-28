'use client'

import React from 'react'

export function ClientFormattedDate({ value }: { value: string }) {
  const parsed = React.useMemo(() => new Date(value), [value])
  const formatted = Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString()
  return <>{formatted || '—'}</>
}
