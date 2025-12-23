import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'

describe('LoadingSpinner', () => {
  it('renders without crashing', () => {
    render(<LoadingSpinner />)
    const spinner = screen.getByRole('status')
    expect(spinner).toBeInTheDocument()
  })

  it('has accessible loading text', () => {
    render(<LoadingSpinner />)
    const loadingText = screen.getByText(/loading/i)
    expect(loadingText).toBeInTheDocument()
  })

  it('displays visible loading text', () => {
    render(<LoadingSpinner />)
    const loadingText = screen.getByText(/loading/i)
    expect(loadingText).toBeVisible()
  })

  it('renders spinner element with animate-spin class', () => {
    const { container } = render(<LoadingSpinner />)
    const spinnerElement = container.querySelector('.animate-spin')
    expect(spinnerElement).toBeInTheDocument()
  })

  it('has proper ARIA role for accessibility', () => {
    render(<LoadingSpinner />)
    const spinner = screen.getByRole('status')
    expect(spinner).toHaveAttribute('role', 'status')
  })

  it('renders with correct Tailwind classes for styling', () => {
    const { container } = render(<LoadingSpinner />)
    const wrapper = container.querySelector('.flex.items-center.justify-center')
    expect(wrapper).toBeInTheDocument()
  })

  it('renders rounded spinner border', () => {
    const { container } = render(<LoadingSpinner />)
    const spinnerElement = container.querySelector('.rounded-full')
    expect(spinnerElement).toBeInTheDocument()
  })
})
