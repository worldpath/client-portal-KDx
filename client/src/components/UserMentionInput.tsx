import { useState, useRef, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface UserMentionInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  id?: string;
  className?: string;
}

export default function UserMentionInput({
  value,
  onChange,
  placeholder,
  rows = 4,
  id,
  className,
}: UserMentionInputProps) {
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [autocompletePosition, setAutocompletePosition] = useState({ top: 0, left: 0 });
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Search users for autocomplete
  const { data: users } = trpc.users.searchUsers.useQuery(
    { query: searchQuery },
    { enabled: showAutocomplete && searchQuery.length > 0 }
  );

  // Handle textarea change
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    onChange(newValue);

    // Check if user is typing @mention
    const cursorPosition = e.target.selectionStart;
    const textBeforeCursor = newValue.substring(0, cursorPosition);
    const lastAtIndex = textBeforeCursor.lastIndexOf("@");

    if (lastAtIndex !== -1) {
      const textAfterAt = textBeforeCursor.substring(lastAtIndex + 1);
      // Check if there's no space after @ (still typing username)
      if (!textAfterAt.includes(" ") && textAfterAt.length >= 0) {
        setSearchQuery(textAfterAt);
        setShowAutocomplete(true);
        setSelectedIndex(0);
        
        // Calculate autocomplete position
        if (textareaRef.current) {
          const rect = textareaRef.current.getBoundingClientRect();
          setAutocompletePosition({
            top: rect.bottom + window.scrollY,
            left: rect.left + window.scrollX,
          });
        }
      } else {
        setShowAutocomplete(false);
      }
    } else {
      setShowAutocomplete(false);
    }
  };

  // Handle user selection from autocomplete
  const selectUser = (username: string) => {
    if (!textareaRef.current) return;

    const cursorPosition = textareaRef.current.selectionStart;
    const textBeforeCursor = value.substring(0, cursorPosition);
    const textAfterCursor = value.substring(cursorPosition);
    const lastAtIndex = textBeforeCursor.lastIndexOf("@");

    if (lastAtIndex !== -1) {
      const newValue =
        value.substring(0, lastAtIndex) +
        `@${username} ` +
        textAfterCursor;
      onChange(newValue);
      setShowAutocomplete(false);

      // Set cursor position after inserted mention
      setTimeout(() => {
        if (textareaRef.current) {
          const newCursorPos = lastAtIndex + username.length + 2;
          textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
          textareaRef.current.focus();
        }
      }, 0);
    }
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!showAutocomplete || !users || users.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => Math.min(prev + 1, users.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === "Enter" && showAutocomplete) {
      e.preventDefault();
      if (users[selectedIndex]) {
        selectUser(users[selectedIndex].name || users[selectedIndex].email || "user");
      }
    } else if (e.key === "Escape") {
      setShowAutocomplete(false);
    }
  };

  // Close autocomplete when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setShowAutocomplete(false);
    if (showAutocomplete) {
      document.addEventListener("click", handleClickOutside);
      return () => document.removeEventListener("click", handleClickOutside);
    }
  }, [showAutocomplete]);

  return (
    <div className="relative">
      <Textarea
        ref={textareaRef}
        id={id}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        rows={rows}
        className={className}
      />

      {/* Autocomplete dropdown */}
      {showAutocomplete && users && users.length > 0 && (
        <div
          className="absolute z-50 mt-1 w-64 bg-popover border border-border rounded-md shadow-lg max-h-48 overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {users.map((user: any, index: number) => (
            <button
              key={user.id}
              type="button"
              className={cn(
                "w-full text-left px-3 py-2 hover:bg-accent cursor-pointer flex items-center gap-2",
                index === selectedIndex && "bg-accent"
              )}
              onClick={() => selectUser(user.name || user.email || "user")}
              onMouseEnter={() => setSelectedIndex(index)}
            >
              <div className="flex-1">
                <div className="font-medium text-sm">{user.name || user.email}</div>
                {user.email && user.name && (
                  <div className="text-xs text-muted-foreground">{user.email}</div>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
