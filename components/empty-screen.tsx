import { UseChatHelpers } from 'ai/react'

import { Button } from '@/components/ui/button'
import { ExternalLink } from '@/components/external-link'
import { IconArrowRight } from '@/components/ui/icons'

const exampleMessages = [
  {
    heading: 'Agriculture Patent',
    message: `Think of a new Patent idea for agriculture welfare`
  },
  {
    heading: 'Hallucinate on a new Patent idea',
    message: 'Hallucinate on a new Patent idea'
  }
]

export function EmptyScreen({ setInput }: Pick<UseChatHelpers, 'setInput'>) {
  return (
    <div className="mx-auto max-w-2xl px-4">
      <div className="rounded-lg border bg-background p-8">
        <h1 className="mb-2 text-lg font-semibold">
          Welcome to Self Agent!
        </h1>
        <p className="mb-2 leading-normal text-muted-foreground">
          This is a private self-thinking patent generator. Made by {' '}
          <ExternalLink href="https://rankjay.com">Jay Rank</ExternalLink> and{' '}
          <ExternalLink href="https://vercel.com/storage/kv">
            Aamir Patel
          </ExternalLink>
          .
        </p>
        <p className="leading-normal text-muted-foreground">
          You can start a conversation here or try the following examples:
        </p>
        <div className="mt-4 flex flex-col items-start space-y-2">
          {exampleMessages.map((message, index) => (
            <Button
              key={index}
              variant="link"
              className="h-auto p-0 text-base"
              onClick={() => setInput(message.message)}
            >
              <IconArrowRight className="mr-2 text-muted-foreground" />
              {message.heading}
            </Button>
          ))}
        </div>
      </div>
    </div>
  )
}
