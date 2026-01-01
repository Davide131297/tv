import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import PoliticianTable from '@/components/PoliticianTable'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  usePathname: jest.fn(),
  useSearchParams: jest.fn(),
}))

// Mock fetch
global.fetch = jest.fn()

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

describe('PoliticianTable', () => {
  const mockData = [
    {
      id: '1',
      show_name: 'Markus Lanz',
      episode_date: '2024-01-20',
      politician_name: 'Kevin Kühnert',
      party_name: 'SPD',
      episode_url: 'https://example.com',
    },
  ]

  beforeEach(() => {
    jest.clearAllMocks()
    ;(useRouter as jest.Mock).mockReturnValue({ replace: jest.fn() })
    ;(usePathname as jest.Mock).mockReturnValue('/')
    ;(useSearchParams as jest.Mock).mockReturnValue(new URLSearchParams())
    
    ;(global.fetch as jest.Mock).mockResolvedValue({
      json: async () => ({ success: true, data: mockData }),
    })
  })

  it('renders table headers', async () => {
    render(<PoliticianTable />)
    
    // Headers should be visible
    expect(screen.getByText('Show')).toBeInTheDocument()
    expect(screen.getByText('Datum')).toBeInTheDocument()
    expect(screen.getByText('Politiker')).toBeInTheDocument()
    expect(screen.getByText('Partei')).toBeInTheDocument()
    
    await waitFor(() => {
        const elements = screen.getAllByText('Kevin Kühnert')
        expect(elements.length).toBeGreaterThan(0)
    })
  })

  it('fetches data on mount', async () => {
    render(<PoliticianTable />)
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(1)
    })
    // Check if URL contains default params
    const calledUrl = (global.fetch as jest.Mock).mock.calls[0][0]
    expect(calledUrl).toContain('/api/politics')
  })

  it('filters by show', async () => {
    render(<PoliticianTable />)
    
    // Find a button for a show, e.g. "Markus Lanz"
    // The component ShowOptionsButtons renders buttons.
    // We might need to look for the button text.
    // "Markus Lanz" might be inside a button.
    
    const lanzButton = screen.getByRole('button', { name: /Markus Lanz/i })
    fireEvent.click(lanzButton)
    
    await waitFor(() => {
        // fetch should be called again with new params or router.replace called
        const replace = useRouter().replace
        expect(replace).toHaveBeenCalled()
        // Or if it updates local state and refetches:
        // expect(global.fetch).toHaveBeenCalledTimes(2) 
    })
  })
})
