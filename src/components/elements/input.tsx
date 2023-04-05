import { useEffect, useRef } from "react";

interface PasswordInputProps {
  placeholder: string;
  value: string;
  name: string;
  type: string;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  focus?: boolean;
}

const Input = ({
  placeholder,
  value,
  name,
  onChange,
  type,
  focus = false,
  ...rest
}: PasswordInputProps) => {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (focus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [focus]);
  return (
    <input
      type={type}
      name={name}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      className="input w-full max-w-xs"
      ref={inputRef}
      {...rest}
    />
  );
};

export default Input;
