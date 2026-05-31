'use client'

import dynamic from 'next/dynamic'

const CompareClient = dynamic(
  () => import('./CompareClient'),
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

export default function CompareWrapper() {
  return <CompareClient />
}
