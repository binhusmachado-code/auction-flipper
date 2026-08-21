import { createClient, type User } from '@supabase/supabase-js'
import type { IncomingMessage, ServerResponse } from 'node:http'

export interface ApiRequest extends IncomingMessage {
  body?: Record<string, unknown>
}

export interface ApiResponse extends ServerResponse {
  status(code: number): ApiResponse
  json(body: unknown): ApiResponse
  send(body: string): ApiResponse
}

function required(name: string) {
  const value = process.env[name]
  if (!value) throw new Error(`${name} is not configured`)
  return value
}

export function adminClient() {
  return createClient(required('SUPABASE_URL'), required('SUPABASE_SERVICE_ROLE_KEY'), {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

export async function authenticatedUser(req: ApiRequest): Promise<User> {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, '')
  if (!token) throw new Error('Authentication required')

  const client = createClient(required('SUPABASE_URL'), required('SUPABASE_ANON_KEY'), {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data, error } = await client.auth.getUser(token)
  if (error || !data.user) throw new Error('Invalid or expired session')
  return data.user
}

export function requestOrigin(req: ApiRequest) {
  if (process.env.APP_URL) return new URL(process.env.APP_URL).origin
  const host = req.headers['x-forwarded-host'] || req.headers.host
  const protocol = req.headers['x-forwarded-proto'] || 'https'
  if (!host) throw new Error('Request host is missing')
  const safeHost = Array.isArray(host) ? host[0] : host
  const safeProtocol = Array.isArray(protocol) ? protocol[0] : protocol
  const origin = new URL(`${safeProtocol}://${safeHost}`).origin
  const hostname = new URL(origin).hostname
  if (hostname !== 'localhost' && hostname !== '127.0.0.1' && !hostname.endsWith('.vercel.app')) {
    throw new Error('APP_URL must be configured for this host')
  }
  return origin
}

export async function rawBody(req: ApiRequest) {
  const chunks: Uint8Array[] = []
  let length = 0
  for await (const chunk of req) {
    const bytes = typeof chunk === 'string' ? new TextEncoder().encode(chunk) : new Uint8Array(chunk)
    chunks.push(bytes)
    length += bytes.byteLength
  }
  const body = new Uint8Array(length)
  let offset = 0
  for (const chunk of chunks) {
    body.set(chunk, offset)
    offset += chunk.byteLength
  }
  return new TextDecoder().decode(body)
}
