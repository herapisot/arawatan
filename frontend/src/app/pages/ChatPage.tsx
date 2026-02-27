import { useState, useRef, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Avatar, AvatarFallback } from "../components/ui/avatar";
import { Badge } from "../components/ui/badge";
import {
  Send,
  Image as ImageIcon,
  ShieldCheck,
  AlertTriangle,
  Loader2,
  ArrowLeft,
  MessageCircle,
  Search,
} from "lucide-react";
import { chatApi } from "../services/api";
import { useAuth } from "../contexts/AuthContext";

interface MessageType {
  id: number;
  sender_id: number;
  text: string | null;
  image_path?: string | null;
  created_at: string;
  sender?: {
    id: number;
    full_name: string;
    first_name?: string;
    last_name?: string;
  };
}

interface ConversationType {
  id: number;
  item_id: number;
  participant_one_id: number;
  participant_two_id: number;
  other_participant: {
    id: number;
    full_name: string;
    first_name?: string;
    last_name?: string;
    campus?: string;
    is_verified?: boolean;
  };
  item?: {
    id: number;
    title: string;
    images?: { image_path: string }[];
  };
  latest_message?: {
    id: number;
    text: string | null;
    created_at: string;
    sender_id: number;
  };
  unread_count?: number;
  updated_at: string;
}

const STORAGE_URL = import.meta.env.VITE_STORAGE_URL || "http://localhost:8000/storage";

function getInitials(name?: string): string {
  if (!name) return "??";
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function timeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "now";
  if (diffMin < 60) return `${diffMin}m`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h`;
  const diffDays = Math.floor(diffHr / 24);
  if (diffDays < 7) return `${diffDays}d`;
  return date.toLocaleDateString();
}

export function ChatPage() {
  const { chatId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [conversations, setConversations] = useState<ConversationType[]>([]);
  const [activeConversation, setActiveConversation] = useState<ConversationType | null>(null);
  const [messages, setMessages] = useState<MessageType[]>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showConversationList, setShowConversationList] = useState(true);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  }, []);

  // Load conversations
  useEffect(() => {
    const loadConversations = async () => {
      try {
        const res = await chatApi.getConversations();
        const convs = res.data.data || res.data || [];
        setConversations(convs);

        // If chatId is provided, auto-select that conversation
        if (chatId) {
          const conv = convs.find((c: ConversationType) => c.id === Number(chatId));
          if (conv) {
            setActiveConversation(conv);
            setShowConversationList(false);
            await loadMessages(conv.id);
          }
        }
      } catch (err) {
        console.error("Failed to load conversations:", err);
      } finally {
        setLoading(false);
      }
    };
    loadConversations();
  }, [chatId]);

  // Poll for new messages when a conversation is active
  useEffect(() => {
    if (!activeConversation) return;

    pollingRef.current = setInterval(async () => {
      try {
        const res = await chatApi.getMessages(activeConversation.id);
        const fetched: MessageType[] = res.data.data || res.data || [];
        // Messages come in descending order from API, reverse for display
        const sorted = [...fetched].reverse();
        setMessages((prev) => {
          if (sorted.length !== prev.length || (sorted.length > 0 && sorted[sorted.length - 1]?.id !== prev[prev.length - 1]?.id)) {
            return sorted;
          }
          return prev;
        });
      } catch {
        // Silently fail on poll
      }
    }, 5000);

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [activeConversation?.id]);

  // Also poll conversations for unread counts
  useEffect(() => {
    const convPoll = setInterval(async () => {
      try {
        const res = await chatApi.getConversations();
        const convs = res.data.data || res.data || [];
        setConversations(convs);
      } catch {
        // Silently fail
      }
    }, 15000);

    return () => clearInterval(convPoll);
  }, []);

  const loadMessages = async (conversationId: number) => {
    setMessagesLoading(true);
    try {
      const res = await chatApi.getMessages(conversationId);
      const fetched: MessageType[] = res.data.data || res.data || [];
      // API returns latest first, we need oldest first for display
      setMessages([...fetched].reverse());
      scrollToBottom();
    } catch (err) {
      console.error("Failed to load messages:", err);
    } finally {
      setMessagesLoading(false);
    }
  };

  const selectConversation = async (conv: ConversationType) => {
    setActiveConversation(conv);
    setShowConversationList(false);
    navigate(`/chat/${conv.id}`, { replace: true });
    await loadMessages(conv.id);
  };

  const handleSend = async () => {
    if ((!message.trim() && !imageFile) || !activeConversation || sending) return;

    setSending(true);
    try {
      let data: FormData | { text: string };
      if (imageFile) {
        const formData = new FormData();
        formData.append("image", imageFile);
        if (message.trim()) formData.append("text", message.trim());
        data = formData;
      } else {
        data = { text: message.trim() };
      }

      const res = await chatApi.sendMessage(activeConversation.id, data);
      setMessages((prev) => [...prev, res.data]);
      setMessage("");
      setImageFile(null);
      setImagePreview(null);
      scrollToBottom();

      // Update conversation list (move this one to top with latest message)
      setConversations((prev) =>
        prev.map((c) =>
          c.id === activeConversation.id
            ? { ...c, latest_message: res.data, updated_at: new Date().toISOString() }
            : c
        ).sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
      );
    } catch (err) {
      console.error("Failed to send message:", err);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    e.target.value = "";
  };

  const cancelImage = () => {
    setImageFile(null);
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImagePreview(null);
  };

  const filteredConversations = conversations.filter((c) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      c.other_participant?.full_name?.toLowerCase().includes(q) ||
      c.item?.title?.toLowerCase().includes(q)
    );
  });

  if (loading) {
    return (
      <div className="h-[calc(100vh-4rem-3.5rem)] md:h-[calc(100vh-5rem)] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // ─── Conversation List JSX (inlined to prevent re-mount on state changes) ───
  const conversationListJSX = (
    <div className="flex flex-col h-full">
      {/* Search */}
      <div className="p-3 border-b border-border">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Conversation Items */}
      <div className="flex-1 overflow-y-auto">
        {filteredConversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-8 text-center text-muted-foreground">
            <MessageCircle className="h-12 w-12 mb-3 opacity-50" />
            <p className="font-medium">No conversations yet</p>
            <p className="text-sm mt-1">Start a conversation from an item listing</p>
          </div>
        ) : (
          filteredConversations.map((conv) => {
            const isActive = activeConversation?.id === conv.id;
            const latestMsg = conv.latest_message;
            const unread = conv.unread_count || 0;

            return (
              <button
                key={conv.id}
                onClick={() => selectConversation(conv)}
                className={`w-full text-left px-4 py-3 border-b border-border hover:bg-muted/50 transition-colors flex items-center gap-3 ${
                  isActive ? "bg-muted" : ""
                }`}
              >
                <Avatar className="h-11 w-11 flex-shrink-0">
                  <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                    {getInitials(conv.other_participant?.full_name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm truncate flex items-center gap-1">
                      {conv.other_participant?.full_name || "Unknown"}
                      {conv.other_participant?.is_verified && (
                        <ShieldCheck className="h-3.5 w-3.5 text-success flex-shrink-0" />
                      )}
                    </span>
                    <span className="text-xs text-muted-foreground flex-shrink-0 ml-2">
                      {latestMsg ? timeAgo(latestMsg.created_at) : timeAgo(conv.updated_at)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-0.5">
                    <p className="text-xs text-muted-foreground truncate">
                      {latestMsg
                        ? latestMsg.sender_id === user?.id
                          ? `You: ${latestMsg.text || "📷 Image"}`
                          : latestMsg.text || "📷 Image"
                        : conv.item?.title || "Start chatting"}
                    </p>
                    {unread > 0 && (
                      <Badge className="h-5 min-w-5 flex items-center justify-center rounded-full text-xs bg-primary text-primary-foreground ml-2 flex-shrink-0">
                        {unread}
                      </Badge>
                    )}
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );

  // ─── Message View JSX (inlined to prevent re-mount on state changes) ───
  const messageViewJSX = (
    <div className="flex flex-col h-full">
      {/* Chat Header */}
      <div className="px-4 py-3 border-b border-border flex items-center gap-3 bg-card">
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden flex-shrink-0"
          onClick={() => {
            setShowConversationList(true);
            setActiveConversation(null);
          }}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <Avatar className="h-9 w-9 flex-shrink-0">
          <AvatarFallback className="bg-primary text-primary-foreground text-sm">
            {getInitials(activeConversation?.other_participant?.full_name)}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-sm truncate">
              {activeConversation?.other_participant?.full_name || "Unknown"}
            </span>
            {activeConversation?.other_participant?.is_verified && (
              <ShieldCheck className="h-3.5 w-3.5 text-success flex-shrink-0" />
            )}
          </div>
          {activeConversation?.item && (
            <p className="text-xs text-muted-foreground truncate">
              Re: {activeConversation.item.title}
            </p>
          )}
        </div>
      </div>

      {/* Moderation Notice */}
      <div className="px-4 py-2 bg-warning/10 border-b border-border flex items-center gap-2">
        <AlertTriangle className="h-3.5 w-3.5 text-warning flex-shrink-0" />
        <span className="text-xs text-muted-foreground">
          Conversations are monitored for safety. Be respectful and follow community guidelines.
        </span>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 bg-muted/20">
        {messagesLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
            <MessageCircle className="h-10 w-10 mb-2 opacity-50" />
            <p className="text-sm">No messages yet. Say hello!</p>
          </div>
        ) : (
          <div className="space-y-3 max-w-3xl mx-auto">
            {messages.map((msg, idx) => {
              const isMe = msg.sender_id === user?.id;
              // Show date separator
              const prevMsg = idx > 0 ? messages[idx - 1] : null;
              const currDate = new Date(msg.created_at).toLocaleDateString();
              const prevDate = prevMsg ? new Date(prevMsg.created_at).toLocaleDateString() : null;
              const showDate = currDate !== prevDate;

              return (
                <div key={msg.id}>
                  {showDate && (
                    <div className="flex justify-center my-4">
                      <span className="text-xs text-muted-foreground bg-muted px-3 py-1 rounded-full">
                        {currDate === new Date().toLocaleDateString()
                          ? "Today"
                          : currDate}
                      </span>
                    </div>
                  )}
                  <div className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                    <div className={`flex gap-2 max-w-[75%] ${isMe ? "flex-row-reverse" : ""}`}>
                      {!isMe && (
                        <Avatar className="h-7 w-7 flex-shrink-0 mt-1">
                          <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                            {getInitials(activeConversation?.other_participant?.full_name)}
                          </AvatarFallback>
                        </Avatar>
                      )}
                      <div>
                        <div
                          className={`rounded-2xl px-4 py-2 ${
                            isMe
                              ? "bg-primary text-primary-foreground rounded-br-md"
                              : "bg-card border border-border rounded-bl-md"
                          }`}
                        >
                          {msg.image_path && (
                            <img
                              src={`${STORAGE_URL}/${msg.image_path}`}
                              alt="Shared"
                              className="rounded-lg mb-2 max-w-[250px] cursor-pointer"
                              onClick={() => window.open(`${STORAGE_URL}/${msg.image_path}`, "_blank")}
                            />
                          )}
                          {msg.text && <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.text}</p>}
                        </div>
                        <div
                          className={`text-[10px] text-muted-foreground mt-1 px-1 ${
                            isMe ? "text-right" : "text-left"
                          }`}
                        >
                          {new Date(msg.created_at).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Image Preview */}
      {imagePreview && (
        <div className="px-4 py-2 border-t border-border bg-card flex items-center gap-2">
          <img src={imagePreview} alt="Preview" className="h-16 w-16 object-cover rounded-lg" />
          <Button variant="ghost" size="sm" onClick={cancelImage} className="text-destructive text-xs">
            Remove
          </Button>
        </div>
      )}

      {/* Input Area */}
      <div className="px-4 py-3 border-t border-border bg-card">
        <div className="flex gap-2 items-end">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleImageSelect}
          />
          <Button
            variant="outline"
            size="icon"
            className="flex-shrink-0"
            onClick={() => fileInputRef.current?.click()}
          >
            <ImageIcon className="h-4 w-4" />
          </Button>
          <Input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            className="flex-1"
            disabled={sending}
          />
          <Button
            onClick={handleSend}
            className="flex-shrink-0"
            disabled={sending || (!message.trim() && !imageFile)}
          >
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </div>
  );

  // ─── Layout ───
  return (
    <div className="h-[calc(100vh-4rem-3.5rem)] md:h-[calc(100vh-5rem)] bg-background">
      <div className="container mx-auto h-full max-w-6xl px-0 md:px-4 md:py-4">
        <Card className="h-full overflow-hidden rounded-none md:rounded-lg border-0 md:border">
          <div className="flex h-full">
            {/* Desktop: always show sidebar | Mobile: toggle between list and messages */}

            {/* Conversation List - Desktop sidebar */}
            <div className="hidden md:flex md:w-[340px] flex-shrink-0 border-r border-border flex-col h-full">
              <div className="px-4 py-3 border-b border-border">
                <h2 className="font-bold text-lg">Messages</h2>
              </div>
              {conversationListJSX}
            </div>

            {/* Mobile: Show conversation list OR message view */}
            <div className="md:hidden flex-1 h-full">
              {showConversationList ? (
                <div className="h-full flex flex-col">
                  <div className="px-4 py-3 border-b border-border">
                    <h2 className="font-bold text-lg">Messages</h2>
                  </div>
                  {conversationListJSX}
                </div>
              ) : activeConversation ? (
                messageViewJSX
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  <p>Select a conversation</p>
                </div>
              )}
            </div>

            {/* Desktop: Message view */}
            <div className="hidden md:flex flex-1 flex-col h-full">
              {activeConversation ? (
                messageViewJSX
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                  <MessageCircle className="h-16 w-16 mb-4 opacity-30" />
                  <p className="font-medium text-lg">Select a conversation</p>
                  <p className="text-sm mt-1">Choose from your conversations to start messaging</p>
                </div>
              )}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
