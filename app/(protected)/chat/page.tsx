import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import ChatInterface from '@/components/chat/ChatInterface'

/**
 * Chat Page
 *
 * Protected route - main chat interface with Claude Sonnet 4.5.
 * Features educational tutoring with streaming responses.
 */

export const metadata = {
  title: 'Chat - MemoryLoop',
}

export default async function ChatPage() {
  const session = await auth()

  if (!session?.user?.id) {
    redirect('/login')
  }

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      <ChatInterface userId={session.user.id} />
    </div>
  )
}
