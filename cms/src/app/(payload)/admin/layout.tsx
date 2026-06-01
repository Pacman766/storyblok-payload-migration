import type { ServerFunctionClient } from 'payload'
import { handleServerFunctions, RootLayout } from '@payloadcms/next/layouts'
import configPromise from '@payload-config'
import React from 'react'
import { importMap } from './importMap'

export default function Layout({ children }: { children: React.ReactNode }) {
  const serverFunction: ServerFunctionClient = async (args) => {
    'use server'
    return handleServerFunctions({
      ...args,
      config: configPromise,
      importMap,
    })
  }

  return RootLayout({
    config: configPromise,
    importMap,
    children,
    serverFunction,
  })
}
