import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Send, Mic, Video, Phone } from 'lucide-react';
import axios from 'axios';
import { Room, RoomEvent, Track } from 'livekit-client';

const API_URL = import.meta.env?.VITE_API_URL || 'http://localhost:8000';

type ChatRole = 'user' | 'ai' | 'system';

type ChatMessage = {
  role: ChatRole;
  text: string;
};

export function DigitalHuman() {
  const [roomName, setRoomName] = useState('');
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [livekitUrl, setLivekitUrl] = useState<string | null>(null);
  const [livekitToken, setLivekitToken] = useState<string | null>(null);
  const [livekitConnected, setLivekitConnected] = useState(false);
  const [livekitHasVideo, setLivekitHasVideo] = useState(false);
  const [livekitHasAudio, setLivekitHasAudio] = useState(false);
  const [livekitParticipantCount, setLivekitParticipantCount] = useState(0);
  const [livekitParticipants, setLivekitParticipants] = useState<string[]>([]);
  const [isConnecting, setIsConnecting] = useState(false);
  const [lastLatencyMs, setLastLatencyMs] = useState<number | null>(null);

  const livekitRoomRef = useRef<Room | null>(null);
  const livekitJoinTimesRef = useRef<Map<string, number>>(new Map());
  const livekitJoinedLoggedRef = useRef<Set<string>>(new Set());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const livekitVideoRef = useRef<HTMLVideoElement>(null);
  const livekitAudioRef = useRef<HTMLAudioElement>(null);
  const livekitVideoTrackRef = useRef<Track | null>(null);
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

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const createSession = async () => {
    if (isConnecting || isSessionReady) return;
    setIsConnecting(true);
    try {
      const generatedRoomName = `room-${Date.now()}`;
      const response = await axios.post(`${API_URL}/api/rooms/create`, {
        room_name: generatedRoomName,
        participant_name: 'User',
      });

      setRoomName(generatedRoomName);
      setLivekitUrl(response.data?.url ?? null);
      setLivekitToken(response.data?.token ?? null);
      addSystemMessage('LiveKit session created. Connecting...');
    } catch (error) {
      console.error('Failed to create session:', error);
      addSystemMessage('Failed to create session. Make sure the backend is running.');
    } finally {
      setIsConnecting(false);
    }
  };

  const endSession = async () => {
    if (livekitRoomRef.current) {
      livekitRoomRef.current.disconnect();
      livekitRoomRef.current = null;
    }

    if (roomName) {
      try {
        await axios.delete(`${API_URL}/api/rooms/${roomName}`);
      } catch (error) {
        console.error('Failed to end session:', error);
      }
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
    livekitJoinTimesRef.current.clear();
    livekitJoinedLoggedRef.current.clear();
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
    try {
      const response = await axios.post(`${API_URL}/api/say`, {
        room_name: roomName,
        text: trimmed,
      });
      const t0Ms = Number(response.data?.t0_ms);
      if (Number.isFinite(t0Ms)) {
        pendingLatencyRef.current = t0Ms;
      }
      setMessages((prev) => [...prev, { role: 'ai', text: response.data?.response ?? '' }]);
    } catch (error) {
      console.error('Failed to send text:', error);
      addSystemMessage('Failed to send text. Check backend logs.');
    } finally {
      setIsProcessing(false);
    }
  };

  const sendMessage = () => {
    if (!message.trim()) return;
    handleSendMessage(message);
    setMessage('');
  };

  const handleKeyPress = (e: KeyboardEvent<HTMLTextAreaElement>) => {
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
            livekitVideoTrackRef.current = track;
            setLivekitHasVideo(true);
            if (livekitVideoRef.current) {
              track.attach(livekitVideoRef.current);
            }
          }
          if (track.kind === Track.Kind.Audio) {
            setLivekitHasAudio(true);
            if (livekitAudioRef.current) {
              track.attach(livekitAudioRef.current);
            }
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
          attachTrack(track);
        });

        attachExistingTracks();

        room.on(RoomEvent.TrackUnsubscribed, (track) => {
          track.detach();
          if (track.kind === Track.Kind.Video) {
            setLivekitHasVideo(false);
            livekitVideoTrackRef.current = null;
          }
          if (track.kind === Track.Kind.Audio) {
            setLivekitHasAudio(false);
          }
        });

        room.on(RoomEvent.ParticipantConnected, updateParticipantState);
        room.on(RoomEvent.ParticipantDisconnected, updateParticipantState);

        room.on(RoomEvent.Disconnected, () => {
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
    };
  }, [livekitUrl, livekitToken]);

  useEffect(() => {
    if (!isSessionReady) return;
    const audioEl = livekitAudioRef.current;
    if (!audioEl) return;

    const handlePlaying = () => {
      const t0Ms = pendingLatencyRef.current;
      if (!t0Ms) return;
      const latencyMs = Date.now() - t0Ms;
      pendingLatencyRef.current = null;
      setLastLatencyMs(latencyMs);
      setMessages((prev) => [
        ...prev,
        { role: 'system', text: `Latency t2-t0: ${Math.round(latencyMs)} ms` },
      ]);
    };

    audioEl.addEventListener('playing', handlePlaying);
    return () => {
      audioEl.removeEventListener('playing', handlePlaying);
    };
  }, [isSessionReady]);

  useEffect(() => {
    if (livekitVideoRef.current && livekitVideoTrackRef.current) {
      livekitVideoTrackRef.current.attach(livekitVideoRef.current);
    }
  }, [livekitHasVideo]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between pt-4 text-sm text-gray-600">
          <div className="flex items-center space-x-3">
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
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent mb-2">
            AI Interview Studio
          </h1>
          <p className="text-gray-600">Real-time mock interview with live AI avatar</p>
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
                      <h3 className="text-2xl font-bold text-white mb-3">AI Interview</h3>
                      <p className="text-white/80 mb-6 max-w-md mx-auto">
                        Start a session to join the interview session and talk with AI avatar.
                      </p>
                      <button
                        onClick={createSession}
                        disabled={isConnecting}
                        className="btn-primary px-8 py-4 text-lg disabled:cursor-not-allowed disabled:opacity-60"
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
                          <p className="text-xl font-semibold">Waiting for avatar video track...</p>
                          <p className="text-sm text-white/70 mt-2">
                            Make sure Tavus is enabled and the avatar joins the room.
                          </p>
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
                  <div className="flex items-center justify-between text-sm">
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
                    <div className="flex items-center space-x-4 text-gray-500">
                      <span>Room: {roomName}</span>
                      <span>Participants: {livekitParticipantCount}</span>
                    </div>
                  </div>
                  <div className="mt-2 text-xs text-gray-500">
                    Joined: {livekitParticipants.length ? livekitParticipants.join(', ') : '-'}
                  </div>
                  <div className="mt-1 text-xs text-gray-500">
                    Audio: {livekitHasAudio ? 'active' : 'waiting'} · Video:{' '}
                    {livekitHasVideo ? 'active' : 'waiting'}
                  </div>
                  <div className="mt-1 text-xs text-gray-500">
                    Latency (t2-t0): {lastLatencyMs ? `${Math.round(lastLatencyMs)} ms` : '-'}
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-6">
              <div className="card h-full flex flex-col">
                <h3 className="text-lg font-bold mb-4">Chat</h3>
                <div className="flex-1 min-h-[200px] max-h-[420px] overflow-y-auto space-y-3">
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
                          <div className={`${bubbleClass} px-4 py-2 rounded-2xl`}>{msg.text}</div>
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
                  <div className="flex items-end space-x-2">
                    <textarea
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="Send a message..."
                      className="flex-1 px-4 py-3 border border-gray-300 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                      rows={2}
                    />
                    <button
                      onClick={sendMessage}
                      disabled={!message.trim() || isProcessing || !livekitConnected}
                      className="p-3 rounded-xl bg-primary text-white hover:bg-primary-dark transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
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
      </div>
    </div>
  );
}
