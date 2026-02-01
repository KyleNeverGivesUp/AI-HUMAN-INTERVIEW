import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { motion } from 'framer-motion';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { Send, Mic, Video, Phone, Award } from 'lucide-react';
import axios from 'axios';
import { Room, RoomEvent, Track } from 'livekit-client';

const API_URL = import.meta.env?.VITE_API_URL || 'http://localhost:8000';

type ChatRole = 'user' | 'ai' | 'system';

type ChatMessage = {
  role: ChatRole;
  text: string;
};

type InteractionMode = 'text' | 'voice' | 'video';

type InterviewTurn = {
  role: 'interviewer' | 'candidate';
  content: string;
};

export function DigitalHuman() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const jobId = searchParams.get('jobId');
  const resumeId = searchParams.get('resumeId');
  
  const [roomName, setRoomName] = useState('');
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [livekitUrl, setLivekitUrl] = useState<string | null>(null);
  const [livekitToken, setLivekitToken] = useState<string | null>(null);
  const [livekitConnected, setLivekitConnected] = useState(false);
  const [livekitHasVideo, setLivekitHasVideo] = useState(false);
  const [livekitHasAudio, setLivekitHasAudio] = useState(false);
  const [useAvatar, setUseAvatar] = useState<boolean | null>(null);
  const [livekitParticipantCount, setLivekitParticipantCount] = useState(0);
  const [livekitParticipants, setLivekitParticipants] = useState<string[]>([]);
  const [isConnecting, setIsConnecting] = useState(false);
  const [lastLatencyMs, setLastLatencyMs] = useState<number | null>(null);
  const [interactionMode, setInteractionMode] = useState<InteractionMode>('text');

  const livekitRoomRef = useRef<Room | null>(null);
  const livekitJoinTimesRef = useRef<Map<string, number>>(new Map());
  const livekitJoinedLoggedRef = useRef<Set<string>>(new Set());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const livekitVideoRef = useRef<HTMLVideoElement>(null);
  const livekitAudioRef = useRef<HTMLAudioElement>(null);
  const livekitVideoTrackRef = useRef<Track | null>(null);
  const livekitAudioTrackRef = useRef<Track | null>(null);
  const pendingLatencyRef = useRef<number | null>(null);

  const isSessionReady = Boolean(roomName && livekitUrl && livekitToken);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const formatJoinTime = (timestamp?: number) => {
    return new Date(timestamp ?? Date.now()).toLocaleTimeString('en-GB', { hour12: false });
  };

  const addSystemMessage = (text: string) => {
    setMessages((prev) => [...prev, { role: 'system', text }]);
  };

  const buildConversationHistory = (history: ChatMessage[]): InterviewTurn[] => {
    return history
      .filter((msg) => msg.role === 'user' || msg.role === 'ai')
      .map((msg) => ({
        role: msg.role === 'ai' ? 'interviewer' : 'candidate',
        content: msg.text,
      }));
  };

  const persistInterviewSession = async (sessionId: string, conversation: InterviewTurn[]) => {
    try {
      await axios.post(`${API_URL}/api/interviews/${sessionId}/save`, conversation, {
        params: {
          job_id: jobId ?? undefined,
          resume_id: resumeId ?? undefined,
          room_name: sessionId,
          participant_name: 'User',
        },
      });
      console.log('[Interview] session saved', sessionId);
    } catch (error) {
      console.error('Failed to save interview session:', error);
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const createSession = async () => {
    if (isConnecting || isSessionReady) return;
    setIsConnecting(true);
    try {
      const generatedRoomName = `room-${Date.now()}`;
      
      // Include job and resume context if available
      const requestBody: any = {
        room_name: generatedRoomName,
        participant_name: 'User',
      };
      
      if (jobId) requestBody.job_id = jobId;
      if (resumeId) requestBody.resume_id = resumeId;
      
      const response = await axios.post(`${API_URL}/api/rooms/create`, requestBody);

      setRoomName(generatedRoomName);
      setLivekitUrl(response.data?.url ?? null);
      setLivekitToken(response.data?.token ?? null);
      setUseAvatar(typeof response.data?.use_tavus === 'boolean' ? response.data.use_tavus : null);
      
      if (jobId && resumeId) {
        addSystemMessage('Interview session created with JD matching. Connecting...');
      } else {
        addSystemMessage('LiveKit session created. Connecting...');
      }
    } catch (error) {
      console.error('Failed to create session:', error);
      addSystemMessage('Failed to create session. Make sure the backend is running.');
    } finally {
      setIsConnecting(false);
    }
  };

  const cleanupMedia = () => {
    if (livekitVideoTrackRef.current) {
      livekitVideoTrackRef.current.detach();
      livekitVideoTrackRef.current = null;
    }
    if (livekitAudioTrackRef.current) {
      livekitAudioTrackRef.current.detach();
      livekitAudioTrackRef.current = null;
    }
    if (livekitVideoRef.current) {
      livekitVideoRef.current.srcObject = null;
    }
    if (livekitAudioRef.current) {
      livekitAudioRef.current.pause();
      livekitAudioRef.current.srcObject = null;
    }
  };

  const endSession = async () => {
    const roomToEnd = roomName;
    const conversation = buildConversationHistory(messages);
    cleanupMedia();
    if (livekitRoomRef.current) {
      livekitRoomRef.current.disconnect();
      livekitRoomRef.current = null;
    }

    setRoomName('');
    setMessages([]);
    setLivekitUrl(null);
    setLivekitToken(null);
    setLivekitConnected(false);
    setLivekitHasVideo(false);
    setLivekitHasAudio(false);
    setLivekitParticipantCount(0);
    setLivekitParticipants([]);
    setUseAvatar(null);
    livekitJoinTimesRef.current.clear();
    livekitJoinedLoggedRef.current.clear();

    if (roomToEnd) {
      if (conversation.length > 0) {
        void persistInterviewSession(roomToEnd, conversation);
      }
      try {
        await axios.delete(`${API_URL}/api/rooms/${roomToEnd}`, { timeout: 5000 });
      } catch (error) {
        console.error('Failed to end session:', error);
      }
    }
  };

  const handleSendMessage = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isProcessing) return;

    if (!isSessionReady) {
      addSystemMessage('Session not ready yet. Create a session first.');
      return;
    }

    if (!livekitConnected) {
      addSystemMessage('LiveKit still connecting. Wait a moment and try again.');
      return;
    }

    setMessages((prev) => [...prev, { role: 'user', text: trimmed }]);
    setIsProcessing(true);
    pendingLatencyRef.current = Date.now();
    try {
      const response = await axios.post(`${API_URL}/api/say`, {
        room_name: roomName,
        text: trimmed,
      });
      setMessages((prev) => [...prev, { role: 'ai', text: response.data?.response ?? '' }]);
    } catch (error) {
      console.error('Failed to send text:', error);
      addSystemMessage('Failed to send text. Check backend logs.');
      pendingLatencyRef.current = null;
    } finally {
      setIsProcessing(false);
    }
  };

  const sendMessage = () => {
    if (interactionMode !== 'text') return;
    if (!message.trim()) return;
    handleSendMessage(message);
    setMessage('');
  };

  const handleKeyPress = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (interactionMode !== 'text') return;
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  useEffect(() => {
    if (!livekitUrl || !livekitToken) return;

    let isCancelled = false;

    const connectLivekit = async () => {
      try {
        const room = new Room();
        await room.connect(livekitUrl, livekitToken, { autoSubscribe: true });
        console.log('[LiveKit] connected', {
          name: room.name,
          identity: room.localParticipant?.identity,
        });
        try {
          await room.startAudio();
        } catch (error) {
          console.warn('LiveKit audio start blocked:', error);
          addSystemMessage('Audio is blocked by the browser. Click to enable audio playback.');
        }
        if (isCancelled) {
          room.disconnect();
          return;
        }

        livekitRoomRef.current = room;
        setLivekitConnected(true);
        const logJoinIfNeeded = (identity?: string, joinedAt?: Date) => {
          if (!identity) return;
          if (livekitJoinedLoggedRef.current.has(identity)) return;
          livekitJoinedLoggedRef.current.add(identity);
          addSystemMessage(`${identity} joined at ${formatJoinTime(joinedAt?.getTime?.())}`);
        };

        const updateParticipantState = () => {
          const remoteMap = room.remoteParticipants ?? new Map();
          const presentIdentities = new Set<string>();
          const joinTimes = livekitJoinTimesRef.current;

          const localIdentity = room.localParticipant?.identity;
          if (localIdentity) {
            presentIdentities.add(localIdentity);
            if (!joinTimes.has(localIdentity)) {
              const joinedAt = room.localParticipant?.joinedAt?.getTime?.();
              joinTimes.set(localIdentity, joinedAt ?? Date.now());
            }
            logJoinIfNeeded(localIdentity, room.localParticipant?.joinedAt);
          }

          for (const participant of remoteMap.values()) {
            if (!participant?.identity) continue;
            presentIdentities.add(participant.identity);
            if (!joinTimes.has(participant.identity)) {
              const joinedAt = participant?.joinedAt?.getTime?.();
              joinTimes.set(participant.identity, joinedAt ?? Date.now());
            }
            logJoinIfNeeded(participant.identity, participant.joinedAt);
          }

          for (const identity of Array.from(joinTimes.keys())) {
            if (!presentIdentities.has(identity)) {
              joinTimes.delete(identity);
            }
          }

          const ordered = Array.from(joinTimes.entries())
            .sort((a, b) => a[1] - b[1])
            .map(([identity, ts]) => {
              const timeLabel = new Date(ts).toLocaleTimeString('en-GB', {
                hour12: false,
              });
              return `${identity} (${timeLabel})`;
            });
          setLivekitParticipants(ordered);
          setLivekitParticipantCount(ordered.length);
        };
        updateParticipantState();

        const attachTrack = (track: Track) => {
          if (track.kind === Track.Kind.Video) {
            if (livekitVideoTrackRef.current && livekitVideoTrackRef.current !== track) {
              livekitVideoTrackRef.current.detach();
            }
            livekitVideoTrackRef.current = track;
            setLivekitHasVideo(true);
            if (livekitVideoRef.current) {
              track.attach(livekitVideoRef.current);
            }
            console.log('[LiveKit] video track attached', track);
          }
          if (track.kind === Track.Kind.Audio) {
            if (livekitAudioTrackRef.current && livekitAudioTrackRef.current !== track) {
              livekitAudioTrackRef.current.detach();
            }
            livekitAudioTrackRef.current = track;
            setLivekitHasAudio(true);
            if (livekitAudioRef.current) {
              track.attach(livekitAudioRef.current);
              livekitAudioRef.current.play().catch(() => null);
            }
            console.log('[LiveKit] audio track attached', track);
          }
        };

        const attachExistingTracks = () => {
          for (const participant of room.remoteParticipants.values()) {
            for (const publication of participant.trackPublications.values()) {
              if (publication.track) {
                attachTrack(publication.track);
              }
            }
          }
        };

        room.on(RoomEvent.TrackSubscribed, (track) => {
          console.log('[LiveKit] track subscribed', track.kind);
          attachTrack(track);
        });

        attachExistingTracks();

        room.on(RoomEvent.TrackUnsubscribed, (track) => {
          console.log('[LiveKit] track unsubscribed', track.kind);
          track.detach();
          if (track.kind === Track.Kind.Video) {
            setLivekitHasVideo(false);
            livekitVideoTrackRef.current = null;
          }
          if (track.kind === Track.Kind.Audio) {
            setLivekitHasAudio(false);
            livekitAudioTrackRef.current = null;
            if (livekitAudioRef.current) {
              livekitAudioRef.current.pause();
              livekitAudioRef.current.srcObject = null;
            }
          }
        });

        room.on(RoomEvent.TrackSubscriptionFailed, (trackSid, participant, error) => {
          console.warn('[LiveKit] track subscription failed', { trackSid, participant, error });
        });

        room.on(RoomEvent.ParticipantConnected, updateParticipantState);
        room.on(RoomEvent.ParticipantDisconnected, updateParticipantState);

        room.on(RoomEvent.Disconnected, () => {
          cleanupMedia();
          setLivekitConnected(false);
          setLivekitHasVideo(false);
          setLivekitHasAudio(false);
          setLivekitParticipantCount(0);
          setLivekitParticipants([]);
          livekitJoinTimesRef.current.clear();
          livekitJoinedLoggedRef.current.clear();
        });
      } catch (error) {
        console.error('Failed to connect to LiveKit:', error);
        addSystemMessage('Failed to connect LiveKit. Check token or URL.');
        setLivekitConnected(false);
      }
    };

    connectLivekit();

    return () => {
      isCancelled = true;
      setLivekitParticipantCount(0);
      setLivekitParticipants([]);
      livekitJoinTimesRef.current.clear();
      livekitJoinedLoggedRef.current.clear();
      if (livekitRoomRef.current) {
        livekitRoomRef.current.disconnect();
        livekitRoomRef.current = null;
      }
      cleanupMedia();
    };
  }, [livekitUrl, livekitToken]);

  useEffect(() => {
    if (!isSessionReady) return;
    const audioEl = livekitAudioRef.current;
    if (!audioEl) return;

    const handlePlaying = () => {
      const t0Ms = pendingLatencyRef.current;
      if (!t0Ms) return;
      pendingLatencyRef.current = null;
      axios
        .post(`${API_URL}/api/metrics/latency`, {
          room_name: roomName,
          latency_ms: null,
          status: 'ok',
          client_t0_ms: t0Ms,
          client_t1_ms: Date.now(),
        })
        .then((res) => {
          const latencyMs = Number(res.data?.latency_ms);
          if (Number.isFinite(latencyMs)) {
            setLastLatencyMs(latencyMs);
            setMessages((prev) => [
              ...prev,
              { role: 'system', text: `Latency input→audio: ${Math.round(latencyMs)} ms` },
            ]);
            console.log('[Latency] input→audio', { latencyMs });
          }
        })
        .catch((error) => {
          console.warn('Failed to report latency:', error);
        });
    };

    audioEl.addEventListener('playing', handlePlaying);
    return () => {
      audioEl.removeEventListener('playing', handlePlaying);
    };
  }, [isSessionReady]);

  useEffect(() => {
    if (!isSessionReady) return;
    const audioEl = livekitAudioRef.current;
    if (!audioEl) return;

    const logEvent = (event: Event) => {
      console.log('[Audio]', event.type, {
        paused: audioEl.paused,
        muted: audioEl.muted,
        readyState: audioEl.readyState,
        currentTime: audioEl.currentTime,
      });
    };

    const events = ['play', 'playing', 'pause', 'ended', 'stalled', 'waiting', 'error'];
    events.forEach((type) => audioEl.addEventListener(type, logEvent));
    return () => {
      events.forEach((type) => audioEl.removeEventListener(type, logEvent));
    };
  }, [isSessionReady, livekitHasAudio]);

  useEffect(() => {
    if (livekitVideoRef.current && livekitVideoTrackRef.current) {
      livekitVideoTrackRef.current.attach(livekitVideoRef.current);
    }
  }, [livekitHasVideo]);

  useEffect(() => {
    if (livekitAudioRef.current && livekitAudioTrackRef.current) {
      livekitAudioTrackRef.current.attach(livekitAudioRef.current);
      livekitAudioRef.current.play().catch(() => null);
    }
  }, [livekitHasAudio]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col gap-2 pt-4 text-xs text-gray-600 sm:flex-row sm:items-center sm:justify-between sm:text-sm">
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <Link to="/" className="hover:text-gray-900 transition-colors">
              Job Board
            </Link>
            <span className="text-gray-300">/</span>
            <Link to="/job/1" className="hover:text-gray-900 transition-colors">
              Job Description
            </Link>
          </div>
          <span className="text-xs text-gray-500">Interview navigation</span>
        </div>
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8 pt-6"
        >
          <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent mb-2">
            CareerBoost AI
          </h1>
          <p className="text-sm sm:text-base text-gray-600">
            Real-time mock interview with live AI avatar
          </p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-sm">
            <button
              onClick={() => setInteractionMode('text')}
              className={`px-4 py-2 rounded-full border transition-colors ${
                interactionMode === 'text'
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-blue-400'
              }`}
            >
              Text
            </button>
            <button
              onClick={() => setInteractionMode('voice')}
              className={`px-4 py-2 rounded-full border transition-colors ${
                interactionMode === 'voice'
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-blue-400'
              }`}
            >
              Voice
            </button>
            <button
              onClick={() => setInteractionMode('video')}
              className={`px-4 py-2 rounded-full border transition-colors ${
                interactionMode === 'video'
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-blue-400'
              }`}
            >
              Video
            </button>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-1 gap-6"
        >
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,1fr)]">
            <div>
              <div className="card aspect-video bg-gray-900 rounded-2xl overflow-hidden relative">
                {!isSessionReady ? (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center px-6">
                      <div className="w-32 h-32 mx-auto mb-6 rounded-full bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center">
                        <Video className="w-16 h-16 text-white" />
                      </div>
                      <h3 className="text-2xl font-bold text-white mb-3">CareerBoost AI Interview</h3>
                      <p className="text-white/80 mb-6 max-w-md mx-auto">
                        Start a session to join the interview session and talk with AI avatar.
                      </p>
                      <button
                        onClick={createSession}
                        disabled={isConnecting}
                        className="btn-primary px-6 py-3 text-base sm:px-8 sm:py-4 sm:text-lg disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {isConnecting ? 'Starting...' : 'Start Session'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-900 to-blue-900">
                    <video
                      ref={livekitVideoRef}
                      className="h-full w-full object-cover"
                      autoPlay
                      playsInline
                      muted
                    />
                    {!livekitHasVideo && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-center text-white px-6">
                          <div className="w-32 h-32 mx-auto mb-4 rounded-full bg-white/10 backdrop-blur-lg flex items-center justify-center animate-pulse">
                            <Mic className="w-16 h-16" />
                          </div>
                          {useAvatar === false ? (
                            <>
                              <p className="text-xl font-semibold">Audio-only mode</p>
                              <p className="text-sm text-white/70 mt-2">
                                Video track is disabled for this session.
                              </p>
                            </>
                          ) : (
                            <>
                              <p className="text-xl font-semibold">Waiting for avatar video track...</p>
                              <p className="text-sm text-white/70 mt-2">
                                Make sure Tavus is enabled and the avatar joins the room.
                              </p>
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {isSessionReady && (
                  <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 flex items-center">
                    <button
                      onClick={endSession}
                      className="p-4 rounded-full bg-red-500 hover:bg-red-600 transition-all text-white"
                    >
                      <Phone className="w-6 h-6" />
                    </button>
                  </div>
                )}
              </div>
              {isSessionReady && <audio ref={livekitAudioRef} autoPlay />}

              {isSessionReady && (
                <div className="mt-4 p-4 bg-white rounded-lg border border-gray-200">
                  <div className="flex flex-col gap-2 text-sm sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center space-x-2">
                      <div
                        className={`w-2 h-2 rounded-full ${
                          livekitConnected ? 'bg-green-500 animate-pulse' : 'bg-amber-400'
                        }`}
                      ></div>
                      <span className="text-gray-600">
                        {livekitConnected ? 'Connected' : 'Connecting...'}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-gray-500">
                      <span className="truncate">Room: {roomName}</span>
                      <span>Participants: {livekitParticipantCount}</span>
                    </div>
                  </div>
                  <div className="mt-2 text-xs text-gray-500">
                    Joined: {livekitParticipants.length ? livekitParticipants.join(', ') : '-'}
                  </div>
                  <div className="mt-1 text-xs text-gray-500">
                    Audio: {livekitHasAudio ? 'active' : 'waiting'} · Video:{' '}
                    {useAvatar === false ? 'not active' : livekitHasVideo ? 'active' : 'waiting'}
                  </div>
                  <div className="mt-1 text-xs text-gray-500">
                    Latency (input→audio): {lastLatencyMs ? `${Math.round(lastLatencyMs)} ms` : '-'}
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-6">
              <div className="card h-full flex flex-col">
                <h3 className="text-lg font-bold mb-4">Chat</h3>
                <div className="flex-1 min-h-[160px] max-h-[42vh] sm:min-h-[200px] sm:max-h-[420px] overflow-y-auto space-y-3">
                  {messages.length === 0 ? (
                    <div className="text-center text-gray-500 mt-6">
                      <p className="mb-2">💬 Waiting for messages</p>
                      <p className="text-xs">Send a message to start</p>
                    </div>
                  ) : (
                    messages.map((msg, index) => {
                      const isUser = msg.role === 'user';
                      const isSystem = msg.role === 'system';
                      const containerClass = isUser
                        ? 'flex justify-end'
                        : isSystem
                        ? 'flex justify-center'
                        : 'flex justify-start';
                      const bubbleClass = isSystem
                        ? 'bg-gray-200 text-gray-600 text-xs'
                        : isUser
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-900';
                      return (
                        <motion.div
                          key={`msg-${index}`}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className={containerClass}
                        >
                          <div
                            className={`${bubbleClass} px-4 py-2 rounded-2xl text-sm sm:text-base break-words max-w-[85%] sm:max-w-[75%]`}
                          >
                            {msg.text}
                          </div>
                        </motion.div>
                      );
                    })
                  )}
                  {isProcessing && (
                    <div className="flex justify-start">
                      <div className="bg-gray-100 px-4 py-2 rounded-2xl">
                        <div className="flex space-x-2">
                          <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce"></div>
                          <div
                            className="w-2 h-2 rounded-full bg-gray-400 animate-bounce"
                            style={{ animationDelay: '0.1s' }}
                          ></div>
                          <div
                            className="w-2 h-2 rounded-full bg-gray-400 animate-bounce"
                            style={{ animationDelay: '0.2s' }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                <div className="mt-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:space-x-2 sm:gap-0">
                    <textarea
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="Send a message..."
                      disabled={interactionMode !== 'text'}
                      className="flex-1 px-4 py-3 border border-gray-300 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                      rows={2}
                    />
                    <button
                      onClick={sendMessage}
                      disabled={
                        interactionMode !== 'text' ||
                        !message.trim() ||
                        isProcessing ||
                        !livekitConnected
                      }
                      className="w-full sm:w-auto p-3 rounded-xl bg-primary text-white hover:bg-primary-dark transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                    >
                      <Send className="w-5 h-5" />
                    </button>
                  </div>
                  {!livekitConnected && isSessionReady && (
                    <p className="mt-2 text-xs text-gray-500">Waiting for LiveKit connection...</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8"
        >
          <div className="card text-center">
            <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-green-100 flex items-center justify-center">
              <Video className="w-6 h-6 text-green-600" />
            </div>
            <h4 className="font-semibold mb-2">Real-Time Video</h4>
            <p className="text-sm text-gray-600">
              Synchronized digital human avatar with lip-sync
            </p>
          </div>
          <div className="card text-center">
            <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-blue-100 flex items-center justify-center">
              <Mic className="w-6 h-6 text-blue-600" />
            </div>
            <h4 className="font-semibold mb-2">Natural Voice</h4>
            <p className="text-sm text-gray-600">High-quality text-to-speech with natural intonation</p>
          </div>
          <div className="card text-center">
            <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-purple-100 flex items-center justify-center">
              <Send className="w-6 h-6 text-purple-600" />
            </div>
            <h4 className="font-semibold mb-2">Low Latency</h4>
            <p className="text-sm text-gray-600">Minimal delay for seamless conversation</p>
          </div>
        </motion.div>

        {/* Interview Evaluate Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-8 text-center"
        >
          <button
            onClick={() => navigate('/interview-evaluate')}
            className="inline-flex items-center space-x-2 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-all shadow-lg hover:shadow-xl"
          >
            <Award className="w-5 h-5" />
            <span className="font-semibold">View Interview Evaluations</span>
          </button>
        </motion.div>
      </div>
    </div>
  );
}
