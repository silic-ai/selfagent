'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { kv } from '@vercel/kv'
import { PineconeClient } from '@pinecone-database/pinecone'

import { auth } from '@/auth'
import { type Chat } from '@/lib/types'
import { QueryResponse } from '@pinecone-database/pinecone/dist/pinecone-generated-ts-fetch'

const pinecone = new PineconeClient()

export const pineconeFormat = (queryResponse: QueryResponse) => {
  let query = 'OLD PATENTS:\n\n'
  if (queryResponse.matches) {
    for (let i = 0; i < queryResponse.matches.length; i++) {
      const metadata = queryResponse.matches[i].metadata as Record<string, any>
      query += metadata.Abstract + "\n\n"
    }
  }

  query += 'Now hallucinate on the original patent idea I gave above, and think of a new patent idea based on this relevant old patents in similar field'

  return query;
}

export const pineconeCLientIndex = async (query: number[]) => {
  await pinecone.init({
    environment: 'gcp-starter',
    apiKey: '1f6cd3dc-3ac4-4d97-ac9e-fd54b626030f'
  })

  const index = pinecone.Index('text-patent-1')
  const queryResponse = await index.query({
    queryRequest: {
      namespace: '',
      topK: 10,
      includeValues: true,
      includeMetadata: true,
      vector: query
    }
  })

  return queryResponse
}

export async function getChats(userId?: string | null) {
  if (!userId) {
    return []
  }

  try {
    const pipeline = kv.pipeline()
    const chats: string[] = await kv.zrange(`user:chat:${userId}`, 0, -1, {
      rev: true
    })

    for (const chat of chats) {
      pipeline.hgetall(chat)
    }

    const results = await pipeline.exec()

    return results as Chat[]
  } catch (error) {
    return []
  }
}

export async function getChat(id: string, userId: string) {
  const chat = await kv.hgetall<Chat>(`chat:${id}`)

  if (!chat || (userId && chat.userId !== userId)) {
    return null
  }

  return chat
}

export async function removeChat({ id, path }: { id: string; path: string }) {
  const session = await auth()

  if (!session) {
    return {
      error: 'Unauthorized'
    }
  }

  const uid = await kv.hget<string>(`chat:${id}`, 'userId')

  if (uid !== session?.user?.id) {
    return {
      error: 'Unauthorized'
    }
  }

  await kv.del(`chat:${id}`)
  await kv.zrem(`user:chat:${session.user.id}`, `chat:${id}`)

  revalidatePath('/')
  return revalidatePath(path)
}

export async function clearChats() {
  const session = await auth()

  if (!session?.user?.id) {
    return {
      error: 'Unauthorized'
    }
  }

  const chats: string[] = await kv.zrange(`user:chat:${session.user.id}`, 0, -1)
  if (!chats.length) {
    return redirect('/')
  }
  const pipeline = kv.pipeline()

  for (const chat of chats) {
    pipeline.del(chat)
    pipeline.zrem(`user:chat:${session.user.id}`, chat)
  }

  await pipeline.exec()

  revalidatePath('/')
  return redirect('/')
}

export async function getSharedChat(id: string) {
  const chat = await kv.hgetall<Chat>(`chat:${id}`)

  if (!chat || !chat.sharePath) {
    return null
  }

  return chat
}

export async function shareChat(chat: Chat) {
  const session = await auth()

  if (!session?.user?.id || session.user.id !== chat.userId) {
    return {
      error: 'Unauthorized'
    }
  }

  const payload = {
    ...chat,
    sharePath: `/share/${chat.id}`
  }

  await kv.hmset(`chat:${chat.id}`, payload)

  return payload
}
