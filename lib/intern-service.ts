// ========================================
// INTERN MODULE - PHASE 2
// React TypeScript Functions for User Signup & File Handling
// ========================================

import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/supabase';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient<Database>(supabaseUrl, supabaseKey);

// ========================================
// TYPES & INTERFACES
// ========================================

export interface InternApplicationData {
  assignedTopic?: 'auto' | 'health' | 'tech' | 'finance' | 'lifestyle' | 'education' | 'food' | 'travel';
  agreementSigned?: boolean;
}

export interface InternSignupResult {
  success: boolean;
  userId?: string;
  internId?: string;
  error?: string;
}

export interface DocumentUploadResult {
  success: boolean;
  documentId?: string;
  storagePath?: string;
  error?: string;
}

export interface InternDocument {
  id: string;
  document_type: string;
  storage_path: string;
  original_filename: string;
  file_size: number;
  mime_type: string;
  upload_date: string;
}

// ========================================
// INTERN SIGNUP FUNCTION
// ========================================

/**
 * Handles intern signup process
 * 1. Registers new user via Supabase Auth
 * 2. Creates intern record in database
 * 3. Sets initial status to 'Applied'
 */
export async function handleInternSignup(
  email: string, 
  password: string, 
  applicationData: InternApplicationData = {}
): Promise<InternSignupResult> {
  try {
    // Step 1: Register user with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`
      }
    });

    if (authError) {
      console.error('Auth signup error:', authError);
      return {
        success: false,
        error: `Registration failed: ${authError.message}`
      };
    }

    if (!authData.user) {
      return {
        success: false,
        error: 'Registration failed: No user data returned'
      };
    }

    // Step 2: Create intern record in database
    const { data: internData, error: internError } = await supabase
      .from('interns')
      .insert({
        user_id: authData.user.id,
        status: 'Applied',
        assigned_topic: applicationData.assignedTopic || null,
        agreement_signed: applicationData.agreementSigned || false
      })
      .select()
      .single();

    if (internError) {
      console.error('Intern creation error:', internError);
      
      // If intern creation fails, we should clean up the auth user
      await supabase.auth.admin.deleteUser(authData.user.id);
      
      return {
        success: false,
        error: `Failed to create intern record: ${internError.message}`
      };
    }

    return {
      success: true,
      userId: authData.user.id,
      internId: internData.id
    };

  } catch (error) {
    console.error('Unexpected error during signup:', error);
    return {
      success: false,
      error: `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

// ========================================
// DOCUMENT UPLOAD FUNCTION
// ========================================

/**
 * Handles secure file upload for intern documents
 * 1. Uploads file to Supabase Storage
 * 2. Records document metadata in database
 * 3. Returns upload result with document ID
 */
export async function uploadInternDocument(
  file: File,
  internId: string,
  documentType: 'Institution Letter' | 'Behavior Agreement' | 'ID Document' | 'Resume' | 'Portfolio' | 'Other'
): Promise<DocumentUploadResult> {
  try {
    // Validate file
    if (!file || file.size === 0) {
      return {
        success: false,
        error: 'No file provided or file is empty'
      };
    }

    // Check file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return {
        success: false,
        error: 'File size exceeds 10MB limit'
      };
    }

    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/gif',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];

    if (!allowedTypes.includes(file.type)) {
      return {
        success: false,
        error: 'File type not allowed. Please upload PDF, image, or Word document.'
      };
    }

    // Create storage path: interns/[internId]/[documentType]/[timestamp]-[filename]
    const timestamp = Date.now();
    const sanitizedFilename = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const storagePath = `interns/${internId}/${documentType}/${timestamp}-${sanitizedFilename}`;

    // Step 1: Upload file to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('intern-docs')
      .upload(storagePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      console.error('File upload error:', uploadError);
      return {
        success: false,
        error: `File upload failed: ${uploadError.message}`
      };
    }

    // Step 2: Record document metadata in database
    const { data: documentData, error: documentError } = await supabase
      .from('intern_documents')
      .insert({
        intern_id: internId,
        document_type: documentType,
        storage_path: storagePath,
        original_filename: file.name,
        file_size: file.size,
        mime_type: file.type
      })
      .select()
      .single();

    if (documentError) {
      console.error('Document record error:', documentError);
      
      // Clean up uploaded file if database record fails
      await supabase.storage
        .from('intern-docs')
        .remove([storagePath]);
      
      return {
        success: false,
        error: `Failed to record document: ${documentError.message}`
      };
    }

    return {
      success: true,
      documentId: documentData.id,
      storagePath: storagePath
    };

  } catch (error) {
    console.error('Unexpected error during upload:', error);
    return {
      success: false,
      error: `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

// ========================================
// HELPER FUNCTIONS
// ========================================

/**
 * Gets all documents for a specific intern
 */
export async function getInternDocuments(internId: string): Promise<InternDocument[]> {
  try {
    const { data, error } = await supabase
      .from('intern_documents')
      .select('*')
      .eq('intern_id', internId)
      .order('upload_date', { ascending: false });

    if (error) {
      console.error('Error fetching documents:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Unexpected error fetching documents:', error);
    return [];
  }
}

/**
 * Downloads a document from storage
 */
export async function downloadDocument(storagePath: string): Promise<Blob | null> {
  try {
    const { data, error } = await supabase.storage
      .from('intern-docs')
      .download(storagePath);

    if (error) {
      console.error('Error downloading document:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Unexpected error downloading document:', error);
    return null;
  }
}

/**
 * Deletes a document and its database record
 */
export async function deleteDocument(documentId: string): Promise<{ success: boolean; error?: string }> {
  try {
    // First, get the document record to find the storage path
    const { data: document, error: fetchError } = await supabase
      .from('intern_documents')
      .select('storage_path')
      .eq('id', documentId)
      .single();

    if (fetchError || !document) {
      return {
        success: false,
        error: 'Document not found'
      };
    }

    // Delete from storage
    const { error: storageError } = await supabase.storage
      .from('intern-docs')
      .remove([document.storage_path]);

    if (storageError) {
      console.error('Error deleting from storage:', storageError);
      // Continue with database deletion even if storage deletion fails
    }

    // Delete database record
    const { error: dbError } = await supabase
      .from('intern_documents')
      .delete()
      .eq('id', documentId);

    if (dbError) {
      console.error('Error deleting database record:', dbError);
      return {
        success: false,
        error: `Failed to delete document record: ${dbError.message}`
      };
    }

    return { success: true };
  } catch (error) {
    console.error('Unexpected error deleting document:', error);
    return {
      success: false,
      error: `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

/**
 * Gets signed URL for document viewing
 */
export async function getDocumentUrl(storagePath: string, expiresIn: number = 3600): Promise<string | null> {
  try {
    const { data, error } = await supabase.storage
      .from('intern-docs')
      .createSignedUrl(storagePath, expiresIn);

    if (error) {
      console.error('Error creating signed URL:', error);
      return null;
    }

    return data.signedUrl;
  } catch (error) {
    console.error('Unexpected error creating signed URL:', error);
    return null;
  }
}

// ========================================
// UTILITY FUNCTIONS
// ========================================

/**
 * Formats file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Gets file icon based on MIME type
 */
export function getFileIcon(mimeType: string): string {
  if (mimeType.includes('pdf')) return '📄';
  if (mimeType.includes('image')) return '🖼️';
  if (mimeType.includes('word') || mimeType.includes('document')) return '📝';
  return '📎';
}

/**
 * Validates email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validates password strength
 */
export function validatePassword(password: string): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  
  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

export default supabase;

