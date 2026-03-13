import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
	appId: 'com.fitlog.app',
	appName: 'FitLog',
	webDir: 'build',
	plugins: {
		SplashScreen: {
			launchAutoHide: false,
			showSpinner: true,
			backgroundColor: '#ffffff'
		},
		CapacitorUpdater: {
			// Configure your OTA update server URLs here
			// updateUrl: 'https://ota.example.com/updates',
			// statsUrl: 'https://ota.example.com/stats'
		}
	}
};

export default config;
