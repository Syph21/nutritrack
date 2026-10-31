import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.nutritrack.offline',
  appName: 'NutriTrack',
  webDir: 'www',
  server: {
    androidScheme: 'https'
  },
  ios: {
    contentInset: 'automatic',
    backgroundColor: '#080c14'
  },
  android: {
    backgroundColor: '#080c14'
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1200,
      backgroundColor: '#080c14',
      showSpinner: false
    }
  }
};

export default config;
