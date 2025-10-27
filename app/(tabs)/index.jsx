import { useColorScheme } from '@/hooks/useColorScheme';
import { useNavigation } from '@react-navigation/native';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile } from 'firebase/auth';
import React, { useEffect, useState } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import {
    ActivityIndicator, Alert, Platform,
    ScrollView,
    StyleSheet,
    Text, TextInput, TouchableOpacity,
    View
} from 'react-native';
import { auth } from '../../config/firebase';


export default function AuthPage() {
  const navigation = useNavigation();
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === 'dark';

  const [user, loading, error] = useAuthState(auth);

  const [isLoading, setIsLoading] = useState(false);
  const [mode, setMode] = useState('login');

  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  const [registerName, setRegisterName] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [role, setRole] = useState('student'); // default role


  useEffect(() => {
    if (user) {
      navigation.replace('Drawer');
    }
  }, [user]);

  const handleLogin = async () => {
    if (!loginEmail || !loginPassword) {
      return Alert.alert('Error', 'Please fill all fields.');
    }
    setIsLoading(true);
    try {
      await signInWithEmailAndPassword(auth, loginEmail, loginPassword);
      setIsLoading(false);
    } catch (error) {
      setIsLoading(false);
      Alert.alert('Login Failed', error.message);
    }
  };

  const handleRegister = async () => {
    if (!registerName || !registerEmail || !registerPassword) {
      return Alert.alert('Error', 'Please fill all fields.');
    }
    setIsLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, registerEmail, registerPassword);
      await updateProfile(userCredential.user, {
        displayName: registerName,
      });
      setIsLoading(false);
    } catch (error) {
      setIsLoading(false);
      Alert.alert('Registration Failed', error.message);
    }
  };

  return (
    <ScrollView
      style={[styles.outerContainer, isDarkMode && { backgroundColor: '#121212' }]}
      contentContainerStyle={[
        styles.scrollContent,
        isDarkMode && { backgroundColor: '#121212' },
      ]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.contentCard, isDarkMode && { backgroundColor: '#121212' }]}>
        <View style={styles.logoContainer}>
          <Text style={[styles.logoText, isDarkMode && { color: '#4CAF50' }]}>
            ChonX
          </Text>
          <View style={styles.logoUnderline} />
        </View>
        <Text style={[styles.subtitle, isDarkMode && { color: '#fff' }]}>
          Your Sustainable Journey Starts Here
        </Text>

        {/* Tabs */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            onPress={() => setMode('login')}
            style={[styles.tab, mode === 'login' && styles.activeTabBackground]}
          >
            <Text style={[styles.tabText, mode === 'login' && styles.activeTabText]}>Login</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setMode('register')}
            style={[styles.tab, mode === 'register' && styles.activeTabBackground]}
          >
            <Text style={[styles.tabText, mode === 'register' && styles.activeTabText]}>Register</Text>
          </TouchableOpacity>
        </View>

        {/* Forms */}
        {mode === 'login' ? (
          <View style={styles.form}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              placeholder="name@example.com"
              style={styles.input}
              value={loginEmail}
              onChangeText={setLoginEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <Text style={styles.label}>Password</Text>
            <TextInput
              placeholder="••••••••"
              secureTextEntry
              style={styles.input}
              value={loginPassword}
              onChangeText={setLoginPassword}
            />
            <TouchableOpacity style={styles.forgotPassword}>
              <Text style={styles.forgotPasswordText}>Forgot password?</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleLogin} style={styles.button} disabled={isLoading}>
              {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Sign in</Text>}
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.form}>
            <Text style={styles.label}>Full Name</Text>
            <TextInput
              placeholder="John Doe"
              style={styles.input}
              value={registerName}
              onChangeText={setRegisterName}
            />
            <Text style={styles.label}>Email</Text>
            <TextInput
              placeholder="name@example.com"
              style={styles.input}
              value={registerEmail}
              onChangeText={setRegisterEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <Text style={styles.label}>Password</Text>
            <TextInput
              placeholder="••••••••"
              secureTextEntry
              style={styles.input}
              value={registerPassword}
              onChangeText={setRegisterPassword}
            />
            <TouchableOpacity onPress={handleRegister} style={styles.button} disabled={isLoading}>
              {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Create account</Text>}
            </TouchableOpacity>
          </View>
        )}

        {/* OAuth Buttons */}
        <OAuthButtons />

        <TouchableOpacity>
          <Text style={styles.privacyPolicy}>Privacy Policy.</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

function OAuthButtons() {
  return (
    <View style={{ marginTop: Platform.OS === 'web' ? '12px' : 16 }}>
      <View style={{ alignItems: 'center', marginBottom: Platform.OS === 'web' ? '8px' : 12 }}>
        <Text style={{ fontSize: Platform.OS === 'web' ? '11px' : 12, color: '#6c757d' }}>Or continue with</Text>
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: Platform.OS === 'web' ? '8px' : 12 }}>
        <TouchableOpacity style={styles.oauthButton} onPress={() => alert('Facebook login coming soon')}>
          <Text style={styles.oauthButtonText}>Facebook</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.oauthButton} onPress={() => alert('Google login coming soon')}>
          <Text style={styles.oauthButtonText}>Google</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}


const styles = StyleSheet.create({
  outerContainer: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    minHeight: Platform.OS === 'web' ? '100vh' : '100%',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: Platform.OS === 'web' ? '20px' : 20,
    paddingHorizontal: Platform.OS === 'web' ? '20px' : 0,
    minHeight: Platform.OS === 'web' ? '100vh' : '100%',
  },
  contentCard: {
    padding: Platform.OS === 'web' ? '20px' : 24,
    backgroundColor: '#fff',
    width: Platform.OS === 'web' ? '100%' : '100%',
    maxWidth: Platform.OS === 'web' ? '420px' : '100%',
    boxShadow: Platform.OS === 'web' ? '0 8px 32px rgba(0,0,0,0.1)' : undefined,
    borderRadius: Platform.OS === 'web' ? '16px' : 0,
    margin: Platform.OS === 'web' ? '0' : 0,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: Platform.OS === 'web' ? '16px' : 24,
  },
  logoText: {
    fontSize: Platform.OS === 'web' ? '36px' : 40,
    fontWeight: 'bold',
    color: '#2E7D32',
    textAlign: 'center',
    letterSpacing: Platform.OS === 'web' ? '1px' : 1,
    textShadow: Platform.OS === 'web' ? '0 2px 4px rgba(0,0,0,0.1)' : undefined,
  },
  logoUnderline: {
    width: Platform.OS === 'web' ? '100px' : 100,
    height: Platform.OS === 'web' ? '3px' : 3,
    backgroundColor: '#4CAF50',
    borderRadius: Platform.OS === 'web' ? '2px' : 1,
    marginTop: Platform.OS === 'web' ? '6px' : 6,
  },
  subtitle: {
    fontSize: Platform.OS === 'web' ? '16px' : 16,
    textAlign: 'center',
    marginBottom: Platform.OS === 'web' ? '24px' : 40,
    color: '#666',
    fontWeight: '400',
    lineHeight: Platform.OS === 'web' ? '20px' : 22,
  },
  
  tabContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: Platform.OS === 'web' ? '20px' : 32,
    backgroundColor: '#f8f9fa',
    borderRadius: Platform.OS === 'web' ? '12px' : 12,
    padding: Platform.OS === 'web' ? '4px' : 2,
    boxShadow: Platform.OS === 'web' ? '0 2px 8px rgba(0,0,0,0.05)' : undefined,
  },
  tab: {
    flex: 1,
    paddingVertical: Platform.OS === 'web' ? '10px' : 12,
    alignItems: 'center',
    borderRadius: Platform.OS === 'web' ? '8px' : 12,
    transition: Platform.OS === 'web' ? 'all 0.3s ease' : undefined,
  },
  activeTabBackground: {
    backgroundColor: '#E8F5E8',
    boxShadow: Platform.OS === 'web' ? '0 2px 4px rgba(76, 175, 80, 0.2)' : undefined,
  },
  tabText: {
    fontSize: Platform.OS === 'web' ? '16px' : 16,
    color: '#6c757d',
    fontWeight: '600',
  },
  activeTabText: {
    color: '#2E7D32',
  },
  label: {
    marginBottom: Platform.OS === 'web' ? '6px' : 6,
    fontWeight: '600',
    color: '#212529',
    fontSize: Platform.OS === 'web' ? '13px' : 14,
  },
  form: {
    marginBottom: Platform.OS === 'web' ? '20px' : 32,
  },
  input: {
    backgroundColor: '#fff',
    padding: Platform.OS === 'web' ? '12px' : 12,
    borderRadius: Platform.OS === 'web' ? '8px' : 8,
    marginBottom: Platform.OS === 'web' ? '12px' : 12,
    borderWidth: Platform.OS === 'web' ? '2px' : 1,
    borderColor: '#e9ecef',
    fontSize: Platform.OS === 'web' ? '14px' : 16,
    transition: Platform.OS === 'web' ? 'border-color 0.3s ease' : undefined,
    outline: Platform.OS === 'web' ? 'none' : undefined,
  },
  forgotPassword: {
    alignItems: 'flex-end',
    marginBottom: Platform.OS === 'web' ? '12px' : 16,
  },
  forgotPasswordText: {
    color: '#2E7D32',
    fontSize: Platform.OS === 'web' ? '12px' : 13,
    fontWeight: '500',
    textDecorationLine: Platform.OS === 'web' ? 'underline' : 'none',
  },
  button: {
    backgroundColor: '#4CAF50',
    padding: Platform.OS === 'web' ? '12px' : 14,
    borderRadius: Platform.OS === 'web' ? '8px' : 8,
    alignItems: 'center',
    boxShadow: Platform.OS === 'web' ? '0 4px 12px rgba(76, 175, 80, 0.3)' : undefined,
    transition: Platform.OS === 'web' ? 'all 0.3s ease' : undefined,
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: Platform.OS === 'web' ? '14px' : 16,
  },
  oauthButton: {
    backgroundColor: '#fff',
    borderWidth: Platform.OS === 'web' ? '2px' : 1,
    borderColor: '#e9ecef',
    borderRadius: Platform.OS === 'web' ? '8px' : 8,
    paddingVertical: Platform.OS === 'web' ? '10px' : 12,
    paddingHorizontal: Platform.OS === 'web' ? '10px' : 10,
    flex: 1,
    alignItems: 'center',
    transition: Platform.OS === 'web' ? 'all 0.3s ease' : undefined,
    boxShadow: Platform.OS === 'web' ? '0 2px 4px rgba(0,0,0,0.05)' : undefined,
  },
  oauthButtonText: {
    fontSize: Platform.OS === 'web' ? '12px' : 14,
    fontWeight: '600',
    color: '#343a40',
  },
  updateText: {
    marginTop: Platform.OS === 'web' ? '12px' : 16,
    fontSize: Platform.OS === 'web' ? '12px' : 12,
    textAlign: 'center',
    color: '#6c757d',
  },
  privacyPolicy: {
    textAlign: 'center',
    marginTop: Platform.OS === 'web' ? '4px' : 4,
    fontSize: Platform.OS === 'web' ? '12px' : 12,
    color: '#2E7D32',
    textDecorationLine: 'underline',
    fontWeight: '500',
  },
});
