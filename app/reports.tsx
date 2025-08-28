import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, TextInput, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import { useAppSelector } from '../src/hooks/redux';
import { RootState } from '../src/store';
import { useReportsService, Report } from '../src/database/reportsService';
import { sttService } from '../src/services/sttService';
import { generateAIReport, renderAIReportToText } from '../src/services/backend';
import { useAuth } from '../src/context/AuthContext';


const ReportCard: React.FC<{ report: Report; onPress: () => void; onDelete: () => void }> = ({ report, onPress, onDelete }) => {
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
    <TouchableOpacity style={styles.reportCard} onPress={onPress}>
      <View style={styles.reportHeader}>
        <View style={[styles.reportIcon, { backgroundColor: getTypeColor(report.type) }]}>
          <MaterialIcons name={getIconName(report.type)} size={24} color="#FFFFFF" />
        </View>
        <View style={styles.reportInfo}>
          <Text style={styles.reportTitle}>{report.title}</Text>
          <Text style={styles.reportDescription}>{getDescription()}</Text>
        </View>
        <View style={styles.reportStatus}>
          <TouchableOpacity
            onPress={onDelete}
            accessibilityLabel="Delete report"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={{ marginRight: 8 }}
          >
            <MaterialIcons name="delete-outline" size={22} color="#FF3B30" />
          </TouchableOpacity>
          {report.status === 'generating' ? (
            <View style={styles.generatingBadge}>
              <MaterialIcons name="sync" size={16} color="#FF9500" />
              <Text style={styles.generatingText}>Generating...</Text>
            </View>
          ) : (
            <MaterialIcons name="chevron-right" size={24} color="#C7C7CC" />
          )}
        </View>
      </View>
      <Text style={styles.reportDate}>
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
  if (!visible) return null;
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.cancelButton}>Close</Text>
          </TouchableOpacity>
          <Text style={styles.modalTitle} numberOfLines={1}>{report?.title ?? 'Report'}</Text>
          <View style={{ width: 64 }} />
        </View>
        <ScrollView style={styles.modalContent}>
          {!!report && (
            <>
              <Text style={styles.sectionTitle}>AI Report</Text>
              <Text style={styles.resultText}>{report.content}</Text>
              <Text style={[styles.sectionTitle, { marginTop: 16 }]}>Prompt</Text>
              <Text style={styles.resultText}>{report.prompt}</Text>
              <Text style={[styles.reportDate, { marginTop: 12 }]}>
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
      console.log('🤖 [AI] Generating report with prompt:', currentPrompt);

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
        console.log('✅ [AI] Report generated successfully');
      } else {
        const msg = resp.error_message ?? 'No report returned';
        const failMsg = `AI report failed: ${msg}`;
        setErrorText(failMsg);
        console.warn('❌ [AI] Report generation failed:', msg);
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
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={onClose} disabled={isGenerating}>
            <Text style={[styles.cancelButton, isGenerating && styles.textDisabled]}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.modalTitle}>Generate AI Report</Text>
          <TouchableOpacity 
            onPress={handleGenerateReport} 
            disabled={isGenerating}
            style={[styles.generateButton, isGenerating && styles.generateButtonDisabled]}
          >
            <Text style={[styles.generateButtonText, isGenerating && styles.generateButtonTextDisabled]}>
              {isGenerating ? 'Generating...' : 'Generate'}
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalContent}>
          <Text style={styles.sectionTitle}>What would you like to analyze?</Text>
          <Text style={styles.sectionSubtitle}>Describe what insights you'd like from your journal entries</Text>
          
          <View style={styles.promptInputContainer}>
            <TextInput
              style={styles.promptInput}
              value={prompt}
              onChangeText={setPrompt}
              placeholder="e.g., 'Analyze my mood patterns over the last month' or 'What are my main stress triggers?'"
              placeholderTextColor="#999999"
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
            <TouchableOpacity 
              style={[
                styles.voiceButton,
                isRecording && styles.voiceButtonRecording,
                (isGenerating || isTranscribing) && styles.voiceButtonDisabled
              ]}
              onPress={handleVoiceRecord}
              disabled={isGenerating || isTranscribing}
            >
              {isTranscribing ? (
                <ActivityIndicator size="small" color="#007AFF" />
              ) : (
                <MaterialIcons 
                  name={isRecording ? "stop" : "mic"} 
                  size={24} 
                  color={isRecording ? "#FF3B30" : "#007AFF"} 
                />
              )}
            </TouchableOpacity>
          </View>

          {sentPrompt && (
            <View style={styles.sentMessageContainer}>
              <View style={styles.sentMessageBubble}>
                <Text style={styles.sentMessageText}>{sentPrompt}</Text>
              </View>
              <Text style={styles.sentMessageLabel}>You</Text>
            </View>
          )}
          
          {isGenerating && (
            <View style={styles.checklistContainer}>
              {steps.map((s, idx) => (
                <View key={s.key} style={styles.checklistItem}>
                  {s.status === 'done' ? (
                    <MaterialIcons name="check-circle" size={20} color="#34C759" />
                  ) : s.status === 'active' ? (
                    <ActivityIndicator size="small" color="#007AFF" />
                  ) : (
                    <MaterialIcons name="radio-button-unchecked" size={20} color="#C7C7CC" />
                  )}
                  <Text style={[styles.checklistLabel, s.status === 'done' && styles.checklistDone]}>
                    {s.label}
                  </Text>
                </View>
              ))}
              <Text style={styles.checklistHint}>This may take a moment. Keep the app open.</Text>
            </View>
          )}

          {!!resultText && (
            <View style={styles.resultContainer}>
              <Text style={styles.sectionTitle}>AI Report</Text>
              <Text style={styles.resultText}>{resultText}</Text>
              <TouchableOpacity style={styles.closeButton} onPress={() => { onReportGenerated(); onClose(); setResultText(null); setErrorText(null); setSteps(prev => prev.map(s => ({...s, status: 'pending'}))); }}>
                <Text style={styles.closeButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          )}

          {!!errorText && !isGenerating && (
            <View style={styles.resultContainer}>
              <Text style={styles.sectionTitle}>AI Report</Text>
              <Text style={[styles.resultText, { color: '#FF3B30' }]}>{errorText}</Text>
              <TouchableOpacity style={styles.closeButton} onPress={() => { onReportGenerated(); onClose(); setResultText(null); setErrorText(null); setSteps(prev => prev.map(s => ({...s, status: 'pending'}))); }}>
                <Text style={styles.closeButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          )}

          {isRecording && (
            <View style={styles.recordingContainer}>
              <MaterialIcons name="fiber-manual-record" size={16} color="#FF3B30" />
              <Text style={styles.recordingMessage}>Recording... Tap stop when finished</Text>
            </View>
          )}
          
          {isTranscribing && (
            <View style={styles.transcribingContainer}>
              <ActivityIndicator size="small" color="#34C759" />
              <Text style={styles.transcribingMessage}>Converting speech to text...</Text>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
};

export default function ReportsTab() {
  const { personalization } = useAppSelector((state: RootState) => state.settings);
  const [modalVisible, setModalVisible] = useState(false);
  const [reports, setReports] = useState<Report[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [detailVisible, setDetailVisible] = useState(false);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const reportsService = useReportsService();

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

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <MaterialIcons name="assessment" size={28} color="#007AFF" />
        <Text style={styles.headerTitle}>Reports</Text>
      </View>
      
      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <View style={styles.addButtonContainer}>
          <TouchableOpacity 
            style={styles.addButton}
            onPress={() => setModalVisible(true)}
          >
            <MaterialIcons name="add" size={20} color="#FFFFFF" />
            <Text style={styles.addButtonText}>Generate New Report</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.reportsSection}>
          <Text style={styles.sectionTitle}>Your Reports</Text>
          
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#007AFF" />
              <Text style={styles.loadingText}>Loading reports...</Text>
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
                <View style={styles.emptyState}>
                  <MaterialIcons name="assessment" size={64} color="#C7C7CC" />
                  <Text style={styles.emptyTitle}>No Reports Yet</Text>
                  <Text style={styles.emptyDescription}>
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
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E7',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: '#1A1A1A',
    marginLeft: 12,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  addButtonContainer: {
    marginBottom: 24,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  reportsSection: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 16,
  },
  reportCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  reportHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  reportIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  reportInfo: {
    flex: 1,
  },
  reportTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  reportDescription: {
    fontSize: 14,
    color: '#666666',
    lineHeight: 20,
  },
  reportStatus: {
    alignItems: 'center',
  },
  generatingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3CD',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  generatingText: {
    fontSize: 12,
    color: '#FF9500',
    marginLeft: 4,
    fontWeight: '500',
  },
  reportDate: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 4,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1A1A1A',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: 280,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E7',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  cancelButton: {
    fontSize: 16,
    color: '#8E8E93',
  },
  generateButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#007AFF',
    borderRadius: 8,
  },
  generateButtonDisabled: {
    backgroundColor: '#C7C7CC',
  },
  generateButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  generateButtonTextDisabled: {
    color: '#FFFFFF',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  reportTypeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E5E7',
  },
  reportTypeCardSelected: {
    borderColor: '#007AFF',
    backgroundColor: '#F0F8FF',
  },
  reportTypeContent: {
    flex: 1,
  },
  reportTypeTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  reportTypeDescription: {
    fontSize: 14,
    color: '#666666',
    lineHeight: 20,
  },
  reportTypeTextSelected: {
    color: '#007AFF',
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 20,
    lineHeight: 20,
  },
  promptInputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5E7',
    overflow: 'hidden',
  },
  promptInput: {
    flex: 1,
    padding: 16,
    fontSize: 16,
    color: '#1A1A1A',
    minHeight: 120,
    maxHeight: 200,
  },
  voiceButton: {
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderLeftWidth: 1,
    borderLeftColor: '#E5E5E7',
  },
  generatingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    padding: 20,
    backgroundColor: '#F0F8FF',
    borderRadius: 12,
  },
  generatingMessage: {
    fontSize: 16,
    color: '#007AFF',
    marginLeft: 12,
    fontWeight: '500',
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: 16,
    color: '#666666',
    marginTop: 12,
  },
  voiceButtonRecording: {
    backgroundColor: '#FFE7E7',
  },
  voiceButtonDisabled: {
    opacity: 0.5,
  },
  recordingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    padding: 16,
    backgroundColor: '#FFE7E7',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FF3B30',
  },
  recordingMessage: {
    fontSize: 16,
    color: '#FF3B30',
    marginLeft: 8,
    fontWeight: '500',
  },
  transcribingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    padding: 16,
    backgroundColor: '#E7F7E7',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#34C759',
  },
  transcribingMessage: {
    fontSize: 16,
    color: '#34C759',
    marginLeft: 8,
    fontWeight: '500',
  },
  textDisabled: {
    color: '#C7C7CC',
  },
  checklistContainer: {
    marginTop: 20,
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5E7',
  },
  checklistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  checklistLabel: {
    marginLeft: 12,
    fontSize: 14,
    color: '#1A1A1A',
  },
  checklistDone: {
    color: '#34C759',
  },
  checklistHint: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 8,
    textAlign: 'center',
  },
  resultContainer: {
    marginTop: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5E7',
    padding: 16,
  },
  resultText: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
    color: '#1A1A1A',
  },
  closeButton: {
    marginTop: 16,
    alignSelf: 'flex-end',
    backgroundColor: '#007AFF',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  closeButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  sentMessageContainer: {
    marginTop: 20,
    alignItems: 'flex-end',
  },
  sentMessageBubble: {
    backgroundColor: '#007AFF',
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 12,
    maxWidth: '80%',
  },
  sentMessageText: {
    color: '#FFFFFF',
    fontSize: 16,
    lineHeight: 20,
  },
  sentMessageLabel: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 4,
    marginRight: 8,
  },
});
