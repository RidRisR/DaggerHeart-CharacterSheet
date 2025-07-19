import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '../utils/test-utils'
import userEvent from '@testing-library/user-event'
import { createMockCard } from '../utils/mocks'

// 示例组件 - 实际测试时替换为真实组件
function CardDisplay({ card }: { card: any }) {
  return (
    <div>
      <h3>{card.name}</h3>
      <p>{card.description}</p>
      <span data-testid="card-type">{card.type}</span>
    </div>
  )
}

describe('CardDisplay Component', () => {
  it('should render card information', () => {
    const mockCard = createMockCard({
      name: 'Test Card',
      description: 'Test description',
      type: 'ancestry'
    })
    
    render(<CardDisplay card={mockCard} />)
    
    expect(screen.getByText('Test Card')).toBeInTheDocument()
    expect(screen.getByText('Test description')).toBeInTheDocument()
    expect(screen.getByTestId('card-type')).toHaveTextContent('ancestry')
  })

  it('should handle missing card data gracefully', () => {
    const mockCard = createMockCard({
      name: 'Minimal Card',
      description: '',
    })
    
    render(<CardDisplay card={mockCard} />)
    
    expect(screen.getByText('Minimal Card')).toBeInTheDocument()
    // 空描述应该渲染空的 p 标签
    const description = screen.getByText('Minimal Card').parentElement?.querySelector('p')
    expect(description).toBeInTheDocument()
    expect(description).toHaveTextContent('')
  })
})