export default function ShortId(){
    return <div>Redirectsss</div>;
}

export async function getLink({params}){
    const primsa = new PrismaClient();
    const {shortId} = params;
    const data = await primsa.link
}