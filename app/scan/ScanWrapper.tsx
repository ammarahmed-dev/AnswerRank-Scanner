'use client'

import dynamic from 'next/dynamic'

const ScanClient = dynamic(
  () => import('./ScanClient'),
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

export default function ScanWrapper() {
  return <ScanClient />
}
