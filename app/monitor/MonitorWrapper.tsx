'use client'

import dynamic from 'next/dynamic'

const MonitorClient = dynamic(
  () => import('./MonitorClient'),
  {
    ssr: false,
    loading: () => (
      <div className="page-loading">
        <div className="page-loading-spinner" />
        <span>Loading...</span>
      </div>
    ),
  }
)

export default function MonitorWrapper() {
  return <MonitorClient />
}
