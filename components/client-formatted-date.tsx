'use client'

import { useEffect, useState } from 'react'

export function ClientFormattedDate({ value }: { value: string }) {
  const [formatted, setFormatted] = useState<string>('')

  useEffect(() => {
    const parsed = new Date(value)
    setFormatted(Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString())
  }, [value])

  return <>{formatted || '—'}</>
}
