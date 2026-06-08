import { Eye, EyeOff } from "lucide-react";
import { forwardRef, useState } from "react";

type Props = Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> & {
  inputClassName?: string;
};

export const PasswordInput = forwardRef<HTMLInputElement, Props>(function PasswordInput(
  { className, inputClassName, ...rest },
  ref,
) {
  const [show, setShow] = useState(false);
  return (
    <div className={`relative ${className ?? ""}`}>
      <input
        ref={ref}
        type={show ? "text" : "password"}
        {...rest}
        className={`${inputClassName ?? "w-full rounded-lg border border-input bg-card px-3 py-2.5 pr-10 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"}`}
      />
      <button
        type="button"
        aria-label={show ? "隱藏密碼" : "顯示密碼"}
        onClick={() => setShow((v) => !v)}
        className="absolute inset-y-0 right-2 my-auto grid h-7 w-7 place-items-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground"
        tabIndex={-1}
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
});
