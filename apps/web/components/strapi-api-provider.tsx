"use client"

import * as React from "react"
import { ApiProvider } from "@reduxjs/toolkit/query/react"

import { strapiApi } from "@/store/strapiApi"

export function StrapiApiProvider({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return <ApiProvider api={strapiApi}>{children}</ApiProvider>
}
