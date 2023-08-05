import { useState, useRef, useEffect } from "react";
import Input from "~/components/elements/input";

interface FieldConfig {
  name: string;
  initialValue?: string;
  type: string;
  placeholder: string;
  displayValue?: string;
  defaultValue?: string | number;
  value?: string | number;
}

interface FormProps {
  label: string;
  isLoading?: boolean;
  placeholder?: string;
  description?: string;
  fields: FieldConfig[];
  size?: "xs" | "sm" | "md" | "lg";
  buttonClassName?: string;
  rootClassName?: string;
  rootFormClassName?: string;
  labelStyle?: string;
  submitHandler: (formValues: {
    [key: string]: string;
  }) => Promise<unknown> | string | void;
  badge?: {
    text: string;
    color: string;
  };
  headerBadge?: {
    text: string;
    color: string;
  };
}

const InputField = ({
  label,
  placeholder,
  description,
  fields,
  submitHandler,
  badge,
  headerBadge,
  isLoading,
  size = "md",
  buttonClassName,
  rootClassName,
  rootFormClassName,
  labelStyle,
}: FormProps) => {
  const [showInputs, setShowInputs] = useState(false);

  const [formValues, setFormValues] = useState<Record<string, string>>({});
  // Create a new ref
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setFormValues(
      fields.reduce((acc, field) => {
        acc[field.name] = field.value || field.initialValue || "";
        return acc;
      }, {})
    );
  }, [fields]);

  useEffect(() => {
    // When showInputs is true, focus the input field
    if (showInputs) {
      inputRef.current?.focus();
    }
  }, [showInputs]);
  const handleEditClick = () => setShowInputs(!showInputs);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormValues((prevValues) => ({
      ...prevValues,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const response = await submitHandler(formValues);
    if (response) {
      setShowInputs(false);
    }
  };

  const renderLoading = () => (
    <div className="mt-1 text-sm">
      <progress className="progress w-56"></progress>
    </div>
  );

  return (
    <>
      {!showInputs ? (
        <div className="flex w-full justify-between">
          <div
            onClick={handleEditClick}
            className={`cursor-pointer  ${labelStyle}`}
          >
            <div className="flex font-medium">
              <span>{label}</span>

              {headerBadge && (
                <span
                  className={`badge badge-outline badge-${headerBadge.color} ml-2`}
                >
                  {headerBadge.text}
                </span>
              )}
            </div>
            <div>
              {description ? (
                <p className="m-0 p-0 text-xs text-gray-500">{description}</p>
              ) : null}
            </div>
            <div className="text-gray-500">
              {placeholder ?? fields[0].placeholder}
              {badge && (
                <span
                  className={`badge badge-outline badge-${badge.color} ml-2`}
                >
                  {badge.text}
                </span>
              )}
            </div>
          </div>
          <div>
            <button
              data-testid="view-form"
              onClick={handleEditClick}
              className={`btn btn-${size}`}
            >
              Change
            </button>
          </div>
        </div>
      ) : (
        <form
          onSubmit={(event) => {
            void handleSubmit(event);
          }}
          className={`flex w-full justify-between ${rootClassName}`}
        >
          <div>
            <div className="flex font-medium">
              <span>{label}</span>

              {headerBadge && (
                <span
                  className={`badge badge-outline badge-${headerBadge.color} ml-2`}
                >
                  {headerBadge.text}
                </span>
              )}
            </div>
            <div>
              {description ? (
                <p className="m-0 p-0 text-xs text-gray-500">{description}</p>
              ) : null}
            </div>
            <div className={rootFormClassName}>
              {fields.map((field, i) => (
                <Input
                  ref={i === 0 ? inputRef : undefined}
                  type={field.type}
                  key={i}
                  placeholder={field.placeholder}
                  value={formValues[field.name]}
                  onChange={handleChange}
                  name={field.name}
                  className={`input-bordered input-${size}`}
                />
              ))}
            </div>
          </div>
          <div className="flex gap-3">
            {isLoading ? (
              renderLoading()
            ) : (
              <>
                <button
                  className={`btn btn-primary btn-${size} ${buttonClassName}`}
                  type="submit"
                >
                  Submit
                </button>
                <button
                  className={`btn btn-${size} ${buttonClassName}`}
                  onClick={(e) => {
                    e.preventDefault();
                    handleEditClick();
                  }}
                >
                  Cancel
                </button>
              </>
            )}
          </div>
        </form>
      )}
    </>
  );
};

export default InputField;
