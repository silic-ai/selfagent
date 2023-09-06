import { Configuration, OpenAIApi } from 'openai-edge'

import { auth } from '@/auth'
import { NextResponse } from 'next/server'

export const runtime = 'edge'

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY
})

const openai = new OpenAIApi(configuration)

export async function POST(req: Request) {
  const json = await req.json()
  const { message } = json
  const userId = (await auth())?.user.id

  if (!userId) {
    return new Response('Unauthorized', {
      status: 401
    })
  }

  const res = await openai.createEmbedding({
    model: 'text-embedding-ada-002',
    input: message,
  })

  const embedding = (await res.json()).data[0]
  return NextResponse.json({ embedding: embedding.embedding })
}
