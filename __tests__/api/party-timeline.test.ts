import { GET } from '@/app/api/party-timeline/route'
import { NextRequest } from 'next/server'
import { supabase } from '@/lib/supabase'

// Mock supabase
jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(),
  },
}))

describe('GET /api/party-timeline', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('returns data for all years (default)', async () => {
    const mockData = [
      { party_name: 'SPD', episode_date: '2024-01-15' },
      { party_name: 'CDU', episode_date: '2024-01-20' },
      { party_name: 'SPD', episode_date: '2024-02-10' },
    ]

    const mockQueryBuilder = {
      select: jest.fn().mockReturnThis(),
      not: jest.fn().mockReturnThis(),
      neq: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      lte: jest.fn().mockReturnThis(),
      then: jest.fn((resolve) => resolve({ data: mockData, error: null })),
    }

    ;(supabase.from as jest.Mock).mockReturnValue(mockQueryBuilder)

    const req = new Request('http://localhost:3000/api/party-timeline?year=all') as unknown as NextRequest
    const res = await GET(req)
    const json = await res.json()

    expect(json.success).toBe(true)
    expect(json.data).toBeDefined()
    expect(json.parties).toContain('SPD')
    expect(json.parties).toContain('CDU')
    
    // Check structure of data
    // Should have entries for 2024-01 and 2024-02
    const janData = json.data.find((d: any) => d.month === '2024-01')
    expect(janData).toBeDefined()
    expect(janData.SPD).toBe(1)
    expect(janData.CDU).toBe(1)

    const febData = json.data.find((d: any) => d.month === '2024-02')
    expect(febData).toBeDefined()
    expect(febData.SPD).toBe(1)
    expect(febData.CDU).toBe(0) // Assuming default 0
  })

  it('returns data for specific year', async () => {
    const mockData = [
      { party_name: 'Grüne', episode_date: '2025-05-15' },
    ]

    const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        not: jest.fn().mockReturnThis(),
        neq: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        lte: jest.fn().mockReturnThis(),
        then: jest.fn((resolve) => resolve({ data: mockData, error: null })),
    }

    ;(supabase.from as jest.Mock).mockReturnValue(mockQueryBuilder)

    const req = new Request('http://localhost:3000/api/party-timeline?year=2025') as unknown as NextRequest
    const res = await GET(req)
    const json = await res.json()

    expect(json.success).toBe(true)
    expect(json.year).toBe('2025')
    // Should have 12 months for specific year
    expect(json.data.length).toBe(12)
    
    const mayData = json.data.find((d: any) => d.month === '2025-05')
    expect(mayData).toBeDefined()
    expect(mayData.Grüne).toBe(1)
  })

  it('handles database errors', async () => {
    const mockQueryBuilder = {
      select: jest.fn().mockReturnThis(),
      not: jest.fn().mockReturnThis(),
      neq: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      lte: jest.fn().mockReturnThis(),
      then: jest.fn((resolve) => resolve({ data: null, error: { message: 'DB Error' } })),
    }

    ;(supabase.from as jest.Mock).mockReturnValue(mockQueryBuilder)

    const req = new Request('http://localhost:3000/api/party-timeline') as unknown as NextRequest
    const res = await GET(req)
    const json = await res.json()

    expect(res.status).toBe(500)
    expect(json.success).toBe(false)
  })
})
