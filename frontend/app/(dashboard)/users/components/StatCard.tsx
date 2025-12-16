export default function StatCard({
title,value
}:{title:string;value:string;}){
    return(
        <div className="rounded-xl bg-primary text-primary-foreground p-4 shadow">
            <p className="text-sm text-primary-foreground/80">{title}</p>
            <p className="text-2xl font-bold">{value}</p>
        </div>
    )
}
