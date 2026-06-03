import type { ServerFunctionClient } from 'payload'
import { handleServerFunctions, RootLayout } from '@payloadcms/next/layouts'
import configPromise from '@payload-config'
import React from 'react'
import { importMap } from './importMap'

/* Global Payload admin styles: theme CSS variables + base/reset.
   Without this only per-component SCSS loads (consumers of the vars),
   leaving theme vars undefined and the UI unstyled. */
import '@payloadcms/next/css'

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
