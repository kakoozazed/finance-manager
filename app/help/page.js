'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import {
  Activity,
  ArrowRight,
  Award,
  BarChart3,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  DollarSign,
  FileText,
  Headphones,
  Home,
  Mail,
  MessageCircle,
  Package,
  Phone,
  Search,
  ShieldCheck,
  Truck,
  Users,
  Video,
  Wallet,
  Zap,
  Coffee,
} from 'lucide-react';

const categories = [
  {
    id: 'all',
    title: 'All',
    description: 'Browse every help topic',
    icon: CircleHelp,
    accent: 'emerald',
  },
  {
    id: 'getting-started',
    title: 'Getting Started',
    description: 'Basics of using the system',
    icon: Zap,
    accent: 'blue',
  },
  {
    id: 'store-records',
    title: 'Store Records',
    description: 'Deliveries, lots, and receiving',
    icon: Package,
    accent: 'green',
  },
  {
    id: 'quality',
    title: 'Quality',
    description: 'Assessment, rejection, and approval',
    icon: Award,
    accent: 'violet',
  },
  {
    id: 'finance',
    title: 'Finance',
    description: 'Payments, balances, and recoveries',
    icon: Wallet,
    accent: 'emerald',
  },
  {
    id: 'suppliers',
    title: 'Suppliers',
    description: 'Supplier details and advances',
    icon: Users,
    accent: 'amber',
  },
  {
    id: 'reports',
    title: 'Reports',
    description: 'Exports, summaries, and analytics',
    icon: BarChart3,
    accent: 'rose',
  },
];

const faqs = [
  {
    id: 1,
    category: 'getting-started',
    question: 'How do I start using GreatPearlFinance?',
    answer:
      'Open the dashboard, review the quick summary cards, then use the main modules in this order: Store Records, Quality Assessment, Coffee Payments, Suppliers, and Reports. This keeps lot movement clear from receiving up to payment.',
  },
  {
    id: 2,
    category: 'store-records',
    question: 'How do I record a new coffee delivery?',
    answer:
      'Go to Store Records, click Add Record, choose or search the supplier, enter the lot details, weight, number of bags, and coffee type, then save. The lot can then move to quality for review.',
  },
  {
    id: 3,
    category: 'quality',
    question: 'How does quality assessment affect pricing?',
    answer:
      'After sampling, the system can consider moisture, outturn, defects, and foreign matter. Those values influence whether a lot is approved, rejected, or bought at discretion, and they also affect the final buying price.',
  },
  {
    id: 4,
    category: 'finance',
    question: 'How do I process supplier payments?',
    answer:
      'Open Coffee Payments, filter for ready or unpaid lots, select a lot, confirm the payable amount, enter payment method and date, apply any advance recovery if needed, then save the payment. The system should update the supplier balance and payment status immediately.',
  },
  {
    id: 5,
    category: 'suppliers',
    question: 'How do I track supplier advances?',
    answer:
      'Open the supplier profile or advances page, record the advance amount and note, and the system should keep an outstanding balance. During coffee payment, part or all of the advance can be recovered automatically or manually.',
  },
  {
    id: 6,
    category: 'quality',
    question: 'What happens when a lot is rejected?',
    answer:
      'A rejected lot should keep its rejection reason, remain excluded from normal payment flow, and appear in the rejected lots area for return, review, or admin discretion, depending on your process.',
  },
  {
    id: 7,
    category: 'suppliers',
    question: 'How do I update supplier information?',
    answer:
      'Use the Suppliers page, search for the supplier, open their profile or edit action, update the needed fields such as phone number or code, then save. Related records should still remain attached to the same supplier.',
  },
  {
    id: 8,
    category: 'reports',
    question: 'How do I generate reports?',
    answer:
      'Go to Reports, choose a report type such as supplier balances, payments, coffee lots, or finance summary, set the date range, apply filters, then export to PDF or Excel if that feature is enabled.',
  },
  {
    id: 9,
    category: 'finance',
    question: 'How do payment methods work?',
    answer:
      'The payment section should support cash, mobile money, bank, or cheque where configured. For bank or cheque flows, you can require a transaction reference so the audit trail stays complete.',
  },
];

const tutorials = [
  { title: 'System Overview', duration: '05:23', category: 'getting-started' },
  { title: 'Recording Deliveries', duration: '04:15', category: 'store-records' },
  { title: 'Quality Workflow', duration: '06:42', category: 'quality' },
  { title: 'Supplier Payments', duration: '07:30', category: 'finance' },
  { title: 'Supplier Advances', duration: '03:58', category: 'suppliers' },
  { title: 'Reports and Exports', duration: '05:10', category: 'reports' },
];

const quickLinks = [
  { title: 'Dashboard', href: '/dashboard', icon: Home },
  { title: 'Store Records', href: '/dashboard/store-records', icon: Package },
  { title: 'Quality', href: '/dashboard/quality', icon: Award },
  { title: 'Coffee Payments', href: '/dashboard/coffee-payments', icon: DollarSign },
  { title: 'Suppliers', href: '/dashboard/finance/suppliers', icon: Users },
  { title: 'Reports', href: '/dashboard/reports', icon: BarChart3 },
];

const supportOptions = [
  {
    title: 'Email Support',
    description: 'Reach the support desk by email',
    value: 'support@greatpearlfinance.com',
    href: 'mailto:support@greatpearlfinance.com',
    icon: Mail,
  },
  {
    title: 'Phone Support',
    description: 'Call during working hours',
    value: '+256 781 121 639',
    href: 'tel:+256781121639',
    icon: Phone,
  },
  {
    title: 'Live Help',
    description: 'Chat with the admin or support team',
    value: 'Available during office hours',
    href: '#',
    icon: MessageCircle,
  },
  {
    title: 'Documentation',
    description: 'Open the full user guide',
    value: 'System manual',
    href: '#',
    icon: FileText,
  },
];

function classNames(...classes) {
  return classes.filter(Boolean).join(' ');
}

function accentClasses(accent = 'emerald') {
  const map = {
    emerald: {
      soft: 'bg-emerald-50 border-emerald-200 text-emerald-700',
      icon: 'bg-emerald-100 text-emerald-700',
      chip: 'bg-emerald-600 text-white',
      lightChip: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    },
    blue: {
      soft: 'bg-blue-50 border-blue-200 text-blue-700',
      icon: 'bg-blue-100 text-blue-700',
      chip: 'bg-blue-600 text-white',
      lightChip: 'bg-blue-50 text-blue-700 border border-blue-200',
    },
    green: {
      soft: 'bg-green-50 border-green-200 text-green-700',
      icon: 'bg-green-100 text-green-700',
      chip: 'bg-green-600 text-white',
      lightChip: 'bg-green-50 text-green-700 border border-green-200',
    },
    violet: {
      soft: 'bg-violet-50 border-violet-200 text-violet-700',
      icon: 'bg-violet-100 text-violet-700',
      chip: 'bg-violet-600 text-white',
      lightChip: 'bg-violet-50 text-violet-700 border border-violet-200',
    },
    amber: {
      soft: 'bg-amber-50 border-amber-200 text-amber-700',
      icon: 'bg-amber-100 text-amber-700',
      chip: 'bg-amber-600 text-white',
      lightChip: 'bg-amber-50 text-amber-700 border border-amber-200',
    },
    rose: {
      soft: 'bg-rose-50 border-rose-200 text-rose-700',
      icon: 'bg-rose-100 text-rose-700',
      chip: 'bg-rose-600 text-white',
      lightChip: 'bg-rose-50 text-rose-700 border border-rose-200',
    },
  };

  return map[accent] || map.emerald;
}

function FaqItem({ faq, isOpen, onToggle }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition hover:bg-slate-50"
      >
        <div>
          <p className="text-sm font-semibold text-slate-900">{faq.question}</p>
        </div>
        <div className="shrink-0 text-slate-400">
          {isOpen ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
        </div>
      </button>
      {isOpen && (
        <div className="border-t border-slate-100 px-5 py-4 text-sm leading-6 text-slate-600">
          {faq.answer}
        </div>
      )}
    </div>
  );
}

export default function HelpPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [expandedFaq, setExpandedFaq] = useState(null);

  const filteredFaqs = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    return faqs.filter((faq) => {
      const matchesCategory = activeCategory === 'all' || faq.category === activeCategory;
      const matchesSearch =
        !term ||
        faq.question.toLowerCase().includes(term) ||
        faq.answer.toLowerCase().includes(term);

      return matchesCategory && matchesSearch;
    });
  }, [activeCategory, searchTerm]);

  const activeMeta = categories.find((item) => item.id === activeCategory) || categories[0];
  const currentAccent = accentClasses(activeMeta.accent);

  return (
    <div className="min-h-screen bg-slate-50">
      <section className="relative overflow-hidden bg-gradient-to-r from-emerald-700 via-emerald-600 to-teal-600 text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.18),transparent_25%),radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.14),transparent_22%)]" />
        <div className="relative mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
          <div className="grid gap-8 lg:grid-cols-[1.3fr_0.7fr] lg:items-center">
            <div>
              <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-sm backdrop-blur-sm">
                <Coffee size={15} />
                GreatPearlFinance Help Center
              </div>
              <h1 className="max-w-3xl text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
                Find answers fast and keep operations moving.
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-emerald-50 sm:text-base">
                Get help with store records, quality, supplier advances, payments, and finance reports in one place.
              </p>

              <div className="mt-6 max-w-2xl">
                <div className="relative">
                  <Search size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search questions, guides, or workflows..."
                    className="h-14 w-full rounded-2xl border border-white/20 bg-white pl-11 pr-4 text-sm text-slate-900 shadow-xl outline-none ring-0 placeholder:text-slate-400 focus:border-white focus:ring-2 focus:ring-white/40"
                  />
                </div>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
              <div className="rounded-3xl border border-white/20 bg-white/10 p-5 backdrop-blur-md">
                <div className="flex items-start gap-3">
                  <div className="rounded-2xl bg-white/15 p-3">
                    <Activity size={20} />
                  </div>
                  <div>
                    <p className="text-sm text-emerald-100">System status</p>
                    <p className="mt-1 flex items-center gap-2 text-sm font-semibold">
                      <CheckCircle2 size={16} className="text-emerald-200" />
                      All systems operational
                    </p>
                    <p className="mt-2 text-xs text-emerald-100">Uptime 99.9%</p>
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-white/20 bg-white/10 p-5 backdrop-blur-md">
                <div className="flex items-start gap-3">
                  <div className="rounded-2xl bg-white/15 p-3">
                    <ShieldCheck size={20} />
                  </div>
                  <div>
                    <p className="text-sm text-emerald-100">Best practice</p>
                    <p className="mt-1 text-sm font-semibold">Move each lot in order</p>
                    <p className="mt-2 text-xs text-emerald-100">
                      Receive → Assess → Approve/Reject → Pay → Report
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {supportOptions.map((option) => {
            const Icon = option.icon;
            return (
              <a
                key={option.title}
                href={option.href}
                className="group rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="mb-3 inline-flex rounded-2xl bg-emerald-50 p-3 text-emerald-700">
                      <Icon size={20} />
                    </div>
                    <h2 className="text-base font-semibold text-slate-900">{option.title}</h2>
                    <p className="mt-1 text-sm text-slate-500">{option.description}</p>
                    <p className="mt-3 text-sm font-medium text-emerald-700">{option.value}</p>
                  </div>
                  <ArrowRight size={16} className="mt-1 text-slate-300 transition group-hover:text-emerald-600" />
                </div>
              </a>
            );
          })}
        </section>

        <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center gap-2">
            <Zap size={18} className="text-emerald-600" />
            <h2 className="text-lg font-semibold text-slate-900">Quick links</h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            {quickLinks.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.title}
                  href={item.href}
                  className="group flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700 transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700"
                >
                  <Icon size={16} className="text-slate-400 transition group-hover:text-emerald-600" />
                  <span>{item.title}</span>
                </Link>
              );
            })}
          </div>
        </section>

        <section className="mt-8 grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="space-y-8">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-5 flex items-center gap-2">
                <BookOpen size={18} className="text-emerald-600" />
                <h2 className="text-lg font-semibold text-slate-900">Help categories</h2>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                {categories.map((category) => {
                  const Icon = category.icon;
                  const styles = accentClasses(category.accent);
                  const isActive = activeCategory === category.id;

                  return (
                    <button
                      key={category.id}
                      type="button"
                      onClick={() => setActiveCategory(category.id)}
                      className={classNames(
                        'flex w-full items-start gap-4 rounded-2xl border p-4 text-left transition',
                        isActive
                          ? styles.soft + ' shadow-sm'
                          : 'border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-white'
                      )}
                    >
                      <div className={classNames('rounded-2xl p-3', isActive ? styles.icon : 'bg-white text-slate-600')}>
                        <Icon size={18} />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{category.title}</p>
                        <p className="mt-1 text-xs leading-5 text-slate-500">{category.description}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-5 flex items-center gap-2">
                <Video size={18} className="text-emerald-600" />
                <h2 className="text-lg font-semibold text-slate-900">Video tutorials</h2>
              </div>
              <div className="space-y-3">
                {tutorials.map((tutorial) => (
                  <div
                    key={tutorial.title}
                    className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 px-4 py-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="rounded-2xl bg-slate-100 p-3 text-slate-700">
                        <Video size={16} />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-900">{tutorial.title}</p>
                        <p className="text-xs text-slate-500">{tutorial.duration}</p>
                      </div>
                    </div>
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600">
                      {categories.find((c) => c.id === tutorial.category)?.title}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <CircleHelp size={18} className="text-emerald-600" />
                  <h2 className="text-lg font-semibold text-slate-900">Frequently asked questions</h2>
                </div>
                <p className="mt-1 text-sm text-slate-500">
                  {filteredFaqs.length} result{filteredFaqs.length === 1 ? '' : 's'} found
                </p>
              </div>
              <span className={classNames('inline-flex w-fit rounded-full px-3 py-1 text-xs font-medium', currentAccent.lightChip)}>
                {activeMeta.title}
              </span>
            </div>

            <div className="mb-5 flex flex-wrap gap-2">
              {categories.map((category) => {
                const isActive = activeCategory === category.id;
                const styles = accentClasses(category.accent);
                return (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() => setActiveCategory(category.id)}
                    className={classNames(
                      'rounded-full px-3 py-1.5 text-sm font-medium transition',
                      isActive ? styles.chip : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    )}
                  >
                    {category.title}
                  </button>
                );
              })}
            </div>

            {filteredFaqs.length > 0 ? (
              <div className="space-y-3">
                {filteredFaqs.map((faq) => (
                  <FaqItem
                    key={faq.id}
                    faq={faq}
                    isOpen={expandedFaq === faq.id}
                    onToggle={() => setExpandedFaq((current) => (current === faq.id ? null : faq.id))}
                  />
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
                <Search size={18} className="mx-auto text-slate-400" />
                <p className="mt-3 text-sm font-medium text-slate-700">No matching help items found</p>
                <p className="mt-1 text-sm text-slate-500">Try another keyword or switch to a different category.</p>
              </div>
            )}
          </div>
        </section>

        <section className="mt-8 grid gap-4 lg:grid-cols-3">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 inline-flex rounded-2xl bg-emerald-50 p-3 text-emerald-700">
              <DollarSign size={18} />
            </div>
            <h3 className="text-base font-semibold text-slate-900">Finance workflow</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Track unpaid lots, supplier balances, recoveries, and payment methods with a clearer audit trail.
            </p>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 inline-flex rounded-2xl bg-blue-50 p-3 text-blue-700">
              <Truck size={18} />
            </div>
            <h3 className="text-base font-semibold text-slate-900">Lot movement</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Keep every lot easy to follow from receiving, to quality review, to payment and reporting.
            </p>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 inline-flex rounded-2xl bg-amber-50 p-3 text-amber-700">
              <FileText size={18} />
            </div>
            <h3 className="text-base font-semibold text-slate-900">Reports</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Export payment history, supplier balances, rejected lots, and finance summaries when needed.
            </p>
          </div>
        </section>

        <section className="mt-8 rounded-3xl bg-gradient-to-r from-slate-900 to-slate-800 p-6 text-white shadow-sm">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm text-slate-300">Still need help?</p>
              <h2 className="mt-1 text-2xl font-semibold">Talk to the GreatPearlFinance support team</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
                For payment issues, supplier balance mismatches, or report problems, contact the support team or system admin.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <a
                href="mailto:support@greatpearlfinance.com"
                className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-100"
              >
                <Mail size={16} />
                Email support
              </a>
              <a
                href="tel:+256781121639"
                className="inline-flex items-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/15"
              >
                <Phone size={16} />
                Call support
              </a>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
