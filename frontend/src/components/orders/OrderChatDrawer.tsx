import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Send,
  MessageSquare,
  Store,
  Truck,
  User,
  ShieldCheck,
  RefreshCw,
  Clock,
  Sparkles,
} from 'lucide-react';
import { getOrderMessagesApi, sendOrderMessageApi } from '../../services/api';
import { OrderMessage } from '../../types/order';

interface OrderChatDrawerProps {
  orderId: string;
  orderNumber: string;
  isOpen: boolean;
  onClose: () => void;
  currentUserRole?: string;
  currentUserId?: string;
}

const QUICK_PROMPTS = [
  'When will the order be dispatched?',
  'Is the order packed and ready for pickup?',
  'Please call when you reach near the farm gate.',
  'Order confirmed and packed with genuine batch.',
  'Courier is on the way with your agricultural supplies.',
  'Payment has been verified via UPI QR.',
];

export const OrderChatDrawer: React.FC<OrderChatDrawerProps> = ({
  orderId,
  orderNumber,
  isOpen,
  onClose,
  currentUserRole = 'FARMER',
  currentUserId,
}) => {
  const [messages, setMessages] = useState<OrderMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollIntervalRef = useRef<any>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchMessages = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      setError(null);
      const res = await getOrderMessagesApi(orderId);
      if (res.success && Array.isArray(res.messages)) {
        setMessages(res.messages);
      }
    } catch (err: any) {
      if (!silent) {
        setError(err?.response?.data?.message || 'Failed to load order conversation.');
      }
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchMessages();
      // Auto-poll messages every 4 seconds while open
      pollIntervalRef.current = setInterval(() => {
        fetchMessages(true);
      }, 4000);
    } else {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    }

    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [isOpen, orderId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text || sending) return;

    try {
      setSending(true);
      setError(null);
      const res = await sendOrderMessageApi(orderId, text);
      if (res.success && res.message) {
        setMessages((prev) => [...prev, res.message]);
        if (!textToSend) setInputText('');
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Could not send message. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (!isOpen) return null;

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'SHOP_OWNER':
      case 'AGRI_PARTNER':
        return {
          label: 'Store Partner',
          icon: Store,
          bg: 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700',
        };
      case 'DELIVERY_BOY':
        return {
          label: 'Delivery Partner',
          icon: Truck,
          bg: 'bg-cyan-100 dark:bg-cyan-950 text-cyan-800 dark:text-cyan-300 border-cyan-300 dark:border-cyan-700',
        };
      case 'FARMER':
        return {
          label: 'Farmer',
          icon: User,
          bg: 'bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 border-blue-300 dark:border-blue-700',
        };
      case 'ADMIN':
      default:
        return {
          label: 'AgroMitra Support',
          icon: ShieldCheck,
          bg: 'bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300 border-purple-300 dark:border-purple-700',
        };
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 w-full max-w-md h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-300">
        {/* Drawer Header */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-emerald-50 via-teal-50 to-white dark:from-slate-900 dark:via-slate-900 dark:to-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-md">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-heading font-extrabold text-sm sm:text-base text-slate-900 dark:text-white">
                  Direct Order Chat
                </h3>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Order #{orderNumber} • Farmer, Store & Courier
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => fetchMessages()}
              disabled={loading}
              title="Refresh messages"
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-800 dark:hover:text-white transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Conversation Thread */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-slate-50/50 dark:bg-slate-900/50">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs">
              {error}
            </div>
          )}

          {messages.length === 0 && !loading && (
            <div className="py-12 text-center space-y-2">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <Sparkles className="w-6 h-6" />
              </div>
              <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                No messages yet
              </p>
              <p className="text-xs text-slate-400 max-w-xs mx-auto">
                Need updates or special delivery instructions? Ask the Agri Store or Courier Partner directly below.
              </p>
            </div>
          )}

          {messages.map((msg, idx) => {
            const senderId = typeof msg.sender === 'object' ? (msg.sender as any)?._id : msg.sender;
            const isMe =
              Boolean(currentUserId && senderId === currentUserId) ||
              msg.senderRole === currentUserRole;

            const badge = getRoleBadge(msg.senderRole);
            const BadgeIcon = badge.icon;

            return (
              <div
                key={msg.id || msg._id || idx}
                className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} space-y-1`}
              >
                {/* Sender Header */}
                <div className="flex items-center gap-1.5 px-1">
                  <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                    {msg.senderName}
                  </span>
                  <span
                    className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-extrabold border ${badge.bg}`}
                  >
                    <BadgeIcon className="w-2.5 h-2.5" />
                    <span>{badge.label}</span>
                  </span>
                </div>

                {/* Bubble */}
                <div
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs sm:text-sm shadow-sm ${
                    isMe
                      ? 'bg-emerald-600 text-white rounded-tr-none'
                      : 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700/80 rounded-tl-none'
                  }`}
                >
                  <p className="whitespace-pre-wrap break-words">{msg.message}</p>
                </div>

                {/* Timestamp */}
                <span className="text-[10px] text-slate-400 px-1 flex items-center gap-1">
                  <Clock className="w-2.5 h-2.5" />
                  {new Date(msg.createdAt).toLocaleTimeString('en-IN', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Quick Suggestion Chips */}
        <div className="p-2 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-x-auto flex items-center gap-1.5 no-scrollbar">
          {QUICK_PROMPTS.map((prompt, i) => (
            <button
              key={i}
              onClick={() => handleSendMessage(prompt)}
              disabled={sending}
              className="shrink-0 px-2.5 py-1 rounded-xl text-[11px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-slate-700 transition"
            >
              {prompt}
            </button>
          ))}
        </div>

        {/* Input Bar */}
        <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type message to store / courier..."
              disabled={sending}
              maxLength={1000}
              className="flex-1 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
            />
            <button
              onClick={() => handleSendMessage()}
              disabled={!inputText.trim() || sending}
              className="p-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white shadow-md transition shrink-0"
              title="Send message"
            >
              <Send className={`w-4 h-4 ${sending ? 'animate-pulse' : ''}`} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
