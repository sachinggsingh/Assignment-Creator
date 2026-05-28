'use client'

import { useState } from 'react'
import { Menu, X, ChevronRight, Star, Zap, Brain, Check, ArrowRight } from 'lucide-react'
import Link from 'next/link'

const navLinks = [
  { href: '#features', label: 'Features' },
  { href: '#pricing', label: 'Pricing' },
  { href: '#testimonials', label: 'Testimonials' },
  { href: '#about', label: 'About' },
]

const featureCards = [
  {
    icon: <Zap className="h-5 w-5" />,
    title: 'Lightning Fast',
    description: 'Generate comprehensive assessments in seconds using our advanced AI engine.',
  },
  {
    icon: <Brain className="h-5 w-5" />,
    title: 'AI Powered',
    description: 'Leverage cutting-edge language models for intelligent question generation.',
  },
  {
    icon: <Check className="h-5 w-5" />,
    title: 'Quality Assured',
    description: 'Every assessment goes through rigorous validation for accuracy and relevance.',
  },
]

export default function Home() {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div
      className="min-h-screen bg-background text-foreground"
      style={{ fontFamily: "'DM Sans', 'Helvetica Neue', sans-serif" }}
    >
      {/* Navigation */}
      <nav className="fixed inset-x-0 top-0 z-50 border-b border-black/10 bg-white/90 backdrop-blur-xl dark:border-white/10 dark:bg-black/90">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 lg:px-8">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Brain className="h-5 w-5" />
            </div>
            <span className="text-sm font-semibold tracking-tight">VedaAI</span>
          </Link>

          <div className="hidden items-center gap-8 md:flex">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-sm text-black/50 transition-colors hover:text-black dark:text-white/50 dark:hover:text-white"
              >
                {link.label}
              </a>
            ))}
          </div>

          <div className="hidden items-center gap-3 md:flex">
            <Link
              href="/sign-in"
              className="rounded-full border border-black/20 px-5 py-2 text-sm font-medium transition-all hover:border-black hover:bg-black hover:text-white dark:border-white/20 dark:hover:border-white dark:hover:bg-white dark:hover:text-black"
            >
              Sign In
            </Link>
            <Link
              href="/sign-up"
              className="rounded-full bg-black px-5 py-2 text-sm font-medium text-white transition-all hover:bg-black/80 dark:bg-white dark:text-black dark:hover:bg-white/90"
            >
              Get Started
            </Link>
          </div>

          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="rounded-md p-2 md:hidden"
            aria-label="Toggle menu"
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {menuOpen && (
          <div className="border-t border-black/10 bg-white px-6 pb-5 pt-4 dark:border-white/10 dark:bg-black">
            <div className="space-y-1">
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="block rounded-md px-3 py-2 text-sm text-black/60 hover:bg-black/5 hover:text-black dark:text-white/60 dark:hover:bg-white/5 dark:hover:text-white"
                >
                  {link.label}
                </a>
              ))}
              <div className="grid gap-2 pt-3">
                <Link
                  href="/sign-in"
                  className="rounded-full border border-black/20 px-4 py-2 text-center text-sm font-medium dark:border-white/20"
                >
                  Sign In
                </Link>
                <Link
                  href="/sign-up"
                  className="rounded-full bg-black px-4 py-2 text-center text-sm font-medium text-white dark:bg-white dark:text-black"
                >
                  Get Started
                </Link>
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* Hero */}
      <section className="relative flex min-h-screen items-center justify-center overflow-hidden pt-20">
        {/* Subtle grid pattern */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.03] dark:opacity-[0.06]"
          style={{
            backgroundImage:
              'linear-gradient(black 1px, transparent 1px), linear-gradient(90deg, black 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }}
        />

        {/* Large typographic accent */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden">
          <span
            className="select-none text-[22vw] font-black leading-none tracking-tighter text-black/[0.03] dark:text-white/[0.03]"
          >
            AI
          </span>
        </div>

        <div className="relative z-10 mx-auto max-w-5xl px-6 text-center lg:px-8">
          <div className="mx-auto mb-8 inline-flex items-center gap-2 rounded-full border border-black/15 bg-black/5 px-4 py-1.5 text-xs font-medium uppercase tracking-widest dark:border-white/15 dark:bg-white/5">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-black dark:bg-white" />
            AI-Powered Assessment Generation
          </div>

          <h1
            className="mx-auto max-w-4xl text-5xl font-black leading-[0.95] tracking-tighter sm:text-6xl md:text-8xl"
          >
            Create
            <br />
            <span className="text-black/20 dark:text-white/20">assessments</span>
            <br />
            instantly.
          </h1>

          <p className="mx-auto mt-8 max-w-xl text-base leading-relaxed text-black/50 dark:text-white/50 sm:text-lg">
            Save time, improve quality, and deliver polished assessments with an AI workflow built for educators and training teams.
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/sign-up"
              className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-primary to-secondary px-8 py-3.5 text-sm font-semibold text-primary-foreground transition-all hover:opacity-95"
            >
              Start Free Trial
              <ArrowRight className="h-4 w-4" />
            </Link>
            <a
              href="#features"
              className="inline-flex items-center gap-2 rounded-full border border-border px-8 py-3.5 text-sm font-semibold transition-all hover:border-primary hover:text-foreground"
            >
              See Features
            </a>
          </div>

          <div className="mt-16 grid gap-px overflow-hidden rounded-2xl border border-black/10 bg-black/10 sm:grid-cols-3 dark:border-white/10 dark:bg-white/10">
            {[
              { value: '50K+', label: 'Assessments Created' },
              { value: '10K+', label: 'Active Educators' },
              { value: '99%', label: 'Satisfaction Rate' },
            ].map((stat) => (
              <div
                key={stat.label}
                className="bg-white px-6 py-7 dark:bg-black"
              >
                <div className="text-4xl font-black tracking-tighter">{stat.value}</div>
                <p className="mt-1.5 text-xs uppercase tracking-widest text-black/40 dark:text-white/40">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="border-t border-black/10 px-6 py-24 dark:border-white/10 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="mb-16 flex items-end justify-between">
            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-black/40 dark:text-white/40">Features</p>
              <h2 className="max-w-md text-4xl font-black leading-tight tracking-tighter sm:text-5xl">
                Built for modern learning teams
              </h2>
            </div>
            <Link
              href="/sign-up"
              className="hidden items-center gap-2 rounded-full border border-black/20 px-5 py-2.5 text-sm font-medium transition-all hover:border-black dark:border-white/20 dark:hover:border-white md:inline-flex"
            >
              Explore all features
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="grid gap-px overflow-hidden rounded-2xl border border-black/10 bg-black/10 md:grid-cols-3 dark:border-white/10 dark:bg-white/10">
            {featureCards.map((feature, i) => (
              <div
                key={feature.title}
                className="group bg-white px-8 py-10 transition-colors hover:bg-black hover:text-white dark:bg-black dark:hover:bg-white dark:hover:text-black"
              >
                <div className="mb-6 flex h-10 w-10 items-center justify-center rounded-lg border border-black/10 text-black transition-colors group-hover:border-white/20 group-hover:text-white dark:border-white/10 dark:text-white dark:group-hover:border-black/20 dark:group-hover:text-black">
                  {feature.icon}
                </div>
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest opacity-40">0{i + 1}</p>
                <h3 className="mb-3 text-xl font-bold tracking-tight">{feature.title}</h3>
                <p className="text-sm leading-relaxed opacity-50">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="border-t border-black/10 px-6 py-24 dark:border-white/10 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="mb-16">
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-black/40 dark:text-white/40">Pricing</p>
            <h2 className="max-w-lg text-4xl font-black leading-tight tracking-tighter sm:text-5xl">
              Simple plans that scale with your team
            </h2>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            {[
              {
                name: 'Starter',
                price: 'Free',
                description: 'Perfect for getting started',
                features: ['10 assessments/month', 'Basic customization', 'Email support'],
                cta: 'Get Started',
                highlight: false,
              },
              {
                name: 'Professional',
                price: '$49',
                period: '/mo',
                description: 'For serious educators',
                features: ['Unlimited assessments', 'Advanced analytics', 'Priority support', 'Custom branding', 'API access'],
                cta: 'Start Pro',
                highlight: true,
              },
              {
                name: 'Enterprise',
                price: 'Custom',
                description: 'For large organizations',
                features: ['Everything in Pro', 'Dedicated support', 'Custom integrations', 'SLA guarantee'],
                cta: 'Talk to Sales',
                highlight: false,
              },
            ].map((plan) => (
              <div
                key={plan.name}
                className={`rounded-2xl border p-8 ${
                  plan.highlight
                    ? 'border-black bg-black text-white dark:border-white dark:bg-white dark:text-black'
                    : 'border-black/10 bg-white dark:border-white/10 dark:bg-black'
                }`}
              >
                {plan.highlight && (
                  <p className="mb-4 text-[10px] font-semibold uppercase tracking-widest opacity-50">Most Popular</p>
                )}
                <h3 className="text-2xl font-black tracking-tight">{plan.name}</h3>
                <p className={`mt-1 text-sm ${plan.highlight ? 'opacity-80' : 'text-muted-foreground'}`}>
                  {plan.description}
                </p>
                <div className="mt-6 flex items-baseline gap-1">
                  <span className="text-5xl font-black tracking-tighter">{plan.price}</span>
                  {plan.period && (
                    <span className={`text-sm ${plan.highlight ? 'opacity-50' : 'text-black/40 dark:text-white/40'}`}>
                      {plan.period}
                    </span>
                  )}
                </div>
                <Link
                  href="/sign-up"
                  className={`mt-6 flex w-full items-center justify-center gap-2 rounded-full py-3 text-sm font-semibold transition-all ${
                    plan.highlight
                      ? 'bg-primary text-primary-foreground hover:opacity-90'
                      : 'border border-border hover:border-primary hover:text-foreground'
                  }`}
                >
                  {plan.cta}
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <div className="mt-8 space-y-3">
                  {plan.features.map((feature) => (
                    <div key={feature} className="flex items-center gap-3">
                      <div className={`flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full ${plan.highlight ? 'bg-white/20' : 'bg-black/10 dark:bg-white/10'}`}>
                        <Check className="h-2.5 w-2.5" />
                      </div>
                      <span className={`text-sm ${plan.highlight ? 'opacity-80' : 'text-black/70 dark:text-white/70'}`}>
                        {feature}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* About */}
      <section id="about" className="border-t border-black/10 px-6 py-24 dark:border-white/10 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="grid items-center gap-16 lg:grid-cols-2">
            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-black/40 dark:text-white/40">About</p>
              <h2 className="text-4xl font-black leading-tight tracking-tighter sm:text-5xl">
                Built to help educators move faster
              </h2>
            </div>
            <div className="space-y-5 text-base leading-relaxed text-black/60 dark:text-white/60">
              <p>
                VedaAI was founded with one mission: to revolutionize how educators create assessments while keeping the human touch at the center.
              </p>
              <p>
                Our platform combines pedagogical expertise with current AI capabilities to generate thoughtful, high-quality assessments that save time and improve learning outcomes.
              </p>
              <p>
                Whether you&apos;re a teacher, trainer, or learning leader, VedaAI adapts to your unique needs and helps you move from idea to ready-to-use content quickly.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="border-t border-black/10 px-6 py-24 dark:border-white/10 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="mb-16">
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-black/40 dark:text-white/40">Testimonials</p>
            <h2 className="text-4xl font-black tracking-tighter sm:text-5xl">Loved by educators worldwide</h2>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {[
              {
                name: 'Sarah Johnson',
                role: 'High School Teacher',
                initials: 'SJ',
                text: "VedaAI saved me hours every week. I can now focus on what matters most — teaching and student engagement.",
              },
              {
                name: 'Marcus Chen',
                role: 'University Professor',
                initials: 'MC',
                text: "The quality of AI-generated assessments is impressive. They're pedagogically sound and truly align with my curriculum.",
              },
              {
                name: 'Emily Rodriguez',
                role: 'Corporate L&D Manager',
                initials: 'ER',
                text: "We've cut our assessment creation time by 80%. The ROI has been exceptional for our training programs.",
              },
            ].map((t, i) => (
              <div
                key={i}
                className="rounded-2xl border border-black/10 bg-white p-8 dark:border-white/10 dark:bg-black"
              >
                <div className="mb-6 flex gap-0.5">
                  {[...Array(5)].map((_, j) => (
                    <Star key={j} className="h-3.5 w-3.5 fill-black text-black dark:fill-white dark:text-white" />
                  ))}
                </div>
                <p className="mb-8 text-sm leading-relaxed text-black/70 dark:text-white/70">{t.text}</p>
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-black text-xs font-bold text-white dark:bg-white dark:text-black">
                    {t.initials}
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{t.name}</p>
                    <p className="text-xs text-black/40 dark:text-white/40">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Banner */}
      <section className="border-t border-border px-6 py-24 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="overflow-hidden rounded-3xl bg-primary px-10 py-16 text-primary-foreground sm:px-16">
            <div className="flex flex-col items-start gap-8 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-4xl font-black tracking-tighter sm:text-5xl">
                  Ready to get started?
                </h2>
                <p className="mt-3 text-base opacity-60">
                  Join 10,000+ educators already using VedaAI.
                </p>
              </div>
              <Link
                href="/sign-up"
                className="flex-shrink-0 inline-flex items-center gap-2 rounded-full bg-white px-7 py-3.5 text-sm font-semibold text-black transition-all hover:bg-white/90 dark:bg-black dark:text-white dark:hover:bg-black/90"
              >
                Start Free Trial
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-black/10 dark:border-white/10">
        <div className="mx-auto max-w-7xl px-6 py-16 lg:px-8">
          <div className="grid gap-12 md:grid-cols-4">
            <div>
              <div className="mb-4 flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-black dark:bg-white">
                  <Brain className="h-4 w-4 text-white dark:text-black" />
                </div>
                <span className="text-sm font-bold">VedaAI</span>
              </div>
              <p className="text-sm text-black/40 dark:text-white/40">
                Revolutionizing assessment creation with AI technology.
              </p>
            </div>

            {[
              {
                title: 'Product',
                links: ['Features', 'Pricing', 'Security', 'Roadmap'],
              },
              {
                title: 'Company',
                links: ['About', 'Blog', 'Careers', 'Contact'],
              },
              {
                title: 'Legal',
                links: ['Privacy Policy', 'Terms of Service', 'Cookie Policy'],
              },
            ].map((col) => (
              <div key={col.title}>
                <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-black/40 dark:text-white/40">
                  {col.title}
                </p>
                <ul className="space-y-2.5">
                  {col.links.map((link) => (
                    <li key={link}>
                      <a
                        href="#"
                        className="text-sm text-black/60 transition-colors hover:text-black dark:text-white/60 dark:hover:text-white"
                      >
                        {link}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="mt-16 flex flex-col items-center justify-between gap-6 border-t border-black/10 pt-8 dark:border-white/10 sm:flex-row">
            <div className="flex gap-6">
              {['Twitter', 'LinkedIn', 'GitHub'].map((s) => (
                <a
                  key={s}
                  href="#"
                  className="text-sm text-black/40 transition-colors hover:text-black dark:text-white/40 dark:hover:text-white"
                >
                  {s}
                </a>
              ))}
            </div>
            <p className="text-xs text-black/30 dark:text-white/30">
              © 2024 VedaAI. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}