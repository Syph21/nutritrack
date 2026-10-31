import { StatusBar } from 'expo-status-bar';
import { SafeAreaView, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';

// Point this at your deployed PWA URL (GitHub Pages / Netlify / Vercel).
const APP_URL = 'https://syph21.github.io/nutritrack/';

export default function App() {
  return (
    <SafeAreaView style={styles.container}>
      <WebView source={{ uri: APP_URL }} style={styles.webview} />
      <StatusBar style="auto" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f1ea' },
  webview: { flex: 1 },
});