import { render, screen } from '@testing-library/react'
import Footer from '@/components/Footer'

describe('Footer', () => {
  it('renders the footer text', () => {
    render(<Footer />)
    expect(screen.getByText(/Daten basierend auf/i)).toBeInTheDocument()
    expect(screen.getByText(/Abgeordnetenwatch.de/i)).toBeInTheDocument()
    expect(screen.getByText(/Datenschutz/i)).toBeInTheDocument()
    expect(screen.getByText(/Impressum/i)).toBeInTheDocument()
  })
})
