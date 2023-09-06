'use client'

import { useChat, type Message } from 'ai/react'

import { cn } from '@/lib/utils'
import { ChatList } from '@/components/chat-list'
import { ChatPanel } from '@/components/chat-panel'
import { EmptyScreen } from '@/components/empty-screen'
import { ChatScrollAnchor } from '@/components/chat-scroll-anchor'
import { useLocalStorage } from '@/lib/hooks/use-local-storage'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { useEffect, useState } from 'react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { toast } from 'react-hot-toast'
import { pineconeCLientIndex, pineconeFormat } from '@/app/actions'
import { usePathname } from 'next/navigation'

const IS_PREVIEW = process.env.VERCEL_ENV === 'preview'
export interface ChatProps extends React.ComponentProps<'div'> {
  initialMessages?: Message[]
  id?: string
}

export function Chat({ id, initialMessages, className }: ChatProps) {
  const [previewToken, setPreviewToken] = useLocalStorage<string | null>(
    'ai-token',
    null
  )
  const [previewTokenDialog, setPreviewTokenDialog] = useState(IS_PREVIEW)
  const [previewTokenInput, setPreviewTokenInput] = useState(previewToken ?? '')
  const [lock, setLock] = useState<boolean>(false);
  const [masterTrigger, setMasterTrigger] = useState<boolean>(false);
  const pathname = usePathname();
  const { messages, setMessages, append, reload, stop, isLoading, input, setInput } =
    useChat({
      initialMessages,
      id,
      body: {
        id,
        previewToken
      },
      onResponse(response) {
        if (response.status === 401) {
          toast.error(response.statusText)
        }
      }
    })

    const self_loop = async () => {
      setLock(true);
      const query_to_vector = messages[messages.length - 1].role === 'assistant' ? messages[messages.length - 1].content : messages[messages.length - 2].content
      const response1 = await fetch('/api/embedding', {
        method: 'POST',
        body: JSON.stringify({
          message: query_to_vector
        })
      })
      const vector_query = await response1.json()
      const response2 = await pineconeCLientIndex(await vector_query.embedding);
      const new_search_query = await pineconeFormat(await response2);
      console.log(response2, new_search_query);
      setMessages([...messages, {
        id: 'new',
        role: 'user',
        content: new_search_query
      }])

      reload();
      // append({
      //   id: 'new',
      //   role: 'user',
      //   content: new_search_query
      // })
    }

    useEffect(() => {
      const decideToLoop = pathname.slice(0, 5) === '/chat' ? masterTrigger : messages.length > 3 && !lock && !isLoading;
      if (decideToLoop || masterTrigger) {
        self_loop();
      }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [messages, isLoading, masterTrigger])
  return (
    <>
      <div className={cn('pb-[200px] pt-4 md:pt-10', className)}>
        {messages.length ? (
          <>
            <ChatList messages={messages} />
            <ChatScrollAnchor trackVisibility={isLoading} />
          </>
        ) : (
          <EmptyScreen setInput={setInput} />
        )}
      </div>
      <ChatPanel
        id={id}
        isLoading={isLoading}
        stop={stop}
        append={append}
        reload={reload}
        messages={messages}
        input={input}
        setInput={setInput}
        setMasterTrigger={setMasterTrigger}
      />

      <Dialog open={previewTokenDialog} onOpenChange={setPreviewTokenDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enter your OpenAI Key</DialogTitle>
            <DialogDescription>
              If you have not obtained your OpenAI API key, you can do so by{' '}
              <a
                href="https://platform.openai.com/signup/"
                className="underline"
              >
                signing up
              </a>{' '}
              on the OpenAI website. This is only necessary for preview
              environments so that the open source community can test the app.
              The token will be saved to your browser&apos;s local storage under
              the name <code className="font-mono">ai-token</code>.
            </DialogDescription>
          </DialogHeader>
          <Input
            value={previewTokenInput}
            placeholder="OpenAI API key"
            onChange={e => setPreviewTokenInput(e.target.value)}
          />
          <DialogFooter className="items-center">
            <Button
              onClick={() => {
                setPreviewToken(previewTokenInput)
                setPreviewTokenDialog(false)
              }}
            >
              Save Token
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
