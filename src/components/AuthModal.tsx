import { MaterialIcons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { ActivityIndicator, Modal, SafeAreaView, Text, TextInput, TouchableOpacity, View, StyleSheet } from 'react-native';
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
      <SafeAreaView className="flex-1 bg-neutral-100">
        <View className="flex-row items-center justify-between px-5 py-4 bg-white border-b border-neutral-200" style={{ borderBottomWidth: StyleSheet.hairlineWidth }}>
          <TouchableOpacity onPress={() => { reset(); onClose(); }}>
            <Text className="text-neutral-500 text-base">Cancel</Text>
          </TouchableOpacity>
          <Text className="text-lg font-semibold text-neutral-900">{mode === 'signin' ? 'Sign in' : 'Create account'}</Text>
          <View style={{ width: 60 }} />
        </View>

        <View className="px-5 pt-1 mb-1.5 items-center">
          <View className="flex-row bg-[#EFEFF0] p-1 rounded-[10px]">
            <TouchableOpacity className={`flex-1 py-2 items-center rounded-[8px] ${mode === 'signin' ? 'bg-white' : ''}`} onPress={() => setMode('signin')}>
              <Text className={`font-semibold ${mode === 'signin' ? 'text-neutral-900' : 'text-neutral-500'}`}>Sign in</Text>
            </TouchableOpacity>
            <TouchableOpacity className={`flex-1 py-2 items-center rounded-[8px] ${mode === 'signup' ? 'bg-white' : ''}`} onPress={() => setMode('signup')}>
              <Text className={`font-semibold ${mode === 'signup' ? 'text-neutral-900' : 'text-neutral-500'}`}>Sign up</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View className="flex-1 px-5 pb-5 items-center">
          <View className="w-full max-w-[420px] self-center">

          {mode === 'signup' && (
            <View className="flex-row">
              <View className="mb-4 flex-1 mr-2">
                <Text className="text-sm text-neutral-500 mb-1.5">First name</Text>
                <TextInput
                  value={firstName}
                  onChangeText={setFirstName}
                  autoCapitalize="words"
                  autoCorrect={false}
                  placeholder="Jane"
                  className="bg-white border border-neutral-200 rounded-[10px] px-3 py-3 text-base text-neutral-900"
                />
              </View>
              <View className="mb-4 flex-1 ml-2">
                <Text className="text-sm text-neutral-500 mb-1.5">Last name</Text>
                <TextInput
                  value={lastName}
                  onChangeText={setLastName}
                  autoCapitalize="words"
                  autoCorrect={false}
                  placeholder="Doe"
                  className="bg-white border border-neutral-200 rounded-[10px] px-3 py-3 text-base text-neutral-900"
                />
              </View>
            </View>
          )}

          <View className="mb-4">
            <Text className="text-sm text-neutral-500 mb-1.5">Email</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              placeholder="you@example.com"
              className="bg-white border border-neutral-200 rounded-[10px] px-3 py-3 text-base text-neutral-900"
            />
          </View>

          <View className="mb-4">
            <Text className="text-sm text-neutral-500 mb-1.5">Password</Text>
            <View className="flex-row items-center">
              <TextInput
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                placeholder="••••••••"
                className="flex-1 bg-white border border-neutral-200 rounded-[10px] px-3 py-3 text-base text-neutral-900"
              />
              <TouchableOpacity className="px-3 h-11 justify-center" onPress={() => setShowPassword(v => !v)}>
                <MaterialIcons name={showPassword ? 'visibility-off' : 'visibility'} size={22} color="#8E8E93" />
              </TouchableOpacity>
            </View>
          </View>

          {mode === 'signup' && (
            <View className="mb-4">
              <Text className="text-sm text-neutral-500 mb-1.5">Confirm Password</Text>
              <View className="flex-row items-center">
                <TextInput
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showPassword}
                  placeholder="••••••••"
                  className="flex-1 bg-white border border-neutral-200 rounded-[10px] px-3 py-3 text-base text-neutral-900"
                />
                <TouchableOpacity className="px-3 h-11 justify-center" onPress={() => setShowPassword(v => !v)}>
                  <MaterialIcons name={showPassword ? 'visibility-off' : 'visibility'} size={22} color="#8E8E93" />
                </TouchableOpacity>
              </View>
            </View>
          )}

          {error ? <Text className="text-[#FF3B30] mt-1">{error}</Text> : null}
          {message ? <Text className="text-[#34C759] mt-1">{message}</Text> : null}
          </View>
        </View>

        <View className="p-5 bg-white border-t border-neutral-200" style={{ borderTopWidth: StyleSheet.hairlineWidth }}>
          <TouchableOpacity className={`items-center rounded-[10px] py-3.5 ${submitting ? 'opacity-70' : ''}`} style={{ backgroundColor: '#007AFF' }} onPress={onSubmit} disabled={submitting}>
            {submitting ? <ActivityIndicator color="#FFFFFF" /> : <Text className="text-white text-base font-semibold">{mode === 'signin' ? 'Sign in' : 'Sign up'}</Text>}
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
};
