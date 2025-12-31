'use client'

import { useEffect, useRef } from 'react'
import FlashcardMode from './FlashcardMode'
import MultipleChoiceModeWrapper from './MultipleChoiceModeWrapper'

/**
 * MixedMode Component
 *
 * Renders either MultipleChoiceMode or FlashcardMode based on card type
 * and distractor availability.
 *
 * Per spec 017-multi-choice-distractors:
 * - Uses MC mode when card has 3+ distractors
 * - Falls back to flashcard mode if distractors unavailable
 * - Shows toast notification on fallback (T039)
 */

interface StudyCard {
  id: string
  question: string
  answer: string
  cardType: 'flashcard' | 'multiple_choice'
  distractors?: string[]
  distractorsJobId?: string
}

interface MixedModeProps {
  cards: StudyCard[]
  currentIndex: number
  onRate: (rating: 1 | 2 | 3 | 4, responseTimeMs?: number) => void
  distractorsFailed?: boolean // T035, T037: Flag indicating distractor generation failed
  onFallbackNotify?: () => void // T039: Callback to show toast notification
}

export default function MixedMode({
  cards,
  currentIndex,
  onRate,
  distractorsFailed = false,
  onFallbackNotify,
}: MixedModeProps) {
  const currentCard = cards[currentIndex]
  const notifiedRef = useRef<string | null>(null)

  // T039: Show toast notification when falling back due to distractor failure
  useEffect(() => {
    if (
      distractorsFailed &&
      currentCard &&
      currentCard.cardType === 'multiple_choice' &&
      notifiedRef.current !== currentCard.id &&
      onFallbackNotify
    ) {
      notifiedRef.current = currentCard.id
      onFallbackNotify()
    }
  }, [distractorsFailed, currentCard, onFallbackNotify])

  if (!currentCard) {
    return null
  }

  // T037-T038: Use MultipleChoiceModeWrapper for MC cards
  // The wrapper handles:
  // 1. Background distractor generation
  // 2. Fallback to flashcard mode on failure
  // 3. Checking for valid distractors
  if (currentCard.cardType === 'multiple_choice') {
    return (
      <MultipleChoiceModeWrapper
        question={currentCard.question}
        answer={currentCard.answer}
        distractors={currentCard.distractors}
        distractorsJobId={currentCard.distractorsJobId}
        onRate={(rating, responseTimeMs) => onRate(rating, responseTimeMs)}
        cardNumber={currentIndex + 1}
        totalCards={cards.length}
      />
    )
  }

  // Flashcard mode for non-MC cards
  return (
    <FlashcardMode
      question={currentCard.question}
      answer={currentCard.answer}
      onRate={onRate}
      cardNumber={currentIndex + 1}
      totalCards={cards.length}
    />
  )
}
