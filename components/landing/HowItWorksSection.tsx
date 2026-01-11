/**
 * HowItWorksSection Component
 *
 * Landing page section explaining the 3-step process of using Loopi.
 * Server component with responsive layout (vertical on mobile, horizontal on desktop).
 */

interface Step {
  number: number
  title: string
  description: string
}

const steps: Step[] = [
  {
    number: 1,
    title: 'Set Your Goal',
    description:
      'Enter what you want to learn. Loopi analyzes your goal and creates a personalized skill tree.',
  },
  {
    number: 2,
    title: 'Study with AI',
    description:
      'Each skill comes with AI-generated flashcards and explanations tailored to your level.',
  },
  {
    number: 3,
    title: 'Review & Remember',
    description:
      'Loopi schedules reviews based on how well you know each concept. The more you review, the less often you need to.',
  },
]

function StepCard({ step }: { step: Step }) {
  return (
    <div
      className={`landing-step landing-step-${step.number} flex flex-col items-center text-center flex-1`}
    >
      <div className="landing-step-number w-16 h-16 rounded-full bg-blue-600 dark:bg-blue-500 flex items-center justify-center mb-4">
        <span className="text-2xl font-bold text-white">{step.number}</span>
      </div>
      <h3 className="landing-step-title text-xl font-bold text-gray-900 dark:text-gray-100 mb-3">
        {step.title}
      </h3>
      <p className="landing-step-description text-gray-600 dark:text-gray-400 leading-relaxed max-w-sm">
        {step.description}
      </p>
    </div>
  )
}

export default function HowItWorksSection() {
  return (
    <section className="landing-how-it-works py-16 sm:py-24 bg-gray-50 dark:bg-gray-900">
      <div className="landing-how-it-works-container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="landing-how-it-works-heading text-3xl sm:text-4xl font-bold text-center text-gray-900 dark:text-gray-100 mb-12 sm:mb-16">
          How It Works
        </h2>

        <div className="landing-steps-grid flex flex-col lg:flex-row gap-12 lg:gap-8 items-center lg:items-start justify-center">
          {steps.map((step) => (
            <StepCard key={step.number} step={step} />
          ))}
        </div>
      </div>
    </section>
  )
}
