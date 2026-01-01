import { render, screen } from '@testing-library/react'
import LastShowTable from '@/components/LastShowTable'
import { EpisodeData } from '@/types'

// Mock Tooltip components from UI library
jest.mock('@/components/ui/tooltip', () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TooltipTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TooltipContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

// Mock PoliticianModal to avoid complex sub-renders
jest.mock('@/components/PoliticianModal', () => {
  return function MockPoliticianModal({ politicianName }: { politicianName: string }) {
    return <span data-testid="politician-name">{politicianName}</span>
  }
})

describe('LastShowTable', () => {
  const mockEpisodes: EpisodeData[] = [
    {
      episode_date: '2024-01-15',
      politician_count: 2,
      politicians: [
        { name: 'Politician A', party_name: 'SPD', politician_id: 1 },
        { name: 'Politician B', party_name: 'CDU', politician_id: 2 },
      ],
      episode_url: 'https://example.com/ep1',
      topic_id: 1,
      topic: 'Test Topic',
    },
    {
      episode_date: '2024-01-16',
      politician_count: 0,
      politicians: [],
      episode_url: null,
      topic_id: 2,
      topic: 'Test Topic 2',
    },
  ]

  it('renders episode dates and counts', () => {
    render(<LastShowTable episodes={mockEpisodes} />)

    const dateElements = screen.getAllByText('15.01.2024')
    expect(dateElements.length).toBeGreaterThan(0)
    
    const secondDateElements = screen.getAllByText('16.01.2024')
    expect(secondDateElements.length).toBeGreaterThan(0)
  })

  it('renders politician names', () => {
    render(<LastShowTable episodes={mockEpisodes} />)
    
    expect(screen.getAllByText('Politician A').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Politician B').length).toBeGreaterThan(0)
  })

  it('renders empty state message', () => {
    render(<LastShowTable episodes={mockEpisodes} />)
    // The component renders "Keine Politik-Gäste" for episodes with no politicians
    // Note: It might be rendered twice (mobile and desktop view)
    const emptyMessages = screen.getAllByText('Keine Politik-Gäste')
    expect(emptyMessages.length).toBeGreaterThan(0)
  })

  it('renders links for episodes with URL', () => {
    render(<LastShowTable episodes={mockEpisodes} />)
    const links = screen.getAllByText(/Episode öffnen/i)
    expect(links.length).toBeGreaterThan(0)
    // Verify href attribute if possible, or just presence
    const linkElement = links[0].closest('a')
    expect(linkElement).toHaveAttribute('href', 'https://example.com/ep1')
  })
})
