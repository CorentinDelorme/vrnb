import { emptySplitApi as api } from "./emptyApi"
const injectedRtkApi = api.injectEndpoints({
  endpoints: (build) => ({
    getBureaux: build.query<GetBureauxApiResponse, GetBureauxApiArg>({
      query: (queryArg) => ({
        url: `/bureaux`,
        params: {
          sort: queryArg.sort,
          pagination: queryArg.pagination,
          fields: queryArg.fields,
          populate: queryArg.populate,
          filters: queryArg.filters,
          locale: queryArg.locale,
        },
      }),
    }),
    postBureaux: build.mutation<PostBureauxApiResponse, PostBureauxApiArg>({
      query: (queryArg) => ({
        url: `/bureaux`,
        method: "POST",
        body: queryArg.bureauRequest,
      }),
    }),
    getBureauxById: build.query<
      GetBureauxByIdApiResponse,
      GetBureauxByIdApiArg
    >({
      query: (queryArg) => ({ url: `/bureaux/${queryArg.id}` }),
    }),
    putBureauxById: build.mutation<
      PutBureauxByIdApiResponse,
      PutBureauxByIdApiArg
    >({
      query: (queryArg) => ({
        url: `/bureaux/${queryArg.id}`,
        method: "PUT",
        body: queryArg.bureauRequest,
      }),
    }),
    deleteBureauxById: build.mutation<
      DeleteBureauxByIdApiResponse,
      DeleteBureauxByIdApiArg
    >({
      query: (queryArg) => ({
        url: `/bureaux/${queryArg.id}`,
        method: "DELETE",
      }),
    }),
  }),
  overrideExisting: false,
})
export { injectedRtkApi as strapiApi }
export type GetBureauxApiResponse = /** status 200 OK */ BureauListResponse
export type GetBureauxApiArg = {
  /** Sort by attributes ascending (asc) or descending (desc) */
  sort?: string
  pagination?: {
    withCount?: boolean
    page?: number
    pageSize?: number
    start?: number
    limit?: number
  }
  /** Fields to return (ex: title,author) */
  fields?: string
  /** Relations to return */
  populate?: string
  /** Filters to apply */
  filters?: {
    [key: string]: any
  }
  /** Locale to apply */
  locale?: string
}
export type PostBureauxApiResponse = /** status 200 OK */ BureauResponse
export type PostBureauxApiArg = {
  bureauRequest: BureauRequest
}
export type GetBureauxByIdApiResponse = /** status 200 OK */ BureauResponse
export type GetBureauxByIdApiArg = {
  id: number
}
export type PutBureauxByIdApiResponse = /** status 200 OK */ BureauResponse
export type PutBureauxByIdApiArg = {
  id: number
  bureauRequest: BureauRequest
}
export type DeleteBureauxByIdApiResponse = /** status 200 OK */ number
export type DeleteBureauxByIdApiArg = {
  id: number
}
export type Bureau = {
  id?: string | number
  documentId?: string
  name: string
  order: number
  createdAt?: string
  updatedAt?: string
  publishedAt?: string
  createdBy?: {
    id?: string | number
    documentId?: string
    firstname?: string
    lastname?: string
    username?: string
    email?: string
    resetPasswordToken?: string
    registrationToken?: string
    isActive?: boolean
    roles?: {
      id?: string | number
      documentId?: string
      name?: string
      code?: string
      description?: string
      users?: {
        id?: string | number
        documentId?: string
      }[]
      permissions?: {
        id?: string | number
        documentId?: string
        action?: string
        actionParameters?: any
        subject?: string
        properties?: any
        conditions?: any
        role?: {
          id?: string | number
          documentId?: string
        }
        createdAt?: string
        updatedAt?: string
        publishedAt?: string
        createdBy?: {
          id?: string | number
          documentId?: string
        }
        updatedBy?: {
          id?: string | number
          documentId?: string
        }
        locale?: string
        localizations?: {
          id?: string | number
          documentId?: string
        }[]
      }[]
      createdAt?: string
      updatedAt?: string
      publishedAt?: string
      createdBy?: {
        id?: string | number
        documentId?: string
      }
      updatedBy?: {
        id?: string | number
        documentId?: string
      }
      locale?: string
      localizations?: {
        id?: string | number
        documentId?: string
      }[]
    }[]
    blocked?: boolean
    preferedLanguage?: string
    createdAt?: string
    updatedAt?: string
    publishedAt?: string
    createdBy?: {
      id?: string | number
      documentId?: string
    }
    updatedBy?: {
      id?: string | number
      documentId?: string
    }
    locale?: string
    localizations?: {
      id?: string | number
      documentId?: string
    }[]
  }
  updatedBy?: {
    id?: string | number
    documentId?: string
  }
  locale?: string
  localizations?: {
    id?: string | number
    documentId?: string
    name?: string
    order?: number
    createdAt?: string
    updatedAt?: string
    publishedAt?: string
    createdBy?: {
      id?: string | number
      documentId?: string
    }
    updatedBy?: {
      id?: string | number
      documentId?: string
    }
    locale?: string
    localizations?: {
      id?: string | number
      documentId?: string
    }[]
  }[]
}
export type BureauListResponse = {
  data?: Bureau[]
  meta?: {
    pagination?: {
      page?: number
      pageSize?: number
      pageCount?: number
      total?: number
    }
  }
}
export type Error = {
  data?: ((object | null) | (object[] | null)) | null
  error: {
    status?: number
    name?: string
    message?: string
    details?: object
  }
}
export type BureauResponse = {
  data?: Bureau
  meta?: object
}
export type BureauRequest = {
  data: {
    name: string
    order: number
    locale?: string
    localizations?: (number | string)[]
  }
}
export const {
  useGetBureauxQuery,
  usePostBureauxMutation,
  useGetBureauxByIdQuery,
  usePutBureauxByIdMutation,
  useDeleteBureauxByIdMutation,
} = injectedRtkApi
