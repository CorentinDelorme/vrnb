import { emptySplitApi as api } from "./emptyApi"
const injectedRtkApi = api.injectEndpoints({
  endpoints: (build) => ({
    getBureaux: build.query<GetBureauxApiResponse, GetBureauxApiArg>({
      query: (queryArg) => ({
        url: `/bureaux`,
        params: {
          fields: queryArg.fields,
          filters: queryArg.filters,
          _q: queryArg._q,
          pagination: queryArg.pagination,
          sort: queryArg.sort,
          populate: queryArg.populate,
          status: queryArg.status,
          hasPublishedVersion: queryArg.hasPublishedVersion,
        },
      }),
    }),
    postBureaux: build.mutation<PostBureauxApiResponse, PostBureauxApiArg>({
      query: (queryArg) => ({
        url: `/bureaux`,
        method: "POST",
        body: queryArg.body,
        params: {
          fields: queryArg.fields,
          populate: queryArg.populate,
          status: queryArg.status,
          hasPublishedVersion: queryArg.hasPublishedVersion,
        },
      }),
    }),
    getBureauxById: build.query<
      GetBureauxByIdApiResponse,
      GetBureauxByIdApiArg
    >({
      query: (queryArg) => ({
        url: `/bureaux/${queryArg.id}`,
        params: {
          fields: queryArg.fields,
          populate: queryArg.populate,
          filters: queryArg.filters,
          sort: queryArg.sort,
          status: queryArg.status,
          hasPublishedVersion: queryArg.hasPublishedVersion,
        },
      }),
    }),
    putBureauxById: build.mutation<
      PutBureauxByIdApiResponse,
      PutBureauxByIdApiArg
    >({
      query: (queryArg) => ({
        url: `/bureaux/${queryArg.id}`,
        method: "PUT",
        body: queryArg.body,
        params: {
          fields: queryArg.fields,
          populate: queryArg.populate,
          status: queryArg.status,
          hasPublishedVersion: queryArg.hasPublishedVersion,
        },
      }),
    }),
    deleteBureauxById: build.mutation<
      DeleteBureauxByIdApiResponse,
      DeleteBureauxByIdApiArg
    >({
      query: (queryArg) => ({
        url: `/bureaux/${queryArg.id}`,
        method: "DELETE",
        params: {
          fields: queryArg.fields,
          populate: queryArg.populate,
          filters: queryArg.filters,
          status: queryArg.status,
          hasPublishedVersion: queryArg.hasPublishedVersion,
        },
      }),
    }),
    getPartners: build.query<GetPartnersApiResponse, GetPartnersApiArg>({
      query: (queryArg) => ({
        url: `/partners`,
        params: {
          fields: queryArg.fields,
          filters: queryArg.filters,
          _q: queryArg._q,
          pagination: queryArg.pagination,
          sort: queryArg.sort,
          populate: queryArg.populate,
          status: queryArg.status,
          hasPublishedVersion: queryArg.hasPublishedVersion,
        },
      }),
    }),
    postPartners: build.mutation<PostPartnersApiResponse, PostPartnersApiArg>({
      query: (queryArg) => ({
        url: `/partners`,
        method: "POST",
        body: queryArg.body,
        params: {
          fields: queryArg.fields,
          populate: queryArg.populate,
          status: queryArg.status,
          hasPublishedVersion: queryArg.hasPublishedVersion,
        },
      }),
    }),
    getPartnersById: build.query<
      GetPartnersByIdApiResponse,
      GetPartnersByIdApiArg
    >({
      query: (queryArg) => ({
        url: `/partners/${queryArg.id}`,
        params: {
          fields: queryArg.fields,
          populate: queryArg.populate,
          filters: queryArg.filters,
          sort: queryArg.sort,
          status: queryArg.status,
          hasPublishedVersion: queryArg.hasPublishedVersion,
        },
      }),
    }),
    putPartnersById: build.mutation<
      PutPartnersByIdApiResponse,
      PutPartnersByIdApiArg
    >({
      query: (queryArg) => ({
        url: `/partners/${queryArg.id}`,
        method: "PUT",
        body: queryArg.body,
        params: {
          fields: queryArg.fields,
          populate: queryArg.populate,
          status: queryArg.status,
          hasPublishedVersion: queryArg.hasPublishedVersion,
        },
      }),
    }),
    deletePartnersById: build.mutation<
      DeletePartnersByIdApiResponse,
      DeletePartnersByIdApiArg
    >({
      query: (queryArg) => ({
        url: `/partners/${queryArg.id}`,
        method: "DELETE",
        params: {
          fields: queryArg.fields,
          populate: queryArg.populate,
          filters: queryArg.filters,
          status: queryArg.status,
          hasPublishedVersion: queryArg.hasPublishedVersion,
        },
      }),
    }),
  }),
  overrideExisting: false,
})
export { injectedRtkApi as strapiApi }
export type GetBureauxApiResponse = /** status 200 OK */ {
  data: {
    /** The document ID, represented by a UUID */
    documentId: string
    id: string | number
    /** A string field */
    name: string
    /** An integer field */
    order: number
    /** A datetime field */
    createdAt?: string
    /** A datetime field */
    updatedAt?: string
    /** A datetime field */
    publishedAt: string
  }[]
}
export type GetBureauxApiArg = {
  fields?: ("name" | "order" | "createdAt" | "updatedAt" | "publishedAt")[]
  filters?: {
    [key: string]: any
  }
  _q?: string
  pagination?: {
    /** Include total count in response */
    withCount?: boolean
  } & (
    | {
        /** Page number (1-based) */
        page: number
        /** Number of entries per page */
        pageSize: number
      }
    | {
        /** Number of entries to skip */
        start: number
        /** Maximum number of entries to return */
        limit: number
      }
  )
  sort?:
    | ("name" | "order" | "createdAt" | "updatedAt" | "publishedAt")
    | ("name" | "order" | "createdAt" | "updatedAt" | "publishedAt")[]
    | {
        [key: string]: "asc" | "desc"
      }
    | {
        [key: string]: "asc" | "desc"
      }[]
  populate?: "*" | string | string[]
  status?: "draft" | "published"
  hasPublishedVersion?: boolean | ("true" | "false")
}
export type PostBureauxApiResponse = /** status 200 OK */ {
  data: {
    /** The document ID, represented by a UUID */
    documentId: string
    id: string | number
    /** A string field */
    name: string
    /** An integer field */
    order: number
    /** A datetime field */
    createdAt?: string
    /** A datetime field */
    updatedAt?: string
    /** A datetime field */
    publishedAt: string
  }
}
export type PostBureauxApiArg = {
  fields?: ("name" | "order" | "createdAt" | "updatedAt" | "publishedAt")[]
  populate?: "*" | string | string[]
  status?: "draft" | "published"
  hasPublishedVersion?: boolean | ("true" | "false")
  body: {
    data: {
      /** A string field */
      name: string
      /** A float field */
      order: number
      /** A datetime field */
      publishedAt: string
    }
  }
}
export type GetBureauxByIdApiResponse = /** status 200 OK */ {
  data: {
    /** The document ID, represented by a UUID */
    documentId: string
    id: string | number
    /** A string field */
    name: string
    /** An integer field */
    order: number
    /** A datetime field */
    createdAt?: string
    /** A datetime field */
    updatedAt?: string
    /** A datetime field */
    publishedAt: string
  }
}
export type GetBureauxByIdApiArg = {
  id: string
  fields?: ("name" | "order" | "createdAt" | "updatedAt" | "publishedAt")[]
  populate?: "*" | string | string[]
  filters?: {
    [key: string]: any
  }
  sort?:
    | ("name" | "order" | "createdAt" | "updatedAt" | "publishedAt")
    | ("name" | "order" | "createdAt" | "updatedAt" | "publishedAt")[]
    | {
        [key: string]: "asc" | "desc"
      }
    | {
        [key: string]: "asc" | "desc"
      }[]
  status?: "draft" | "published"
  hasPublishedVersion?: boolean | ("true" | "false")
}
export type PutBureauxByIdApiResponse = /** status 200 OK */ {
  data: {
    /** The document ID, represented by a UUID */
    documentId: string
    id: string | number
    /** A string field */
    name: string
    /** An integer field */
    order: number
    /** A datetime field */
    createdAt?: string
    /** A datetime field */
    updatedAt?: string
    /** A datetime field */
    publishedAt: string
  }
}
export type PutBureauxByIdApiArg = {
  id: string
  fields?: ("name" | "order" | "createdAt" | "updatedAt" | "publishedAt")[]
  populate?: "*" | string | string[]
  status?: "draft" | "published"
  hasPublishedVersion?: boolean | ("true" | "false")
  body: {
    data: {
      /** A string field */
      name?: string
      /** A float field */
      order?: number
      /** A datetime field */
      publishedAt?: string
    }
  }
}
export type DeleteBureauxByIdApiResponse = /** status 200 OK */ {
  data: {
    /** The document ID, represented by a UUID */
    documentId: string
    id: string | number
    /** A string field */
    name: string
    /** An integer field */
    order: number
    /** A datetime field */
    createdAt?: string
    /** A datetime field */
    updatedAt?: string
    /** A datetime field */
    publishedAt: string
  }
}
export type DeleteBureauxByIdApiArg = {
  id: string
  fields?: ("name" | "order" | "createdAt" | "updatedAt" | "publishedAt")[]
  populate?: "*" | string | string[]
  filters?: {
    [key: string]: any
  }
  status?: "draft" | "published"
  hasPublishedVersion?: boolean | ("true" | "false")
}
export type GetPartnersApiResponse = /** status 200 OK */ {
  data: {
    /** The document ID, represented by a UUID */
    documentId: string
    id: string | number
    /** A string field */
    name: string
    /** A string field */
    url: string
    /** A datetime field */
    createdAt?: string
    /** A datetime field */
    updatedAt?: string
    /** A datetime field */
    publishedAt: string
    /** A media field */
    logo: PluginUploadFileDocument
  }[]
}
export type GetPartnersApiArg = {
  fields?: ("name" | "url" | "createdAt" | "updatedAt" | "publishedAt")[]
  filters?: {
    [key: string]: any
  }
  _q?: string
  pagination?: {
    /** Include total count in response */
    withCount?: boolean
  } & (
    | {
        /** Page number (1-based) */
        page: number
        /** Number of entries per page */
        pageSize: number
      }
    | {
        /** Number of entries to skip */
        start: number
        /** Maximum number of entries to return */
        limit: number
      }
  )
  sort?:
    | ("name" | "url" | "createdAt" | "updatedAt" | "publishedAt")
    | ("name" | "url" | "createdAt" | "updatedAt" | "publishedAt")[]
    | {
        [key: string]: "asc" | "desc"
      }
    | {
        [key: string]: "asc" | "desc"
      }[]
  populate?: "*" | "logo" | "logo"[]
  status?: "draft" | "published"
  hasPublishedVersion?: boolean | ("true" | "false")
}
export type PostPartnersApiResponse = /** status 200 OK */ {
  data: {
    /** The document ID, represented by a UUID */
    documentId: string
    id: string | number
    /** A string field */
    name: string
    /** A string field */
    url: string
    /** A datetime field */
    createdAt?: string
    /** A datetime field */
    updatedAt?: string
    /** A datetime field */
    publishedAt: string
    /** A media field */
    logo: PluginUploadFileDocument
  }
}
export type PostPartnersApiArg = {
  fields?: ("name" | "url" | "createdAt" | "updatedAt" | "publishedAt")[]
  populate?: "*" | "logo" | "logo"[]
  status?: "draft" | "published"
  hasPublishedVersion?: boolean | ("true" | "false")
  body: {
    data: {
      /** A string field */
      name: string
      /** A string field */
      url: string
      /** A datetime field */
      publishedAt: string
      /** A media field */
      logo: any
    }
  }
}
export type GetPartnersByIdApiResponse = /** status 200 OK */ {
  data: {
    /** The document ID, represented by a UUID */
    documentId: string
    id: string | number
    /** A string field */
    name: string
    /** A string field */
    url: string
    /** A datetime field */
    createdAt?: string
    /** A datetime field */
    updatedAt?: string
    /** A datetime field */
    publishedAt: string
    /** A media field */
    logo: PluginUploadFileDocument
  }
}
export type GetPartnersByIdApiArg = {
  id: string
  fields?: ("name" | "url" | "createdAt" | "updatedAt" | "publishedAt")[]
  populate?: "*" | "logo" | "logo"[]
  filters?: {
    [key: string]: any
  }
  sort?:
    | ("name" | "url" | "createdAt" | "updatedAt" | "publishedAt")
    | ("name" | "url" | "createdAt" | "updatedAt" | "publishedAt")[]
    | {
        [key: string]: "asc" | "desc"
      }
    | {
        [key: string]: "asc" | "desc"
      }[]
  status?: "draft" | "published"
  hasPublishedVersion?: boolean | ("true" | "false")
}
export type PutPartnersByIdApiResponse = /** status 200 OK */ {
  data: {
    /** The document ID, represented by a UUID */
    documentId: string
    id: string | number
    /** A string field */
    name: string
    /** A string field */
    url: string
    /** A datetime field */
    createdAt?: string
    /** A datetime field */
    updatedAt?: string
    /** A datetime field */
    publishedAt: string
    /** A media field */
    logo: PluginUploadFileDocument
  }
}
export type PutPartnersByIdApiArg = {
  id: string
  fields?: ("name" | "url" | "createdAt" | "updatedAt" | "publishedAt")[]
  populate?: "*" | "logo" | "logo"[]
  status?: "draft" | "published"
  hasPublishedVersion?: boolean | ("true" | "false")
  body: {
    data: {
      /** A string field */
      name?: string
      /** A string field */
      url?: string
      /** A datetime field */
      publishedAt?: string
      /** A media field */
      logo?: any
    }
  }
}
export type DeletePartnersByIdApiResponse = /** status 200 OK */ {
  data: {
    /** The document ID, represented by a UUID */
    documentId: string
    id: string | number
    /** A string field */
    name: string
    /** A string field */
    url: string
    /** A datetime field */
    createdAt?: string
    /** A datetime field */
    updatedAt?: string
    /** A datetime field */
    publishedAt: string
    /** A media field */
    logo: PluginUploadFileDocument
  }
}
export type DeletePartnersByIdApiArg = {
  id: string
  fields?: ("name" | "url" | "createdAt" | "updatedAt" | "publishedAt")[]
  populate?: "*" | "logo" | "logo"[]
  filters?: {
    [key: string]: any
  }
  status?: "draft" | "published"
  hasPublishedVersion?: boolean | ("true" | "false")
}
export type PluginUploadFileDocument = {
  /** The document ID, represented by a UUID */
  documentId: string
  id: string | number
  /** A string field */
  name: string
  /** A text field */
  alternativeText?: string
  /** A text field */
  caption?: string
  /** A JSON field */
  focalPoint?: any
  /** An integer field */
  width?: number
  /** An integer field */
  height?: number
  /** A JSON field */
  formats?: any
  /** A string field */
  hash: string
  /** A string field */
  ext?: string
  /** A string field */
  mime: string
  /** A decimal field */
  size: number
  /** A text field */
  url: string
  /** A text field */
  previewUrl?: string
  /** A string field */
  provider: string
  /** A JSON field */
  provider_metadata?: any
  /** A datetime field */
  createdAt?: string
  /** A datetime field */
  updatedAt?: string
  /** A datetime field */
  publishedAt: string
  related: any
}
export const {
  useGetBureauxQuery,
  usePostBureauxMutation,
  useGetBureauxByIdQuery,
  usePutBureauxByIdMutation,
  useDeleteBureauxByIdMutation,
  useGetPartnersQuery,
  usePostPartnersMutation,
  useGetPartnersByIdQuery,
  usePutPartnersByIdMutation,
  useDeletePartnersByIdMutation,
} = injectedRtkApi
