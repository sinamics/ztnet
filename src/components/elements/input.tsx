import { useEffect, useRef } from "react";

interface PasswordInputProps {
  placeholder: string;
  value?: string;
  name: string;
  type: string;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  focus?: boolean;
  className?: string;
  defaultValue?: string;
}

const Input = ({
  placeholder,
  value,
  name,
  onChange,
  type,
  className = "",
  defaultValue,
  focus = false,
  ...rest
}: PasswordInputProps) => {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (focus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [focus]);

  useEffect(() => {
    if (defaultValue && inputRef.current && onChange) {
      const event = {
        target: {
          name: inputRef.current.name,
          value: defaultValue,
        },
      };
      onChange(event as React.ChangeEvent<HTMLInputElement>);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <input
      type={type}
      name={name}
      placeholder={placeholder}
      defaultValue={defaultValue}
      value={value}
      onChange={onChange}
      className={`input w-full max-w-xs ${className}`}
      ref={inputRef}
      {...rest}
    />
  );
};

export default Input;
