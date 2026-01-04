import AdminUsersPage from '@/components/admin/users/page'

export default async function Page({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
    const resolvedSearchParams = await searchParams
    return <AdminUsersPage searchParams={resolvedSearchParams} />
}
