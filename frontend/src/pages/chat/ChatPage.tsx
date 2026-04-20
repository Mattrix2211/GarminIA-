import { useState, useRef, useEffect } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { apiStreamPost } from '@/lib/api'
import styles from './ChatPage.module.css'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
}

export function ChatPage() {
  const { user } = useAuthStore()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function handleSend() {
    if (!input.trim() || streaming || !user) return

    const userMessage: Message = { id: crypto.randomUUID(), role: 'user', content: input }
    const assistantId = crypto.randomUUID()

    setMessages(m => [...m, userMessage, { id: assistantId, role: 'assistant', content: '' }])
    setInput('')
    setStreaming(true)

    abortRef.current = new AbortController()

    try {
      await apiStreamPost(
        '/api/chat',
        { message: input, history: messages.slice(-10) },
        (chunk) => {
          setMessages(m =>
            m.map(msg => msg.id === assistantId
              ? { ...msg, content: msg.content + chunk }
              : msg
            )
          )
        },
        abortRef.current.signal,
      )
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        setMessages(m =>
          m.map(msg => msg.id === assistantId
            ? { ...msg, content: 'Erreur de connexion. Réessaie.' }
            : msg
          )
        )
      }
    } finally {
      setStreaming(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1>Coach IA</h1>
      </header>

      <div className={styles.messages}>
        {messages.length === 0 && (
          <div className={styles.empty}>
            <p>Parle à ton coach. Il connaît tes données et ton historique.</p>
            <div className={styles.suggestions}>
              {[
                'Pourquoi je suis fatigué cette semaine ?',
                'Est-ce que je progresse ?',
                'Donne-moi un conseil pour mon seuil',
              ].map(s => (
                <button key={s} className={styles.suggestion} onClick={() => setInput(s)}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map(msg => (
          <div key={msg.id} className={`${styles.message} ${styles[msg.role]}`}>
            <p>{msg.content}{msg.role === 'assistant' && streaming && !msg.content ? '…' : ''}</p>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div className={styles.inputBar}>
        <textarea
          className={styles.input}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Écris à ton coach…"
          rows={1}
          disabled={streaming}
        />
        <button
          className={styles.sendBtn}
          onClick={handleSend}
          disabled={!input.trim() || streaming}
        >
          ↑
        </button>
      </div>
    </div>
  )
}
