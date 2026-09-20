import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { ClassSession, LiveSessionState, WebRTCConnectionState } from '../../types';
import { webrtcService } from '../../services/webrtcService';
import { signalingService } from '../../services/signalingService';
import {
  PhoneOff,
  Maximize2,
  Minimize2,
  Radio,
  Clock,
  Wifi,
  WifiOff,
  AlertCircle,
  CheckCircle2,
  Loader2,
  MessageSquare,
  Send,
  X,
  Volume2,
  VolumeX,
  ExternalLink,
  Laptop,
} from 'lucide-react';
import { AnyDeskRemoteModal } from './AnyDeskRemoteModal';

interface StudentClassroomProps {
  currentClass: ClassSession;
  onExit: () => void;
}

export const StudentClassroom: React.FC<StudentClassroomProps> = ({ currentClass, onExit }) => {
  const { user } = useAuth();
  const toast = useToast();

  const [session, setSession] = useState<LiveSessionState | null>(null);
  const [connectionState, setConnectionState] = useState<WebRTCConnectionState>('connecting');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isClassEnded, setIsClassEnded] = useState<boolean>(false);

  // Audio / Video control for student local playback
  const [isAudioMuted, setIsAudioMuted] = useState<boolean>(false);
  const [showChatDrawer, setShowChatDrawer] = useState<boolean>(false);
  const [showAnyDeskModal, setShowAnyDeskModal] = useState<boolean>(false);
  const [chatInput, setChatInput] = useState<string>('');
  const [durationSeconds, setDurationSeconds] = useState<number>(0);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // WebRTC refs
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const classroomContainerRef = useRef<HTMLDivElement | null>(null);
  const cleanupsRef = useRef<Array<() => void>>([]);

  useEffect(() => {
    joinLiveClass();

    const timer = setInterval(() => {
      setDurationSeconds((prev) => prev + 1);
    }, 1000);

    return () => {
      clearInterval(timer);
      teardownStudent();
    };
  }, [currentClass.id]);

  /**
   * Phase D: Student Join Class & Signaling Coordination
   */
  const joinLiveClass = async () => {
    if (!user) return;
    setConnectionState('connecting');
    setErrorMessage(null);

    try {
      // 1. Register Student in Live Session
      const sess = await signalingService.joinSession(
        currentClass.id,
        user.id,
        `${user.firstName} ${user.lastName}`,
        'STUDENT'
      );
      setSession(sess);

      // Check if session is already ended
      if (sess && (sess as any).status === 'ended') {
        setIsClassEnded(true);
        setConnectionState('disconnected');
        return;
      }

      // 2. Listen to Session metadata & end events
      const stopSessionListener = signalingService.listenToSession(currentClass.id, (updatedSess) => {
        setSession(updatedSess);
        if ((updatedSess as any).status === 'ended') {
          setIsClassEnded(true);
          setConnectionState('disconnected');
          toast.info('کلاس توسط مدرس پایان یافت.');
        }
      });
      cleanupsRef.current.push(stopSessionListener);

      // 3. Listen for Teacher's SDP Offer
      const stopOfferListener = signalingService.listenForOffer(
        currentClass.id,
        user.id,
        async (offer) => {
          console.log('[Student] Received offer from teacher, establishing connection...');
          await handleReceivedOffer(offer);
        }
      );
      cleanupsRef.current.push(stopOfferListener);

      toast.info('در حال اتصال به پخش زنده کلاس...');
    } catch (err: any) {
      console.error('Student join error:', err);
      const msg = err.message || 'خطا در ورود به کلاس آنلاین';
      setErrorMessage(msg);
      setConnectionState('failed');
      toast.error(msg);
    }
  };

  /**
   * Phase C & D: Handle Teacher's SDP Offer, Create Answer & ICE Candidates
   */
  const handleReceivedOffer = async (offer: RTCSessionDescriptionInit) => {
    if (!user) return;

    try {
      // Create Student PeerConnection
      const pc = webrtcService.createStudentPeerConnection({
        onTrack: (remoteStream) => {
          console.log('[Student] Received remote teacher media stream track:', remoteStream);
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = remoteStream;
            remoteVideoRef.current.play().catch((e) => {
              console.log('[Student] Auto-play prevented or handled:', e);
            });
          }
          setConnectionState('connected');
        },
        onIceCandidate: (candidate) => {
          signalingService.sendStudentCandidate(currentClass.id, user.id, candidate.toJSON());
        },
        onConnectionStateChange: (state) => {
          console.log(`[Student] WebRTC connection state: ${state}`);
          if (state === 'connected') {
            setConnectionState('connected');
          } else if (state === 'connecting') {
            setConnectionState('connecting');
          } else if (state === 'disconnected') {
            setConnectionState('weak');
          } else if (state === 'failed') {
            setConnectionState('failed');
          }
        },
      });

      peerConnectionRef.current = pc;

      // Create Answer and send back to Teacher
      const answer = await webrtcService.createAnswer(pc, offer);
      await signalingService.sendAnswer(currentClass.id, user.id, answer);

      // Listen for Teacher's ICE Candidates
      const stopCandidateListener = signalingService.listenForTeacherCandidates(
        currentClass.id,
        async (candidate) => {
          await webrtcService.addIceCandidate(pc, candidate);
        }
      );
      cleanupsRef.current.push(stopCandidateListener);
    } catch (err: any) {
      console.error('[Student] Error processing SDP offer:', err);
      setConnectionState('failed');
    }
  };

  const handleLeaveClass = async () => {
    if (user) {
      await signalingService.leaveSession(currentClass.id, user.id);
    }
    teardownStudent();
    onExit();
  };

  const teardownStudent = () => {
    if (peerConnectionRef.current) {
      webrtcService.closePeerConnection(peerConnectionRef.current);
      peerConnectionRef.current = null;
    }

    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }

    cleanupsRef.current.forEach((cleanup) => cleanup());
    cleanupsRef.current = [];
    signalingService.cleanup();
  };

  const toggleFullscreen = () => {
    if (!classroomContainerRef.current) return;
    if (!document.fullscreenElement) {
      classroomContainerRef.current.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const toggleMutePlayback = () => {
    if (remoteVideoRef.current) {
      const nextMuted = !remoteVideoRef.current.muted;
      remoteVideoRef.current.muted = nextMuted;
      setIsAudioMuted(nextMuted);
    }
  };

  const formatDuration = (totalSeconds: number) => {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const getConnectionBadge = () => {
    switch (connectionState) {
      case 'connected':
        return (
          <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500/20 border border-emerald-500/40 rounded-full text-emerald-400 text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>اتصال زنده برقرار است</span>
          </div>
        );
      case 'connecting':
        return (
          <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-500/20 border border-amber-500/40 rounded-full text-amber-400 text-xs font-semibold">
            <Loader2 className="w-3 h-3 animate-spin" />
            <span>در حال اتصال به کلاس...</span>
          </div>
        );
      case 'weak':
        return (
          <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-600/20 border border-amber-600/40 rounded-full text-amber-300 text-xs font-semibold">
            <Wifi className="w-3 h-3" />
            <span>کیفیت اتصال ضعیف</span>
          </div>
        );
      case 'failed':
      case 'disconnected':
        return (
          <div className="flex items-center gap-1.5 px-3 py-1 bg-rose-500/20 border border-rose-500/40 rounded-full text-rose-400 text-xs font-semibold">
            <WifiOff className="w-3 h-3" />
            <span>ارتباط قطع شد</span>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div
      ref={classroomContainerRef}
      className="relative flex flex-col h-[calc(100vh-5rem)] min-h-[640px] bg-slate-950 text-white rounded-2xl overflow-hidden border border-slate-800 select-none shadow-2xl"
    >
      {/* 1. TOP HEADER BAR */}
      <header className="flex items-center justify-between px-5 py-3.5 bg-slate-900/90 backdrop-blur border-b border-slate-800 z-20">
        <div className="flex items-center gap-3">
          {getConnectionBadge()}

          <div className="h-4 w-[1px] bg-slate-700 hidden sm:block" />

          <div>
            <h2 className="text-sm sm:text-base font-bold text-white line-clamp-1">{currentClass.title}</h2>
            <p className="text-xs text-slate-400">مدرس: {currentClass.teacherName || 'مدرس دوره'}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-800/80 rounded-lg text-xs font-mono text-slate-300 border border-slate-700/60">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>{formatDuration(durationSeconds)}</span>
          </div>

          {/* Open in New Window Button */}
          <button
            onClick={() => window.open(window.location.href, '_blank')}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold border border-slate-700 transition"
            title="مشاهده کلاس در برگه جدید مرورگر"
          >
            <ExternalLink className="w-3.5 h-3.5 text-blue-400" />
            <span>برگه مستقل</span>
          </button>

          <button
            onClick={toggleFullscreen}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
            title="تمام‌صفحه"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* 2. MAIN STAGE: TEACHER LIVE VIDEO FEED */}
      <div className="relative flex-1 bg-black flex items-center justify-center overflow-hidden">
        {/* Class Ended Overlay */}
        {isClassEnded && (
          <div className="z-30 max-w-md p-6 bg-slate-900/95 border border-slate-700 rounded-2xl text-center space-y-4 shadow-2xl">
            <div className="w-14 h-14 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-white">کلاس توسط مدرس پایان یافت</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              جلسه آموزشی با موفقیت به اتمام رسید. می‌توانید فایل‌ها و تکالیف مربوط به این جلسه را در پنل کاربری مشاهده نمایید.
            </p>
            <button
              onClick={onExit}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition shadow-lg shadow-blue-600/30"
            >
              بازگشت به داشبورد
            </button>
          </div>
        )}

        {/* Connection Error Screen */}
        {errorMessage && !isClassEnded && (
          <div className="z-30 max-w-md p-6 bg-slate-900 border border-rose-900/60 rounded-xl text-center space-y-4">
            <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
            <h3 className="text-base font-bold text-white">خطا در اتصال به کلاس آنلاین</h3>
            <p className="text-xs text-slate-300 leading-relaxed">{errorMessage}</p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={joinLiveClass}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg transition"
              >
                تلاش مجدد
              </button>
              <button
                onClick={onExit}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg transition"
              >
                انصراف
              </button>
            </div>
          </div>
        )}

        {/* Loading / Connecting Screen */}
        {connectionState === 'connecting' && !errorMessage && !isClassEnded && (
          <div className="flex flex-col items-center gap-3 text-slate-400">
            <Loader2 className="w-12 h-12 animate-spin text-blue-500" />
            <p className="text-sm font-medium">در حال دریافت تصویر زنده مدرس...</p>
            <p className="text-xs text-slate-500">لطفاً چند لحظه شکیبا باشید</p>
          </div>
        )}

        {/* The Live Teacher Video Broadcast */}
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className={`w-full h-full object-contain ${
            connectionState === 'connected' ? 'block' : 'hidden'
          }`}
        />

        {/* Floating Broadcast Mode Indicator */}
        {connectionState === 'connected' && (
          <div className="absolute top-4 left-4 flex items-center gap-2 px-3 py-1.5 bg-slate-900/80 backdrop-blur rounded-lg border border-slate-700/60 text-xs text-slate-300 z-10">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>
              {session?.isScreenSharing
                ? 'مدرس در حال اشتراک محتوا (صفحه نمایش / تخته هوشمند)'
                : 'پخش زنده تصویر مدرس (WebRTC HD)'}
            </span>
          </div>
        )}
      </div>

      {/* 3. CHAT DRAWER */}
      {showChatDrawer && (
        <div className="absolute top-14 bottom-20 left-0 w-80 max-w-full bg-slate-900/95 backdrop-blur-md border-r border-slate-800 z-30 flex flex-col p-4 shadow-2xl animate-in slide-in-from-left duration-200">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-emerald-400" />
              <h3 className="text-sm font-bold text-white">گفتگوی متنی کلاس</h3>
            </div>
            <button
              onClick={() => setShowChatDrawer(false)}
              className="p-1 text-slate-400 hover:text-white rounded-lg"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto py-3 space-y-2.5">
            {(session?.messages || []).map((msg) => (
              <div
                key={msg.id}
                className={`p-2.5 rounded-xl text-xs ${
                  msg.senderId === user?.id
                    ? 'bg-blue-600/20 border border-blue-500/30 mr-4'
                    : 'bg-slate-800/80 border border-slate-700/50 ml-4'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-slate-200">{msg.senderName}</span>
                  <span className="text-[10px] text-slate-500">{msg.timestamp}</span>
                </div>
                <p className="text-slate-300 leading-relaxed">{msg.text}</p>
              </div>
            ))}
          </div>

          <div className="pt-2 border-t border-slate-800 flex gap-2">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && chatInput.trim()) {
                  import('../../api/client').then(({ api }) => {
                    api.sendLiveChatMessage(
                      currentClass.id,
                      user?.id || '',
                      `${user?.firstName} ${user?.lastName}`,
                      'STUDENT',
                      chatInput.trim()
                    );
                    setChatInput('');
                  });
                }
              }}
              placeholder="ارسال پیام به کلاس..."
              className="flex-1 bg-slate-800 text-xs text-white px-3 py-2 rounded-lg border border-slate-700 focus:outline-none focus:border-blue-500"
            />
            <button
              onClick={() => {
                if (!chatInput.trim()) return;
                import('../../api/client').then(({ api }) => {
                  api.sendLiveChatMessage(
                    currentClass.id,
                    user?.id || '',
                    `${user?.firstName} ${user?.lastName}`,
                    'STUDENT',
                    chatInput.trim()
                  );
                  setChatInput('');
                });
              }}
              className="p-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-white transition"
            >
              <Send className="w-4 h-4 rotate-180" />
            </button>
          </div>
        </div>
      )}

      {/* 4. BOTTOM STUDENT BAR */}
      <footer className="h-20 bg-slate-900 border-t border-slate-800 px-6 flex items-center justify-between z-20">
        <div className="flex items-center gap-2">
          {/* Audio Mute toggle for local speaker */}
          <button
            onClick={toggleMutePlayback}
            className={`p-3 rounded-xl border transition ${
              isAudioMuted
                ? 'bg-rose-600/20 border-rose-500 text-rose-400'
                : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300'
            }`}
            title={isAudioMuted ? 'فعال کردن صدای پخش' : 'بی‌صدا کردن پخش'}
          >
            {isAudioMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
          </button>

          {/* Chat Toggle */}
          <button
            onClick={() => setShowChatDrawer(!showChatDrawer)}
            className={`p-3 rounded-xl border transition ${
              showChatDrawer
                ? 'bg-blue-600/30 border-blue-500 text-blue-400'
                : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300'
            }`}
            title="گفتگوی متنی"
          >
            <MessageSquare className="w-5 h-5" />
          </button>

          {/* AnyDesk & Remote Desktop Hub Button */}
          <button
            onClick={() => setShowAnyDeskModal(true)}
            className="p-3 rounded-xl border border-rose-500/40 bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 hover:text-white transition shadow-xs flex items-center gap-1.5"
            title="ریموت دسکتاپ و AnyDesk کلاسی"
          >
            <Laptop className="w-5 h-5 text-rose-400" />
            <span className="text-xs font-semibold hidden md:inline">
              ریموت دسکتاپ AnyDesk
            </span>
          </button>
        </div>

        {/* Center Indicator */}
        <div className="text-center hidden sm:block">
          <p className="text-xs font-semibold text-slate-300">حالت دریافت پخش زنده</p>
          <p className="text-[10px] text-slate-500">مدرس در حال ارائه مبحث آموزشی است</p>
        </div>

        {/* Right Side: Leave Class */}
        <div>
          <button
            onClick={handleLeaveClass}
            className="px-4 py-2.5 bg-slate-800 hover:bg-rose-950 hover:text-rose-400 border border-slate-700 hover:border-rose-800 text-slate-300 text-xs font-bold rounded-xl flex items-center gap-2 transition"
          >
            <PhoneOff className="w-4 h-4" />
            <span>خروج از کلاس</span>
          </button>
        </div>
      </footer>

      {/* ANYDESK REMOTE DESKTOP MODAL */}
      <AnyDeskRemoteModal
        isOpen={showAnyDeskModal}
        onClose={() => setShowAnyDeskModal(false)}
        userRole="STUDENT"
        userName={user ? `${user.firstName} ${user.lastName}` : 'دانش‌آموز'}
        classTitle={currentClass.title}
      />
    </div>
  );
};
