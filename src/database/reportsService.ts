import { useSQLiteContext } from 'expo-sqlite';
import { supabase } from '../lib/supabase';
import { pushReport, deleteRemoteReport } from './reportsSync';

export interface Report {
  id: number;
  title: string;
  content: string;
  prompt: string;
  type: 'insights' | 'patterns' | 'mood' | 'goals' | 'custom';
  status: 'completed' | 'generating';
  createdAt: string;
  updatedAt: string;
}

export interface CreateReportData {
  title: string;
  content: string;
  prompt: string;
  type: Report['type'];
  status?: Report['status'];
}

export const useReportsService = () => {
  const db = useSQLiteContext();

  const initReportsTable = async (): Promise<void> => {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS reports (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        prompt TEXT NOT NULL,
        type TEXT NOT NULL,
        status TEXT DEFAULT 'completed',
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL
      );
    `);
    console.log('✅ [DB] Reports table initialized');
  };

  const getAllReports = async (): Promise<Report[]> => {
    try {
      const result = await db.getAllAsync<Report>(`
        SELECT * FROM reports 
        ORDER BY createdAt DESC
      `);
      
      console.log(`📊 [DB] Retrieved ${result.length} reports`);
      return result;
    } catch (error) {
      console.error('❌ [DB] Error fetching reports:', error);
      return [];
    }
  };

  const createReport = async (reportData: CreateReportData): Promise<Report | null> => {
    try {
      const now = new Date().toISOString();
      
      const result = await db.runAsync(`
        INSERT INTO reports (title, content, prompt, type, status, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [
        reportData.title,
        reportData.content,
        reportData.prompt,
        reportData.type,
        reportData.status || 'completed',
        now,
        now
      ]);

      console.log(`✅ [DB] Report created successfully: ${result.lastInsertRowId}`);
      
      // Return the created report
      const createdReport = await db.getFirstAsync<Report>(`
        SELECT * FROM reports WHERE id = ?
      `, [result.lastInsertRowId]);
      if (!createdReport) {
        console.error('❌ [DB] Failed to read back created report', result.lastInsertRowId);
        return null;
      }
      
      // Push to cloud if session exists (non-blocking failure)
      try {
        const { data } = await supabase.auth.getSession();
        if (data?.session?.user) {
          await pushReport({
            id: createdReport.id,
            title: createdReport.title,
            content: createdReport.content,
            prompt: createdReport.prompt,
            type: createdReport.type,
            status: createdReport.status,
            createdAt: createdReport.createdAt,
            updatedAt: createdReport.updatedAt,
          });
          console.log('☁️ [Sync] Pushed report to cloud');
        }
      } catch (e) {
        console.warn('☁️ [Sync] pushReport failed', e);
      }

      return createdReport;
    } catch (error) {
      console.error('❌ [DB] Error creating report:', error);
      return null;
    }
  };

  const updateReportStatus = async (id: number, status: Report['status'], content?: string, title?: string): Promise<boolean> => {
    try {
      const now = new Date().toISOString();
      
      let query = `UPDATE reports SET status = ?, updatedAt = ?`;
      let params: any[] = [status, now];
      
      if (content) {
        query += `, content = ?`;
        params.push(content);
      }
      if (title) {
        query += `, title = ?`;
        params.push(title);
      }
      
      query += ` WHERE id = ?`;
      params.push(id.toString());
      
      const result = await db.runAsync(query, params);
      
      console.log(`✅ [DB] Report ${id} status updated to ${status}`);
      return result.changes > 0;
    } catch (error) {
      console.error('❌ [DB] Error updating report status:', error);
      return false;
    }
  };

  const deleteReport = async (id: number): Promise<boolean> => {
    try {
      const result = await db.runAsync(`
        DELETE FROM reports WHERE id = ?
      `, [id]);
      
      console.log(`🗑️ [DB] Report deleted: ${id}`);
      const ok = result.changes > 0;

      if (ok) {
        // Delete from cloud if logged in
        try {
          const { data } = await supabase.auth.getSession();
          if (data?.session?.user) {
            await deleteRemoteReport(id);
            console.log('☁️ [Sync] Deleted remote report', id);
          }
        } catch (e) {
          console.warn('☁️ [Sync] deleteRemoteReport failed', e);
        }
      }

      return ok;
    } catch (error) {
      console.error('❌ [DB] Error deleting report:', error);
      return false;
    }
  };

  const getReportById = async (id: number): Promise<Report | null> => {
    try {
      const result = await db.getFirstAsync<Report>(`
        SELECT * FROM reports WHERE id = ?
      `, [id]);
      
      return result;
    } catch (error) {
      console.error('❌ [DB] Error fetching report by ID:', error);
      return null;
    }
  };

  // Clear all local reports from SQLite
  const clearAllReports = async (): Promise<void> => {
    try {
      await db.execAsync('DELETE FROM reports;');
      console.log('🧹 [DB] Cleared all reports');
    } catch (error) {
      console.error('❌ [DB] Error clearing all reports:', error);
      throw error;
    }
  };

  return {
    initReportsTable,
    getAllReports,
    createReport,
    updateReportStatus,
    deleteReport,
    getReportById,
    clearAllReports,
  };
};
