/**
 * Dedicated WebRTC Service for Live Classroom WebRTC
 * Manages RTCPeerConnection instances, SDP negotiation (Offer/Answer),
 * ICE candidate exchange, track assignment, and connection health states.
 */

export interface IceConfigOptions {
  urls: string[];
  username?: string;
  credential?: string;
}

export class WebRTCService {
  /**
   * Generates RTCConfiguration with Google STUN servers
   * and optional TURN server if configured via environment variables.
   */
  getIceServers(): RTCConfiguration {
    const iceServers: RTCIceServer[] = [
      {
        urls: [
          'stun:stun.l.google.com:19302',
          'stun:stun1.l.google.com:19302',
          'stun:stun2.l.google.com:19302',
          'stun:stun.cloudflare.com:3478',
        ],
      },
    ];

    // Check optional TURN config without exposing hardcoded keys
    const metaEnv = (import.meta as any).env || {};
    const turnUrl = metaEnv.VITE_TURN_SERVER_URL;
    const turnUsername = metaEnv.VITE_TURN_USERNAME;
    const turnCredential = metaEnv.VITE_TURN_CREDENTIAL;

    if (turnUrl) {
      iceServers.push({
        urls: turnUrl.split(','),
        username: turnUsername,
        credential: turnCredential,
      });
    }

    return {
      iceServers,
      iceCandidatePoolSize: 2,
    };
  }

  /**
   * Teacher creates a dedicated PeerConnection for an individual student
   */
  createTeacherPeerConnection(
    studentId: string,
    localStream: MediaStream,
    callbacks: {
      onIceCandidate: (candidate: RTCIceCandidate) => void;
      onConnectionStateChange: (state: RTCPeerConnectionState, studentId: string) => void;
    }
  ): RTCPeerConnection {
    const config = this.getIceServers();
    const pc = new RTCPeerConnection(config);

    // Add Teacher tracks (broadcasting)
    localStream.getTracks().forEach((track) => {
      pc.addTrack(track, localStream);
    });

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        callbacks.onIceCandidate(event.candidate);
      }
    };

    pc.onconnectionstatechange = () => {
      callbacks.onConnectionStateChange(pc.connectionState, studentId);
    };

    pc.oniceconnectionstatechange = () => {
      if (pc.iceConnectionState === 'failed' || pc.iceConnectionState === 'disconnected') {
        console.warn(`[WebRTC] ICE state for student ${studentId}: ${pc.iceConnectionState}`);
      }
    };

    return pc;
  }

  /**
   * Student creates PeerConnection to receive Teacher broadcast
   */
  createStudentPeerConnection(callbacks: {
    onTrack: (remoteStream: MediaStream) => void;
    onIceCandidate: (candidate: RTCIceCandidate) => void;
    onConnectionStateChange: (state: RTCPeerConnectionState) => void;
  }): RTCPeerConnection {
    const config = this.getIceServers();
    const pc = new RTCPeerConnection(config);

    const remoteStream = new MediaStream();

    pc.ontrack = (event) => {
      if (event.streams && event.streams[0]) {
        callbacks.onTrack(event.streams[0]);
      } else {
        remoteStream.addTrack(event.track);
        callbacks.onTrack(remoteStream);
      }
    };

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        callbacks.onIceCandidate(event.candidate);
      }
    };

    pc.onconnectionstatechange = () => {
      callbacks.onConnectionStateChange(pc.connectionState);
    };

    return pc;
  }

  /**
   * Create SDP Offer (Teacher initiates connection to student)
   */
  async createOffer(pc: RTCPeerConnection): Promise<RTCSessionDescriptionInit> {
    const offer = await pc.createOffer({
      offerToReceiveAudio: false,
      offerToReceiveVideo: false,
    });
    await pc.setLocalDescription(offer);
    return offer;
  }

  /**
   * Process SDP Answer (Teacher receives student's answer)
   */
  async processAnswer(pc: RTCPeerConnection, answer: RTCSessionDescriptionInit): Promise<void> {
    if (pc.signalingState === 'have-local-offer') {
      const desc = new RTCSessionDescription(answer);
      await pc.setRemoteDescription(desc);
    } else {
      console.warn(`[WebRTC] Ignoring answer in invalid signaling state: ${pc.signalingState}`);
    }
  }

  /**
   * Create SDP Answer (Student answers teacher's offer)
   */
  async createAnswer(
    pc: RTCPeerConnection,
    offer: RTCSessionDescriptionInit
  ): Promise<RTCSessionDescriptionInit> {
    const desc = new RTCSessionDescription(offer);
    await pc.setRemoteDescription(desc);

    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    return answer;
  }

  /**
   * Add ICE candidate to PeerConnection
   */
  async addIceCandidate(pc: RTCPeerConnection, candidateInit: RTCIceCandidateInit): Promise<void> {
    try {
      if (!pc.remoteDescription) {
        // PeerConnection queue handles or buffers until remote description is set
        console.log('[WebRTC] Queueing candidate before remote description');
      }
      const candidate = new RTCIceCandidate(candidateInit);
      await pc.addIceCandidate(candidate);
    } catch (err) {
      console.error('[WebRTC] Error adding ICE candidate:', err);
    }
  }

  /**
   * Close PeerConnection safely
   */
  closePeerConnection(pc: RTCPeerConnection | null): void {
    if (!pc) return;
    try {
      pc.onicecandidate = null;
      pc.ontrack = null;
      pc.onconnectionstatechange = null;
      pc.close();
    } catch (e) {
      console.error('[WebRTC] Error closing peer connection:', e);
    }
  }
}

export const webrtcService = new WebRTCService();
