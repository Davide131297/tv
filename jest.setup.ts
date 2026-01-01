import '@testing-library/jest-dom'
import 'whatwg-fetch'
import { TextEncoder, TextDecoder } from 'util'

global.TextEncoder = TextEncoder
global.TextDecoder = TextDecoder as any

// Polyfill static Response.json if missing (whatwg-fetch doesn't have it)
if (!global.Response.json) {
  // @ts-ignore
  global.Response.json = (data: any, init?: ResponseInit) => {
    return new global.Response(JSON.stringify(data), {
      ...init,
      headers: {
        ...init?.headers,
        'content-type': 'application/json',
      },
    })
  }
}

// Mock next/server
jest.mock('next/server', () => {
  return {
    NextRequest: class NextRequest extends Request {
      constructor(input: any, init: any) {
        super(input, init)
      }
    },
    NextResponse: class NextResponse extends Response {
      static json(body: any, init: any) {
        return new Response(JSON.stringify(body), {
          ...init,
          headers: {
            ...init?.headers,
            'content-type': 'application/json',
          },
        })
      }
    },
  }
})
