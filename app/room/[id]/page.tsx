import RoomPage from '@/components/room/[id]/page'

export default async function Page(props: {
    params: Promise<{ id: string }>
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
    try {
        const resolvedParams = await props.params
        const resolvedSearchParams = await props.searchParams
        return <RoomPage params={Promise.resolve(resolvedParams)} searchParams={Promise.resolve(resolvedSearchParams)} />
    } catch (err: any) {
        return (
            <div className="min-h-screen bg-black text-red-500 p-10 font-mono">
                <h1 className="text-2xl font-bold mb-4">CRITICAL SERVER ERROR (Room Page)</h1>
                <p className="bg-red-500/10 p-4 rounded border border-red-500/20">{err.message || String(err)}</p>
                <p className="mt-4 text-gray-500 text-sm">Tente limpar o cache do navegador ou contatar o suporte.</p>
            </div>
        )
    }
}
