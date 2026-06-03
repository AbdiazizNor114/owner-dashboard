import OwnerShell from '@/components/layout/OwnerShell'
import { ReactNode } from 'react'

export default function RequestsLayout({ children }: { children: ReactNode }) {
  return <OwnerShell>{children}</OwnerShell>
}
