import { Eye, EyeOff } from "lucide-react"
import { useState } from "react"
import { Input } from "./input"

type PasswordInputProps = Omit<React.ComponentProps<typeof Input>, "type"> & {
  /** placeholder when empty */
  placeholder?: string
}

export function PasswordInput({ ...props }: PasswordInputProps) {
  const [visible, setVisible] = useState(false)

  return (
    <div className="relative">
      <Input {...props} type={visible ? "text" : "password"} className={`pr-10 ${props.className ?? ""}`} />
      <button
        type="button"
        tabIndex={-1}
        onClick={() => setVisible((v) => !v)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-200 transition-colors"
      >
        {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  )
}
