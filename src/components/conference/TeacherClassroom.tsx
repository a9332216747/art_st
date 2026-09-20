import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { ClassSession, LiveSessionState, MAX_DIRECT_WEBRTC_STUDENTS } from '../../types';
import { mediaManager } from '../../services/mediaManager';
import { webrtcService } from '../../services/webrtcService';
import { signalingService } from '../../services/signalingService';
import { InteractiveWhiteboard } from './InteractiveWhiteboard';
import { Modal } from '../common/Modal';
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  ScreenShare,
  PhoneOff,
  Users,
  Radio,
  Clock,
  Maximize2,
  Minimize2,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Shield,
  MessageSquare,
  Send,
  X,
  ExternalLink,
  Presentation,
  Monitor,
  Sparkles,
  Laptop,
} from 'lucide-react';
import { AnyDeskRemoteModal } from './AnyDeskRemoteModal';

interface TeacherClassroomProps {
  currentClass: ClassSession;
  onExit: () => void;
}

export const TeacherClassroom: React.FC<TeacherClassroomProps> = ({ currentClass, onExit }) => {
  const { user } = useAuth();
  const toast = useToast();

  // Media state
  const [isCameraOn, setIsCameraOn] = useState<boolean>(true);
  const [isMicOn, setIsMicOn] = useState<boolean>(true);
  const [isScreenSharing, setIsScreenSharing] = useState<boolean>(false);
  const [shareMode, setShareMode] = useState<'screen' | 'whiteboard' | null>(null);
  const [showShareModal, setShowShareModal] = useState<boolean>(false);
  const [showIframeWarningModal, setShowIframeWarningModal] = useState<boolean>(false);
  const [showAnyDeskModal, setShowAnyDeskModal] = useState<boolean>(false);
  const [isInitializingMedia, setIsInitializingMedia] = useState<boolean>(true);
  const [mediaError, setMediaError] = useState<string | null>(null);

  // Session & Roster state
  const [session, setSession] = useState<LiveSessionState | null>(null);
  const [showEndModal, setShowEndModal] = useState<boolean>(false);
  const [showParticipantsDrawer, setShowParticipantsDrawer] = useState<boolean>(false);
  const [showChatDrawer, setShowChatDrawer] = useState<boolean>(false);
  const [chatInput, setChatInput] = useState<string>('');
  const [durationSeconds, setDurationSeconds] = useState<number>(0);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Connection Tracking: Map<studentId, RTCPeerConnection>
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const cleanupsRef = useRef<Array<() => void>>([]);

  // Video DOM refs
  const primaryVideoRef = useRef<HTMLVideoElement | null>(null);
  const pipVideoRef = useRef<HTMLVideoElement | null>(null);
  const classroomContainerRef = useRef<HTMLDivElement | null>(null);

  // Local streams
  const localCameraStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    initializeBroadcaster();

    const timer = setInterval(() => {
      setDurationSeconds((prev) => prev + 1);
    }, 1000);

    return () => {
      clearInterval(timer);
      teardownBroadcaster();
    };
  }, [currentClass.id]);

  // Ensure PiP camera preview is attached and playing whenever screen/whiteboard is sharing
  useEffect(() => {
    if (isScreenSharing && isCameraOn && pipVideoRef.current && localCameraStreamRef.current) {
      pipVideoRef.current.srcObject = localCameraStreamRef.current;
      pipVideoRef.current.play().catch(() => {});
    }
  }, [isScreenSharing, isCameraOn]);

  /**
   * Phase A & B: Initialize Session & Capture Media
   */
  const initializeBroadcaster = async () => {
    if (!user) return;
    setIsInitializingMedia(true);
    setMediaError(null);

    try {
      // 1. Start live session in signaling
      const sess = await signalingService.createSession(
        currentClass.id,
        user.id,
        `${user.firstName} ${user.lastName}`
      );
      setSession(sess);

      // 2. Request Camera & Mic
      const stream = await mediaManager.getTeacherMediaStream();
      localCameraStreamRef.current = stream;

      if (primaryVideoRef.current) {
        primaryVideoRef.current.srcObject = stream;
      }

      // 3. Listen for session updates (participant joins)
      const stopSessionListener = signalingService.listenToSession(currentClass.id, (updatedSess) => {
        setSession(updatedSess);
        handleParticipantsChange(updatedSess);
      });
      cleanupsRef.current.push(stopSessionListener);

      setIsInitializingMedia(false);
      toast.success('کلاس آنلاین با موفقیت شروع شد. تصویر و صدای شما در حال پخش است.');
    } catch (err: any) {
      console.error('Broadcaster initialization error:', err);
      setMediaError(err.message || 'خطا در فعال‌سازی دوربین و میکروفون');
      setIsInitializingMedia(false);
      toast.error(err.message || 'خطا در آغاز جلسه آنلاین');
    }
  };

  /**
   * Phase C: Handle newly joined students -> Create PeerConnection & Offer
   */
  const handleParticipantsChange = (currentSession: LiveSessionState) => {
    if (!localCameraStreamRef.current) return;

    const videoTrack = isScreenSharing && screenStreamRef.current
      ? screenStreamRef.current.getVideoTracks()[0]
      : (localCameraStreamRef.current ? localCameraStreamRef.current.getVideoTracks()[0] : null);
    const audioTrack = localCameraStreamRef.current ? localCameraStreamRef.current.getAudioTracks()[0] : null;

    const streamToBroadcast = new MediaStream();
    if (videoTrack) streamToBroadcast.addTrack(videoTrack);
    if (audioTrack) streamToBroadcast.addTrack(audioTrack);

    const studentParticipants = (currentSession.participants || []).filter(
      (p) => p.role === 'STUDENT'
    );

    studentParticipants.forEach((student) => {
      const studentId = student.userId;
      if (!peerConnectionsRef.current.has(studentId)) {
        initiateStudentConnection(studentId, streamToBroadcast);
      }
    });
  };

  const initiateStudentConnection = async (studentId: string, streamToBroadcast: MediaStream) => {
    try {
      console.log(`[Teacher] Creating PeerConnection for student: ${studentId}`);
      const pc = webrtcService.createTeacherPeerConnection(studentId, streamToBroadcast, {
        onIceCandidate: (candidate) => {
          signalingService.sendTeacherCandidate(currentClass.id, candidate.toJSON());
        },
        onConnectionStateChange: (state, sId) => {
          console.log(`[Teacher] Student ${sId} connection state: ${state}`);
          if (state === 'failed' || state === 'disconnected') {
            closeStudentConnection(sId);
          }
        },
      });

      peerConnectionsRef.current.set(studentId, pc);

      // Create Offer
      const offer = await webrtcService.createOffer(pc);
      await signalingService.sendOffer(currentClass.id, studentId, offer);

      // Listen for Student's Answer
      const stopAnswerListener = signalingService.listenForAnswer(
        currentClass.id,
        studentId,
        async (answer) => {
          console.log(`[Teacher] Received answer from student: ${studentId}`);
          await webrtcService.processAnswer(pc, answer);
        }
      );
      cleanupsRef.current.push(stopAnswerListener);

      // Listen for Student's ICE candidates
      const stopCandidateListener = signalingService.listenForStudentCandidates(
        currentClass.id,
        studentId,
        async (candidate) => {
          await webrtcService.addIceCandidate(pc, candidate);
        }
      );
      cleanupsRef.current.push(stopCandidateListener);
    } catch (err) {
      console.error(`Error setting up connection for student ${studentId}:`, err);
    }
  };

  const closeStudentConnection = (studentId: string) => {
    const pc = peerConnectionsRef.current.get(studentId);
    if (pc) {
      webrtcService.closePeerConnection(pc);
      peerConnectionsRef.current.delete(studentId);
    }
  };

  /**
   * Phase B: Toggle Camera
   */
  const handleToggleCamera = () => {
    if (!localCameraStreamRef.current) return;
    const videoTrack = localCameraStreamRef.current.getVideoTracks()[0];
    if (videoTrack) {
      const nextState = !videoTrack.enabled;
      videoTrack.enabled = nextState;
      setIsCameraOn(nextState);
      signalingService.toggleMedia(currentClass.id, { isCameraOn: nextState });
      toast.info(nextState ? 'دوربین فعال شد' : 'دوربین غیرفعال شد');
    }
  };

  /**
   * Phase B: Toggle Microphone
   */
  const handleToggleMic = () => {
    if (!localCameraStreamRef.current) return;
    const audioTrack = localCameraStreamRef.current.getAudioTracks()[0];
    if (audioTrack) {
      const nextState = !audioTrack.enabled;
      audioTrack.enabled = nextState;
      setIsMicOn(nextState);
      signalingService.toggleMedia(currentClass.id, { isMicOn: nextState });
      toast.info(nextState ? 'میکروفون فعال شد' : 'میکروفون بی‌صدا شد');
    }
  };

  /**
   * Phase E: Screen Sharing & Interactive Whiteboard with seamless track replacement
   */
  const handleToggleScreenShare = async () => {
    if (isScreenSharing) {
      stopScreenSharingAndRestoreCamera();
    } else {
      setShowShareModal(true);
    }
  };

  const handleStartNativeScreenShare = async () => {
    setShowShareModal(false);
    try {
      const { stream, track: screenTrack } = await mediaManager.startScreenShare(() => {
        stopScreenSharingAndRestoreCamera();
      });

      screenStreamRef.current = stream;
      setIsScreenSharing(true);
      setShareMode('screen');

      // Update main video view to screen stream and play
      if (primaryVideoRef.current) {
        primaryVideoRef.current.srcObject = stream;
        primaryVideoRef.current.play().catch(() => {});
      }

      // Replace track in all active student PeerConnections
      for (const [studentId, pc] of peerConnectionsRef.current.entries()) {
        await mediaManager.replaceVideoTrackInConnection(pc, screenTrack);
      }

      signalingService.toggleMedia(currentClass.id, { isScreenSharing: true });
      toast.success('اشتراک‌گذاری صفحه نمایش سیستم با موفقیت آغاز گردید.');
    } catch (err: any) {
      if (err.isIframeBlocked) {
        setShowIframeWarningModal(true);
      } else if (!err.isCancelled) {
        toast.error(err.message || 'خطا در شروع اشتراک صفحه');
      }
    }
  };

  const handleStartWhiteboardShare = () => {
    setShowShareModal(false);
    setShowIframeWarningModal(false);
    setIsScreenSharing(true);
    setShareMode('whiteboard');
    signalingService.toggleMedia(currentClass.id, { isScreenSharing: true });
    toast.success('تخته وایت‌برد هوشمند آنلاین فعال و برای هنرجویان ارسال می‌شود.');
  };

  const handleWhiteboardCanvasReady = async (canvas: HTMLCanvasElement) => {
    try {
      const { stream, track } = mediaManager.startCanvasShare(canvas, 25, () => {
        stopScreenSharingAndRestoreCamera();
      });

      screenStreamRef.current = stream;

      // Replace track in all active student PeerConnections
      for (const [studentId, pc] of peerConnectionsRef.current.entries()) {
        await mediaManager.replaceVideoTrackInConnection(pc, track);
      }
    } catch (err: any) {
      console.error('Error starting canvas share:', err);
    }
  };

  const stopScreenSharingAndRestoreCamera = async () => {
    mediaManager.stopScreenShare();
    screenStreamRef.current = null;
    setIsScreenSharing(false);
    setShareMode(null);

    // Restore Camera in local preview and play
    if (primaryVideoRef.current && localCameraStreamRef.current) {
      primaryVideoRef.current.srcObject = localCameraStreamRef.current;
      primaryVideoRef.current.play().catch(() => {});
    }

    // Replace video track with camera in all active PeerConnections
    if (localCameraStreamRef.current) {
      const cameraTrack = localCameraStreamRef.current.getVideoTracks()[0] || null;
      for (const [studentId, pc] of peerConnectionsRef.current.entries()) {
        await mediaManager.replaceVideoTrackInConnection(pc, cameraTrack);
      }
    }

    signalingService.toggleMedia(currentClass.id, { isScreenSharing: false });
    toast.info('اشتراک‌گذاری متوقف و تصویر دوربین بازگردانی شد.');
  };

  /**
   * Phase F: End Class for Everyone
   */
  const handleConfirmEndClass = async () => {
    try {
      await signalingService.endSession(currentClass.id);
      teardownBroadcaster();
      toast.success('جلسه آنلاین با موفقیت پایان یافت.');
      onExit();
    } catch (err: any) {
      toast.error('خطا در ثبت پایان کلاس');
    }
  };

  /**
   * Teardown and cleanup all WebRTC and media resources
   */
  const teardownBroadcaster = () => {
    // 1. Close all student peer connections
    peerConnectionsRef.current.forEach((pc) => {
      webrtcService.closePeerConnection(pc);
    });
    peerConnectionsRef.current.clear();

    // 2. Stop all media streams
    mediaManager.stopAllMediaTracks();
    localCameraStreamRef.current = null;
    screenStreamRef.current = null;

    // 3. Clear signaling listeners
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

  const formatDuration = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const pad = (n: number) => n.toString().padStart(2, '0');
    return hours > 0
      ? `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
      : `${pad(minutes)}:${pad(seconds)}`;
  };

  const activeStudents = (session?.participants || []).filter((p) => p.role === 'STUDENT');

  return (
    <div
      ref={classroomContainerRef}
      className="relative flex flex-col h-[calc(100vh-5rem)] min-h-[640px] bg-slate-950 text-white rounded-2xl overflow-hidden border border-slate-800 select-none shadow-2xl"
    >
      {/* 1. TOP STATUS BAR */}
      <header className="flex items-center justify-between px-5 py-3.5 bg-slate-900/90 backdrop-blur border-b border-slate-800 z-20">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1 bg-rose-500/20 border border-rose-500/40 rounded-full text-rose-400 text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
            <span>پخش زنده (مدرس)</span>
          </div>

          <div className="h-4 w-[1px] bg-slate-700 hidden sm:block" />

          <div>
            <h2 className="text-sm sm:text-base font-bold text-white line-clamp-1">{currentClass.title}</h2>
            <p className="text-xs text-slate-400">مدرس: {user?.firstName} {user?.lastName}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Timer */}
          <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-800/80 rounded-lg text-xs font-mono text-slate-300 border border-slate-700/60">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>{formatDuration(durationSeconds)}</span>
          </div>

          {/* Active Students Counter */}
          <button
            onClick={() => setShowParticipantsDrawer(!showParticipantsDrawer)}
            className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs text-slate-200 transition border border-slate-700"
            title="مشاهده لیست شرکت‌کنندگان"
          >
            <Users className="w-4 h-4 text-emerald-400" />
            <span className="hidden sm:inline">هنرجویان آنلاین:</span>
            <span className="font-bold text-emerald-400">{activeStudents.length}</span>
            <span className="text-slate-500 text-[10px]">/ {MAX_DIRECT_WEBRTC_STUDENTS}</span>
          </button>

          {/* Open in New Window Button (bypasses iframe restrictions) */}
          <button
            onClick={() => window.open(window.location.href, '_blank')}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold border border-slate-700 transition"
            title="باز کردن کلاس در برگه جدید مرورگر برای اشتراک آزادانه پنجره‌ها و برنامه‌ها"
          >
            <ExternalLink className="w-3.5 h-3.5 text-blue-400" />
            <span>برگه مستقل</span>
          </button>

          {/* Fullscreen Toggle */}
          <button
            onClick={toggleFullscreen}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
            title="تمام‌صفحه"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* 2. MAIN BROADCAST STAGE */}
      <div className="relative flex-1 bg-black flex items-center justify-center overflow-hidden">
        {/* Loading / Initializing Media */}
        {isInitializingMedia && (
          <div className="flex flex-col items-center gap-3 text-slate-400">
            <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
            <p className="text-sm font-medium">در حال راه‌اندازی دوربین و میکروفون مدرس...</p>
          </div>
        )}

        {/* Media Error Screen */}
        {mediaError && !isInitializingMedia && (
          <div className="max-w-md p-6 bg-slate-900 border border-rose-900/60 rounded-xl text-center space-y-4">
            <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
            <h3 className="text-base font-bold text-white">خطا در فعال‌سازی تصویر یا صدا</h3>
            <p className="text-xs text-slate-300 leading-relaxed">{mediaError}</p>
            <button
              onClick={initializeBroadcaster}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg transition"
            >
              تلاش مجدد
            </button>
          </div>
        )}

        {/* Interactive Whiteboard (Active when shareMode === 'whiteboard') */}
        {isScreenSharing && shareMode === 'whiteboard' && (
          <div className="w-full h-full relative z-0">
            <InteractiveWhiteboard
              onCanvasReady={handleWhiteboardCanvasReady}
              onClose={stopScreenSharingAndRestoreCamera}
            />
          </div>
        )}

        {/* Primary Broadcast Video (Screen Share or Camera) */}
        <video
          ref={primaryVideoRef}
          autoPlay
          playsInline
          muted // Always mute local playback to prevent acoustic feedback loop
          className={`w-full h-full object-contain ${
            (!isCameraOn && !isScreenSharing) || (isScreenSharing && shareMode === 'whiteboard')
              ? 'hidden'
              : 'block'
          }`}
        />

        {/* Camera Off Placeholder when not screen sharing */}
        {!isCameraOn && !isScreenSharing && !isInitializingMedia && !mediaError && (
          <div className="flex flex-col items-center justify-center gap-4 text-slate-400 p-8">
            <div className="w-20 h-20 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center">
              <VideoOff className="w-10 h-10 text-slate-500" />
            </div>
            <div className="text-center">
              <p className="text-sm font-bold text-slate-200">دوربین شما غیرفعال است</p>
              <p className="text-xs text-slate-400 mt-1">صوت شما همچنان برای هنرجویان ارسال می‌شود</p>
            </div>
          </div>
        )}

        {/* Picture-in-Picture (PiP) Camera Preview during Screen Sharing */}
        {isScreenSharing && isCameraOn && (
          <div className="absolute bottom-20 right-6 w-48 h-32 sm:w-60 sm:h-38 rounded-xl overflow-hidden shadow-2xl border-2 border-blue-500 bg-slate-900 z-10 transition-all">
            <video
              ref={pipVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
            <div className="absolute top-2 right-2 px-2 py-0.5 bg-black/70 backdrop-blur rounded text-[10px] text-white font-medium">
              تصویر مدرس
            </div>
          </div>
        )}

        {/* Broadcast Status Pill */}
        <div className="absolute top-4 left-4 flex items-center gap-2 px-3 py-1.5 bg-slate-900/80 backdrop-blur rounded-lg border border-slate-700/60 text-xs text-slate-300 z-10">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>پخش استریم: کیفیت 720p HD</span>
        </div>
      </div>

      {/* 3. PARTICIPANTS DRAWER */}
      {showParticipantsDrawer && (
        <div className="absolute top-14 bottom-20 right-0 w-80 max-w-full bg-slate-900/95 backdrop-blur-md border-l border-slate-800 z-30 flex flex-col p-4 shadow-2xl animate-in slide-in-from-right duration-200">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-400" />
              <h3 className="text-sm font-bold text-white">هنرجویان کلاس ({activeStudents.length})</h3>
            </div>
            <button
              onClick={() => setShowParticipantsDrawer(false)}
              className="p-1 text-slate-400 hover:text-white rounded-lg"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto py-3 space-y-2">
            {activeStudents.length === 0 ? (
              <div className="text-center py-10 text-xs text-slate-400">
                در حال حاضر هنرجویی وارد کلاس نشده است.
              </div>
            ) : (
              activeStudents.map((stu) => {
                const pc = peerConnectionsRef.current.get(stu.userId);
                const isConnected = pc && pc.connectionState === 'connected';

                return (
                  <div
                    key={stu.userId}
                    className="flex items-center justify-between p-2.5 bg-slate-800/80 rounded-xl border border-slate-700/60 text-xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-blue-600/30 border border-blue-500/40 flex items-center justify-center font-bold text-blue-300">
                        {stu.userName.charAt(0)}
                      </div>
                      <div>
                        <p className="font-semibold text-white">{stu.userName}</p>
                        <p className="text-[10px] text-slate-400">دانش‌آموز</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          isConnected ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'
                        }`}
                        title={isConnected ? 'اتصال WebRTC برقرار است' : 'در حال هماهنگی سیگنال'}
                      />
                      <span className="text-[10px] text-slate-400">
                        {isConnected ? 'متصل' : 'سیگنالینگ'}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* 4. CHAT DRAWER */}
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
                  signalingService.toggleMedia(currentClass.id, {}).then(() => {
                    import('../../api/client').then(({ api }) => {
                      api.sendLiveChatMessage(
                        currentClass.id,
                        user?.id || '',
                        `${user?.firstName} ${user?.lastName}`,
                        'TEACHER',
                        chatInput.trim()
                      );
                      setChatInput('');
                    });
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
                    'TEACHER',
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

      {/* 5. BOTTOM CONTROL BAR */}
      <footer className="h-20 bg-slate-900 border-t border-slate-800 px-6 flex items-center justify-between z-20">
        {/* Left Side: Secondary Tools */}
        <div className="flex items-center gap-2">
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
        </div>

        {/* Center: Primary Broadcaster Media Controls */}
        <div className="flex items-center gap-3">
          {/* Mic Toggle */}
          <button
            onClick={handleToggleMic}
            className={`p-3.5 rounded-2xl flex items-center gap-2 border transition ${
              isMicOn
                ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-white'
                : 'bg-rose-600/20 hover:bg-rose-600/30 border-rose-500 text-rose-400'
            }`}
            title={isMicOn ? 'قطع میکروفون' : 'فعال‌سازی میکروفون'}
          >
            {isMicOn ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
            <span className="text-xs font-semibold hidden md:inline">
              {isMicOn ? 'میکروفون فعال' : 'بی‌صدا'}
            </span>
          </button>

          {/* Camera Toggle */}
          <button
            onClick={handleToggleCamera}
            className={`p-3.5 rounded-2xl flex items-center gap-2 border transition ${
              isCameraOn
                ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-white'
                : 'bg-rose-600/20 hover:bg-rose-600/30 border-rose-500 text-rose-400'
            }`}
            title={isCameraOn ? 'خاموش کردن دوربین' : 'روشن کردن دوربین'}
          >
            {isCameraOn ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
            <span className="text-xs font-semibold hidden md:inline">
              {isCameraOn ? 'دوربین فعال' : 'دوربین خاموش'}
            </span>
          </button>

          {/* Screen Share Toggle */}
          <button
            onClick={handleToggleScreenShare}
            className={`p-3.5 rounded-2xl flex items-center gap-2 border transition ${
              isScreenSharing
                ? 'bg-blue-600 hover:bg-blue-500 border-blue-400 text-white'
                : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300'
            }`}
            title={isScreenSharing ? 'توقف اشتراک‌گذاری صفحه' : 'اشتراک‌گذاری صفحه'}
          >
            <ScreenShare className="w-5 h-5" />
            <span className="text-xs font-semibold hidden md:inline">
              {isScreenSharing ? 'توقف اشتراک صفحه' : 'اشتراک‌گذاری صفحه'}
            </span>
          </button>

          {/* AnyDesk & Remote Desktop Hub Button */}
          <button
            onClick={() => setShowAnyDeskModal(true)}
            className="p-3.5 rounded-2xl flex items-center gap-2 border border-rose-500/40 bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 hover:text-white transition shadow-xs"
            title="ریموت دسکتاپ و AnyDesk کلاسی"
          >
            <Laptop className="w-5 h-5 text-rose-400" />
            <span className="text-xs font-semibold hidden lg:inline">
              ریموت دسکتاپ AnyDesk
            </span>
          </button>
        </div>

        {/* Right Side: End Class Button */}
        <div>
          <button
            onClick={() => setShowEndModal(true)}
            className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-lg shadow-rose-600/20 transition"
          >
            <PhoneOff className="w-4 h-4" />
            <span>پایان کلاس آنلاین</span>
          </button>
        </div>
      </footer>

      {/* END CLASS CONFIRMATION MODAL */}
      {showEndModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl text-center space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-full bg-rose-500/20 text-rose-500 flex items-center justify-center mx-auto">
              <PhoneOff className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-bold text-white">پایان کلاس آنلاین برای همه</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                آیا از پایان دادن به این جلسه اطمینان دارید؟ با پایان کلاس، ارتباط ویدیویی تمام هنرجویان قطع خواهد شد.
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowEndModal(false)}
                className="flex-1 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-xl transition"
              >
                انصراف
              </button>
              <button
                onClick={handleConfirmEndClass}
                className="flex-1 px-4 py-2.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl transition shadow-lg shadow-rose-600/30"
              >
                بله، پایان کلاس
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SHARE METHOD SELECTION MODAL */}
      <Modal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        title="انتخاب روش اشتراک‌گذاری برای کلاس"
        maxWidth="md"
      >
        <div className="space-y-4 text-right py-2">
          <p className="text-xs text-slate-600 leading-relaxed">
            لطفاً نحوه ارائه محتوای آموزشی برای هنرجویان آنلاین را انتخاب فرمایید:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Option 1: Native System Screen Share */}
            <button
              type="button"
              onClick={handleStartNativeScreenShare}
              className="flex flex-col items-start p-4 rounded-2xl border-2 border-slate-200 hover:border-blue-500 bg-slate-50 hover:bg-blue-50/50 text-right transition-all group cursor-pointer"
            >
              <div className="p-2.5 rounded-xl bg-blue-100 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors mb-3">
                <Monitor className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-slate-800">اشتراک صفحه نمایش سیستم</h4>
              <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                اشتراک کل مانیتور، پنجره اسلاید (PowerPoint، PDF خوان، مرورگر) یا تب‌های سیستم
              </p>
            </button>

            {/* Option 2: Interactive Whiteboard */}
            <button
              type="button"
              onClick={handleStartWhiteboardShare}
              className="flex flex-col items-start p-4 rounded-2xl border-2 border-slate-200 hover:border-emerald-500 bg-slate-50 hover:bg-emerald-50/50 text-right transition-all group cursor-pointer"
            >
              <div className="p-2.5 rounded-xl bg-emerald-100 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-colors mb-3">
                <Presentation className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-slate-800">تخته وایت‌برد هوشمند</h4>
              <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                رسم فرمول، قلم، هایلایتر، اشکال هندسی، متن و اسلاید با پخش زنده روان 25fps
              </p>
            </button>

            {/* Option 3: AnyDesk & Remote Desktop */}
            <button
              type="button"
              onClick={() => {
                setShowShareModal(false);
                setShowAnyDeskModal(true);
              }}
              className="sm:col-span-2 flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 rounded-2xl border-2 border-rose-200 hover:border-rose-500 bg-rose-50/50 hover:bg-rose-50 text-right transition-all group cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-rose-100 text-rose-600 group-hover:bg-rose-600 group-hover:text-white transition-colors">
                  <Laptop className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-rose-950">ریموت دسکتاپ و دسترسی AnyDesk</h4>
                  <p className="text-[11px] text-rose-700 mt-0.5">
                    اشتراک شناسه AnyDesk برای کنترل از راه دور سیستم، رفع اشکال پروژه و هدایت مشترک کلاسی
                  </p>
                </div>
              </div>
              <span className="mt-2 sm:mt-0 text-xs font-bold text-rose-700 bg-white px-3 py-1 rounded-lg border border-rose-200 shadow-2xs">
                راه‌اندازی AnyDesk
              </span>
            </button>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={() => setShowShareModal(false)}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition"
            >
              انصراف
            </button>
          </div>
        </div>
      </Modal>

      {/* IFRAME SECURITY RESTRICTION MODAL */}
      <Modal
        isOpen={showIframeWarningModal}
        onClose={() => setShowIframeWarningModal(false)}
        title="محدودیت امنیتی فریم در اشتراک مستقیم سیستم"
        maxWidth="md"
      >
        <div className="space-y-4 text-right py-2">
          <div className="p-3.5 bg-amber-50 rounded-xl border border-amber-200 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-900 leading-relaxed">
              به دلیل قوانین امنیتی مرورگر، دسترسی به اشتراک کل دسکتاپ درون فریم‌های پیش‌نمایش مسدود است. می‌توانید از دو راهکار زیر بدون هیچ مشکلی استفاده کنید:
            </p>
          </div>

          <div className="space-y-2.5">
            <button
              type="button"
              onClick={() => {
                setShowIframeWarningModal(false);
                window.open(window.location.href, '_blank');
              }}
              className="w-full flex items-center justify-between p-3.5 rounded-xl border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-900 text-xs font-bold transition text-right group"
            >
              <span className="flex items-center gap-2">
                <ExternalLink className="w-4 h-4 text-blue-600 group-hover:scale-110 transition-transform" />
                ۱. باز کردن کلاس در برگه جدید (توصیه شده برای اشتراک نامحدود دسکتاپ و پنجره‌ها)
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setShowIframeWarningModal(false);
                handleStartWhiteboardShare();
              }}
              className="w-full flex items-center justify-between p-3.5 rounded-xl border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 text-xs font-bold transition text-right group"
            >
              <span className="flex items-center gap-2">
                <Presentation className="w-4 h-4 text-emerald-600 group-hover:scale-110 transition-transform" />
                ۲. استفاده از تخته وایت‌برد هوشمند آنلاین (بدون نیاز به باز کردن برگه جدید)
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setShowIframeWarningModal(false);
                setShowAnyDeskModal(true);
              }}
              className="w-full flex items-center justify-between p-3.5 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-900 text-xs font-bold transition text-right group"
            >
              <span className="flex items-center gap-2">
                <Laptop className="w-4 h-4 text-rose-600 group-hover:scale-110 transition-transform" />
                ۳. استفاده از AnyDesk و ریموت دسکتاپ (دسترسی مستقیم و پایدار)
              </span>
            </button>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={() => setShowIframeWarningModal(false)}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition"
            >
              بستن
            </button>
          </div>
        </div>
      </Modal>

      {/* ANYDESK REMOTE DESKTOP MODAL */}
      <AnyDeskRemoteModal
        isOpen={showAnyDeskModal}
        onClose={() => setShowAnyDeskModal(false)}
        userRole="TEACHER"
        userName={user ? `${user.firstName} ${user.lastName}` : 'استاد'}
        classTitle={currentClass.title}
      />
    </div>
  );
};
