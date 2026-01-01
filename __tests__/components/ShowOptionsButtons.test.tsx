import { render, screen, fireEvent } from '@testing-library/react'
import ShowOptionsButtons, { getChannelButtonColor, getShowButtonColor } from '@/components/ShowOptionsButtons'

describe('ShowOptionsButtons', () => {
  it('renders all show buttons when withAll is true', () => {
    const onShowChange = jest.fn()
    render(
      <ShowOptionsButtons 
        onShowChange={onShowChange} 
        selectedShow="all" 
        withAll={true} 
      />
    )

    // Check for "Insgesamt" button (which usually corresponds to "all")
    // If "Insgesamt" is not found, it might be "Alle Shows" or similar in the types
    // Let's check for "Alle" or similar if "Insgesamt" fails
    const allButtons = screen.getAllByText(/Alle Shows/i)
    expect(allButtons.length).toBeGreaterThan(0)
    
    // Check for some other shows
    expect(screen.getAllByText('Markus Lanz').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Maybrit Illner').length).toBeGreaterThan(0)
  })

  it('renders without "Insgesamt" when withAll is false', () => {
    const onShowChange = jest.fn()
    render(
      <ShowOptionsButtons 
        onShowChange={onShowChange} 
        selectedShow="Markus Lanz" 
        withAll={false} 
      />
    )

    expect(screen.queryByText('Alle Shows')).not.toBeInTheDocument()
    expect(screen.getByText('Markus Lanz')).toBeInTheDocument()
  })

  it('calls onShowChange when a button is clicked', () => {
    const onShowChange = jest.fn()
    render(
      <ShowOptionsButtons 
        onShowChange={onShowChange} 
        selectedShow="all" 
      />
    )

    const lanzButton = screen.getByText('Markus Lanz')
    fireEvent.click(lanzButton)

    expect(onShowChange).toHaveBeenCalledWith('Markus Lanz')
  })

  it('applies correct colors helper functions', () => {
    expect(getChannelButtonColor('ZDF')).toContain('bg-yellow-100')
    expect(getShowButtonColor('Markus Lanz')).toContain('bg-orange-100')
    expect(getShowButtonColor('all')).toContain('bg-black')
  })
})
