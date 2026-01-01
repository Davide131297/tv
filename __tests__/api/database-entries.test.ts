import { GET } from '@/app/api/database-entries/route'
import { NextRequest } from 'next/server'
import { supabase } from '@/lib/supabase'

// Mock supabase
jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(),
  },
}))

describe('GET /api/database-entries', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('returns paginated entries', async () => {
    const mockData = [
      { id: 1, politician_name: 'Test 1' },
      { id: 2, politician_name: 'Test 2' },
    ]
    const mockCount = 100

    const mockQueryBuilder = {
      select: jest.fn().mockReturnThis(),
      range: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      neq: jest.fn().mockReturnThis(),
      then: jest.fn((resolve) => resolve({ data: mockData, error: null, count: mockCount })),
    }

    ;(supabase.from as jest.Mock).mockReturnValue(mockQueryBuilder)

    const req = new Request('http://localhost:3000/api/database-entries?page=1&limit=10') as unknown as NextRequest
    const res = await GET(req)
    const json = await res.json()

    expect(json.entries).toHaveLength(2)
    expect(json.totalCount).toBe(100)
    expect(json.page).toBe(1)
    expect(json.limit).toBe(10)
    expect(json.totalPages).toBe(10)
    
    // Check if range was called correctly
    expect(mockQueryBuilder.range).toHaveBeenCalledWith(0, 9)
  })

  it('calculates correct offset for page 2', async () => {
    const mockQueryBuilder = {
      select: jest.fn().mockReturnThis(),
      range: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      neq: jest.fn().mockReturnThis(),
      then: jest.fn((resolve) => resolve({ data: [], error: null, count: 0 })),
    }

    ;(supabase.from as jest.Mock).mockReturnValue(mockQueryBuilder)

    const req = new Request('http://localhost:3000/api/database-entries?page=2&limit=20') as unknown as NextRequest
    await GET(req)

    // offset = (2-1)*20 = 20. limit = 20. end = 20+20-1 = 39.
    expect(mockQueryBuilder.range).toHaveBeenCalledWith(20, 39)
  })
})
