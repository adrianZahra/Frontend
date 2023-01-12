// Copyright Epic Games, Inc. All Rights Reserved.

import { Logger } from "../Logger/Logger";
import { Config, Flags } from "../Config/Config";
import { AggregatedStats } from "./AggregatedStats";

/**
 * Handles the Peer Connection 
 */
export class PeerConnectionController {
    peerConnection: RTCPeerConnection;
    aggregatedStats: AggregatedStats;
    config: Config;

    /**
     * Create a new RTC Peer Connection client
     * @param options - Peer connection Options
     * @param config - The config for our PS experience.
     */
    constructor(options: RTCConfiguration, config: Config) {

        this.config = config;

        // Set the ICE transport to relay if TURN enabled
        if (config.isFlagEnabled(Flags.ForceTURN)) {
            options.iceTransportPolicy = "relay";
            Logger.Log(Logger.GetStackTrace(), "Forcing TURN usage by setting ICE Transport Policy in peer connection config.");
        }

        // build a new peer connection with the options
        this.peerConnection = new RTCPeerConnection(options);
        this.peerConnection.onsignalingstatechange = (ev: Event) => this.handleSignalStateChange(ev);
        this.peerConnection.oniceconnectionstatechange = (ev: Event) => this.handleIceConnectionStateChange(ev);
        this.peerConnection.onicegatheringstatechange = (ev: Event) => this.handleIceGatheringStateChange(ev);
        this.peerConnection.ontrack = (ev: RTCTrackEvent) => this.handleOnTrack(ev);
        this.peerConnection.onicecandidate = (ev: RTCPeerConnectionIceEvent) => this.handleIceCandidate(ev);
		this.peerConnection.ondatachannel = (ev: RTCDataChannelEvent) => this.handleDataChannel(ev);
        this.aggregatedStats = new AggregatedStats();
    }

    /**
     * Create an offer for the Web RTC handshake and send the offer to the signaling server via websocket
     * @param offerOptions - RTC Offer Options
     */
    async createOffer(offerOptions: RTCOfferOptions, config: Config) {
        Logger.Log(Logger.GetStackTrace(), "Create Offer", 6);

        const isLocalhostConnection = location.hostname === "localhost" || location.hostname === "127.0.0.1";
        const isHttpsConnection = location.protocol === 'https:';
        let useMic = config.isFlagEnabled(Flags.UseMic);
        if (useMic && isLocalhostConnection && !isHttpsConnection) {
            useMic = false;
            Logger.Error(Logger.GetStackTrace(), "Microphone access in the browser will not work if you are not on HTTPS or localhost. Disabling mic access.");
            Logger.Error(Logger.GetStackTrace(), "For testing you can enable HTTP microphone access Chrome by visiting chrome://flags/ and enabling 'unsafely-treat-insecure-origin-as-secure'");
        }

        this.setupTransceiversAsync(useMic).finally(() => { 
			this.peerConnection.createOffer(offerOptions).then((offer: RTCSessionDescriptionInit) => {
				this.showTextOverlayConnecting();
				offer.sdp = this.mungeSDP(offer.sdp, useMic);
				this.peerConnection.setLocalDescription(offer);
				this.onSendWebRTCOffer(offer);
			}).catch(() => {
				this.showTextOverlaySetupFailure();
			});
		});
    }

	/**
	 * 
	 */
	async receiveOffer(Offer: RTCSessionDescriptionInit, config: Config) {
		Logger.Log(Logger.GetStackTrace(), "Receive Offer", 6);

		this.peerConnection.setRemoteDescription(Offer).then(() => {
			const isLocalhostConnection = location.hostname === "localhost" || location.hostname === "127.0.0.1";
			const isHttpsConnection = location.protocol === 'https:';
			let useMic = config.isFlagEnabled(Flags.UseMic);
			if (useMic && isLocalhostConnection && !isHttpsConnection) {
				useMic = false;
				Logger.Error(Logger.GetStackTrace(), "Microphone access in the browser will not work if you are not on HTTPS or localhost. Disabling mic access.");
				Logger.Error(Logger.GetStackTrace(), "For testing you can enable HTTP microphone access Chrome by visiting chrome://flags/ and enabling 'unsafely-treat-insecure-origin-as-secure'");
			}

			this.setupTransceiversAsync(useMic).finally(() => {
				this.peerConnection.createAnswer()
					.then((Answer: RTCSessionDescriptionInit) => {
						Answer.sdp = this.mungeSDP(Answer.sdp, useMic);
						return this.peerConnection.setLocalDescription(Answer);
					})
					.then(() => {
						this.onSendWebRTCAnswer(this.peerConnection.currentLocalDescription);
					})
					.catch(() => {
						Logger.Error(Logger.GetStackTrace(), "createAnswer() failed");
					});
			});
		});
	}

	/**
	 * Set the Remote Descriptor from the signaling server to the RTC Peer Connection 
	 * @param sdp - RTC Session Descriptor from the Signaling Server
	 */
	receiveAnswer(sdp: RTCSessionDescriptionInit) {
		this.peerConnection.setRemoteDescription(sdp);
	}

    /**
     * Generate Aggregated Stats and then fire a onVideo Stats event
     */
    generateStats() {

        this.peerConnection.getStats(null).then((StatsData: RTCStatsReport) => {
            this.aggregatedStats.processStats(StatsData);
            this.onVideoStats(this.aggregatedStats);
        });
    }

    /**
     * Close The Peer Connection
     */
    close() {
        if (this.peerConnection) {
            this.peerConnection.close()
            this.peerConnection = null;
        }
    }

    /**
     * Modify the Session Descriptor 
     * @param sdp - Session Descriptor as a string
     * @param useMic - Is the microphone in use
     * @returns A modified Session Descriptor
     */
    mungeSDP(sdp: string, useMic: boolean) {
        const mungedSDP = sdp;
        mungedSDP.replace(/(a=fmtp:\d+ .*level-asymmetry-allowed=.*)\r\n/gm, "$1;x-google-start-bitrate=10000;x-google-max-bitrate=100000\r\n");
        mungedSDP.replace('useinbandfec=1', 'useinbandfec=1;stereo=1;sprop-maxcapturerate=48000');

        let audioSDP = '';

        // set max bitrate to highest bitrate Opus supports
        audioSDP += 'maxaveragebitrate=510000;';

        if(useMic){
            // set the max capture rate to 48khz (so we can send high quality audio from mic)
            audioSDP += 'sprop-maxcapturerate=48000;';
        }

        // Force mono or stereo based on whether ?forceMono was passed or not
        audioSDP += this.config.isFlagEnabled(Flags.ForceMonoAudio) ? 'sprop-stereo=0;stereo=0;' : 'sprop-stereo=1;stereo=1;';

        // enable in-band forward error correction for opus audio
        audioSDP += 'useinbandfec=1';

        // We use the line 'useinbandfec=1' (which Opus uses) to set our Opus specific audio parameters.
        mungedSDP.replace('useinbandfec=1', audioSDP);

        return mungedSDP;
    }

    /**
     * When a Ice Candidate is received add to the RTC Peer Connection 
     * @param iceCandidate - RTC Ice Candidate from the Signaling Server
     */
    handleOnIce(iceCandidate: RTCIceCandidate) {
        Logger.Log(Logger.GetStackTrace(), "peerconnection handleOnIce", 6);

        // // if forcing TURN, reject any candidates not relay
        if (this.config.isFlagEnabled(Flags.ForceTURN)) {
            // check if no relay address is found, if so, we are assuming it means no TURN server
            if (iceCandidate.candidate.indexOf("relay") < 0) {
                Logger.Info(Logger.GetStackTrace(), `Dropping candidate because it was not TURN relay. | Type= ${iceCandidate.type} | Protocol= ${iceCandidate.protocol} | Address=${iceCandidate.address} | Port=${iceCandidate.port} |`, 6);
                return;
            }
        }

        this.peerConnection.addIceCandidate(iceCandidate);
    }

    /**
     * When the RTC Peer Connection Signaling server state Changes
     * @param state - Signaling Server State Change Event
     */
    handleSignalStateChange(state: Event) {
        Logger.Log(Logger.GetStackTrace(), 'signaling state change: ' + state, 6);
    }

    /**
     * Handle when the Ice Connection State Changes
     * @param state - Ice Connection State
     */
    handleIceConnectionStateChange(state: Event) {
        Logger.Log(Logger.GetStackTrace(), 'ice connection state change: ' + state, 6);
    }

    /**
     * Handle when the Ice Gathering State Changes
     * @param state - Ice Gathering State Change
     */
    handleIceGatheringStateChange(state: Event) {
        Logger.Log(Logger.GetStackTrace(), 'ice gathering state change: ' + JSON.stringify(state), 6);
    }

    /**
     * Activates the onTrack method
     * @param event - The webRtc track event 
     */
    handleOnTrack(event: RTCTrackEvent) {
        this.onTrack(event);
    }

    /**
     * Activates the onPeerIceCandidate 
     * @param event - The peer ice candidate
     */
    handleIceCandidate(event: RTCPeerConnectionIceEvent) {
        this.onPeerIceCandidate(event);
    }

	/**
	 * Activates the onDataChannel 
	 * @param event - The peer's data channel
	 */
	handleDataChannel(event: RTCDataChannelEvent) {
		this.onDataChannel(event);
	}

    /**
     * An override method for onTrack for use outside of the PeerConnectionController
     * @param trackEvent - The webRtc track event
     */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    onTrack(trackEvent: RTCTrackEvent) {
		// Default Functionality: Do Nothing
	}

    /**
     * An override method for onPeerIceCandidate for use outside of the PeerConnectionController
     * @param peerConnectionIceEvent - The peer ice candidate
     */
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
    onPeerIceCandidate(peerConnectionIceEvent: RTCPeerConnectionIceEvent) { 
		// Default Functionality: Do Nothing
	}

	/**
	 * An override method for onDataChannel for use outside of the PeerConnectionController
	 * @param datachannelEvent - The peer's data channel
	 */
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	onDataChannel(datachannelEvent: RTCDataChannelEvent) {
		// Default Functionality: Do Nothing
	}

    /**
     * Setup tracks on the RTC Peer Connection 
     * @param useMic - is mic in use
     */
	async setupTransceiversAsync(useMic: boolean) {

        const hasTransceivers = this.peerConnection.getTransceivers().length > 0;

        // Setup a transceiver for getting UE video
        this.peerConnection.addTransceiver("video", { direction: "recvonly" });

        // Setup a transceiver for sending mic audio to UE and receiving audio from UE
        if (!useMic) {
            this.peerConnection.addTransceiver("audio", { direction: "recvonly" });
        } else {
            // set the audio options based on mic usage
            const audioOptions = useMic ?
                {
                    autoGainControl: false,
                    channelCount: 1,
                    echoCancellation: false,
                    latency: 0,
                    noiseSuppression: false,
                    sampleRate: 48000,
                    sampleSize: 16,
                    volume: 1.0
                } : false;

            // set the media send options 
            const mediaSendOptions: MediaStreamConstraints = {
                video: false,
                audio: audioOptions,
            }

            // Note using mic on android chrome requires SSL or chrome://flags/ "unsafely-treat-insecure-origin-as-secure"
            const stream = await navigator.mediaDevices.getUserMedia(mediaSendOptions);
            if (stream) {
                if (hasTransceivers) {
                    for (const transceiver of this.peerConnection.getTransceivers()) {
                        if (transceiver && transceiver.receiver && transceiver.receiver.track && transceiver.receiver.track.kind === "audio") {
                            for (const track of stream.getTracks()) {
                                if (track.kind && track.kind == "audio") {
                                    transceiver.sender.replaceTrack(track);
                                    transceiver.direction = "sendrecv";
                                }
                            }
                        }
                    }
                }
                else {
                    for (const track of stream.getTracks()) {
                        if (track.kind && track.kind == "audio") {
                            this.peerConnection.addTransceiver(track, { direction: "sendrecv" });
                        }
                    }
                }
            }
            else {
                this.peerConnection.addTransceiver("audio", { direction: "recvonly" });
            }
        }
    }

    /**
     * And override event for when the video stats are fired
     * @param event - Aggregated Stats
     */
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
    onVideoStats(event: AggregatedStats) { 
		// Default Functionality: Do Nothing
	}

    /**
     * Event to send the RTC offer to the Signaling server
     * @param offer - RTC Offer
     */
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
    onSendWebRTCOffer(offer: RTCSessionDescriptionInit) { 
		// Default Functionality: Do Nothing
	}

	/**
	 * Event to send the RTC Answer to the Signaling server
	 * @param answer - RTC Answer
	 */
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	onSendWebRTCAnswer(answer: RTCSessionDescriptionInit) { 
		// Default Functionality: Do Nothing
	}

    /**
     * An override for showing the Peer connection connecting Overlay
     */
    showTextOverlayConnecting() {
		// Default Functionality: Do Nothing
	}

    /**
     * An override for showing the Peer connection Failed overlay
     */
    showTextOverlaySetupFailure() {
		// Default Functionality: Do Nothing
	}
}