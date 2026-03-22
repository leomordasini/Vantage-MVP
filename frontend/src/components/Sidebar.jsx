import { NavLink } from 'react-router-dom'

const navItems = [
  {
    section: 'Overview',
    links: [
      { to: '/dashboard', label: 'Dashboard', icon: HomeIcon },
      { to: '/tasks',     label: 'Tasks',     icon: CheckSquareIcon },
    ],
  },
  {
    section: 'People & Accounts',
    links: [
      { to: '/customers',       label: 'Customers',       icon: BuildingIcon },
      { to: '/direct-reports',  label: 'Direct Reports',  icon: UsersIcon    },
    ],
  },
  {
    section: 'Work',
    links: [
      { to: '/meetings', label: 'Meetings', icon: CalendarIcon },
      { to: '/projects', label: 'Projects', icon: FolderIcon },
    ],
  },
  {
    section: 'Settings',
    links: [
      { to: '/admin', label: 'Admin', icon: SettingsIcon },
    ],
  },
]

export default function Sidebar() {
  return (
    <aside className="w-56 bg-slate-900 text-slate-100 flex flex-col flex-shrink-0">
      {/* Logo */}
      <div className="px-4 pt-6 pb-5 border-b border-slate-700 flex flex-col items-center text-center">
        {/* Face-in-lock SVG — inline so it renders instantly with no extra request */}
        <svg viewBox="0 0 64 64" className="w-16 h-16 mb-3 drop-shadow-lg" xmlns="http://www.w3.org/2000/svg">
          {/* Outer glow ring */}
          <circle cx="32" cy="32" r="30" fill="none" stroke="#6366f1" strokeWidth="1.5" opacity="0.4"/>
          {/* Lock body */}
          <rect x="10" y="30" width="44" height="30" rx="6" fill="#3f3f50" stroke="#6b6b82" strokeWidth="1.5"/>
          {/* Shackle */}
          <path d="M19 30 L19 19 Q19 8 32 8 Q45 8 45 19 L45 30"
                fill="none" stroke="#6b6b82" strokeWidth="5.5" strokeLinecap="round"/>
          {/* Face — skin */}
          <ellipse cx="32" cy="39" rx="9" ry="10" fill="#c9a87c"/>
          {/* Ears */}
          <ellipse cx="23" cy="39" r="2" fill="#c9a87c"/>
          <ellipse cx="41" cy="39" r="2" fill="#c9a87c"/>
          {/* Ear studs */}
          <circle cx="23" cy="39" r="0.8" fill="#888"/>
          <circle cx="41" cy="39" r="0.8" fill="#888"/>
          {/* Eyes — slightly skeptical */}
          <ellipse cx="28.5" cy="37" rx="2.2" ry="2.2" fill="#1a1a2e"/>
          <ellipse cx="35.5" cy="37" rx="2.2" ry="2.2" fill="#1a1a2e"/>
          <circle cx="29.2" cy="36.4" r="0.6" fill="white" opacity="0.7"/>
          <circle cx="36.2" cy="36.4" r="0.6" fill="white" opacity="0.7"/>
          {/* Nose ring */}
          <circle cx="32" cy="41.5" r="1.3" fill="none" stroke="#9ca3af" strokeWidth="0.9"/>
          {/* Mouth — straight, deadpan */}
          <path d="M28.5 45 Q32 46 35.5 45" fill="none" stroke="#8a6a4a" strokeWidth="1" strokeLinecap="round"/>
          {/* Hair */}
          <ellipse cx="32" cy="29.5" rx="9" ry="4" fill="#1a1a1a"/>
          {/* Keyhole */}
          <circle cx="32" cy="54" r="3" fill="#1e1b4b"/>
          <rect x="30.5" y="54" width="3" height="4.5" rx="0.8" fill="#1e1b4b"/>
        </svg>

        <p className="text-2xl font-black tracking-tighter text-white leading-none">LIL</p>
        <p className="text-xs font-semibold text-indigo-400 tracking-widest uppercase mt-1">Locked-In Leo</p>
        <p className="text-xs text-slate-500 mt-1 italic">stay locked. stay winning.</p>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-6">
        {navItems.map((group) => (
          <div key={group.section}>
            <p className="px-2 mb-1 text-xs font-semibold uppercase tracking-widest text-slate-500">
              {group.section}
            </p>
            <ul className="space-y-0.5">
              {group.links.map(({ to, label, icon: Icon }) => (
                <li key={to}>
                  <NavLink
                    to={to}
                    className={({ isActive }) =>
                      `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-indigo-600 text-white'
                          : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                      }`
                    }
                  >
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    {label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>
    </aside>
  )
}

// ─── Icons ───────────────────────────────────────────────────────────────────

function HomeIcon({ className }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
  )
}

function CheckSquareIcon({ className }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
    </svg>
  )
}

function BuildingIcon({ className }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
  )
}

function UsersIcon({ className }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  )
}

function FolderIcon({ className }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
    </svg>
  )
}

function CalendarIcon({ className }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  )
}

function SettingsIcon({ className }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  )
}
