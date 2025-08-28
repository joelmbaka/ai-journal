import { MaterialIcons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { ActivityIndicator, Modal, SafeAreaView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useAuth } from '../context/AuthContext';

interface AuthModalProps {
  visible: boolean;
  onClose: () => void;
}

type Mode = 'signin' | 'signup';

export const AuthModal: React.FC<AuthModalProps> = ({ visible, onClose }) => {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const reset = () => {
    setEmail('');
    setPassword('');
    setMessage(null);
    setError(null);
    setFirstName('');
    setLastName('');
    setConfirmPassword('');
  };

  const onSubmit = async () => {
    setSubmitting(true);
    setError(null);
    setMessage(null);
    try {
      if (mode === 'signin') {
        const res = await signIn(email.trim(), password);
        if (res.error) setError(res.error);
        else {
          setMessage('Signed in');
          onClose();
          reset();
        }
      } else {
        const trimmedEmail = email.trim();
        const trimmedFirst = firstName.trim();
        const trimmedLast = lastName.trim();

        if (!trimmedFirst || !trimmedLast) {
          setError('First and last name are required');
          return;
        }
        if (password.length < 6) {
          setError('Password must be at least 6 characters');
          return;
        }
        if (password !== confirmPassword) {
          setError('Passwords do not match');
          return;
        }

        const res = await signUp(trimmedEmail, password, trimmedFirst, trimmedLast);
        if (res.error) setError(res.error);
        else if (res.session) {
          setMessage('Account created and signed in');
          onClose();
          reset();
        } else {
          setMessage('Account created. Please verify your email, then sign in.');
        }
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => { reset(); onClose(); }}>
            <Text style={styles.cancel}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.title}>{mode === 'signin' ? 'Sign in' : 'Create account'}</Text>
          <View style={{ width: 60 }} />
        </View>

        <View style={styles.switchBar}>
          <View style={styles.switchRow}>
            <TouchableOpacity style={[styles.switchBtn, mode === 'signin' && styles.switchBtnActive]} onPress={() => setMode('signin')}>
              <Text style={[styles.switchText, mode === 'signin' && styles.switchTextActive]}>Sign in</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.switchBtn, mode === 'signup' && styles.switchBtnActive]} onPress={() => setMode('signup')}>
              <Text style={[styles.switchText, mode === 'signup' && styles.switchTextActive]}>Sign up</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.content}>
          <View style={styles.form}>

          {mode === 'signup' && (
            <View style={[styles.row]}>
              <View style={[styles.field, styles.flexHalf, { marginRight: 8 }]}>
                <Text style={styles.label}>First name</Text>
                <TextInput
                  value={firstName}
                  onChangeText={setFirstName}
                  autoCapitalize="words"
                  autoCorrect={false}
                  placeholder="Jane"
                  style={styles.input}
                />
              </View>
              <View style={[styles.field, styles.flexHalf, { marginLeft: 8 }]}>
                <Text style={styles.label}>Last name</Text>
                <TextInput
                  value={lastName}
                  onChangeText={setLastName}
                  autoCapitalize="words"
                  autoCorrect={false}
                  placeholder="Doe"
                  style={styles.input}
                />
              </View>
            </View>
          )}

          <View style={styles.field}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              placeholder="you@example.com"
              style={styles.input}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Password</Text>
            <View style={styles.passwordRow}>
              <TextInput
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                placeholder="••••••••"
                style={[styles.input, { flex: 1 }]}
              />
              <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowPassword(v => !v)}>
                <MaterialIcons name={showPassword ? 'visibility-off' : 'visibility'} size={22} color="#8E8E93" />
              </TouchableOpacity>
            </View>
          </View>

          {mode === 'signup' && (
            <View style={styles.field}>
              <Text style={styles.label}>Confirm Password</Text>
              <View style={styles.passwordRow}>
                <TextInput
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showPassword}
                  placeholder="••••••••"
                  style={[styles.input, { flex: 1 }]}
                />
                <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowPassword(v => !v)}>
                  <MaterialIcons name={showPassword ? 'visibility-off' : 'visibility'} size={22} color="#8E8E93" />
                </TouchableOpacity>
              </View>
            </View>
          )}

          {error ? <Text style={styles.error}>{error}</Text> : null}
          {message ? <Text style={styles.message}>{message}</Text> : null}
          </View>
        </View>

        <View style={styles.footer}>
          <TouchableOpacity style={[styles.submitBtn, submitting && styles.submitBtnDisabled]} onPress={onSubmit} disabled={submitting}>
            {submitting ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.submitText}>{mode === 'signin' ? 'Sign in' : 'Sign up'}</Text>}
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E5E5E7' },
  cancel: { color: '#8E8E93', fontSize: 16 },
  title: { fontSize: 18, fontWeight: '600', color: '#1A1A1A' },
  content: { flex: 1, paddingHorizontal: 20, paddingTop: 0, paddingBottom: 20, justifyContent: 'flex-start', alignItems: 'center' },
  switchBar: { paddingHorizontal: 20, paddingTop: 4, marginBottom: 6, alignItems: 'center' },
  form: { width: '100%', maxWidth: 420, alignSelf: 'center' },
  field: { marginBottom: 16 },
  row: { flexDirection: 'row' },
  flexHalf: { flex: 1 },
  label: { fontSize: 14, color: '#666666', marginBottom: 6 },
  input: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5E5E7', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 12, fontSize: 16, color: '#1A1A1A' },
  passwordRow: { flexDirection: 'row', alignItems: 'center' },
  eyeBtn: { paddingHorizontal: 12, height: 44, justifyContent: 'center' },
  error: { color: '#FF3B30', marginTop: 4 },
  message: { color: '#34C759', marginTop: 4 },
  footer: { padding: 20, backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: '#E5E5E7' },
  submitBtn: { backgroundColor: '#007AFF', paddingVertical: 14, alignItems: 'center', borderRadius: 10 },
  submitBtnDisabled: { opacity: 0.7 },
  submitText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  switchRow: { flexDirection: 'row', backgroundColor: '#EFEFF0', padding: 4, borderRadius: 10, marginBottom: 0 },
  switchBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8 },
  switchBtnActive: { backgroundColor: '#FFFFFF' },
  switchText: { color: '#666666', fontWeight: '600' },
  switchTextActive: { color: '#1A1A1A' },
});
