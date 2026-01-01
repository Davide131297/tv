import { GET } from '@/app/api/politics/route'
import { NextRequest } from 'next/server'
import { supabase } from '@/lib/supabase'

// Mock supabase
jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(),
  },
}))

describe('GET /api/politics', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('returns party stats by default', async () => {
    const mockData = [
      { party_name: 'SPD' },
      { party_name: 'CDU' },
      { party_name: 'SPD' },
    ]

    const mockQueryBuilder = {
      select: jest.fn().mockReturnThis(),
      not: jest.fn().mockReturnThis(),
      neq: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      lte: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      range: jest.fn().mockReturnThis(),
      then: jest.fn((resolve) => resolve({ data: mockData, error: null })),
    }

    ;(supabase.from as jest.Mock).mockReturnValue(mockQueryBuilder)

    const req = new Request('http://localhost:3000/api/politics') as unknown as NextRequest
    const res = await GET(req)
    const json = await res.json()

    expect(json.success).toBe(true)
    expect(json.data).toBeDefined()
    expect(json.data).toHaveLength(2) // SPD (2) and CDU (1)
    
    // Sort order is desc by count
    expect(json.data[0].party_name).toBe('SPD')
    expect(json.data[0].count).toBe(2)
  })
})
