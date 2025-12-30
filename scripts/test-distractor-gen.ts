import { config } from 'dotenv'
import { resolve } from 'path'
config({ path: resolve(process.cwd(), '.env.local') })

async function testGen() {
  const { generateDistractors } = await import('../lib/ai/distractor-generator')

  console.log('Testing distractor generation...')
  console.log('ANTHROPIC_API_KEY set:', !!process.env.ANTHROPIC_API_KEY)

  const result = await generateDistractors('What is the capital of France?', 'Paris', {
    timeoutMs: 10000,
  })

  console.log('Result:', JSON.stringify(result, null, 2))
  process.exit(0)
}

testGen().catch((e) => {
  console.error('Error:', e)
  process.exit(1)
})
