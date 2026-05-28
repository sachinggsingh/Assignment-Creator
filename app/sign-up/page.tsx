import { AuthForm } from '@/components/auth-form'

export default function SignUpPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <AuthForm mode="sign-up" />
    </div>
  )
}
