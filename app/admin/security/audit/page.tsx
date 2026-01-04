import SecurityAuditPage from '@/components/admin/security/audit/page'

export default async function Page({ searchParams }: { searchParams: Promise<{ action?: string }> }) {
    const resolvedParams = await searchParams
    return <SecurityAuditPage searchParams={resolvedParams} />
}
