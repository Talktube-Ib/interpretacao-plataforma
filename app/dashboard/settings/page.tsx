import SettingsPage from '@/components/dashboard/settings/page'

export default async function Page({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
    return <SettingsPage searchParams={searchParams} />
}
