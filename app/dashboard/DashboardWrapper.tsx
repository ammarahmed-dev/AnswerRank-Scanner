'use client'

import dynamic from 'next/dynamic'

const DashboardClient = dynamic(
  () => import('./DashboardClient'),
  {
    ssr: false,
    loading: () => (
      <div className="page-loading">
        <div className="page-loading-spinner" />
        <span>Loading your workspace...</span>
      </div>
    ),
  }
)

export default function DashboardWrapper() {
  return <DashboardClient />
}
