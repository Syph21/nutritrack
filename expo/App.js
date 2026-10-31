import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as WebBrowser from 'expo-web-browser';

const APP_URL = 'https://syph21.github.io/nutritrack/';

export default function App() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    WebBrowser.openBrowserAsync(APP_URL).finally(() => setLoading(false));
  }, []);

  return (
    <View style={styles.container}>
      {loading ? <ActivityIndicator size="large" color="#b8421a" /> : <Text style={styles.text}>NutriTrack opened in browser.</Text>}
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f4f1ea' },
  text: { marginTop: 16, color: '#1c1916', fontSize: 16 },
});