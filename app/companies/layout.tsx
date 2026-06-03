import OwnerShell from '@/components/layout/OwnerShell'
import { ReactNode } from 'react'
export default function Layout({ children }: { children: ReactNode }) {
  return <OwnerShell>{children}</OwnerShell>
}
