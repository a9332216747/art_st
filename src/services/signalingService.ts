/**
 * Dedicated WebRTC Signaling Service
 * Interfaces with the isolated Firestore/Signaling API structure:
 * liveSessions/{sessionId}/participants
 * liveSessions/{sessionId}/teacherCandidates
 * liveSessions/{sessionId}/studentConnections/{studentId}
 */

import { api } from '../api/client';
import { LiveSessionState, StudentConnectionDoc, IceCandidateDoc } from '../types';

export class SignalingService {
  private activeIntervals: number[] = [];
  private seenCandidateIds: Set<string> = new Set();

  /**
   * Teacher creates or starts a live session
   */
  async createSession(classId: string, teacherId: string, teacherName: string): Promise<LiveSessionState> {
    return api.startLiveSession(classId, teacherId, teacherName);
  }

  /**
   * Student or participant joins a live session
   */
  async joinSession(classId: string, userId: string, userName: string, role: string): Promise<LiveSessionState> {
    return api.joinLiveSession(classId, userId, userName, role);
  }

  /**
   * Get latest session metadata
   */
  async getSession(classId: string): Promise<LiveSessionState> {
    return api.getLiveSession(classId);
  }

  /**
   * Teacher sends SDP Offer to a specific student
   */
  async sendOffer(classId: string, studentId: string, offer: RTCSessionDescriptionInit): Promise<void> {
    await api.sendOffer(classId, studentId, offer);
  }

  /**
   * Student sends SDP Answer back to teacher
   */
  async sendAnswer(classId: string, studentId: string, answer: RTCSessionDescriptionInit): Promise<void> {
    await api.sendAnswer(classId, studentId, answer);
  }

  /**
   * Teacher pushes ICE Candidate
   */
  async sendTeacherCandidate(classId: string, candidate: RTCIceCandidateInit): Promise<void> {
    await api.sendTeacherCandidate(classId, candidate);
  }

  /**
   * Student pushes ICE Candidate into isolated subcollection
   */
  async sendStudentCandidate(classId: string, studentId: string, candidate: RTCIceCandidateInit): Promise<void> {
    await api.sendStudentCandidate(classId, studentId, candidate);
  }

  /**
   * Student polls for Teacher's SDP Offer
   */
  listenForOffer(
    classId: string,
    studentId: string,
    onOffer: (offer: RTCSessionDescriptionInit) => void
  ): () => void {
    let hasReceivedOffer = false;
    const interval = window.setInterval(async () => {
      if (hasReceivedOffer) return;
      try {
        const conn = await api.getStudentConnection(classId, studentId);
        if (conn && conn.offer && (conn.status === 'offered' || !hasReceivedOffer)) {
          hasReceivedOffer = true;
          onOffer(conn.offer);
        }
      } catch (err) {
        // silent retry
      }
    }, 1500);

    this.activeIntervals.push(interval);
    return () => {
      clearInterval(interval);
      this.activeIntervals = this.activeIntervals.filter((i) => i !== interval);
    };
  }

  /**
   * Teacher polls for Student's SDP Answer
   */
  listenForAnswer(
    classId: string,
    studentId: string,
    onAnswer: (answer: RTCSessionDescriptionInit) => void
  ): () => void {
    let hasReceivedAnswer = false;
    const interval = window.setInterval(async () => {
      if (hasReceivedAnswer) return;
      try {
        const conn = await api.getStudentConnection(classId, studentId);
        if (conn && conn.answer && !hasReceivedAnswer) {
          hasReceivedAnswer = true;
          onAnswer(conn.answer);
        }
      } catch (err) {
        // silent retry
      }
    }, 1500);

    this.activeIntervals.push(interval);
    return () => {
      clearInterval(interval);
      this.activeIntervals = this.activeIntervals.filter((i) => i !== interval);
    };
  }

  /**
   * Student listens for Teacher's ICE candidates
   */
  listenForTeacherCandidates(
    classId: string,
    onCandidate: (candidate: RTCIceCandidateInit) => void
  ): () => void {
    const interval = window.setInterval(async () => {
      try {
        const cands: IceCandidateDoc[] = await api.getTeacherCandidates(classId);
        if (Array.isArray(cands)) {
          cands.forEach((c) => {
            const key = `teacher_${c.id}`;
            if (!this.seenCandidateIds.has(key)) {
              this.seenCandidateIds.add(key);
              onCandidate(c.candidate);
            }
          });
        }
      } catch (err) {}
    }, 1500);

    this.activeIntervals.push(interval);
    return () => {
      clearInterval(interval);
      this.activeIntervals = this.activeIntervals.filter((i) => i !== interval);
    };
  }

  /**
   * Teacher listens for Student's ICE candidates
   */
  listenForStudentCandidates(
    classId: string,
    studentId: string,
    onCandidate: (candidate: RTCIceCandidateInit) => void
  ): () => void {
    const interval = window.setInterval(async () => {
      try {
        const cands: IceCandidateDoc[] = await api.getStudentCandidates(classId, studentId);
        if (Array.isArray(cands)) {
          cands.forEach((c) => {
            const key = `student_${studentId}_${c.id}`;
            if (!this.seenCandidateIds.has(key)) {
              this.seenCandidateIds.add(key);
              onCandidate(c.candidate);
            }
          });
        }
      } catch (err) {}
    }, 1500);

    this.activeIntervals.push(interval);
    return () => {
      clearInterval(interval);
      this.activeIntervals = this.activeIntervals.filter((i) => i !== interval);
    };
  }

  /**
   * Listen to session status changes & participant roster
   */
  listenToSession(classId: string, onUpdate: (session: LiveSessionState) => void): () => void {
    const interval = window.setInterval(async () => {
      try {
        const session = await api.getLiveSession(classId);
        onUpdate(session);
      } catch (err) {}
    }, 2500);

    this.activeIntervals.push(interval);
    return () => {
      clearInterval(interval);
      this.activeIntervals = this.activeIntervals.filter((i) => i !== interval);
    };
  }

  /**
   * Teacher ends class
   */
  async endSession(classId: string): Promise<void> {
    await api.endLiveSession(classId);
  }

  /**
   * Participant leaves class
   */
  async leaveSession(classId: string, userId: string): Promise<void> {
    await api.leaveLiveSession(classId, userId);
  }

  /**
   * Toggle teacher media controls
   */
  async toggleMedia(
    classId: string,
    controls: { isCameraOn?: boolean; isMicOn?: boolean; isScreenSharing?: boolean }
  ): Promise<LiveSessionState> {
    return api.toggleLiveControls(classId, controls);
  }

  /**
   * Cleanup all intervals and cached candidates
   */
  cleanup(): void {
    this.activeIntervals.forEach((id) => clearInterval(id));
    this.activeIntervals = [];
    this.seenCandidateIds.clear();
  }
}

export const signalingService = new SignalingService();
