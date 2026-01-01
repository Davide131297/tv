import { GET } from '@/app/api/politician-details/route'
import { NextRequest } from 'next/server'
import { supabase } from '@/lib/supabase'

// Mock supabase
jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(),
  },
}))

// Mock crypto.randomUUID if not available
if (!global.crypto.randomUUID) {
  Object.defineProperty(global.crypto, 'randomUUID', {
    value: () => 'test-uuid-' + Math.random(),
  })
}

describe('GET /api/politician-details', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('returns error if id is missing', async () => {
    const req = new Request('http://localhost:3000/api/politician-details') as unknown as NextRequest
    const res = await GET(req)
    const json = await res.json()

    expect(res.status).toBe(400)
    expect(json.error).toBe('Missing politician ID')
  })

  it('returns details with links', async () => {
    // Mock Data
    const mockAppearances = [
      { show_name: 'Markus Lanz', episode_date: '2025-01-20' },
    ]
    const mockLinkData = { episode_url: 'https://zdf.de/...' }

    // Query Builder Mocks
    const mockPoliticiansBuilder = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      neq: jest.fn().mockReturnThis(),
      then: jest.fn((resolve) => resolve({ data: mockAppearances, error: null })),
    }

    const mockLinksBuilder = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      neq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: mockLinkData, error: null }),
    }

    ;(supabase.from as jest.Mock).mockImplementation((table) => {
      if (table === 'tv_show_politicians') return mockPoliticiansBuilder
      if (table === 'show_links') return mockLinksBuilder
      return { select: jest.fn().mockReturnThis() }
    })

    const req = new Request('http://localhost:3000/api/politician-details?id=123') as unknown as NextRequest
    const res = await GET(req)
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(Array.isArray(json)).toBe(true)
    expect(json).toHaveLength(1)
    expect(json[0].show_name).toBe('Markus Lanz')
    expect(json[0].episode_url).toBe('https://zdf.de/...')
    expect(json[0].id).toBeDefined()
  })
})
