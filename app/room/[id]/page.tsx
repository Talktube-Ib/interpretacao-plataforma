import RoomPage from '@/components/room/[id]/page'

export default async function Page(props: {
    params: Promise<{ id: string }>
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
    return <RoomPage params={props.params} searchParams={props.searchParams} />
}
