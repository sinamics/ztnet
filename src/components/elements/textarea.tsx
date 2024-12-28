import { forwardRef, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import cn from "classnames";

interface TextAreaProps {
	placeholder: string;
	value?: string | number;
	useTooltip?: boolean;
	name: string;
	onChange?: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
	onBlur?: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
	onKeyDown?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
	ref?: React.RefObject<HTMLTextAreaElement>;
	focus?: boolean;
	className?: string;
	defaultValue?: string | number;
	disabled?: boolean;
	maxRows?: number;
	minRows?: number;
}

const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(
  (
    {
      value,
      name,
      onChange,
      onBlur,
      className = "",
      defaultValue,
      focus = false,
      useTooltip = false,
      maxRows = 5,
      minRows = 1,
      ...rest
    }: TextAreaProps,
    forwardedRef,
  ) => {
    const t = useTranslations("input");
    const [isFocused, setIsFocused] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const handleRef = (instance: HTMLTextAreaElement | null) => {
      textareaRef.current = instance;
      if (typeof forwardedRef === "function") {
        forwardedRef(instance);
      } else if (forwardedRef) {
        forwardedRef.current = instance;
      }
    };

    const adjustHeight = () => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      // Store the scroll position
      const scrollTop = textarea.scrollTop;
      
      // Reset height to calculate new height
      textarea.style.height = "auto";
      
      // Calculate based on content
      const paddingTop = 2;
      const paddingBottom = 2;
      const border = 0; // Since we're using borderless style
      const singleLineHeight = 24; // Height for single line
      
  
      const minHeight = (singleLineHeight * minRows) + paddingTop + paddingBottom + border;
      const maxHeight = (singleLineHeight * maxRows) + paddingTop + paddingBottom + border;
      const contentHeight = textarea.scrollHeight;
      
      // Ensure height is between minHeight and maxHeight
      const newHeight = Math.min(Math.max(contentHeight, minHeight), maxHeight);
      
      
      textarea.style.height = `${newHeight}px`;
      textarea.style.overflowY = textarea.scrollHeight > newHeight ? "auto" : "hidden";
      
      // Restore scroll position
      textarea.scrollTop = scrollTop;
    };

    const handleFocus = () => {
      setIsFocused(true);
    };

    const handleBlur = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
      setIsFocused(false);
      if (onBlur) {
        onBlur(event);
      }
    };

    const handleChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
      adjustHeight();
      if (onChange) {
        onChange(event);
      }
    };

    useEffect(() => {
      if (focus && forwardedRef && "current" in forwardedRef) {
        forwardedRef.current?.focus();
      }
    }, [focus, forwardedRef]);

    useEffect(() => {
      if (defaultValue && forwardedRef && "current" in forwardedRef && onChange) {
        const event = {
          target: {
            name: forwardedRef.current?.name || "",
            value: defaultValue,
          },
        };
        onChange(event as React.ChangeEvent<HTMLTextAreaElement>);
      }
    }, [defaultValue, onChange, forwardedRef]);

    // biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
    useEffect(() => {
      adjustHeight();
    }, [value, defaultValue]);

    return (
      <div
        className={cn("w-full", { tooltip: useTooltip && isFocused })}
        data-tip={t("enterToSave")}
      >
        <textarea
          name={name}
          defaultValue={defaultValue}
          value={value}
          onChange={handleChange}
          onBlur={handleBlur}
          onFocus={handleFocus}
          className={cn(
            "input resize-none leading-tight",
            "pt-1.5 pb-0.5",
            "min-h-[24px]",
            "transition-none",
            className
          )}
          ref={handleRef}
          rows={1}
          {...rest}
        />
      </div>
    );
  },
);

TextArea.displayName = "TextArea";

export default TextArea;
