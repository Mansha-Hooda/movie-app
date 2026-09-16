import { PageSkeleton } from '@/components/PageSkeleton'

export default function Loading() {
  return (
    <main className="mx-auto max-w-lg px-5 pb-24 pt-6">
      <PageSkeleton />
    </main>
  )
}
