import * as libspsfrontend from '@tensorworks/libspsfrontend'
import { SPSSignalling } from './SignallingExtension';


export class NativeDOMDelegate extends libspsfrontend.DelegateBase {
	
	private signallingExtension : SPSSignalling;

	static SPSFlags = class {
		static sendToServer = "sendStatsToServer"
	}

	constructor(config: libspsfrontend.Config) {
		super(config);
		this.signallingExtension = new SPSSignalling(this.webRtcController.webSocketController);
		this.signallingExtension.onAuthenticationResponse = this.handleSignallingResponse.bind(this);
		this.signallingExtension.onInstanceStateChanged = this.handleSignallingResponse.bind(this);

		this.enforceSpecialSignallingServerUrl();

		// Add 'Send Stats to Server' checkbox
		const spsSettingsSection = this.config.buildSectionWithHeading(this.settingsPanel.settingsContentElement, "Scalable Pixel Streaming");
		const sendStatsToServerSettings = new libspsfrontend.SettingFlag(
			NativeDOMDelegate.SPSFlags.sendToServer,
			"Send stats to server",
			"Send session stats to the server",
			true
		);

		this.config.addSettingFlag(spsSettingsSection, sendStatsToServerSettings);
	}

	onVideoStats(videoStats: libspsfrontend.AggregatedStats): void {
		super.onVideoStats(videoStats);

		if (this.config.isFlagEnabled(NativeDOMDelegate.SPSFlags.sendToServer)) {
			this.webRtcController.sendStatsToSignallingServer(videoStats);
		}
	}

	handleSignallingResponse(signallingResp: string, isError: boolean) {
		if(isError) { 
			this.showErrorOverlay(signallingResp);
		} else { 
			this.showTextOverlay(signallingResp);
		}
	}

	enforceSpecialSignallingServerUrl() {
		// SPS needs a special /ws added to the signalling server url so K8s can distinguish it
		this.webRtcController.buildSignallingServerUrl = function() {
			let signallingUrl = this.config.getTextSettingValue(libspsfrontend.TextParameters.SignallingServerUrl);

			if(signallingUrl && signallingUrl !== undefined && !signallingUrl.endsWith("/ws")) {
				signallingUrl = signallingUrl.endsWith("/") ? signallingUrl + "ws" : signallingUrl + "/ws";
			}

			return signallingUrl
		};
	}

}