import { useState } from "react";
import Input from "~/components/elements/input";
import EditIcon from "~/icons/edit";
interface FieldConfig {
  name: string;
  initialValue?: string;
  type: string;
  placeholder: string | number;
  displayValue?: string;
  defaultValue?: string | number;
}

interface FormProps {
  label: string;
  isLoading?: boolean;
  placeholder?: string;
  fields: FieldConfig[];
  size?: "xs" | "sm" | "md" | "lg";
  buttonClassName?: string;
  rootClassName?: string;
  labelStyle?: string;
  submitHandler: (formValues: {
    [key: string]: string;
  }) => Promise<unknown> | string | void;
  badge?: {
    text: string;
    color: string;
  };
}

const InputField = ({
  label,
  placeholder,
  fields,
  submitHandler,
  badge,
  isLoading,
  size = "sm",
  buttonClassName,
  rootClassName,
  labelStyle,
}: FormProps) => {
  const [showInputs, setShowInputs] = useState(false);
  const [formValues, setFormValues] = useState<Record<string, string>>(
    fields.reduce((acc, field) => {
      acc[field.name] = field.initialValue || "";
      return acc;
    }, {})
  );

  const handleEditClick = () => setShowInputs(!showInputs);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const targetName = e.target.name;
    const targetValue = e.target.value;
    setFormValues({ ...formValues, [targetName]: targetValue });
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const response = await submitHandler(formValues);
    if (response) {
      setShowInputs(false);
    }
  };

  const renderInputs = () => (
    <form
      onSubmit={(event) => {
        void handleSubmit(event);
      }}
      className={rootClassName}
    >
      {fields.map((field, i) => (
        <Input
          focus={i === 0}
          type={field.type}
          key={i}
          placeholder={field.placeholder}
          value={formValues[field.name]}
          onChange={handleChange}
          name={field.name}
          defaultValue={field.defaultValue}
          className={`input-${size}`}
        />
      ))}
      <div className="flex gap-3">
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
      </div>
    </form>
  );
  const renderLoading = () => (
    <div className="mt-1 text-sm">
      <progress className="progress w-56"></progress>
    </div>
  );
  return (
    <>
      <dt
        onClick={handleEditClick}
        className={`flex cursor-pointer items-center gap-2 font-medium ${labelStyle}`}
      >
        {label}
        <EditIcon data-testid="edit-icon" />
      </dt>
      {showInputs ? (
        isLoading ? (
          renderLoading()
        ) : (
          renderInputs()
        )
      ) : (
        <dd className={`mt-1 flex items-center gap-2 ${labelStyle}`}>
          {placeholder ?? fields[0].placeholder}
          {badge ? (
            <div className={`badge badge-${badge.color}`}>{badge.text}</div>
          ) : null}
        </dd>
      )}
    </>
  );
};

export default InputField;
