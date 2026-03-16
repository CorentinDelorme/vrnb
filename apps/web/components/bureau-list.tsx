"use client"

import { useGetBureauxQuery } from "@/store/strapiApi"
import { Button } from "@repo/ui/components/button"
import { BureauDetails } from "./bureau-details"

export function BureauList() {
  const { data, error, isLoading, isFetching, refetch } = useGetBureauxQuery({})

  const bureauDocumentIds =
    data?.data
      ?.map((bureau) => bureau.documentId)
      .filter((id): id is string => typeof id === "string" && id.length > 0) ?? []

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-lg font-semibold">Bureaux</h2>
        <Button size="sm" onClick={() => void refetch()}>
          Refresh
        </Button>
      </div>

      {isLoading || isFetching ? (
        <p className="text-sm text-muted-foreground">Loading bureaux…</p>
      ) : error ? (
        <p className="text-sm text-destructive">Unable to load bureaux.</p>
      ) : bureauDocumentIds.length === 0 ? (
        <p className="text-sm text-muted-foreground">No bureaux found.</p>
      ) : (
        <div className="space-y-4">
          {bureauDocumentIds.map((documentId) => (
            <BureauDetails key={documentId} documentId={documentId} />
          ))}
        </div>
      )}
    </div>
  )
}
