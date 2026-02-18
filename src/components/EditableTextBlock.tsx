import React, { useState, useRef, useEffect, useCallback } from "react";

interface EditableTextBlockProps {
  initialValue: string;
  onSave: (value: string) => void;
  tagName?: "h1" | "h2" | "h3" | "p" | "span" | "div";
  className?: string;
  placeholder?: string;
  multiline?: boolean;
  onEnter?: () => void;
  autoFocus?: boolean;
}

const EditableTextBlock: React.FC<EditableTextBlockProps> = ({
  initialValue,
  onSave,
  tagName = "div",
  className = "",
  placeholder = "Type here...",
  multiline = true,
  onEnter,
  autoFocus = false,
}) => {
  const [isEditing, setIsEditing] = useState(autoFocus);
  const [localValue, setLocalValue] = useState(initialValue);
  const contentRef = useRef<HTMLElement>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!isEditing) {
      setLocalValue(initialValue);
      if (contentRef.current && contentRef.current.innerText !== initialValue) {
        contentRef.current.innerText = initialValue;
      }
    }
  }, [initialValue, isEditing]);

  const handleSave = useCallback(
    (newValue: string) => {
      const trimmed = newValue.trim();
      if (trimmed !== initialValue) {
        onSave(trimmed);
      }
    },
    [initialValue, onSave],
  );

  const handleChange = useCallback(() => {
    if (!contentRef.current) return;
    const newValue = contentRef.current.innerText;
    setLocalValue(newValue);

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      handleSave(newValue);
    }, 600);
  }, [handleSave]);

  const handleBlur = useCallback(() => {
    setIsEditing(false);
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    if (contentRef.current) {
      handleSave(contentRef.current.innerText);
    }
  }, [handleSave]);

  const lastEnterTime = useRef<number>(0);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      setIsEditing(false);
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      if (contentRef.current) {
        contentRef.current.innerText = initialValue;
      }
      setLocalValue(initialValue);
    } else if (e.key === "Enter") {
      if (!multiline) {
        e.preventDefault();
        contentRef.current?.blur();
      } else if (onEnter) {
        const now = Date.now();
        if (now - lastEnterTime.current < 500) {
          e.preventDefault();
          if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
          if (contentRef.current) handleSave(contentRef.current.innerText);
          onEnter();
          lastEnterTime.current = 0;
        } else {
          lastEnterTime.current = now;
        }
      }
    }
  };

  const handleClick = () => {
    setIsEditing(true);
  };

  useEffect(() => {
    if (isEditing && contentRef.current) {
      contentRef.current.focus();
    }
  }, [isEditing]);

  const Tag = tagName as any;

  return (
    <Tag
      ref={contentRef}
      contentEditable={isEditing}
      suppressContentEditableWarning={true}
      onClick={handleClick}
      onBlur={handleBlur}
      onInput={handleChange}
      onKeyDown={handleKeyDown}
      className={`
                outline-none min-w-[10px] cursor-text transition-colors duration-200
                bg-transparent
                ${!localValue && placeholder ? "empty:before:content-[attr(data-placeholder)] empty:before:text-white/20" : ""}
                ${className}
            `}
      data-placeholder={placeholder}
      spellCheck={false}
    >
      {initialValue}
    </Tag>
  );
};

export default EditableTextBlock;
