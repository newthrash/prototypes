/**
 * WebRTC Manager for ScreenLink
 * Handles peer-to-peer screen sharing connections
 */

class WebRTCManager {
    constructor(socket, roomCode) {
        this.socket = socket;
        this.roomCode = roomCode;
        this.pc = null;
        this.localStream = null;
        this.isHost = false;
        this.peerId = null;
        
        // ICE servers configuration (STUN/TURN)
        this.iceServers = {
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' },
                { urls: 'stun:stun2.l.google.com:19302' },
                { urls: 'stun:stun3.l.google.com:19302' },
                { urls: 'stun:stun4.l.google.com:19302' }
            ]
        };
        
        this.setupSocketListeners();
        this.setupUI();
    }
    
    setupSocketListeners() {
        // Handle incoming WebRTC signaling
        this.socket.on('offer', async (data) => {
            console.log('Received offer from:', data.sender_id);
            await this.handleOffer(data.offer, data.sender_id);
        });
        
        this.socket.on('answer', async (data) => {
            console.log('Received answer from:', data.sender_id);
            await this.handleAnswer(data.answer);
        });
        
        this.socket.on('ice-candidate', async (data) => {
            console.log('Received ICE candidate from:', data.sender_id);
            await this.handleIceCandidate(data.candidate);
        });
    }
    
    setupUI() {
        const shareBtn = document.getElementById('shareBtn');
        const stopShareBtn = document.getElementById('stopShareBtn');
        
        if (shareBtn) {
            shareBtn.addEventListener('click', () => this.startScreenShare());
        }
        
        if (stopShareBtn) {
            stopShareBtn.addEventListener('click', () => this.stopScreenShare());
        }
    }
    
    async createPeerConnection() {
        console.log('Creating peer connection...');
        
        this.pc = new RTCPeerConnection(this.iceServers);
        
        // Handle ICE candidates
        this.pc.onicecandidate = (event) => {
            if (event.candidate && this.peerId) {
                console.log('Sending ICE candidate');
                this.socket.emit('ice_candidate', {
                    target_id: this.peerId,
                    candidate: event.candidate
                });
            }
        };
        
        // Handle connection state changes
        this.pc.onconnectionstatechange = () => {
            console.log('Connection state:', this.pc.connectionState);
        };
        
        // Handle incoming streams
        this.pc.ontrack = (event) => {
            console.log('Received remote stream');
            const remoteVideo = document.getElementById('remoteVideo');
            if (remoteVideo && event.streams[0]) {
                remoteVideo.srcObject = event.streams[0];
                document.getElementById('waitingMessage')?.classList.add('hidden');
            }
        };
    }
    
    async startHost(peerId) {
        console.log('Starting as host for peer:', peerId);
        this.isHost = true;
        this.peerId = peerId;
        await this.createPeerConnection();
    }
    
    async startScreenShare() {
        try {
            console.log('Requesting screen share...');
            
            // Get screen share stream
            this.localStream = await navigator.mediaDevices.getDisplayMedia({
                video: {
                    cursor: 'always',
                    displaySurface: 'monitor'
                },
                audio: false
            });
            
            console.log('Screen share obtained');
            
            // Show local video
            const localVideo = document.getElementById('localVideo');
            const localContainer = document.getElementById('localVideoContainer');
            if (localVideo && localContainer) {
                localVideo.srcObject = this.localStream;
                localContainer.classList.remove('hidden');
            }
            
            // Add tracks to peer connection
            this.localStream.getTracks().forEach(track => {
                console.log('Adding track to peer connection:', track.kind);
                this.pc.addTrack(track, this.localStream);
            });
            
            // Create and send offer
            const offer = await this.pc.createOffer();
            await this.pc.setLocalDescription(offer);
            
            console.log('Sending offer to peer:', this.peerId);
            this.socket.emit('offer', {
                target_id: this.peerId,
                offer: offer
            });
            
            // Update UI
            document.getElementById('shareBtn')?.classList.add('hidden');
            document.getElementById('stopShareBtn')?.classList.remove('hidden');
            
            // Notify that screen share started
            this.socket.emit('screen_share_started', { room_code: this.roomCode });
            
            // Handle when user stops sharing via browser UI
            this.localStream.getVideoTracks()[0].onended = () => {
                this.stopScreenShare();
            };
            
        } catch (err) {
            console.error('Error starting screen share:', err);
            alert('Could not start screen sharing. Please make sure you\'ve granted permission.');
        }
    }
    
    stopScreenShare() {
        console.log('Stopping screen share...');
        
        // Stop all tracks
        if (this.localStream) {
            this.localStream.getTracks().forEach(track => track.stop());
            this.localStream = null;
        }
        
        // Remove tracks from peer connection
        if (this.pc) {
            const senders = this.pc.getSenders();
            senders.forEach(sender => {
                if (sender.track) {
                    this.pc.removeTrack(sender);
                }
            });
        }
        
        // Update UI
        const localContainer = document.getElementById('localVideoContainer');
        if (localContainer) {
            localContainer.classList.add('hidden');
        }
        
        document.getElementById('shareBtn')?.classList.remove('hidden');
        document.getElementById('stopShareBtn')?.classList.add('hidden');
        
        // Notify peers
        this.socket.emit('screen_share_stopped', { room_code: this.roomCode });
    }
    
    async handleOffer(offer, senderId) {
        console.log('Handling offer from:', senderId);
        this.peerId = senderId;
        this.isHost = false;
        
        await this.createPeerConnection();
        
        // Set remote description
        await this.pc.setRemoteDescription(new RTCSessionDescription(offer));
        
        // Create answer
        const answer = await this.pc.createAnswer();
        await this.pc.setLocalDescription(answer);
        
        // Send answer
        console.log('Sending answer to:', senderId);
        this.socket.emit('answer', {
            target_id: senderId,
            answer: answer
        });
    }
    
    async handleAnswer(answer) {
        console.log('Handling answer');
        if (this.pc) {
            await this.pc.setRemoteDescription(new RTCSessionDescription(answer));
        }
    }
    
    async handleIceCandidate(candidate) {
        console.log('Handling ICE candidate');
        if (this.pc) {
            try {
                await this.pc.addIceCandidate(new RTCIceCandidate(candidate));
            } catch (err) {
                console.error('Error adding ICE candidate:', err);
            }
        }
    }
    
    handlePeerDisconnect() {
        console.log('Handling peer disconnect');
        
        // Stop screen share if active
        if (this.localStream) {
            this.stopScreenShare();
        }
        
        // Close peer connection
        if (this.pc) {
            this.pc.close();
            this.pc = null;
        }
        
        this.peerId = null;
    }
    
    disconnect() {
        this.handlePeerDisconnect();
    }
}

// Make available globally
window.WebRTCManager = WebRTCManager;
