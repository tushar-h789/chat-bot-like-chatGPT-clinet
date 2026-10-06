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

export type ChatMessage = {
  id: string;
  conversation_id: string;
  role: string;
  content: string;
  status: string;
  created_at: string;
  updated_at: string;
};

export type ApiErrorBody = {
  error: {
    code: string;
    message: string;
  };
};
