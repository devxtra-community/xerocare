"use client"

import { Button } from "@/components/ui/button"

export default function Pagination() {
    return (
        <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Showing 1 to 5 of 25 results</p>

            <div className="flex items-center gap-2"> 
                <Button variant="outline" size="sm">Previous</Button>
                <Button size="sm">1</Button>
                <Button variant="outline" size="sm">
                    2
                </Button>
                <Button variant="outline" size="sm">
                    3
                </Button>

                <Button variant="outline" size="sm">
                    Next
                </Button>
            </div>
        </div>
    )
}