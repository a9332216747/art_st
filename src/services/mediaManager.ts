/**
 * Dedicated Media Management Service for Live Classroom WebRTC
 * Manages user media (camera, mic), screen sharing, track replacement,
 * and device lifecycle with robust error handling.
 */

export interface MediaConstraints {
  width?: { ideal?: number; max?: number };
  height?: { ideal?: number; max?: number };
  frameRate?: { ideal?: number; max?: number };
}

export class MediaManager {
  private localStream: MediaStream | null = null;
  private screenStream: MediaStream | null = null;
  private onScreenShareEndedCallbacks: Array<() => void> = [];

  /**
   * Request teacher camera and microphone stream with high quality constraints
   */
  async getTeacherMediaStream(customConstraints?: MediaStreamConstraints): Promise<MediaStream> {
    const defaultConstraints: MediaStreamConstraints = {
      video: {
        width: { ideal: 1280, max: 1920 },
        height: { ideal: 720, max: 1080 },
        frameRate: { ideal: 25, max: 30 },
      },
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    };

    const constraints = customConstraints || defaultConstraints;

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('مرورگر شما از وب‌آر‌تی‌سی یا ضبط صوت و تصویر پشتیبانی نمی‌کند.');
      }

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      this.localStream = stream;
      return stream;
    } catch (err: any) {
      console.error('MediaManager getUserMedia error:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        throw new Error('دسترسی به دوربین یا میکروفون توسط کاربر مسدود شد. لطفاً در تنظیمات مرورگر اجازه دسترسی را فعال فرمایید.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        throw new Error('هیچ دستگاه دوربین یا میکروفونی در سیستم شما شناسایی نشد.');
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        throw new Error('دوربین یا میکروفون در حال حاضر توسط برنامه دیگری در سیستم شما اشغال شده است.');
      } else if (err.name === 'OverconstrainedError') {
        // Fallback to basic constraints if high quality is not supported
        try {
          const fallbackStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
          this.localStream = fallbackStream;
          return fallbackStream;
        } catch (fallbackErr: any) {
          throw new Error('کیفیت درخواستی توسط دوربین شما پشتیبانی نمی‌شود.');
        }
      }
      throw new Error(err.message || 'خطا در فعال‌سازی دوربین یا میکروفون');
    }
  }

  /**
   * Check if the application is currently running inside an iframe
   */
  isInIframe(): boolean {
    try {
      return window.self !== window.top;
    } catch (e) {
      return true;
    }
  }

  /**
   * Start screen sharing (full screen, window, or browser tab)
   * With multi-step fallback constraints for maximum cross-browser reliability.
   */
  async startScreenShare(onEnded?: () => void): Promise<{ stream: MediaStream; track: MediaStreamTrack }> {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
      throw new Error('مرورگر شما از اشتراک‌گذاری مستقیم صفحه نمایش پشتیبانی نمی‌کند.');
    }

    let stream: MediaStream | null = null;
    let lastError: any = null;

    // Strategy 1: Standard display media with audio false
    try {
      stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: false,
      });
    } catch (err1: any) {
      lastError = err1;
      // Strategy 2: Simple video: true constraint without audio parameter (works on WebKit / Safari)
      try {
        stream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
        });
      } catch (err2: any) {
        lastError = err2;
      }
    }

    if (!stream) {
      const isIframe = this.isInIframe();
      const errMsg = (lastError?.message || '').toLowerCase();
      const errName = lastError?.name || '';

      if (
        isIframe &&
        (errName === 'NotAllowedError' ||
          errName === 'SecurityError' ||
          errMsg.includes('permission') ||
          errMsg.includes('policy') ||
          errMsg.includes('iframe') ||
          errMsg.includes('display-capture'))
      ) {
        const customErr: any = new Error(
          'اشتراک مستقیم صفحه در محیط پیش‌نمایش درون‌برنامه‌ای (iFrame) به علت سیاست‌های امنیتی مرورگر مسدود است. لطفاً برنامه را در برگه مستقل باز کنید یا از تخته وایت‌برد هوشمند استفاده فرمایید.'
        );
        customErr.isIframeBlocked = true;
        throw customErr;
      }

      if (errName === 'NotAllowedError' || errName === 'PermissionDeniedError') {
        const customErr: any = new Error('اشتراک‌گذاری صفحه توسط کاربر لغو گردید یا دسترسی داده نشد.');
        customErr.isCancelled = true;
        throw customErr;
      }

      throw new Error(lastError?.message || 'خطا در شروع اشتراک‌گذاری صفحه نمایش');
    }

    this.screenStream = stream;
    const screenTrack = stream.getVideoTracks()[0];

    if (!screenTrack) {
      throw new Error('ترک تصویر برای اشتراک صفحه یافت نشد.');
    }

    if (onEnded) {
      this.onScreenShareEndedCallbacks.push(onEnded);
    }

    // Handle native browser "Stop Sharing" floating button
    screenTrack.onended = () => {
      this.stopScreenShare();
    };

    return { stream, track: screenTrack };
  }

  /**
   * Start screen sharing from an interactive Canvas (Whiteboard / Slides / Diagram)
   * Produces a real-time MediaStreamTrack via canvas.captureStream without iframe security restrictions!
   */
  startCanvasShare(
    canvas: HTMLCanvasElement,
    fps = 25,
    onEnded?: () => void
  ): { stream: MediaStream; track: MediaStreamTrack } {
    let stream: MediaStream;
    if (typeof canvas.captureStream === 'function') {
      stream = canvas.captureStream(fps);
    } else if (typeof (canvas as any).mozCaptureStream === 'function') {
      stream = (canvas as any).mozCaptureStream(fps);
    } else {
      throw new Error('قابلیت ضبط جریان تخته در مرورگر شما پشتیبانی نمی‌شود.');
    }

    this.screenStream = stream;
    const screenTrack = stream.getVideoTracks()[0];

    if (!screenTrack) {
      throw new Error('خطا در ایجاد جریان تصویری از تخته آموزشی.');
    }

    if (onEnded) {
      this.onScreenShareEndedCallbacks.push(onEnded);
    }

    screenTrack.onended = () => {
      this.stopScreenShare();
    };

    return { stream, track: screenTrack };
  }

  /**
   * Stop screen sharing and notify callbacks to restore camera stream
   */
  stopScreenShare(): void {
    if (this.screenStream) {
      this.screenStream.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch (e) {}
      });
      this.screenStream = null;
    }

    // Fire restoration callbacks
    const callbacks = [...this.onScreenShareEndedCallbacks];
    this.onScreenShareEndedCallbacks = [];
    callbacks.forEach((cb) => {
      try {
        cb();
      } catch (e) {
        console.error('Error in onScreenShareEnded callback:', e);
      }
    });
  }

  /**
   * Seamlessly replace the video track in all active student RTCPeerConnections
   * without renegotiation or disruption
   */
  async replaceVideoTrackInConnection(
    peerConnection: RTCPeerConnection,
    newTrack: MediaStreamTrack | null
  ): Promise<boolean> {
    try {
      const senders = peerConnection.getSenders();
      const videoSender = senders.find((s) => s.track && s.track.kind === 'video') ||
        senders.find((s) => !s.track || (s as any).kind === 'video');

      if (videoSender) {
        await videoSender.replaceTrack(newTrack);
        return true;
      }
      return false;
    } catch (err) {
      console.error('replaceVideoTrackInConnection failed:', err);
      return false;
    }
  }

  /**
   * Toggle track enable/disable state (soft mute)
   */
  toggleTrack(track: MediaStreamTrack | null, forceState?: boolean): boolean {
    if (!track) return false;
    track.enabled = forceState !== undefined ? forceState : !track.enabled;
    return track.enabled;
  }

  /**
   * Stop all active media tracks cleanly
   */
  stopAllMediaTracks(stream?: MediaStream | null): void {
    const targetStream = stream || this.localStream;
    if (targetStream) {
      targetStream.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch (e) {}
      });
    }

    if (this.screenStream) {
      this.screenStream.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch (e) {}
      });
      this.screenStream = null;
    }

    if (!stream) {
      this.localStream = null;
    }
  }

  getLocalStream(): MediaStream | null {
    return this.localStream;
  }

  getScreenStream(): MediaStream | null {
    return this.screenStream;
  }
}

export const mediaManager = new MediaManager();
