import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { useSendChatMessage } from '@workspace/api-client-react';
import type { ChatMessage } from '@workspace/api-client-react';
import { ArrowDown, ArrowUp, Check, CircleHelp, Clock3, Lightbulb, Plus, Sparkles, X } from 'lucide-react';

const STORAGE_KEY = 'plainspoken-conversation-v1';
const suggestions = [
  { title: 'Make this clearer', prompt: 'How can I make a piece of writing clearer and easier to follow?' },
  { title: 'Plan something', prompt: 'Help me make a simple, realistic plan for a productive week.' },
  { title: 'Explain a big idea', prompt: 'Explain compound interest in a way that feels intuitive.' },
];

function readConversation(): ChatMessage[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return [];
    const parsed: unknown = JSON.parse(saved);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is ChatMessage =>
        item && (item.role === 'user' || item.role === 'assistant') && typeof item.content === 'string',
    );
  } catch {
    return [];
  }
}

export default function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>(readConversation);
  const [draft, setDraft] = useState('');
  const [failedRequest, setFailedRequest] = useState<ChatMessage[] | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const mutation = useSendChatMessage();
  const isPending = mutation.isPending;

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    } catch {
      // The conversation stays usable if browser storage is unavailable.
    }
  }, [messages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, isPending, failedRequest]);

  const submitMessages = (requestHistory: ChatMessage[]) => {
    setFailedRequest(null);
    mutation.mutate(
      { data: { messages: requestHistory.slice(-24) } },
      {
        onSuccess: (reply) => {
          setMessages([...requestHistory, { role: 'assistant', content: reply.content }]);
          setFailedRequest(null);
        },
        onError: () => setFailedRequest(requestHistory),
      },
    );
  };

  const send = (content: string) => {
    const trimmed = content.trim();
    if (!trimmed || isPending) return;
    const next = [...messages, { role: 'user' as const, content: trimmed }];
    setMessages(next);
    setDraft('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
    submitMessages(next);
  };

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    send(draft);
  };

  const onComposerKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      send(draft);
    }
  };

  const clearConversation = () => {
    setMessages([]);
    setFailedRequest(null);
    setDraft('');
    setConfirmClear(false);
    mutation.reset();
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Clearing in-memory state is still sufficient for this session.
    }
    textareaRef.current?.focus();
  };

  const isEmpty = messages.length === 0;

  return (
    <div className="chat-shell flex min-h-[100dvh] flex-col text-foreground">
      <header className="chat-topbar sticky top-0 z-20 flex shrink-0 items-center justify-between px-5 sm:px-8">
        <div className="flex items-center gap-3">
          <div className="chat-brand-mark" aria-hidden="true">
            <Sparkles size={16} strokeWidth={1.8} />
          </div>
          <div className="leading-tight">
            <div className="font-semibold tracking-[-0.035em]">Plainspoken</div>
            <div className="mt-1 text-[11px] font-medium tracking-[0.08em] text-muted-foreground">A LITTLE HELP, RIGHT HERE</div>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setConfirmClear(true)}
          disabled={isEmpty || isPending}
          data-testid="button-new-conversation"
          className="group flex items-center gap-2 rounded-full border border-border bg-card/70 px-3.5 py-2 text-[13px] font-medium text-foreground transition hover:border-foreground/25 hover:bg-card disabled:cursor-not-allowed disabled:opacity-40 sm:px-4"
        >
          <Plus size={15} className="text-muted-foreground transition group-hover:text-accent" />
          <span className="hidden sm:inline">New conversation</span>
          <span className="sm:hidden">New</span>
        </button>
      </header>

      <main className="flex flex-1 flex-col px-4 sm:px-7">
        {isEmpty ? (
          <section className="chat-content flex flex-1 flex-col justify-center pb-8 pt-12 sm:pb-12 sm:pt-16">
            <div className="message-enter mb-8 sm:mb-10">
              <div className="mb-5 flex h-10 w-10 items-center justify-center rounded-full border border-accent/20 bg-accent/10 text-accent">
                <Sparkles size={18} strokeWidth={1.8} />
              </div>
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.19em] text-accent">Your open tab for ideas</p>
              <h1 className="chat-heading max-w-[620px] text-[clamp(2.7rem,8vw,4.45rem)] font-semibold leading-[0.99] text-foreground">
                What can I help<br className="hidden sm:block" /> you figure out?
              </h1>
              <p className="mt-5 max-w-[420px] text-[15px] leading-7 text-muted-foreground">
                Ask a question, untangle a thought, or get a first draft. Start wherever you are.
              </p>
            </div>
            <div className="grid gap-2.5 sm:grid-cols-3">
              {suggestions.map((item, index) => (
                <button
                  type="button"
                  key={item.title}
                  onClick={() => send(item.prompt)}
                  data-testid={`button-suggestion-${index}`}
                  className="suggestion-card group flex min-h-[89px] flex-col items-start justify-between rounded-[15px] border border-border/80 bg-card/70 p-4 text-left hover:border-accent/40 hover:bg-card"
                >
                  <span className="text-[13px] font-semibold tracking-[-0.015em] text-foreground">{item.title}</span>
                  <span className="flex w-full items-center justify-between text-[11px] text-muted-foreground">
                    <span>Try a question</span>
                    <ArrowUp size={13} className="-rotate-45 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-accent" />
                  </span>
                </button>
              ))}
            </div>
            <div className="mt-8 flex items-center gap-2 text-[12px] text-muted-foreground/80">
              <Clock3 size={13} />
              <span>Your conversation is saved on this device.</span>
            </div>
          </section>
        ) : (
          <section className="chat-content flex-1 pb-8 pt-8 sm:pt-11" aria-label="Conversation">
            <div className="mb-8 flex items-center gap-2 border-b border-border/70 pb-4 text-[11px] font-medium uppercase tracking-[0.15em] text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-accent" />
              Conversation
              <span className="ml-auto normal-case tracking-normal">{messages.length} {messages.length === 1 ? 'message' : 'messages'}</span>
            </div>
            <div className="space-y-8">
              {messages.map((message, index) => (
                <article key={`${index}-${message.role}`} data-testid={`message-${message.role}-${index}`} className="message-enter flex gap-3.5 sm:gap-4">
                  <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${message.role === 'assistant' ? 'bg-primary text-primary-foreground' : 'border border-border bg-card text-muted-foreground'}`}>
                    {message.role === 'assistant' ? <Sparkles size={14} /> : <span className="text-[10px] font-semibold">YOU</span>}
                  </div>
                  <div className="min-w-0 flex-1 pt-1">
                    <div className="mb-2 text-[12px] font-semibold text-foreground">{message.role === 'assistant' ? 'Plainspoken' : 'You'}</div>
                    <p className="whitespace-pre-wrap break-words text-[14px] leading-[1.8] text-foreground/90 sm:text-[15px]">{message.content}</p>
                  </div>
                </article>
              ))}
              {isPending && (
                <div className="message-enter flex gap-3.5 sm:gap-4" data-testid="status-generating">
                  <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground"><Sparkles size={14} /></div>
                  <div className="pt-1">
                    <div className="mb-3 text-[12px] font-semibold">Plainspoken</div>
                    <div className="flex items-center gap-1.5 rounded-full bg-card px-3.5 py-2.5">
                      <span className="typing-dot h-1.5 w-1.5 rounded-full bg-accent" />
                      <span className="typing-dot h-1.5 w-1.5 rounded-full bg-accent" />
                      <span className="typing-dot h-1.5 w-1.5 rounded-full bg-accent" />
                    </div>
                  </div>
                </div>
              )}
              {failedRequest && !isPending && (
                <div role="alert" data-testid="status-send-error" className="message-enter ml-11 rounded-2xl border border-destructive/20 bg-destructive/5 p-4 sm:ml-12">
                  <div className="flex items-start gap-2.5">
                    <CircleHelp size={17} className="mt-0.5 shrink-0 text-destructive" />
                    <div className="flex-1">
                      <p className="text-[13px] font-semibold text-foreground">That didn’t go through.</p>
                      <p className="mt-1 text-[12px] leading-5 text-muted-foreground">Your message is still here. Check your connection and give it another try.</p>
                      <button type="button" onClick={() => submitMessages(failedRequest)} data-testid="button-retry-send" className="mt-3 text-[12px] font-semibold text-accent underline decoration-accent/30 underline-offset-4 hover:decoration-accent">Try again</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div ref={bottomRef} />
          </section>
        )}
        <footer className="chat-content sticky bottom-0 z-10 w-full pb-[max(14px,env(safe-area-inset-bottom))] pt-3">
          <form onSubmit={onSubmit} className="composer-shadow rounded-[20px] border border-border/90 bg-card p-2 transition focus-within:border-primary/40 focus-within:ring-4 focus-within:ring-primary/5">
            <label htmlFor="chat-composer" className="sr-only">Ask Plainspoken a question</label>
            <textarea
              id="chat-composer"
              ref={textareaRef}
              value={draft}
              onChange={(event) => {
                setDraft(event.target.value);
                event.currentTarget.style.height = 'auto';
                event.currentTarget.style.height = `${Math.min(event.currentTarget.scrollHeight, 180)}px`;
              }}
              onKeyDown={onComposerKeyDown}
              maxLength={12000}
              rows={1}
              placeholder="Ask anything…"
              disabled={isPending}
              data-testid="input-chat-message"
              className="block max-h-[180px] min-h-[48px] w-full resize-none bg-transparent px-3.5 py-3 text-[14px] leading-6 text-foreground outline-none placeholder:text-muted-foreground/75 disabled:opacity-60 sm:px-4"
            />
            <div className="flex items-center justify-between px-2 pb-1 pt-0.5">
              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground/75">
                <Lightbulb size={13} />
                <span>Good questions can start small</span>
              </div>
              <button
                type="submit"
                disabled={!draft.trim() || isPending}
                data-testid="button-send-message"
                aria-label={isPending ? 'Sending message' : 'Send message'}
                className="flex h-9 w-9 items-center justify-center rounded-[12px] bg-primary text-primary-foreground transition hover:bg-primary/90 active:scale-95 disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground"
              >
                {isPending ? <span className="h-4 w-4 animate-pulse rounded-full border-2 border-current border-t-transparent" /> : <ArrowUp size={17} strokeWidth={2.2} />}
              </button>
            </div>
          </form>
          <p className="pb-1 pt-2 text-center text-[10px] tracking-[0.015em] text-muted-foreground/70">Enter to send · Shift + Enter for a new line</p>
        </footer>
      </main>

      {confirmClear && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/25 p-4 backdrop-blur-[3px]" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setConfirmClear(false); }}>
          <section role="dialog" aria-modal="true" aria-labelledby="clear-title" className="message-enter w-full max-w-[390px] rounded-[22px] border border-border bg-card p-6 shadow-2xl">
            <div className="flex items-start justify-between">
              <div>
                <div className="mb-4 flex h-9 w-9 items-center justify-center rounded-full bg-accent/10 text-accent"><Plus size={17} /></div>
                <h2 id="clear-title" className="chat-heading text-[23px] font-semibold">Start fresh?</h2>
              </div>
              <button type="button" onClick={() => setConfirmClear(false)} aria-label="Close dialog" data-testid="button-close-clear-dialog" className="rounded-full p-2 text-muted-foreground transition hover:bg-muted hover:text-foreground"><X size={16} /></button>
            </div>
            <p className="mt-2 text-[13px] leading-6 text-muted-foreground">This clears the conversation saved on this device. There’s no way to bring it back.</p>
            <div className="mt-6 flex justify-end gap-2">
              <button type="button" onClick={() => setConfirmClear(false)} data-testid="button-cancel-clear" className="rounded-full px-4 py-2.5 text-[12px] font-semibold text-muted-foreground transition hover:bg-muted hover:text-foreground">Keep chatting</button>
              <button type="button" onClick={clearConversation} data-testid="button-confirm-clear" className="flex items-center gap-2 rounded-full bg-primary px-4 py-2.5 text-[12px] font-semibold text-primary-foreground transition hover:bg-primary/90"><Check size={14} /> Clear conversation</button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
