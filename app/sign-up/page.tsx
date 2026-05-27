import Link from 'next/link'
import { Brain } from 'lucide-react'
import { AuthForm } from '@/components/auth-form'

export default function SignUpPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="border-b border-border px-6 py-4">
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold">
          <Brain className="h-5 w-5" />
          AssessMind AI
        </Link>
      </header>
      <main className="flex flex-1 items-center justify-center px-4 py-12">
        <AuthForm mode="sign-up" />
      </main>
    </div>
  )
}
