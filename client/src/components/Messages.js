import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { FaUserFriends } from 'react-icons/fa';
import API from '../services/api';
import { DEFAULT_PROPERTY_IMAGE } from '../constants/propertyMedia';

const useQuery = () => new URLSearchParams(useLocation().search);

export default function Messages() {
  const query = useQuery();
  const navigate = useNavigate();
  const [conversations, setConversations] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [composer, setComposer] = useState('');
  const [currentUserId, setCurrentUserId] = useState(null);
  const [groupOpen, setGroupOpen] = useState(false);
  const [groupMembers, setGroupMembers] = useState([]);
  const [groupError, setGroupError] = useState('');

  const loadConversations = async () => {
    try {
      const res = await API.get('/conversations');
      setConversations(res.data || []);
      return res.data || [];
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Unable to load conversations.');
      return [];
    }
  };

  const loadMessages = async (conversationId) => {
    if (!conversationId) return;
    try {
      const res = await API.get(`/conversations/${conversationId}/messages`);
      setMessages(res.data || []);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Unable to load messages.');
    }
  };

  useEffect(() => {
    const bootstrap = async () => {
      setLoading(true);
      const recipient = query.get('recipient');
      const property = query.get('property');
      let meId = null;
      try {
        const me = await API.get('/users/me');
        meId = me.data?.id || null;
        setCurrentUserId(meId);
      } catch (err) {
        console.error(err);
      }
      if (recipient) {
        const recipientId = Number(recipient);
        if (!Number.isFinite(recipientId)) {
          setError('Invalid recipient.');
          navigate('/messages', { replace: true });
          setLoading(false);
          return;
        }
        if (meId !== null && recipientId === meId) {
          setError('You cannot message yourself.');
          navigate('/messages', { replace: true });
          setLoading(false);
          return;
        }
        try {
          const res = await API.post('/conversations', {
            recipientId,
            propertyId: property && Number.isFinite(Number(property)) ? Number(property) : null
          });
          const convoId = res.data?.id;
          const convos = await loadConversations();
          if (meId !== null) {
            setCurrentUserId(meId);
          }
          if (convoId) {
            setActiveId(convoId);
            await loadMessages(convoId);
          } else if (convos.length) {
            setActiveId(convos[0].id);
            await loadMessages(convos[0].id);
          }
        } catch (err) {
          console.error(err);
          setError(err.response?.data?.message || 'Unable to start conversation.');
        } finally {
          navigate('/messages', { replace: true });
          setLoading(false);
        }
        return;
      }

      const convos = await loadConversations();
      if (meId !== null) {
        setCurrentUserId(meId);
      }
      if (convos.length) {
        setActiveId(convos[0].id);
        await loadMessages(convos[0].id);
      }
      setLoading(false);
    };

    bootstrap();
  }, []);

  const activeConversation = useMemo(
    () => conversations.find((conversation) => conversation.id === activeId),
    [conversations, activeId]
  );

  const otherMembers = useMemo(() => {
    if (!activeConversation) return [];
    return (activeConversation.members || []).filter((member) => member.id !== currentUserId);
  }, [activeConversation, currentUserId]);

  const isGroupChat = useMemo(() => otherMembers.length > 1, [otherMembers.length]);

  const buildGroupName = (members) => {
    if (!members.length) return 'Conversation';
    const names = members.map((member) => member.name);
    if (names.length <= 3) return names.join(', ');
    return `${names.slice(0, 3).join(', ')} ...`;
  };

  const displayTitle = useMemo(() => {
    if (!activeConversation) return '';
    if (otherMembers.length === 1) return otherMembers[0].name;
    if (otherMembers.length > 1) return buildGroupName(otherMembers);
    return buildGroupName(otherMembers);
  }, [activeConversation, otherMembers]);

  const avatarMembers = useMemo(() => {
    if (!activeConversation) return [];
    if (otherMembers.length <= 1) return otherMembers;
    return otherMembers.slice(0, 2);
  }, [activeConversation, otherMembers]);

  const handleSend = async () => {
    if (!composer.trim() || !activeId) return;
    setSending(true);
    try {
      await API.post(`/conversations/${activeId}/messages`, { body: composer.trim() });
      setComposer('');
      await loadMessages(activeId);
      await loadConversations();
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Unable to send message.');
    } finally {
      setSending(false);
    }
  };

  const knownContacts = useMemo(() => {
    const map = new Map();
    conversations.forEach((conversation) => {
      (conversation.members || []).forEach((member) => {
        if (member.id === currentUserId) return;
        if (!map.has(member.id)) {
          map.set(member.id, member);
        }
      });
    });
    return Array.from(map.values());
  }, [conversations, currentUserId]);

  const handleCreateGroup = async () => {
    setGroupError('');
    if (!groupMembers.length) {
      setGroupError('Select at least one person to create a group.');
      return;
    }
    try {
      const res = await API.post('/conversations', {
        memberIds: groupMembers
      });
      const convoId = res.data?.id;
      const convos = await loadConversations();
      if (convoId) {
        setActiveId(convoId);
        await loadMessages(convoId);
      } else if (convos.length) {
        setActiveId(convos[0].id);
        await loadMessages(convos[0].id);
      }
      setGroupOpen(false);
      setGroupMembers([]);
    } catch (err) {
      console.error(err);
      setGroupError(err.response?.data?.message || 'Unable to create group.');
    }
  };

  return (
    <div className="messages-page">
      <div className="messages-sidebar">
        <div className="messages-header">
          <h1 className="h5 mb-0">Messages</h1>
          <div className="messages-actions">
            <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => setGroupOpen(true)}>
              <FaUserFriends className="me-1" />
              New group
            </button>
          </div>
        </div>
        {loading ? (
          <div className="text-muted">Loading conversations...</div>
        ) : conversations.length ? (
          <div className="messages-list">
            {conversations.map((conversation) => {
              const memberList = (conversation.members || []).filter((member) => member.id !== currentUserId);
              const isGroup = memberList.length > 1;
              const previewTitle =
                memberList.length === 1 ? memberList[0].name : buildGroupName(memberList);
              const previewAvatars = isGroup ? memberList.slice(0, 2) : memberList.slice(0, 1);
              const extraCount = isGroup && memberList.length > 2 ? memberList.length - 2 : 0;
              return (
                <button
                  key={conversation.id}
                  type="button"
                  className={`messages-item ${conversation.id === activeId ? 'is-active' : ''}`}
                  onClick={async () => {
                    setActiveId(conversation.id);
                    await loadMessages(conversation.id);
                  }}
                >
                  <div className="messages-item-avatar">
                    {previewAvatars.map((member) => (
                      <img
                        key={member.id}
                        src={member.profile_image_url || DEFAULT_PROPERTY_IMAGE}
                        alt={member.name}
                      />
                    ))}
                    {extraCount > 0 && <span className="avatar-extra">+{extraCount}</span>}
                  </div>
                <div className="messages-item-content">
                  <div className="messages-item-title">{previewTitle}</div>
                  <div className="messages-item-preview">{conversation.last_message || 'Start the conversation'}</div>
                </div>
              </button>
              );
            })}
          </div>
        ) : (
          <div className="text-muted">No conversations yet.</div>
        )}
      </div>
      <div className="messages-thread">
        {error && <div className="alert alert-warning">{error}</div>}
        {activeConversation ? (
          <>
            <div className="messages-thread-header">
              <div className="messages-thread-title">
                <div className="messages-item-avatar large">
                  {avatarMembers.map((member) => (
                    <img
                      key={member.id}
                      src={member.profile_image_url || DEFAULT_PROPERTY_IMAGE}
                      alt={member.name}
                    />
                  ))}
                  {isGroupChat && otherMembers.length > 2 && (
                    <span className="avatar-extra">+{otherMembers.length - 2}</span>
                  )}
                </div>
                <div>
                  <h2 className="h5 mb-1">{displayTitle}</h2>
                  {isGroupChat && <p className="text-muted small mb-0">Group chat</p>}
                </div>
              </div>
            </div>
            <div className="messages-thread-body">
              {messages.length ? (
                messages.map((message) => (
                  <div key={message.id} className="message-bubble">
                    <div className="message-meta">{message.sender_name}</div>
                    <p>{message.body}</p>
                  </div>
                ))
              ) : (
                <div className="text-muted">No messages yet. Say hello.</div>
              )}
            </div>
            <div className="messages-thread-footer">
              <input
                type="text"
                className="form-control"
                placeholder="Write a message"
                value={composer}
                onChange={(event) => setComposer(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    handleSend();
                  }
                }}
              />
              <button type="button" className="btn btn-primary" onClick={handleSend} disabled={sending}>
                Send
              </button>
            </div>
          </>
        ) : (
          <div className="messages-empty text-muted">Select a conversation to start chatting.</div>
        )}
      </div>

      {groupOpen && (
        <div className="filter-modal" role="dialog" aria-modal="true">
          <div className="filter-dialog">
            <div className="filter-header">
              <h2 className="h5 mb-0">Create a group</h2>
              <button type="button" className="btn btn-link" onClick={() => setGroupOpen(false)}>
                Close
              </button>
            </div>
            <div className="filter-body">
              <div className="filter-field">
                <label className="form-label">Add people you already talked with</label>
                <div className="filter-city-grid">
                  {knownContacts.length ? (
                    knownContacts.map((contact) => (
                      <label key={contact.id} className="filter-city-pill">
                        <input
                          type="checkbox"
                          checked={groupMembers.includes(contact.id)}
                          onChange={(event) => {
                            const checked = event.target.checked;
                            setGroupMembers((prev) => {
                              if (checked) return [...prev, contact.id];
                              return prev.filter((id) => id !== contact.id);
                            });
                          }}
                        />
                        <span>{contact.name}</span>
                      </label>
                    ))
                  ) : (
                    <p className="text-muted mb-0">No previous chats yet.</p>
                  )}
                </div>
              </div>
              {groupError && <div className="alert alert-warning py-2">{groupError}</div>}
            </div>
            <div className="filter-footer">
              <button type="button" className="btn btn-outline-secondary" onClick={() => setGroupOpen(false)}>
                Cancel
              </button>
              <button type="button" className="btn btn-primary" onClick={handleCreateGroup}>
                Create group
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
