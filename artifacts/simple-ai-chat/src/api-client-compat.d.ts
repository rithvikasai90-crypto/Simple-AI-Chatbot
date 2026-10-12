declare module '@workspace/api-client-react' {
  export interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
  }

  export interface ChatReply {
    content: string;
  }

  export function useSendChatMessage(): {
    isPending: boolean;
    mutate: (
      variables: { data: { messages: ChatMessage[] } },
      options?: {
        onSuccess?: (reply: ChatReply) => void;
        onError?: () => void;
      },
    ) => void;
    reset: () => void;
  };
}
