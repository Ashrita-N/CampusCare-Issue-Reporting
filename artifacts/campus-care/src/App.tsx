import { type ChangeEvent, type ReactNode, useState } from 'react';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle, ArrowRight, BarChart3, Bell, Building2, Check, CheckCircle2,
  ChevronDown, ClipboardList, Clock3, ImagePlus, LayoutDashboard,
  LifeBuoy, ListFilter, Loader2, MapPin, Menu, Search, ShieldCheck,
  Sparkles, TrendingUp, UserRound, Wrench, X, XCircle
} from 'lucide-react';
import {
  getGetDashboardSummaryQueryKey, getGetIssueHistoryQueryKey,
  getGetIssueQueryKey, getGetIssuesQueryKey,
  getGetNotificationsQueryKey, type Analytics, type CampusLocation, type DashboardSummary,
  type Issue, type IssueAnalysis, type StatusHistory, useAnalyzeIssue, useCreateIssue,
  useGetAnalytics, useGetDashboardSummary, useGetIssue, useGetIssueHistory, useGetIssues,
  useGetLocations, useGetNotifications, useHealthCheck, useMarkNotificationRead, useUpdateIssue
} from '@workspace/api-client-react';
import { Link, Route, Switch, useLocation, useParams, Router as WouterRouter } from 'wouter';
import { ErrorBoundary } from '@/components/error-boundary';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';

const queryClient = new QueryClient();
const navItems = [
  { href: '/dashboard', label: 'Overview', icon: LayoutDashboard },
  { href: '/issues', label: 'My issues', icon: ClipboardList },
  { href: '/report', label: 'Report an issue', icon: Wrench },
];

function formatDate(value?: string | null) {
  if (!value) return 'Not set';
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value));
}
function formatRelative(value?: string | null) {
  if (!value) return 'Recently';
  const hours = Math.floor((Date.now() - new Date(value).getTime()) / 3600000);
  if (hours < 1) return 'Just now';
  if (hours < 24) return `${hours}h ago`;
  if (hours < 48) return 'Yesterday';
  return `${Math.floor(hours / 24)}d ago`;
}
function titleCase(value?: string | null) {
  return (value || 'Unknown').replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}
function statusTone(status?: string | null) {
  if (status === 'resolved') return 'status-resolved';
  if (status === 'in_progress') return 'status-progress';
  if (status === 'reported') return 'status-reported';
  return 'status-muted';
}
function priorityTone(priority?: string | null) {
  if (priority === 'critical') return 'priority-critical';
  if (priority === 'high') return 'priority-high';
  if (priority === 'medium') return 'priority-medium';
  return 'priority-low';
}

function Logo({ light = false }: { light?: boolean }) {
  return (
    <div className={`flex items-center gap-3 ${light ? 'text-primary-foreground' : ''}`}>
      <div className="grid h-9 w-9 place-items-center rounded-xl bg-accent text-accent-foreground shadow-sm">
        <ShieldCheck className="h-5 w-5" strokeWidth={2.5} />
      </div>
      <div className="leading-none">
        <div className="font-display text-[17px] font-bold tracking-tight">CampusCare</div>
        <div className={`mt-1 text-[9px] font-semibold uppercase tracking-[.2em] ${light ? 'text-primary-foreground/50' : 'text-muted-foreground'}`}>campus operations</div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status?: string | null }) {
  return <span className={`status-badge ${statusTone(status)}`}><span className="status-dot" />{titleCase(status)}</span>;
}
function PriorityBadge({ priority }: { priority?: string | null }) {
  return <span className={`priority-badge ${priorityTone(priority)}`}>{titleCase(priority)}</span>;
}

function AppShell({ children }: { children: ReactNode }) {
  const [location, setLocation] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { data: notifications } = useGetNotifications();
  const unread = notifications?.filter((item) => !item.read).length ?? 0;
  const isAdmin = location.startsWith('/admin');
  return (
    <div className="min-h-[100dvh] bg-background">
      <aside className={`fixed inset-y-0 left-0 z-40 flex w-[252px] flex-col bg-sidebar px-5 py-6 text-sidebar-foreground transition-transform duration-300 lg:translate-x-0 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center justify-between"><Logo light /><button type="button" className="text-sidebar-foreground/60 lg:hidden" onClick={() => setMobileOpen(false)} data-testid="button-close-menu"><X className="h-5 w-5" /></button></div>
        <div className="mt-10 px-2 text-[10px] font-bold uppercase tracking-[.2em] text-sidebar-foreground/40">{isAdmin ? 'Command center' : 'Your campus'}</div>
        <nav className="mt-3 space-y-1">
          {(isAdmin ? [
            { href: '/admin', label: 'All issues', icon: ListFilter },
            { href: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
          ] : navItems).map((item, index) => {
            const Icon = item.icon;
            const active = location === item.href || (item.href !== '/dashboard' && location.startsWith(item.href));
            return <Link key={item.href} href={item.href} onClick={() => setMobileOpen(false)} className={`group flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-all ${active ? 'bg-sidebar-accent text-sidebar-accent-foreground shadow-sm' : 'text-sidebar-foreground/65 hover:bg-sidebar-accent/70 hover:text-sidebar-foreground'}`} data-testid={`link-nav-${index}`}>
              <Icon className={`h-[18px] w-[18px] ${active ? 'text-sidebar-primary' : ''}`} />{item.label}
              {item.href === '/issues' && unread > 0 && <span className="ml-auto grid h-5 min-w-5 place-items-center rounded-full bg-accent px-1 text-[10px] font-bold text-accent-foreground">{unread}</span>}
            </Link>;
          })}
        </nav>
        <div className="mt-auto">
          <div className="mb-5 rounded-2xl border border-sidebar-border bg-sidebar-accent/60 p-4">
            <div className="flex items-center gap-2 text-xs font-semibold text-sidebar-foreground"><LifeBuoy className="h-4 w-4 text-sidebar-primary" />Campus response desk</div>
            <p className="mt-2 text-xs leading-relaxed text-sidebar-foreground/55">Urgent safety issue? Campus Security is available 24/7.</p>
            <button type="button" onClick={() => window.alert('Campus Security: 555-0144')} className="mt-3 text-xs font-bold text-sidebar-primary hover:underline" data-testid="button-security-contact">Contact security <ArrowRight className="ml-1 inline h-3 w-3" /></button>
          </div>
          <div className="flex items-center gap-3 border-t border-sidebar-border pt-4">
            <div className="grid h-9 w-9 place-items-center rounded-full bg-sidebar-primary font-bold text-sidebar-primary-foreground">AR</div>
            <div className="min-w-0 flex-1"><div className="truncate text-sm font-semibold">Alex Rivera</div><div className="text-xs text-sidebar-foreground/45">Student · North campus</div></div>
            <button type="button" onClick={() => setLocation('/login')} className="text-sidebar-foreground/45 hover:text-sidebar-foreground" data-testid="button-sign-out"><ChevronDown className="h-4 w-4 rotate-[-90deg]" /></button>
          </div>
        </div>
      </aside>
      {mobileOpen && <button aria-label="Close navigation" type="button" className="fixed inset-0 z-30 bg-primary/20 lg:hidden" onClick={() => setMobileOpen(false)} data-testid="button-overlay-close" />}
      <main className="min-h-[100dvh] lg:pl-[252px]">
        <header className="sticky top-0 z-20 flex h-[72px] items-center justify-between border-b border-border/70 bg-background/90 px-5 backdrop-blur-md sm:px-8">
          <button type="button" className="rounded-lg p-2 text-muted-foreground lg:hidden" onClick={() => setMobileOpen(true)} data-testid="button-open-menu"><Menu className="h-5 w-5" /></button>
          <div className="hidden text-xs font-medium text-muted-foreground sm:block">{isAdmin ? 'CampusCare / Command center' : 'Wednesday, October 16, 2024'}</div>
          <div className="ml-auto flex items-center gap-3">
            <Link href="/issues" className="relative grid h-9 w-9 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground" data-testid="link-notifications"><Bell className="h-[18px] w-[18px]" />{unread > 0 && <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-destructive ring-2 ring-background" />}</Link>
            {isAdmin && <span className="rounded-full border border-accent/40 bg-accent/20 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide text-accent-foreground">Admin view</span>}
          </div>
        </header>
        <div className="mx-auto max-w-[1440px] px-5 py-7 sm:px-8 lg:px-10">{children}</div>
      </main>
    </div>
  );
}

function PageHeading({ eyebrow, title, description, action }: { eyebrow: string; title: string; description?: string; action?: ReactNode }) {
  return <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
    <div><div className="mb-2 text-[10px] font-bold uppercase tracking-[.2em] text-muted-foreground">{eyebrow}</div><h1 className="font-display text-3xl font-bold tracking-[-.04em] text-foreground sm:text-[38px]">{title}</h1>{description && <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{description}</p>}</div>
    {action}
  </div>;
}
function SkeletonBlock({ className = '' }: { className?: string }) { return <div className={`animate-pulse rounded-xl bg-muted ${className}`} />; }
function LoadingState() { return <div className="space-y-4"><SkeletonBlock className="h-32" /><div className="grid gap-4 sm:grid-cols-3"><SkeletonBlock className="h-28" /><SkeletonBlock className="h-28" /><SkeletonBlock className="h-28" /></div><SkeletonBlock className="h-56" /></div>; }
function ErrorState({ onRetry }: { onRetry?: () => void }) { return <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-8 text-center"><XCircle className="mx-auto h-8 w-8 text-destructive" /><h3 className="mt-3 font-display text-lg font-bold">The campus feed is unavailable</h3><p className="mt-1 text-sm text-muted-foreground">We could not load this view. Try again in a moment.</p>{onRetry && <Button onClick={onRetry} variant="outline" className="mt-5" data-testid="button-retry">Try again</Button>}</div>; }

function IssueRow({ issue, admin = false }: { issue: Issue; admin?: boolean }) {
  return <Link href={`/issues/${issue.issueId}`} className="issue-row group block animate-enter" data-testid={`card-issue-${issue.issueId}`}>
    <div className="flex min-w-0 items-start gap-3"><div className={`mt-1 grid h-9 w-9 shrink-0 place-items-center rounded-xl ${issue.priority === 'critical' ? 'bg-destructive/10 text-destructive' : 'bg-secondary text-primary'}`}><Wrench className="h-4 w-4" /></div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><span className="font-mono text-[11px] font-bold text-muted-foreground">{issue.issueId}</span><StatusBadge status={issue.status} />{admin && <PriorityBadge priority={issue.priority} />}</div><h3 className="mt-1 truncate text-sm font-bold text-foreground group-hover:text-primary">{issue.shortDescription || issue.description}</h3><div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground"><span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{issue.locationLabel || `${issue.campus} · ${issue.block}`}</span><span>{formatRelative(issue.updatedAt || issue.createdAt)}</span></div></div><ArrowRight className="mt-3 h-4 w-4 shrink-0 text-muted-foreground/50 transition-transform group-hover:translate-x-1 group-hover:text-primary" /></div>
  </Link>;
}

function EmptyIssues({ mine = true }: { mine?: boolean }) {
  return <div className="rounded-2xl border border-dashed border-border bg-card/50 px-5 py-14 text-center"><div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-secondary text-primary"><ClipboardList className="h-6 w-6" /></div><h3 className="mt-4 font-display text-lg font-bold">{mine ? 'Nothing needs your attention' : 'No issues match these filters'}</h3><p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">{mine ? 'When you report a campus issue, updates and next steps will appear here.' : 'Try broadening your search or clearing one of the filters.'}</p>{mine && <Link href="/report" className="mt-5 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground" data-testid="link-empty-report">Report your first issue <ArrowRight className="h-4 w-4" /></Link>}</div>;
}

function Dashboard() {
  const summary = useGetDashboardSummary();
  const notifications = useGetNotifications();
  if (summary.isLoading) return <LoadingState />;
  if (summary.isError) return <ErrorState onRetry={() => summary.refetch()} />;
  const data = summary.data as DashboardSummary | undefined;
  const recent = data?.recentIssues ?? [];
  return <div>
    <PageHeading eyebrow="Student workspace" title="Good morning, Alex." description="Here’s the current pulse of the issues you’ve raised across campus." action={<Link href="/report" className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground shadow-sm transition-transform hover:-translate-y-0.5" data-testid="link-report-issue"><Wrench className="h-4 w-4" /> Report an issue</Link>} />
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {[{ label: 'Open issues', value: (data?.reported ?? 0) + (data?.inProgress ?? 0), note: 'Awaiting resolution', icon: Clock3, tone: 'text-primary' }, { label: 'In progress', value: data?.inProgress ?? 0, note: 'Being worked on', icon: Wrench, tone: 'text-accent-foreground' }, { label: 'Resolved', value: data?.resolved ?? 0, note: 'Closed this year', icon: CheckCircle2, tone: 'text-[#39745d]' }, { label: 'Notifications', value: data?.unreadNotifications ?? notifications.data?.filter((item) => !item.read).length ?? 0, note: 'Unread updates', icon: Bell, tone: 'text-[#ae5b28]' }].map((stat, index) => { const Icon = stat.icon; return <div key={stat.label} className={`metric-card animate-enter stagger-${index + 1}`} data-testid={`metric-${index}`}><div className={`grid h-9 w-9 place-items-center rounded-xl bg-secondary ${stat.tone}`}><Icon className="h-4 w-4" /></div><div className="mt-5 font-display text-3xl font-bold tracking-tight">{stat.value}</div><div className="mt-1 text-sm font-semibold">{stat.label}</div><div className="mt-1 text-xs text-muted-foreground">{stat.note}</div></div>; })}</div>
    <div className="mt-8 grid gap-6 xl:grid-cols-[1.35fr_.65fr]">
      <section className="panel overflow-hidden"><div className="flex items-center justify-between border-b border-border/70 px-5 py-4"><div><h2 className="font-display text-lg font-bold">Recent issues</h2><p className="mt-1 text-xs text-muted-foreground">Your latest reports and their movement</p></div><Link href="/issues" className="text-xs font-bold text-primary hover:underline" data-testid="link-view-all-issues">View all <ArrowRight className="ml-1 inline h-3 w-3" /></Link></div>{recent.length ? <div>{recent.slice(0, 5).map((issue) => <IssueRow key={issue.issueId} issue={issue} />)}</div> : <div className="p-6"><EmptyIssues /></div>}</section>
      <section className="panel"><div className="flex items-center justify-between border-b border-border/70 px-5 py-4"><div><h2 className="font-display text-lg font-bold">Latest updates</h2><p className="mt-1 text-xs text-muted-foreground">Stay close to what changed</p></div><Bell className="h-4 w-4 text-muted-foreground" /></div><div className="p-5">{notifications.isLoading ? <div className="space-y-3"><SkeletonBlock className="h-12" /><SkeletonBlock className="h-12" /><SkeletonBlock className="h-12" /></div> : notifications.data?.length ? <div className="space-y-4">{notifications.data.slice(0, 4).map((item) => <NotificationItem key={item.id} item={item} />)}</div> : <p className="py-6 text-center text-sm text-muted-foreground">You’re all caught up.</p>}</div></section>
    </div>
    <div className="mt-6 grid gap-6 lg:grid-cols-[.8fr_1.2fr]"><section className="relative overflow-hidden rounded-2xl bg-primary p-6 text-primary-foreground"><div className="absolute -right-10 -top-12 h-40 w-40 rounded-full border-[18px] border-accent/20" /><div className="relative"><div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.15em] text-accent"><Sparkles className="h-4 w-4" /> Good to know</div><h2 className="mt-4 max-w-md font-display text-2xl font-bold leading-tight">Clear reports help campus teams move faster.</h2><p className="mt-3 max-w-md text-sm leading-relaxed text-primary-foreground/65">Add a precise location and a photo when you can. They help the right team arrive prepared.</p></div></section><section className="panel p-6"><div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.15em] text-muted-foreground"><MapPin className="h-4 w-4 text-primary" /> Campus response</div><div className="mt-5 flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div><div className="font-display text-2xl font-bold">North campus</div><p className="mt-1 text-sm text-muted-foreground">Operations are running normally today.</p></div><div className="flex items-center gap-3"><div className="h-2 w-28 overflow-hidden rounded-full bg-secondary"><div className="h-full w-[82%] rounded-full bg-[#39745d]" /></div><span className="text-xs font-bold text-[#39745d]">82% resolved</span></div></div></section></div>
  </div>;
}

function NotificationItem({ item }: { item: { id: number; issueId?: string | null; message: string; read: boolean; createdAt: string } }) {
  const qc = useQueryClient();
  const mark = useMarkNotificationRead();
  const handleRead = () => { if (!item.read) mark.mutate({ notificationId: item.id }, { onSuccess: () => qc.invalidateQueries({ queryKey: getGetNotificationsQueryKey() }) }); };
  return <button type="button" onClick={handleRead} className={`flex w-full items-start gap-3 text-left ${item.read ? 'opacity-60' : ''}`} data-testid={`button-notification-${item.id}`}><span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${item.read ? 'bg-border' : 'bg-accent'}`} /><span className="min-w-0 flex-1"><span className="block text-sm leading-snug">{item.message}</span><span className="mt-1 block text-[11px] text-muted-foreground">{formatRelative(item.createdAt)}</span></span></button>;
}

function IssuesPage({ admin = false }: { admin?: boolean; params?: Record<string, string | undefined> } = {}) {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [priority, setPriority] = useState('');
  const [sort, setSort] = useState<'newest' | 'oldest' | 'highest_priority' | 'recently_updated'>('newest');
  const params = admin ? { search, status: status || undefined, priority: priority || undefined, sort } : { mine: true, search, status: status || undefined, sort };
  const issues = useGetIssues(params);
  return <div>
    <PageHeading eyebrow={admin ? 'Operations queue' : 'Personal workspace'} title={admin ? 'All campus issues' : 'My issues'} description={admin ? 'Triage, assign, and move every open issue toward a clear resolution.' : 'Every report you submit, with the latest status and response in one place.'} action={!admin && <Link href="/report" className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground" data-testid="link-new-issue"><Wrench className="h-4 w-4" /> New report</Link>} />
    {admin && <div className="mb-6 grid gap-3 sm:grid-cols-3"><div className="admin-callout bg-primary text-primary-foreground"><div className="text-xs uppercase tracking-widest text-primary-foreground/60">Needs attention</div><div className="mt-2 font-display text-3xl font-bold">{issues.data?.filter((issue) => issue.status !== 'resolved').length ?? '—'}</div><div className="mt-1 text-xs text-primary-foreground/60">active issues in queue</div></div><div className="admin-callout"><div className="text-xs uppercase tracking-widest text-muted-foreground">Critical reports</div><div className="mt-2 font-display text-3xl font-bold text-destructive">{issues.data?.filter((issue) => issue.priority === 'critical').length ?? '—'}</div><div className="mt-1 text-xs text-muted-foreground">require fast action</div></div><Link href="/admin/analytics" className="admin-callout transition-transform hover:-translate-y-0.5" data-testid="link-admin-analytics"><div className="flex items-center justify-between"><div className="text-xs uppercase tracking-widest text-muted-foreground">Campus insights</div><TrendingUp className="h-4 w-4 text-primary" /></div><div className="mt-3 font-display text-xl font-bold">See the patterns</div><div className="mt-1 text-xs text-muted-foreground">Open analytics <ArrowRight className="ml-1 inline h-3 w-3" /></div></Link></div>}
    <div className="panel mb-5 p-3"><div className="flex flex-col gap-3 lg:flex-row"><div className="relative flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by issue, location, or ID" className="h-10 border-0 bg-muted/70 pl-9 shadow-none" data-testid="input-search-issues" /></div><div className="flex flex-wrap gap-2"><select value={status} onChange={(event) => setStatus(event.target.value)} className="h-10 rounded-md border border-input bg-card px-3 text-sm" data-testid="select-status-filter"><option value="">All statuses</option><option value="reported">Reported</option><option value="in_progress">In progress</option><option value="resolved">Resolved</option></select>{admin && <select value={priority} onChange={(event) => setPriority(event.target.value)} className="h-10 rounded-md border border-input bg-card px-3 text-sm" data-testid="select-priority-filter"><option value="">All priorities</option><option value="critical">Critical</option><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option></select>}<select value={sort} onChange={(event) => setSort(event.target.value as 'newest' | 'oldest' | 'highest_priority' | 'recently_updated')} className="h-10 rounded-md border border-input bg-card px-3 text-sm" data-testid="select-sort-issues"><option value="newest">Newest first</option><option value="oldest">Oldest first</option><option value="highest_priority">Priority first</option><option value="recently_updated">Recently updated</option></select></div></div></div>
    {issues.isLoading ? <LoadingState /> : issues.isError ? <ErrorState onRetry={() => issues.refetch()} /> : issues.data?.length ? <div className="panel overflow-hidden">{issues.data.map((issue) => admin ? <AdminIssueRow key={issue.issueId} issue={issue} /> : <IssueRow key={issue.issueId} issue={issue} />)}</div> : <EmptyIssues mine={!admin} />}
  </div>;
}

function AdminIssueRow({ issue }: { issue: Issue }) {
  const update = useUpdateIssue();
  const qc = useQueryClient();
  const [status, setStatus] = useState(issue.status);
  const saveStatus = (value: string) => {
    setStatus(value);
    update.mutate({ issueId: issue.issueId, data: { status: value, note: `Status changed to ${titleCase(value)} by operations.` } }, {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getGetIssuesQueryKey() });
        qc.invalidateQueries({ queryKey: getGetIssueQueryKey(issue.issueId) });
        qc.invalidateQueries({ queryKey: getGetIssueHistoryQueryKey(issue.issueId) });
      },
    });
  };
  return <div className="issue-row group flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between" data-testid={`row-admin-issue-${issue.issueId}`}>
    <Link href={`/issues/${issue.issueId}`} className="flex min-w-0 flex-1 items-start gap-3" data-testid={`link-admin-issue-${issue.issueId}`}><div className={`mt-1 grid h-9 w-9 shrink-0 place-items-center rounded-xl ${issue.priority === 'critical' ? 'bg-destructive/10 text-destructive' : 'bg-secondary text-primary'}`}><Wrench className="h-4 w-4" /></div><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="font-mono text-[11px] font-bold text-muted-foreground">{issue.issueId}</span><StatusBadge status={status} /><PriorityBadge priority={issue.priority} /></div><h3 className="mt-1 truncate text-sm font-bold">{issue.shortDescription || issue.description}</h3><div className="mt-1 flex flex-wrap gap-x-3 text-xs text-muted-foreground"><span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{issue.locationLabel || `${issue.campus} · ${issue.block}`}</span><span>{issue.assignedDepartment || 'Unassigned'}</span></div></div></Link>
    <div className="flex items-center gap-2 pl-12 lg:pl-0"><select value={status} onChange={(event) => saveStatus(event.target.value)} disabled={update.isPending} className="h-9 rounded-md border border-input bg-card px-2 text-xs font-semibold" data-testid={`select-admin-status-${issue.issueId}`}><option value="reported">Reported</option><option value="in_progress">In progress</option><option value="resolved">Resolved</option></select><Link href={`/issues/${issue.issueId}`} className="grid h-9 w-9 place-items-center rounded-md border border-border text-muted-foreground hover:bg-muted hover:text-foreground" data-testid={`link-admin-detail-${issue.issueId}`}><ArrowRight className="h-4 w-4" /></Link></div>
  </div>;
}

function ReportPage() {
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [campus, setCampus] = useState('');
  const [block, setBlock] = useState('');
  const [floor, setFloor] = useState('');
  const [room, setRoom] = useState('');
  const [customLocation, setCustomLocation] = useState('');
  const [preview, setPreview] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<IssueAnalysis | null>(null);
  const [similar, setSimilar] = useState<Issue[]>([]);
  const [, setLocation] = useLocation();
  const locations = useGetLocations();
  const analyze = useAnalyzeIssue();
  const create = useCreateIssue();
  const qc = useQueryClient();
  const selectedCampus = locations.data?.find((item: CampusLocation) => item.campus === campus);
  const selectedBlock = selectedCampus?.blocks.find((item) => item.name === block);
  const handleAnalyze = () => { if (description.trim().length < 12) return; analyze.mutate({ data: { description } }, { onSuccess: (result) => { setAnalysis(result); setCategory(result.category); } }); };
  const handleFile = (event: ChangeEvent<HTMLInputElement>) => { const file = event.target.files?.[0]; if (file) setPreview(URL.createObjectURL(file)); };
  const handleSubmit = () => {
    if (description.trim().length < 12 || !campus || !block) return;
    create.mutate({ data: { description, category: category || analysis?.category || 'other', campus, block, floor, room, customLocation: customLocation || null, imageUrl: preview, reportedBy: 'Alex Rivera' } }, {
      onSuccess: (result) => { setSimilar(result.similarIssues || []); qc.invalidateQueries({ queryKey: getGetIssuesQueryKey() }); qc.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() }); if (!(result.similarIssues?.length)) setLocation(`/issues/${result.issue.issueId}`); }
    });
  };
  return <div className="max-w-5xl">
    <PageHeading eyebrow="New report" title="Make campus better." description="Tell us what’s happening. We’ll route it to the right team and keep you posted." />
    <div className="grid gap-6 lg:grid-cols-[1fr_330px]">
      <section className="panel p-5 sm:p-7"><div className="flex items-center gap-3 border-b border-border/70 pb-5"><div className="grid h-9 w-9 place-items-center rounded-xl bg-accent text-accent-foreground"><Wrench className="h-4 w-4" /></div><div><h2 className="font-display text-lg font-bold">Describe the issue</h2><p className="text-xs text-muted-foreground">Be specific enough for someone to find it.</p></div></div><label className="mt-6 block text-sm font-bold" htmlFor="issue-description">What needs attention?</label><Textarea id="issue-description" value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Example: The south entrance card reader is not accepting student IDs..." className="mt-2 min-h-32 resize-none bg-muted/40" data-testid="textarea-issue-description" /><div className="mt-2 flex items-center justify-between text-xs text-muted-foreground"><span>{description.length < 12 ? 'At least 12 characters' : 'Good detail helps us route this correctly.'}</span><span>{description.length}/500</span></div><div className="mt-5 rounded-xl border border-accent/30 bg-accent/10 p-4"><div className="flex items-center justify-between"><div className="flex items-center gap-2 text-sm font-bold"><Sparkles className="h-4 w-4 text-accent-foreground" /> AI triage assistant</div>{analysis && <span className="text-xs font-bold text-[#39745d]"><Check className="mr-1 inline h-3 w-3" /> Analyzed</span>}</div><p className="mt-1 text-xs leading-relaxed text-muted-foreground">We’ll suggest a category and urgency. You stay in control before submitting.</p>{analysis ? <div className="mt-4 grid gap-2 sm:grid-cols-3"><div className="rounded-lg bg-card p-3"><div className="text-[10px] uppercase tracking-wider text-muted-foreground">Category</div><div className="mt-1 text-sm font-bold">{titleCase(analysis.category)}</div></div><div className="rounded-lg bg-card p-3"><div className="text-[10px] uppercase tracking-wider text-muted-foreground">Priority</div><div className="mt-1 text-sm font-bold">{titleCase(analysis.priority)}</div></div><div className="rounded-lg bg-card p-3"><div className="text-[10px] uppercase tracking-wider text-muted-foreground">Confidence</div><div className="mt-1 text-sm font-bold">{Math.round(analysis.confidence * 100)}%</div></div><p className="sm:col-span-3 text-xs text-muted-foreground">{analysis.priorityReason}</p></div> : <Button type="button" onClick={handleAnalyze} disabled={description.trim().length < 12 || analyze.isPending} variant="outline" className="mt-4 border-accent/50 bg-card" data-testid="button-analyze-issue">{analyze.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} Analyze my report</Button>}</div>
      <div className="mt-6"><label className="block text-sm font-bold" htmlFor="issue-category">Category</label><select id="issue-category" value={category} onChange={(event) => setCategory(event.target.value)} className="mt-2 h-10 w-full rounded-md border border-input bg-muted/40 px-3 text-sm" data-testid="select-issue-category"><option value="">Select a category</option><option value="facilities">Facilities</option><option value="technology">Technology</option><option value="safety">Safety</option><option value="cleanliness">Cleanliness</option><option value="accessibility">Accessibility</option><option value="other">Other</option></select></div>
      <div className="mt-6"><div className="flex items-center justify-between"><label className="block text-sm font-bold">Add a photo <span className="font-normal text-muted-foreground">(optional)</span></label>{preview && <button type="button" className="text-xs font-bold text-destructive" onClick={() => setPreview(null)} data-testid="button-remove-photo">Remove</button>}</div><label className="mt-2 flex min-h-28 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-input bg-muted/30 transition-colors hover:border-primary hover:bg-muted/60">{preview ? <img src={preview} alt="Issue preview" className="max-h-36 rounded-lg object-cover" data-testid="img-issue-preview" /> : <><ImagePlus className="h-5 w-5 text-muted-foreground" /><span className="mt-2 text-xs font-semibold text-muted-foreground">Choose an image from your device</span></>}<input type="file" accept="image/*" className="hidden" onChange={handleFile} data-testid="input-issue-image" /></label></div></section>
      <aside className="space-y-6"><section className="panel p-5"><div className="flex items-center gap-2 text-sm font-bold"><MapPin className="h-4 w-4 text-primary" /> Where is it?</div><p className="mt-1 text-xs text-muted-foreground">A precise location gets the right person there first time.</p><div className="mt-5 space-y-3"><FieldSelect label="Campus" value={campus} onChange={(value) => { setCampus(value); setBlock(''); }} options={locations.data?.map((item: CampusLocation) => item.campus) || ['North campus', 'South campus']} testId="select-campus" /><FieldSelect label="Block / building" value={block} onChange={setBlock} options={selectedCampus?.blocks.map((item) => item.name) || []} testId="select-block" disabled={!campus} /><FieldSelect label="Floor" value={floor} onChange={setFloor} options={selectedBlock?.floors || ['Ground', '1', '2', '3']} testId="select-floor" /><input value={room} onChange={(event) => setRoom(event.target.value)} placeholder="Room or area (optional)" className="h-10 w-full rounded-md border border-input bg-muted/40 px-3 text-sm" data-testid="input-room" /><input value={customLocation} onChange={(event) => setCustomLocation(event.target.value)} placeholder="Landmark or extra detail" className="h-10 w-full rounded-md border border-input bg-muted/40 px-3 text-sm" data-testid="input-custom-location" /></div></section><section className="rounded-2xl border border-border bg-secondary/60 p-5"><div className="flex items-center gap-2 text-sm font-bold"><ShieldCheck className="h-4 w-4 text-primary" /> Before you send</div><ul className="mt-3 space-y-2 text-xs leading-relaxed text-muted-foreground"><li className="flex gap-2"><Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#39745d]" /> No personal information needed.</li><li className="flex gap-2"><Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#39745d]" /> You’ll receive updates as it moves.</li><li className="flex gap-2"><Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#39745d]" /> Duplicate reports are safely linked.</li></ul></section><Button onClick={handleSubmit} disabled={create.isPending || description.trim().length < 12 || !campus || !block} className="h-12 w-full text-sm font-bold" data-testid="button-submit-issue">{create.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />} Submit report</Button></aside>
    </div>
    {similar.length > 0 && <div className="mt-6 rounded-2xl border border-[#dca96c] bg-[#fff5e5] p-5"><div className="flex gap-3"><AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-[#ae5b28]" /><div><h3 className="font-display font-bold text-[#6f3f1e]">This may already be on the radar</h3><p className="mt-1 text-sm text-[#8d5f3c]">We found {similar.length} similar {similar.length === 1 ? 'report' : 'reports'}. Review them before creating a new one.</p><div className="mt-3 space-y-2">{similar.map((issue) => <Link href={`/issues/${issue.issueId}`} key={issue.issueId} className="flex items-center justify-between rounded-lg bg-card/70 px-3 py-2 text-sm hover:bg-card" data-testid={`link-similar-${issue.issueId}`}><span className="font-semibold">{issue.shortDescription}</span><ArrowRight className="h-4 w-4" /></Link>)}</div><button type="button" className="mt-4 text-xs font-bold text-[#6f3f1e] underline" onClick={() => setSimilar([])} data-testid="button-dismiss-duplicate">I still need to report this</button></div></div></div>}
  </div>;
}

function FieldSelect({ label, value, onChange, options, testId, disabled = false }: { label: string; value: string; onChange: (value: string) => void; options: string[]; testId: string; disabled?: boolean }) {
  return <label className="block"><span className="mb-1.5 block text-xs font-bold text-muted-foreground">{label}</span><select value={value} onChange={(event) => onChange(event.target.value)} disabled={disabled} className="h-10 w-full rounded-md border border-input bg-muted/40 px-3 text-sm disabled:cursor-not-allowed disabled:opacity-50" data-testid={testId}><option value="">Choose {label.toLowerCase()}</option>{options.map((option) => <option key={option} value={option}>{option}</option>)}</select></label>;
}

function IssueDetail() {
  const { issueId = '' } = useParams<{ issueId: string }>();
  const issue = useGetIssue(issueId, { query: { queryKey: getGetIssueQueryKey(issueId), enabled: Boolean(issueId) } });
  const history = useGetIssueHistory(issueId, { query: { queryKey: getGetIssueHistoryQueryKey(issueId), enabled: Boolean(issueId) } });
  const [, setLocation] = useLocation();
  if (issue.isLoading) return <LoadingState />;
  if (issue.isError || !issue.data) return <ErrorState onRetry={() => issue.refetch()} />;
  const data = issue.data;
  const events = history.data || [];
  return <div className="max-w-5xl"><button type="button" className="mb-5 inline-flex items-center gap-2 text-sm font-bold text-muted-foreground hover:text-foreground" onClick={() => setLocation('/issues')} data-testid="button-back-issues">← Back to issues</button><div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-start"><div><div className="flex flex-wrap items-center gap-2"><span className="font-mono text-xs font-bold text-muted-foreground">{data.issueId}</span><StatusBadge status={data.status} /><PriorityBadge priority={data.priority} /></div><h1 className="mt-3 max-w-3xl font-display text-3xl font-bold tracking-[-.04em] sm:text-[42px]">{data.shortDescription || data.description}</h1><p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">{data.description}</p></div><div className="flex shrink-0 items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-xs text-muted-foreground"><Clock3 className="h-4 w-4" /> Reported {formatDate(data.createdAt)}</div></div><div className="mt-8 grid gap-6 lg:grid-cols-[1.1fr_.9fr]"><section className="panel p-5 sm:p-7"><div className="flex items-center justify-between"><h2 className="font-display text-lg font-bold">Resolution timeline</h2><span className="text-xs text-muted-foreground">{events.length} updates</span></div>{history.isLoading ? <div className="mt-7 space-y-5"><SkeletonBlock className="h-12" /><SkeletonBlock className="h-12" /><SkeletonBlock className="h-12" /></div> : <div className="relative mt-7 space-y-7 pl-8 before:absolute before:bottom-2 before:left-[9px] before:top-2 before:w-px before:bg-border">{events.map((event, index) => <TimelineEvent key={event.id} event={event} first={index === events.length - 1} />)}{!events.length && <p className="text-sm text-muted-foreground">Your report is logged. Status updates will appear here.</p>}</div>}</section><aside className="space-y-6"><section className="panel overflow-hidden">{data.imageUrl && <img src={data.imageUrl} alt="Issue evidence" className="h-48 w-full object-cover" data-testid="img-detail-evidence" />}<div className="p-5"><div className="flex items-center gap-2 text-sm font-bold"><MapPin className="h-4 w-4 text-primary" /> Location</div><div className="mt-3 font-semibold">{data.locationLabel || `${data.campus} · ${data.block}`}</div><div className="mt-1 text-sm text-muted-foreground">{[data.floor && `Floor ${data.floor}`, data.room && `Room ${data.room}`].filter(Boolean).join(' · ') || 'Exact room not specified'}</div></div></section><section className="panel p-5"><div className="text-xs font-bold uppercase tracking-[.15em] text-muted-foreground">Assigned team</div><div className="mt-3 flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl bg-secondary text-primary"><Building2 className="h-5 w-5" /></div><div><div className="text-sm font-bold">{data.assignedDepartment || 'Campus operations'}</div><div className="text-xs text-muted-foreground">They’ll update this report directly</div></div></div>{data.resolutionNotes && <div className="mt-5 border-t border-border pt-4"><div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Resolution notes</div><p className="mt-2 text-sm leading-relaxed">{data.resolutionNotes}</p></div>}</section></aside></div></div>;
}
function TimelineEvent({ event, first }: { event: StatusHistory; first: boolean }) {
  return <div className="relative"><div className={`absolute -left-8 top-0 grid h-5 w-5 place-items-center rounded-full border-4 border-card ${first ? 'bg-accent text-accent-foreground' : 'bg-primary text-primary-foreground'}`}>{first ? <Check className="h-2.5 w-2.5" /> : <span className="h-1.5 w-1.5 rounded-full bg-current" />}</div><div className="flex flex-col justify-between gap-1 sm:flex-row"><div><div className="text-sm font-bold">{titleCase(event.newStatus)}</div><p className="mt-1 text-xs text-muted-foreground">{event.note || `Updated by ${event.changedBy}`}</p></div><time className="text-[11px] text-muted-foreground">{formatDate(event.timestamp)}</time></div></div>;
}

function AnalyticsPage() {
  const analytics = useGetAnalytics();
  if (analytics.isLoading) return <LoadingState />;
  if (analytics.isError || !analytics.data) return <ErrorState onRetry={() => analytics.refetch()} />;
  const data = analytics.data as Analytics;
  const maxStatus = Math.max(...(data.byStatus || []).map((item) => item.value), 1);
  const maxCategory = Math.max(...(data.byCategory || []).map((item) => item.value), 1);
  return <div><PageHeading eyebrow="Command center" title="Campus insights" description="A live read on where care is needed, what’s moving, and how quickly teams are responding." action={<div className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-xs font-semibold text-muted-foreground"><TrendingUp className="h-4 w-4 text-[#39745d]" /> Live campus data</div>} /><div className="grid gap-6 xl:grid-cols-[1.2fr_.8fr]"><section className="panel p-5 sm:p-7"><div className="flex items-center justify-between"><div><h2 className="font-display text-lg font-bold">Resolution trend</h2><p className="mt-1 text-xs text-muted-foreground">Issues resolved over the last reporting period</p></div><span className="rounded-full bg-secondary px-2.5 py-1 text-[11px] font-bold text-primary">Last 7 periods</span></div><div className="mt-8 flex h-48 items-end gap-2 sm:gap-5">{(data.resolutionTrend || []).map((point) => <div key={point.label} className="flex h-full flex-1 flex-col items-center justify-end gap-2"><div className="w-full max-w-12 rounded-t-md bg-primary transition-all hover:bg-accent" style={{ height: `${Math.max(8, (point.value / Math.max(...(data.resolutionTrend || []).map((item) => item.value), 1)) * 100)}%` }} title={`${point.value} resolved`} /><span className="text-[10px] text-muted-foreground">{point.label}</span></div>)}</div></section><section className="panel p-5 sm:p-7"><div className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-accent-foreground" /><h2 className="font-display text-lg font-bold">What stands out</h2></div><div className="mt-5 space-y-4">{(data.insights || []).slice(0, 4).map((insight, index) => <div key={insight} className="flex gap-3 border-b border-border/70 pb-4 last:border-0 last:pb-0"><span className="font-mono text-xs font-bold text-accent-foreground">0{index + 1}</span><p className="text-sm leading-relaxed">{insight}</p></div>)}</div></section></div><div className="mt-6 grid gap-6 lg:grid-cols-2"><MetricBars title="Issues by status" items={data.byStatus || []} max={maxStatus} colors={['bg-primary', 'bg-accent', 'bg-[#39745d]', 'bg-[#ae5b28]']} /><MetricBars title="Issues by category" items={data.byCategory || []} max={maxCategory} colors={['bg-primary', 'bg-[#39745d]', 'bg-accent', 'bg-[#ae5b28]', 'bg-[#8c6f99]']} /></div></div>;
}
function MetricBars({ title, items, max, colors }: { title: string; items: { label: string; value: number }[]; max: number; colors: string[] }) {
  return <section className="panel p-5 sm:p-7"><div className="flex items-center justify-between"><h2 className="font-display text-lg font-bold">{title}</h2><BarChart3 className="h-4 w-4 text-muted-foreground" /></div><div className="mt-6 space-y-4">{items.slice(0, 6).map((item, index) => <div key={item.label}><div className="mb-1.5 flex justify-between text-xs"><span className="font-semibold">{titleCase(item.label)}</span><span className="font-mono text-muted-foreground">{item.value}</span></div><div className="h-2 overflow-hidden rounded-full bg-secondary"><div className={`h-full rounded-full ${colors[index % colors.length]}`} style={{ width: `${Math.max(4, (item.value / max) * 100)}%` }} /></div></div>)}</div></section>;
}

function Login() {
  const [, setLocation] = useLocation();
  const [role, setRole] = useState<'student' | 'admin'>('student');
  return <div className="grid min-h-[100dvh] lg:grid-cols-[.9fr_1.1fr]"><section className="relative hidden overflow-hidden bg-primary p-12 text-primary-foreground lg:flex lg:flex-col lg:justify-between"><div className="absolute bottom-[-15%] right-[-10%] h-[520px] w-[520px] rounded-full border-[70px] border-accent/15" /><div><Logo light /><div className="mt-24 max-w-md"><div className="mb-5 flex items-center gap-2 text-xs font-bold uppercase tracking-[.2em] text-accent"><ShieldCheck className="h-4 w-4" /> Trusted campus operations</div><h1 className="font-display text-5xl font-bold leading-[1.04] tracking-[-.06em]">Small reports.<br /><span className="text-accent">Visible progress.</span></h1><p className="mt-6 max-w-sm text-base leading-relaxed text-primary-foreground/65">CampusCare gives every campus community member a clear line from “something’s wrong” to “it’s fixed.”</p></div></div><div className="text-xs text-primary-foreground/45">A calmer, more accountable campus — one report at a time.</div></section><section className="flex items-center justify-center bg-background px-5 py-10 sm:px-10"><div className="w-full max-w-[410px]"><div className="mb-10 lg:hidden"><Logo /></div><div className="mb-8"><div className="text-[10px] font-bold uppercase tracking-[.2em] text-muted-foreground">Welcome back</div><h2 className="mt-2 font-display text-3xl font-bold tracking-[-.04em]">Sign in to CampusCare</h2><p className="mt-2 text-sm text-muted-foreground">Use the demo access below to explore the experience.</p></div><div className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6"><div className="text-sm font-bold">I’m signing in as...</div><div className="mt-3 grid grid-cols-2 gap-2"><button type="button" onClick={() => setRole('student')} className={`rounded-xl border px-3 py-3 text-left text-sm transition-colors ${role === 'student' ? 'border-primary bg-secondary font-bold' : 'border-border hover:bg-muted'}`} data-testid="button-role-student"><UserRound className="mb-2 h-4 w-4 text-primary" />Student / staff</button><button type="button" onClick={() => setRole('admin')} className={`rounded-xl border px-3 py-3 text-left text-sm transition-colors ${role === 'admin' ? 'border-primary bg-secondary font-bold' : 'border-border hover:bg-muted'}`} data-testid="button-role-admin"><ShieldCheck className="mb-2 h-4 w-4 text-primary" />Administrator</button></div><label className="mt-5 block text-sm font-bold" htmlFor="login-email">Campus email</label><Input id="login-email" defaultValue={role === 'admin' ? 'ops@campus.edu' : 'alex.rivera@campus.edu'} className="mt-2 bg-muted/40" data-testid="input-login-email" /><Button onClick={() => setLocation(role === 'admin' ? '/admin' : '/dashboard')} className="mt-5 h-11 w-full font-bold" data-testid="button-demo-sign-in">Continue to CampusCare <ArrowRight className="h-4 w-4" /></Button><p className="mt-4 text-center text-[11px] leading-relaxed text-muted-foreground">Demo mode — no password required.<br />Your role changes the workspace you see.</p></div><Link href="/" className="mt-6 block text-center text-sm font-semibold text-muted-foreground hover:text-foreground" data-testid="link-back-home">← Back to campuscare.app</Link></div></section></div>;
}

function Landing() {
  const health = useHealthCheck();
  const serviceOnline = !health.isError;
  return <div className="min-h-[100dvh] bg-background"><header className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 sm:px-8"><Logo /><div className="hidden items-center gap-7 text-sm font-semibold text-muted-foreground md:flex"><a href="#how-it-works" className="hover:text-foreground">How it works</a><a href="#trust" className="hover:text-foreground">Built for campus</a><Link href="/login" className="rounded-lg border border-border bg-card px-4 py-2.5 text-foreground" data-testid="link-landing-sign-in">Sign in</Link></div><Link href="/login" className="text-sm font-bold text-primary md:hidden" data-testid="link-mobile-sign-in">Sign in</Link></header><main><section className="relative mx-auto grid max-w-7xl gap-10 px-5 pb-20 pt-16 sm:px-8 sm:pt-24 lg:grid-cols-[1.05fr_.95fr] lg:items-center lg:pb-28"><div className="absolute left-[-10%] top-[-8%] h-72 w-72 rounded-full bg-accent/15 blur-3xl" /><div className="relative animate-enter"><div className={`mb-6 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.22em] ${serviceOnline ? 'text-[#39745d]' : 'text-destructive'}`}><span className={`h-2 w-2 rounded-full ${serviceOnline ? 'bg-[#39745d]' : 'bg-destructive'}`} /> Campus is in session · response desk {serviceOnline ? 'online' : 'checking in'}</div><h1 className="max-w-2xl font-display text-[clamp(3.1rem,7vw,6.8rem)] font-bold leading-[.94] tracking-[-.08em]">Make your<br /><span className="text-primary">campus count.</span></h1><p className="mt-7 max-w-lg text-lg leading-relaxed text-muted-foreground">CampusCare turns everyday campus problems into clear action — and keeps everyone in the loop until they’re resolved.</p><div className="mt-9 flex flex-col gap-3 sm:flex-row"><Link href="/report" className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-5 py-3.5 text-sm font-bold text-primary-foreground shadow-md transition-transform hover:-translate-y-0.5" data-testid="link-landing-report">Report an issue <ArrowRight className="h-4 w-4" /></Link><Link href="/login" className="inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-card px-5 py-3.5 text-sm font-bold transition-colors hover:bg-secondary" data-testid="link-landing-track">Track an issue <Search className="h-4 w-4" /></Link></div><div className="mt-9 flex items-center gap-3 text-xs text-muted-foreground"><div className="flex -space-x-2"><div className="grid h-7 w-7 place-items-center rounded-full border-2 border-background bg-[#e7bd83] text-[10px] font-bold">JM</div><div className="grid h-7 w-7 place-items-center rounded-full border-2 border-background bg-[#9bc4b2] text-[10px] font-bold">SK</div><div className="grid h-7 w-7 place-items-center rounded-full border-2 border-background bg-[#c7b3d0] text-[10px] font-bold">AR</div></div><span><strong className="text-foreground">2,840</strong> campus community members connected</span></div></div><div className="relative animate-enter stagger-2"><div className="rounded-[28px] border border-primary/20 bg-primary p-4 shadow-xl sm:p-6"><div className="flex items-center justify-between border-b border-primary-foreground/15 pb-4 text-primary-foreground"><div className="flex items-center gap-2 text-sm font-bold"><ShieldCheck className="h-4 w-4 text-accent" /> CampusCare overview</div><span className="rounded-full bg-accent/20 px-2 py-1 text-[10px] font-bold text-accent">LIVE</span></div><div className="mt-5 rounded-2xl bg-primary-foreground/10 p-4"><div className="flex items-center justify-between text-xs text-primary-foreground/60"><span>ISSUE CC-1048</span><span>Updated 12m ago</span></div><div className="mt-4 text-lg font-bold text-primary-foreground">Library south entrance card reader</div><div className="mt-2 flex items-center gap-2 text-xs text-primary-foreground/60"><MapPin className="h-3 w-3" /> South campus · Library</div><div className="mt-5 flex items-center justify-between"><span className="status-badge status-progress">In progress</span><span className="text-xs text-primary-foreground/50">Facilities team assigned</span></div></div><div className="mt-4 grid grid-cols-3 gap-2"><div className="rounded-xl bg-primary-foreground/10 p-3"><div className="font-display text-2xl font-bold text-primary-foreground">47</div><div className="mt-1 text-[10px] text-primary-foreground/50">Open reports</div></div><div className="rounded-xl bg-accent p-3 text-accent-foreground"><div className="font-display text-2xl font-bold">82%</div><div className="mt-1 text-[10px] opacity-70">Resolved this term</div></div><div className="rounded-xl bg-primary-foreground/10 p-3"><div className="font-display text-2xl font-bold text-primary-foreground">1.8d</div><div className="mt-1 text-[10px] text-primary-foreground/50">Avg response</div></div></div></div><div className="absolute -bottom-5 -left-5 rounded-xl border border-border bg-card p-3 shadow-lg sm:-left-8"><div className="flex items-center gap-2 text-xs font-bold"><CheckCircle2 className="h-4 w-4 text-[#39745d]" /> Accountability built in</div><div className="mt-1 text-[10px] text-muted-foreground">Every update is visible.</div></div></div></section><section id="how-it-works" className="border-y border-border/70 bg-secondary/40"><div className="mx-auto max-w-7xl px-5 py-20 sm:px-8"><div className="grid gap-10 lg:grid-cols-[.7fr_1.3fr]"><div><div className="text-[10px] font-bold uppercase tracking-[.2em] text-muted-foreground">The simple loop</div><h2 className="mt-3 max-w-sm font-display text-4xl font-bold leading-tight tracking-[-.05em]">From “noticed” to “sorted.”</h2></div><div className="grid gap-6 sm:grid-cols-3">{[{ number: '01', title: 'Spot it', body: 'Capture what’s wrong, where it is, and what it affects.' }, { number: '02', title: 'We route it', body: 'Smart triage gets your report to the right campus team.' }, { number: '03', title: 'See progress', body: 'Follow every status change until the job is done.' }].map((item) => <div key={item.number} className="border-t-2 border-primary pt-4"><div className="font-mono text-xs font-bold text-accent-foreground">{item.number}</div><h3 className="mt-5 font-display text-xl font-bold">{item.title}</h3><p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.body}</p></div>)}</div></div></div></section><section id="trust" className="mx-auto max-w-7xl px-5 py-20 sm:px-8"><div className="flex flex-col justify-between gap-8 lg:flex-row lg:items-end"><div><div className="text-[10px] font-bold uppercase tracking-[.2em] text-muted-foreground">Designed for a real campus</div><h2 className="mt-3 max-w-2xl font-display text-4xl font-bold leading-tight tracking-[-.05em]">Good operations feel like trust.</h2></div><p className="max-w-sm text-sm leading-relaxed text-muted-foreground">Students, staff, and administrators see the same source of truth — with the right amount of detail for every role.</p></div><div className="mt-10 grid gap-4 md:grid-cols-3"><div className="rounded-2xl bg-primary p-6 text-primary-foreground"><ShieldCheck className="h-6 w-6 text-accent" /><h3 className="mt-10 font-display text-xl font-bold">Accountable by default</h3><p className="mt-2 text-sm leading-relaxed text-primary-foreground/60">A visible timeline replaces the black hole after “submit.”</p></div><div className="rounded-2xl border border-border bg-card p-6"><Sparkles className="h-6 w-6 text-accent-foreground" /><h3 className="mt-10 font-display text-xl font-bold">Less friction to report</h3><p className="mt-2 text-sm leading-relaxed text-muted-foreground">Smart suggestions do the admin work without taking control away.</p></div><div className="rounded-2xl border border-border bg-card p-6"><BarChart3 className="h-6 w-6 text-primary" /><h3 className="mt-10 font-display text-xl font-bold">Better decisions</h3><p className="mt-2 text-sm leading-relaxed text-muted-foreground">Operations teams spot patterns before they become campus-wide problems.</p></div></div></section><section className="mx-auto max-w-7xl px-5 pb-24 sm:px-8"><div className="flex flex-col items-start justify-between gap-6 rounded-3xl bg-accent p-7 sm:p-10 md:flex-row md:items-center"><div><h2 className="font-display text-3xl font-bold tracking-[-.04em]">See something off?</h2><p className="mt-2 text-sm text-accent-foreground/70">The best time to report it is while it’s still small.</p></div><Link href="/report" className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-3 text-sm font-bold text-primary-foreground" data-testid="link-bottom-report">Report an issue <ArrowRight className="h-4 w-4" /></Link></div></section></main><footer className="border-t border-border/70 px-5 py-6 sm:px-8"><div className="mx-auto flex max-w-7xl flex-col justify-between gap-3 text-xs text-muted-foreground sm:flex-row"><span>© 2024 CampusCare · Built for better campus days</span><span>North campus operations desk · Online</span></div></footer></div>;
}

function Router() {
  const [location] = useLocation();
  const publicRoute = location === '/' || location === '/login';
  return <ErrorBoundary resetKey={location}>{publicRoute ? <Switch><Route path="/" component={Landing} /><Route path="/login" component={Login} /></Switch> : <AppShell><Switch><Route path="/dashboard" component={Dashboard} /><Route path="/issues/:issueId" component={IssueDetail} /><Route path="/issues" component={IssuesPage} /><Route path="/report" component={ReportPage} /><Route path="/admin/analytics" component={AnalyticsPage} /><Route path="/admin"><IssuesPage admin /></Route><Route component={NotFound} /></Switch></AppShell>}</ErrorBoundary>;
}

function App() {
  return <QueryClientProvider client={queryClient}><TooltipProvider><WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}><Router /></WouterRouter><Toaster /></TooltipProvider></QueryClientProvider>;
}

export default App;