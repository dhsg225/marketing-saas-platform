import React, { useState, useRef, useEffect } from 'react';
import {
  BoldIcon,
  ItalicIcon,
  ListBulletIcon,
  LinkIcon,
  HashtagIcon,
  FaceSmileIcon
} from '@heroicons/react/24/outline';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  autoSave?: boolean;
  onAutoSave?: (value: string) => void;
  originalValue?: string;
  isEdited?: boolean;
  isSaved?: boolean;
}

const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value,
  onChange,
  placeholder = "Start typing your content...",
  className = "",
  autoSave = false,
  onAutoSave,
  originalValue = "",
  isEdited = false,
  isSaved = false
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  // Auto-save functionality
  useEffect(() => {
    if (!autoSave || !onAutoSave) return;

    const interval = setInterval(() => {
      if (isEditing && value) {
        onAutoSave(value);
        setLastSaved(new Date());
      }
    }, 10000); // 10 seconds

    return () => clearInterval(interval);
  }, [autoSave, onAutoSave, isEditing, value]);

  const handleInput = () => {
    if (editorRef.current) {
      const content = editorRef.current.innerHTML;
      onChange(content);
      setIsEditing(true);
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    document.execCommand('insertText', false, text);
  };

  const execCommand = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
  };

  const insertHashtag = () => {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const hashtag = '#';
      range.insertNode(document.createTextNode(hashtag));
      range.collapse(false);
      selection.removeAllRanges();
      selection.addRange(range);
    }
    editorRef.current?.focus();
  };

  const insertEmoji = () => {
    const emojis = ['😊', '🚀', '💡', '🎯', '✨', '🔥', '💪', '🎉'];
    const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      range.insertNode(document.createTextNode(randomEmoji));
      range.collapse(false);
      selection.removeAllRanges();
      selection.addRange(range);
    }
    editorRef.current?.focus();
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className={`rich-text-editor ${className}`}>
      {/* Toolbar */}
      <div className="flex items-center space-x-2 p-3 bg-gray-50 border border-gray-200 rounded-t-lg">
        <button
          type="button"
          onClick={() => execCommand('bold')}
          className="p-2 hover:bg-gray-200 rounded transition-colors"
          title="Bold"
        >
          <BoldIcon className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => execCommand('italic')}
          className="p-2 hover:bg-gray-200 rounded transition-colors"
          title="Italic"
        >
          <ItalicIcon className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => execCommand('insertUnorderedList')}
          className="p-2 hover:bg-gray-200 rounded transition-colors"
          title="Bullet List"
        >
          <ListBulletIcon className="h-4 w-4" />
        </button>
        <div className="w-px h-6 bg-gray-300"></div>
        <button
          type="button"
          onClick={insertHashtag}
          className="p-2 hover:bg-gray-200 rounded transition-colors"
          title="Insert Hashtag"
        >
          <HashtagIcon className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={insertEmoji}
          className="p-2 hover:bg-gray-200 rounded transition-colors"
          title="Insert Emoji"
        >
          <FaceSmileIcon className="h-4 w-4" />
        </button>
        <div className="w-px h-6 bg-gray-300"></div>
        <button
          type="button"
          onClick={() => {
            const url = prompt('Enter URL:');
            if (url) execCommand('createLink', url);
          }}
          className="p-2 hover:bg-gray-200 rounded transition-colors"
          title="Insert Link"
        >
          <LinkIcon className="h-4 w-4" />
        </button>
      </div>

      {/* Editor */}
      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        onPaste={handlePaste}
        onFocus={() => setIsEditing(true)}
        onBlur={() => setIsEditing(false)}
        className="min-h-[200px] p-4 border border-gray-200 border-t-0 rounded-b-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
        style={{ whiteSpace: 'pre-wrap' }}
        dangerouslySetInnerHTML={{ __html: value || '' }}
        data-placeholder={placeholder}
      />

      {/* Status Bar */}
      <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
        <div className="flex items-center space-x-4">
          {lastSaved && (
            <span>Last saved: {formatTime(lastSaved)}</span>
          )}
          {isEditing && (
            <span className="text-orange-500">● Editing</span>
          )}
          {isEdited && !isSaved && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
              ✏️ Edited
            </span>
          )}
          {isSaved && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
              ✅ Saved
            </span>
          )}
        </div>
        <div className="text-gray-400">
          {value ? `${value.replace(/<[^>]*>/g, '').length} characters` : '0 characters'}
        </div>
      </div>

      <style>{`
        .rich-text-editor [contenteditable]:empty:before {
          content: attr(data-placeholder);
          color: #9ca3af;
          pointer-events: none;
        }
      `}</style>
    </div>
  );
};

export default RichTextEditor;
