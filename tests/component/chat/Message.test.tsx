import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import Message from '@/components/chat/Message'
import type { Message as MessageType } from '@/types'

/**
 * Component Tests for Message Component
 *
 * Tests rendering of user and assistant messages with streaming states.
 */

describe('Message Component', () => {
  const mockUserMessage: MessageType = {
    id: 'user-msg-1',
    conversationId: 'conv-1',
    userId: 'user-1',
    role: 'user',
    content: 'Hello, can you help me?',
    embedding: null,
    createdAt: Date.now(),
    hasFlashcards: false,
  }

  const mockAssistantMessage: MessageType = {
    id: 'assistant-msg-1',
    conversationId: 'conv-1',
    userId: 'user-1',
    role: 'assistant',
    content: 'Of course! How can I assist you today?',
    embedding: null,
    createdAt: Date.now(),
    hasFlashcards: false,
  }

  describe('User messages', () => {
    it('should render user message with correct content', () => {
      render(<Message message={mockUserMessage} />)

      expect(screen.getByText('Hello, can you help me?')).toBeInTheDocument()
      expect(screen.getByText('You')).toBeInTheDocument()
    })

    it('should apply user styling', () => {
      render(<Message message={mockUserMessage} />)

      const messageElement = screen.getByTestId('chat-message')
      expect(messageElement).toHaveAttribute('data-role', 'user')
      expect(messageElement).toHaveClass('justify-end')
    })

    it('should display timestamp', () => {
      render(<Message message={mockUserMessage} />)

      const timestamp = new Date(mockUserMessage.createdAt).toLocaleTimeString(
        [],
        {
          hour: '2-digit',
          minute: '2-digit',
        }
      )

      expect(screen.getByText(timestamp)).toBeInTheDocument()
    })
  })

  describe('Assistant messages', () => {
    it('should render assistant message with correct content', () => {
      render(<Message message={mockAssistantMessage} />)

      expect(
        screen.getByText('Of course! How can I assist you today?')
      ).toBeInTheDocument()
      expect(screen.getByText('Claude')).toBeInTheDocument()
    })

    it('should apply assistant styling', () => {
      render(<Message message={mockAssistantMessage} />)

      const messageElement = screen.getByTestId('chat-message')
      expect(messageElement).toHaveAttribute('data-role', 'assistant')
      expect(messageElement).toHaveClass('justify-start')
    })
  })

  describe('Streaming state', () => {
    it('should show streaming indicator when isStreaming is true', () => {
      render(<Message message={mockAssistantMessage} isStreaming={true} />)

      const container = screen.getByTestId('chat-message')
      expect(container.querySelector('.animate-pulse')).toBeInTheDocument()
    })

    it('should not show streaming indicator when isStreaming is false', () => {
      render(<Message message={mockAssistantMessage} isStreaming={false} />)

      const container = screen.getByTestId('chat-message')
      expect(container.querySelector('.animate-pulse')).not.toBeInTheDocument()
    })

    it('should not show streaming indicator by default', () => {
      render(<Message message={mockAssistantMessage} />)

      const container = screen.getByTestId('chat-message')
      expect(container.querySelector('.animate-pulse')).not.toBeInTheDocument()
    })
  })

  describe('Content formatting', () => {
    it('should preserve whitespace and line breaks', () => {
      const multilineMessage: MessageType = {
        ...mockUserMessage,
        content: 'Line 1\nLine 2\n\nLine 3',
      }

      const { container } = render(<Message message={multilineMessage} />)

      // Find element with whitespace-pre-wrap class that contains our content
      const content = container.querySelector('.whitespace-pre-wrap')
      expect(content).toBeInTheDocument()
      expect(content).toHaveTextContent('Line 1')
      expect(content).toHaveTextContent('Line 2')
      expect(content).toHaveTextContent('Line 3')
    })

    it('should handle long content', () => {
      const longMessage: MessageType = {
        ...mockUserMessage,
        content: 'a'.repeat(1000),
      }

      render(<Message message={longMessage} />)

      expect(screen.getByText('a'.repeat(1000))).toBeInTheDocument()
    })
  })
})
