"use client"

import { useGetBureauxByIdQuery } from "@/store/strapiApi"
import { Button } from "@repo/ui/components/button"

export function BureauDetails({ documentId }: { documentId: string }) {
  const { data, error, isLoading, isFetching, refetch } = useGetBureauxByIdQuery({
    id: documentId,
  })

  return (
    <div className="rounded-md border border-border p-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">/bureaux/{documentId}</h2>
        <Button size="sm" onClick={() => void refetch()}>
          Refresh
        </Button>
      </div>

      {isLoading || isFetching ? (
        <p className="mt-3 text-sm text-muted-foreground">Loading…</p>
      ) : error ? (
        <p className="mt-3 text-sm text-destructive">
          Unable to load bureau (documentId: {documentId}).
        </p>
      ) : (
        <pre className="mt-3 max-h-72 overflow-auto rounded bg-muted p-3 text-xs">
          {JSON.stringify(data, null, 2)}
        </pre>
      )}
    </div>
  )
}
