import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Modal, TextInput, Alert, ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import { useReportsService, Report } from '../src/database/reportsService';
import { sttService } from '../src/services/sttService';
import { generateAIReport, renderAIReportToText } from '../src/services/backend';
import { useAuth } from '../src/context/AuthContext';
import { useFocusEffect } from '@react-navigation/native';
import { SlideInView } from '../src/components/SlideInView';
import { useTabTransition } from '../src/context/TabTransitionContext';
import { useAppTheme } from '../src/theme/useAppTheme';


const ReportCard: React.FC<{ report: Report; onPress: () => void; onDelete: () => void }> = ({ report, onPress, onDelete }) => {
  const { tokens } = useAppTheme();
  const getIconName = (type: Report['type']) => {
    switch (type) {
      case 'mood': return 'mood';
      case 'insights': return 'lightbulb';
      case 'patterns': return 'trending-up';
      case 'goals': return 'flag';
      case 'custom': return 'auto-awesome';
      default: return 'description';
    }
  };

  const getTypeColor = (type: Report['type']) => {
    switch (type) {
      case 'mood': return '#FF6B6B';
      case 'insights': return '#4ECDC4';
      case 'patterns': return '#45B7D1';
      case 'goals': return '#96CEB4';
      case 'custom': return '#9B59B6';
      default: return '#95A5A6';
    }
  };

  const getDescription = () => {
    return report.content.length > 100 
      ? report.content.substring(0, 100) + '...' 
      : report.content;
  };

  return (
    <TouchableOpacity className="rounded-xl p-4 mb-3 shadow-sm" style={{ backgroundColor: tokens.colors.card }} onPress={onPress}>
      <View className="flex-row items-center mb-2">
        <View className="w-12 h-12 rounded-full items-center justify-center mr-3" style={{ backgroundColor: getTypeColor(report.type) }}>
          <MaterialIcons name={getIconName(report.type)} size={24} color="#FFFFFF" />
        </View>
        <View className="flex-1">
          <Text className="text-base font-semibold mb-1" style={{ color: tokens.colors.text }}>{report.title}</Text>
          <Text className="text-sm leading-5" style={{ color: tokens.colors.muted }}>{getDescription()}</Text>
        </View>
        <View className="items-center">
          <TouchableOpacity
            onPress={onDelete}
            accessibilityLabel="Delete report"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={{ marginRight: 8 }}
          >
            <MaterialIcons name="delete-outline" size={22} color={tokens.colors.error} />
          </TouchableOpacity>
          {report.status === 'generating' ? (
            <View className="flex-row items-center px-2 py-1 rounded-xl" style={{ backgroundColor: tokens.colors.warningContainer }}>
              <MaterialIcons name="sync" size={16} color={tokens.colors.warning} />
              <Text className="text-xs ml-1 font-medium" style={{ color: tokens.colors.warning }}>Generating...</Text>
            </View>
          ) : (
            <MaterialIcons name="chevron-right" size={24} color={tokens.colors.icon} />
          )}
        </View>
      </View>
      <Text className="text-xs mt-1" style={{ color: tokens.colors.secondaryText }}>
        {new Date(report.createdAt).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })}
      </Text>
    </TouchableOpacity>
  );
};

const ReportDetailModal: React.FC<{ visible: boolean; report: Report | null; onClose: () => void }> = ({ visible, report, onClose }) => {
  const { tokens } = useAppTheme();
  if (!visible) return null;
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView className="flex-1" style={{ backgroundColor: tokens.colors.background }}>
        <View className="flex-row items-center justify-between px-5 py-4 border-b" style={{ borderBottomWidth: StyleSheet.hairlineWidth, backgroundColor: tokens.colors.surface, borderBottomColor: tokens.colors.border }}>
          <TouchableOpacity onPress={onClose}>
            <Text className="text-base" style={{ color: tokens.colors.secondaryText }}>Close</Text>
          </TouchableOpacity>
          <Text className="text-lg font-semibold" style={{ color: tokens.colors.text }} numberOfLines={1}>{report?.title ?? 'Report'}</Text>
          <View style={{ width: 64 }} />
        </View>
        <ScrollView className="flex-1 p-5">
          {!!report && (
            <>
              <Text className="text-xl font-semibold mb-4" style={{ color: tokens.colors.text }}>AI Report</Text>
              <Text className="mt-2 text-sm leading-5" style={{ color: tokens.colors.text }}>{report.content}</Text>
              <Text className="text-xl font-semibold mb-4 mt-4" style={{ color: tokens.colors.text }}>Prompt</Text>
              <Text className="mt-2 text-sm leading-5" style={{ color: tokens.colors.text }}>{report.prompt}</Text>
              <Text className="text-xs mt-3" style={{ color: tokens.colors.secondaryText }}>
                {new Date(report.createdAt).toLocaleString()}
              </Text>
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
};

type StepStatus = 'pending' | 'active' | 'done';
interface StepItemState { key: string; label: string; status: StepStatus }

const AIReportModal: React.FC<{ visible: boolean; onClose: () => void; onReportGenerated: () => void }> = ({ visible, onClose, onReportGenerated }) => {
  const { tokens } = useAppTheme();
  const [prompt, setPrompt] = useState('');
  const [sentPrompt, setSentPrompt] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const { createReport } = useReportsService();
  const { session } = useAuth();
  const [steps, setSteps] = useState<StepItemState[]>([
    { key: 'collect', label: 'Collecting recent journal entries', status: 'pending' },
    { key: 'analyze', label: 'Analyzing patterns and moods', status: 'pending' },
    { key: 'synthesize', label: 'Synthesizing key insights', status: 'pending' },
    { key: 'finalize', label: 'Finalizing report', status: 'pending' },
  ]);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const [resultText, setResultText] = useState<string | null>(null);
  const [errorText, setErrorText] = useState<string | null>(null);

  // Reset modal state on open and clear timers on close
  useEffect(() => {
    if (visible) {
      setSteps([
        { key: 'collect', label: 'Collecting recent journal entries', status: 'pending' },
        { key: 'analyze', label: 'Analyzing patterns and moods', status: 'pending' },
        { key: 'synthesize', label: 'Synthesizing key insights', status: 'pending' },
        { key: 'finalize', label: 'Finalizing report', status: 'pending' },
      ]);
      setResultText(null);
      setErrorText(null);
      setSentPrompt(null);
    } else {
      timersRef.current.forEach(t => clearTimeout(t));
      timersRef.current = [];
    }
  }, [visible]);

  const handleGenerateReport = async () => {
    if (!prompt.trim()) {
      Alert.alert('Missing Prompt', 'Please enter a prompt to generate your AI report.');
      return;
    }

    // Require authentication: show a simple error and stop (no redirect)
    if (!session?.user?.id) {
      Alert.alert('Error', 'You might not be logged in.');
      return;
    }

    // Store sent prompt and clear input field
    setSentPrompt(prompt.trim());
    const currentPrompt = prompt.trim();
    setPrompt('');
    setIsGenerating(true);
    
    try {

      // Start step progression (no DB write until success)
      setSteps(prev => prev.map((s, idx) => ({ ...s, status: idx === 0 ? 'active' : 'pending' })));
      // step 0 done at 5s
      timersRef.current.push(setTimeout(() => {
        setSteps(prev => prev.map((s, idx) => idx === 0 ? { ...s, status: 'done' } : idx === 1 ? { ...s, status: 'active' } : s));
      }, 5000));
      // step 1 done at 10s
      timersRef.current.push(setTimeout(() => {
        setSteps(prev => prev.map((s, idx) => idx === 1 ? { ...s, status: 'done' } : idx === 2 ? { ...s, status: 'active' } : s));
      }, 10000));
      // step 2 done at 15s, step 3 active until API resolves
      timersRef.current.push(setTimeout(() => {
        setSteps(prev => prev.map((s, idx) => idx === 2 ? { ...s, status: 'done' } : idx === 3 ? { ...s, status: 'active' } : s));
      }, 15000));

      // Call backend to generate report
      const resp = await generateAIReport({
        prompt: currentPrompt,
        userId: session.user.id,
        userToken: session.access_token,
        dateRangeDays: 30,
        preferredAnalysisTypes: [],
      });

      if (resp.success && resp.report) {
        const text = renderAIReportToText(resp.report);
        setResultText(text);
        // Only now persist the report
        const created = await createReport({
          title: resp.report.title,
          content: text,
          prompt: currentPrompt,
          type: 'custom',
          status: 'completed'
        });
        if (created) {
          onReportGenerated();
        }
        // Ensure all steps are marked done on completion
        setSteps(prev => prev.map((s) => ({ ...s, status: 'done' })));
      } else {
        const msg = resp.error_message ?? 'No report returned';
        const failMsg = `AI report failed: ${msg}`;
        setErrorText(failMsg);
      }

      setPrompt('');
    } catch (error) {
      console.error('❌ [AI] Error generating report:', error);
      Alert.alert('Error', 'Failed to generate AI report. Please try again.');
    } finally {
      setIsGenerating(false);
      // clear timers
      timersRef.current.forEach(t => clearTimeout(t));
      timersRef.current = [];
    }
  };

  const generateReportTitle = (prompt: string): string => {
    const words = prompt.split(' ').slice(0, 4).join(' ');
    return words.length > 30 ? words.substring(0, 30) + '...' : words;
  };

  const handleVoiceRecord = async () => {
    if (isRecording) {
      // Stop recording
      await stopRecording();
    } else {
      // Start recording
      await startRecording();
    }
  };

  const startRecording = async () => {
    try {
      setIsRecording(true);
      const newRecording = await sttService.startRecording();
      if (newRecording) {
        setRecording(newRecording);
      }
    } catch (error) {
      console.error('Failed to start recording:', error);
      Alert.alert('Recording Error', 'Failed to start voice recording. Please check microphone permissions.');
      setIsRecording(false);
    }
  };

  const stopRecording = async () => {
    if (!recording) return;

    try {
      setIsRecording(false);
      setIsTranscribing(true);
      
      const audioUri = await sttService.stopRecording(recording);
      const sttResult = await sttService.convertSpeechToText(audioUri);
      
      // Append transcribed text to prompt
      const newText = sttResult.text.trim();
      if (newText) {
        setPrompt(prev => prev ? `${prev} ${newText}` : newText);
      }
      
      setRecording(null);
    } catch (error) {
      console.error('Failed to process recording:', error);
      Alert.alert('Transcription Error', 'Failed to convert speech to text. Please try again.');
    } finally {
      setIsTranscribing(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView className="flex-1" style={{ backgroundColor: tokens.colors.background }}>
        <View className="flex-row items-center justify-between px-5 py-4 border-b" style={{ borderBottomWidth: StyleSheet.hairlineWidth, backgroundColor: tokens.colors.surface, borderBottomColor: tokens.colors.border }}>
          <TouchableOpacity onPress={onClose} disabled={isGenerating}>
            <Text className="text-base" style={{ color: isGenerating ? tokens.colors.icon : tokens.colors.secondaryText }}>Cancel</Text>
          </TouchableOpacity>
          <Text className="text-lg font-semibold" style={{ color: tokens.colors.text }}>Generate AI Report</Text>
          <TouchableOpacity 
            onPress={handleGenerateReport} 
            disabled={isGenerating}
            className="px-4 py-2 rounded-lg"
            style={{ backgroundColor: isGenerating ? tokens.colors.icon : tokens.colors.accent }}
          >
            <Text className="text-base font-semibold text-white">
              {isGenerating ? 'Generating...' : 'Generate'}
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView className="flex-1 p-5">
          <Text className="text-xl font-semibold mb-4" style={{ color: tokens.colors.text }}>What would you like to analyze?</Text>
          <Text className="text-sm mb-5 leading-5" style={{ color: tokens.colors.muted }}>Describe what insights you'd like from your journal entries</Text>
          
          <View className="flex-row items-start rounded-xl border overflow-hidden" style={{ backgroundColor: tokens.colors.surface, borderColor: tokens.colors.border }}>
            <TextInput
              className="flex-1 p-4 text-base min-h-[120px] max-h-[200px]"
              value={prompt}
              onChangeText={setPrompt}
              placeholder="e.g., 'Analyze my mood patterns over the last month' or 'What are my main stress triggers?'"
              placeholderTextColor={tokens.colors.muted}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              style={{ color: tokens.colors.text }}
            />
            <TouchableOpacity 
              className="p-4 items-center justify-center border-l"
              style={{
                backgroundColor: isRecording ? tokens.colors.recordingContainer : 'transparent',
                opacity: (isGenerating || isTranscribing) ? 0.5 : 1,
                borderLeftColor: tokens.colors.border,
              }}
              onPress={handleVoiceRecord}
              disabled={isGenerating || isTranscribing}
            >
              {isTranscribing ? (
                <ActivityIndicator size="small" color={tokens.colors.accent} />
              ) : (
                <MaterialIcons 
                  name={isRecording ? "stop" : "mic"} 
                  size={24} 
                  color={isRecording ? tokens.colors.error : tokens.colors.accent} 
                />
              )}
            </TouchableOpacity>
          </View>

          {sentPrompt && (
            <View className="mt-5 items-end">
              <View className="rounded-[18px] px-4 py-3 max-w-[80%]" style={{ backgroundColor: tokens.colors.accent }}>
                <Text className="text-white text-base leading-5">{sentPrompt}</Text>
              </View>
              <Text className="text-xs mt-1 mr-2" style={{ color: tokens.colors.secondaryText }}>You</Text>
            </View>
          )}
          
          {isGenerating && (
            <View className="mt-5 p-4 rounded-xl border" style={{ backgroundColor: tokens.colors.surface, borderColor: tokens.colors.border }}>
              {steps.map((s, idx) => (
                <View key={s.key} className="flex-row items-center py-2">
                  {s.status === 'done' ? (
                    <MaterialIcons name="check-circle" size={20} color={tokens.colors.success} />
                  ) : s.status === 'active' ? (
                    <ActivityIndicator size="small" color={tokens.colors.accent} />
                  ) : (
                    <MaterialIcons name="radio-button-unchecked" size={20} color={tokens.colors.icon} />
                  )}
                  <Text className="ml-3 text-sm" style={{ color: s.status === 'done' ? tokens.colors.success : tokens.colors.text }}>
                    {s.label}
                  </Text>
                </View>
              ))}
              <Text className="text-xs mt-2 text-center" style={{ color: tokens.colors.secondaryText }}>This may take a moment. Keep the app open.</Text>
            </View>
          )}

          {!!resultText && (
            <View className="mt-4 rounded-xl border p-4" style={{ backgroundColor: tokens.colors.surface, borderColor: tokens.colors.border }}>
              <Text className="text-xl font-semibold mb-4" style={{ color: tokens.colors.text }}>AI Report</Text>
              <Text className="mt-2 text-sm leading-5" style={{ color: tokens.colors.text }}>{resultText}</Text>
              <TouchableOpacity className="mt-4 self-end rounded-lg py-2.5 px-4" style={{ backgroundColor: tokens.colors.accent }} onPress={() => { onReportGenerated(); onClose(); setResultText(null); setErrorText(null); setSteps(prev => prev.map(s => ({...s, status: 'pending'}))); }}>
                <Text className="text-white text-sm font-semibold">Close</Text>
              </TouchableOpacity>
            </View>
          )}

          {!!errorText && !isGenerating && (
            <View className="mt-4 rounded-xl border p-4" style={{ backgroundColor: tokens.colors.surface, borderColor: tokens.colors.border }}>
              <Text className="text-xl font-semibold mb-4" style={{ color: tokens.colors.text }}>AI Report</Text>
              <Text className="mt-2 text-sm leading-5" style={{ color: tokens.colors.error }}>{errorText}</Text>
              <TouchableOpacity className="mt-4 self-end rounded-lg py-2.5 px-4" style={{ backgroundColor: tokens.colors.accent }} onPress={() => { onReportGenerated(); onClose(); setResultText(null); setErrorText(null); setSteps(prev => prev.map(s => ({...s, status: 'pending'}))); }}>
                <Text className="text-white text-sm font-semibold">Close</Text>
              </TouchableOpacity>
            </View>
          )}

          {isRecording && (
            <View className="flex-row items-center justify-center mt-5 p-4 rounded-xl border" style={{ backgroundColor: tokens.colors.recordingContainer, borderColor: tokens.colors.error }}>
              <MaterialIcons name="fiber-manual-record" size={16} color={tokens.colors.error} />
              <Text className="text-base ml-2 font-medium" style={{ color: tokens.colors.error }}>Recording... Tap stop when finished</Text>
            </View>
          )}
          
          {isTranscribing && (
            <View className="flex-row items-center justify-center mt-5 p-4 rounded-xl border" style={{ backgroundColor: tokens.colors.transcribingContainer, borderColor: tokens.colors.success }}>
              <ActivityIndicator size="small" color={tokens.colors.success} />
              <Text className="text-base ml-2 font-medium" style={{ color: tokens.colors.success }}>Converting speech to text...</Text>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
};

export default function ReportsTab() {
  const { tokens } = useAppTheme();
  const [modalVisible, setModalVisible] = useState(false);
  const [reports, setReports] = useState<Report[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [detailVisible, setDetailVisible] = useState(false);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const reportsService = useReportsService();
  const { setCurrentByRouteName } = useTabTransition();

  const loadReports = async () => {
    setIsLoading(true);
    const allReports = await reportsService.getAllReports();
    setReports(allReports);
    setIsLoading(false);
  };

  const initializeReportsTable = async () => {
    await reportsService.initReportsTable();
    await loadReports();
  };

  useEffect(() => {
    initializeReportsTable();
  }, []);

  const handleReportGenerated = () => {
    loadReports(); // Refresh the reports list
  };

  const confirmDeleteReport = (report: Report) => {
    Alert.alert(
      'Delete report?',
      'This will remove it locally and from the cloud if you are signed in.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const ok = await reportsService.deleteReport(report.id);
            if (ok) {
              await loadReports();
            } else {
              Alert.alert('Delete failed', 'Could not delete the report. Please try again.');
            }
          },
        },
      ]
    );
  };

  useFocusEffect(
    useCallback(() => {
      setCurrentByRouteName('reports');
    }, [setCurrentByRouteName])
  );

  return (
    <SlideInView>
      <SafeAreaView edges={['top', 'left', 'right']} className="flex-1" style={{ backgroundColor: tokens.colors.background }}>
      <View className="flex-row items-center px-5 py-5 border-b" style={{ minHeight: 56, borderBottomWidth: StyleSheet.hairlineWidth, backgroundColor: tokens.colors.surface, borderBottomColor: tokens.colors.border }}>
        <MaterialIcons name="assessment" size={28} color={tokens.colors.accent} />
        <Text className="text-[22px] font-semibold ml-3" style={{ color: tokens.colors.text }}>Reports</Text>
      </View>
      
      <ScrollView className="flex-1" contentContainerStyle={{ padding: 20 }}>
        <View className="mb-6">
          <TouchableOpacity 
            className="flex-row items-center justify-center py-4 px-6 rounded-xl shadow-sm"
            style={{ backgroundColor: tokens.colors.accent }}
            onPress={() => setModalVisible(true)}
          >
            <MaterialIcons name="add" size={20} color="#FFFFFF" />
            <Text className="text-white text-base font-semibold ml-2">Generate New Report</Text>
          </TouchableOpacity>
        </View>

        <View className="flex-1">
          <Text className="text-xl font-semibold mb-4" style={{ color: tokens.colors.text }}>Your Reports</Text>
          
          {isLoading ? (
            <View className="items-center py-10">
              <ActivityIndicator size="large" color={tokens.colors.accent} />
              <Text className="text-base mt-3" style={{ color: tokens.colors.muted }}>Loading reports...</Text>
            </View>
          ) : (
            <>
              {reports.map((report) => (
                <ReportCard
                  key={report.id}
                  report={report}
                  onPress={() => { setSelectedReport(report); setDetailVisible(true); }}
                  onDelete={() => confirmDeleteReport(report)}
                />
              ))}
              
              {reports.length === 0 && (
                <View className="items-center py-15">
                  <MaterialIcons name="assessment" size={64} color={tokens.colors.icon} />
                  <Text className="text-xl font-semibold mt-4 mb-2" style={{ color: tokens.colors.text }}>No Reports Yet</Text>
                  <Text className="text-base text-center leading-6 max-w-[280px]" style={{ color: tokens.colors.muted }}>
                    Generate your first AI report to get insights about your journal entries
                  </Text>
                </View>
              )}
            </>
          )}
        </View>
      </ScrollView>

      <AIReportModal 
        visible={modalVisible} 
        onClose={() => setModalVisible(false)}
        onReportGenerated={handleReportGenerated}
      />

      <ReportDetailModal
        visible={detailVisible}
        report={selectedReport}
        onClose={() => { setDetailVisible(false); setSelectedReport(null); }}
      />
      </SafeAreaView>
    </SlideInView>
  );
}

// Stylesheet removed in favor of NativeWind className utilities and inline dynamic styles
