export type User = {
  id: string;
  email: string;
  created_at: string;
};

export type Conversation = {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
};

export type AttachedFile = {
  id: string;
  name: string;
  media_type: string;
  size_bytes: number;
};

export type ToolCall = {
  name: string;
  arguments: Record<string, unknown>;
  result: string;
};

export type ChatMessage = {
  id: string;
  conversation_id: string;
  role: string;
  content: string;
  status: string;
  created_at: string;
  updated_at: string;
  files?: AttachedFile[];
  web_search?: boolean;
  tool_calls?: ToolCall[];
};

export type ApiErrorBody = {
  error: {
    code: string;
    message: string;
  };
};
